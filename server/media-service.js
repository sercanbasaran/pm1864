import { randomUUID } from "node:crypto";
import { audit } from "./audit.js";
import { ApiError } from "./errors.js";
const MAX_BYTES = 2 * 1024 * 1024;
const nameOf = (value) => (typeof value === "string" ? value.trim() : "");
export const mediaUrl = (id) => "/api/media/" + id + "/content";
const metadata = (row) => ({
  id: row.id,
  name: row.name,
  mimeType: row.mime_type,
  size: Number(row.size),
  version: Number(row.version),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  url: mediaUrl(row.id),
});
function matches(data, mime) {
  return mime === "image/png"
    ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mime === "image/jpeg"
      ? data[0] === 255 && data[1] === 216 && data[2] === 255
      : mime === "image/webp"
        ? data.subarray(0, 4).toString() === "RIFF" &&
          data.subarray(8, 12).toString() === "WEBP"
        : mime === "image/gif"
          ? ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString())
          : false;
}
export function decodeImageUpload(body) {
  const mime = body.mimeType;
  if (
    typeof body.data !== "string" ||
    !body.data.length ||
    body.data.length > Math.ceil(MAX_BYTES / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data)
  )
    throw new ApiError(422, "Geçerli, en fazla 2 MB görsel verisi gerekli.");
  const data = Buffer.from(body.data, "base64");
  if (
    data.length > MAX_BYTES ||
    data.toString("base64") !== body.data ||
    !matches(data, mime)
  )
    throw new ApiError(
      422,
      "PNG, JPEG, WEBP veya GIF biçiminde en fazla 2 MB görsel yükleyin.",
    );
  return data;
}
export function createMediaService(db) {
  const lock = async (tx) => {
    const row = (
      await tx.query(
        "SELECT revision,document FROM app_catalog WHERE id=1" +
          (tx.dialect === "postgres" ? " FOR UPDATE" : ""),
      )
    ).rows[0];
    return { row, doc: JSON.parse(row.document) };
  };
  async function record(tx, context, title, detail, actor) {
    audit(context.doc, title, detail, actor);
    await tx.query("UPDATE app_catalog SET revision=?,document=? WHERE id=1", [
      Number(context.row.revision) + 1,
      JSON.stringify(context.doc),
    ]);
  }
  async function list() {
    return {
      assets: (
        await db.query(
          "SELECT id,name,mime_type,size,version,created_at,updated_at FROM app_media ORDER BY created_at DESC",
        )
      ).rows.map(metadata),
    };
  }
  async function upload(body, actor) {
    const name = nameOf(body.name),
      mime = body.mimeType;
    if (!name || name.length > 160)
      throw new ApiError(422, "Dosya adı 1–160 karakter olmalıdır.");
    const data = decodeImageUpload(body);
    return db.transaction(async (tx) => {
      const context = await lock(tx),
        id = randomUUID(),
        now = new Date().toISOString();
      await tx.query(
        "INSERT INTO app_media (id,name,mime_type,size,data,version,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)",
        [id, name, mime, data.length, body.data, now, now],
      );
      await record(tx, context, "Medya yüklendi", name, actor);
      return {
        asset: {
          id,
          name,
          mimeType: mime,
          size: data.length,
          version: 1,
          createdAt: now,
          updatedAt: now,
          url: mediaUrl(id),
        },
      };
    });
  }
  async function rename(id, body, actor) {
    return db.transaction(async (tx) => {
      const context = await lock(tx),
        old = (
          await tx.query(
            "SELECT id,name,mime_type,size,version,created_at,updated_at FROM app_media WHERE id=?",
            [id],
          )
        ).rows[0];
      if (!old) throw new ApiError(404, "Medya bulunamadı.");
      if (body.expectedVersion !== Number(old.version))
        throw new ApiError(409, "Medya kaydı değişti. Listeyi yenileyin.");
      const name = nameOf(body.name);
      if (!name || name.length > 160)
        throw new ApiError(422, "Dosya adı 1–160 karakter olmalıdır.");
      const updated = new Date().toISOString();
      await tx.query(
        "UPDATE app_media SET name=?,version=?,updated_at=? WHERE id=?",
        [name, Number(old.version) + 1, updated, id],
      );
      await record(tx, context, "Medya adı güncellendi", name, actor);
      return {
        asset: metadata({
          ...old,
          name,
          version: Number(old.version) + 1,
          updated_at: updated,
        }),
      };
    });
  }
  async function remove(id, body, actor) {
    return db.transaction(async (tx) => {
      const context = await lock(tx),
        old = (
          await tx.query("SELECT name,version FROM app_media WHERE id=?", [id])
        ).rows[0];
      if (!old) throw new ApiError(404, "Medya bulunamadı.");
      if (body.expectedVersion !== Number(old.version))
        throw new ApiError(409, "Medya kaydı değişti. Listeyi yenileyin.");
      if (
        context.doc.categories.some((c) =>
          (c.images || []).some((image) => image.id === id),
        ) ||
        context.doc.products.some(
          (p) =>
            p.mediaId === id ||
            p.customImage === mediaUrl(id) ||
            (p.images || []).some((image) => image.id === id) ||
            p.variants.some((v) =>
              (v.images || []).some((image) => image.id === id),
            ),
        )
      )
        throw new ApiError(
          409,
          "Bu görsel bir ürün veya kategoride kullanılıyor. Önce bağlantısını kaldırın.",
          "MEDIA_IN_USE",
        );
      await tx.query("DELETE FROM app_media WHERE id=?", [id]);
      await record(tx, context, "Medya silindi", old.name, actor);
      return { ok: true };
    });
  }
  async function content(id) {
    const row = (
      await db.query("SELECT mime_type,data FROM app_media WHERE id=?", [id])
    ).rows[0];
    if (!row) throw new ApiError(404, "Medya bulunamadı.");
    return new Response(Buffer.from(row.data, "base64"), {
      headers: {
        "Content-Type": row.mime_type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }
  return { list, upload, rename, remove, content };
}
