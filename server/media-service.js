import {imageResponse} from "./image-response.js";
import {createDerivatives} from "./image-derivatives.js";
import {imageProfiles} from "../src/image-sizes.js";
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
  const pending = new Map();
  async function storeDerivatives(tx,id,variants) {
    for(const v of variants)await tx.query("INSERT INTO app_media_derivatives (media_id,profile,width,height,size,data) VALUES (?,?,?,?,?,?) ON CONFLICT(media_id,profile) DO NOTHING",[id,v.profile,v.width,v.height,v.size,v.data]);
  }
  async function ensureDerivatives(id) {
    if(pending.has(id))return pending.get(id);
    const job=(async()=>{
      const row=(await db.query("SELECT data FROM app_media WHERE id=?",[id])).rows[0];
      if(!row)throw new ApiError(404,"Görsel bulunamadı.");
      let variants;
      try { variants=await createDerivatives(Buffer.from(row.data,'base64')); }
      catch {throw new ApiError(422,"Görsel çözümlenemedi veya 40 megapiksel sınırını aşıyor.");}
      await db.transaction(async tx=>{if((await tx.query("SELECT id FROM app_media WHERE id=?",[id])).rows.length)await storeDerivatives(tx,id,variants);});
    })();
    pending.set(id,job);
    try {await job;}finally{pending.delete(id);}
  }
  async function backfill(body) {
    const cursor=body.cursor || '';
    if(typeof cursor!=='string'||cursor.length>100||!/^[-a-zA-Z0-9]*$/.test(cursor))throw new ApiError(422,"Geçersiz görsel sırası.");
    const rows=(await db.query("SELECT id,name FROM app_media WHERE id>? AND (SELECT COUNT(*) FROM app_media_derivatives WHERE media_id=app_media.id)<3 ORDER BY id LIMIT 6",[cursor])).rows;
    const batch=rows.slice(0,5), failures=[];
    for(const row of batch)try {await ensureDerivatives(row.id);}catch {failures.push({id:row.id,name:row.name});}
    return {processed:batch.length-failures.length,failures,cursor:batch.at(-1)?.id || cursor,done:rows.length<=5};
  }

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
    let variants;
    try { variants=await createDerivatives(data); }
    catch {throw new ApiError(422,"Görsel çözümlenemedi veya 40 megapiksel sınırını aşıyor. Başka bir görsel yükleyin.");}
    return db.transaction(async (tx) => {
      const context = await lock(tx),
        id = randomUUID(),
        now = new Date().toISOString();
      await tx.query(
        "INSERT INTO app_media (id,name,mime_type,size,data,version,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)",
        [id, name, mime, data.length, body.data, now, now],
      );
      await storeDerivatives(tx,id,variants);
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
        (context.doc.packagingItems || []).some(item => item.mediaId === id) ||
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
          "Bu görsel bir ürün, kategori veya ambalajda kullanılıyor. Önce bağlantısını kaldırın.",
          "MEDIA_IN_USE",
        );
      await tx.query("DELETE FROM app_media WHERE id=?", [id]);
      await record(tx, context, "Medya silindi", old.name, actor);
      return { ok: true };
    });
  }
  async function content(id, profile = '', request) {
    if(profile && !Object.hasOwn(imageProfiles,profile))throw new ApiError(422,"Geçersiz görsel boyutu.");
    let row;
    if(profile) {
      row=(await db.query("SELECT data FROM app_media_derivatives WHERE media_id=? AND profile=?",[id,profile])).rows[0];
      if(!row) {
        try {await ensureDerivatives(id);}
        catch(e) {if(e.status===404)throw e; /* A damaged legacy original remains available. */}
        row=(await db.query("SELECT data FROM app_media_derivatives WHERE media_id=? AND profile=?",[id,profile])).rows[0];
      }
    }
    const derivative=!!row;
    if(!row)row=(await db.query("SELECT mime_type,data FROM app_media WHERE id=?",[id])).rows[0];
    if(!row)throw new ApiError(404,"Medya bulunamadı.");
    const bytes=Buffer.from(row.data,'base64');
    return imageResponse(bytes,derivative?'image/webp':row.mime_type,request);

  }
  return { list, upload, rename, remove, content, backfill };

}
