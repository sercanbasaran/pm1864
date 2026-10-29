import {imageResponse} from "./image-response.js";
import {createDerivatives} from "./image-derivatives.js";
import { decodeImageUpload } from "./media-service.js";
import { randomUUID } from "node:crypto";
import { roles, roleFor, can } from "../src/permissions.js";
import { hashPassword, checkPassword } from "./security.js";
import { audit } from "./audit.js";
import { ApiError } from "./errors.js";
export const publicUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  theme: row.theme === "dark" ? "dark" : "light",
  avatarUrl:
    Number(row.avatar_version) > 0
      ? "/api/profile/avatar?user=" +
        encodeURIComponent(row.id) +
        "&v=" +
        Number(row.avatar_version)
      : "",
  active: !!row.active,
  mustChangePassword: !!row.must_change_password,
  version: Number(row.version),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  permissions: roleFor(row.role)?.permissions || [],
});
const emailOf = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (email) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validHash = (hash) =>
  /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash || "");
export function createUserService(db, env) {
  const lock = async (tx) => {
    await tx.query(
      "SELECT revision FROM app_catalog WHERE id=1" +
        (tx.dialect === "postgres" ? " FOR UPDATE" : ""),
    );
  };
  async function initialize() {
    await db.transaction(async (tx) => {
      await lock(tx);
      const count = Number(
        (await tx.query("SELECT COUNT(*) AS total FROM app_users")).rows[0]
          .total,
      );
      if (
        !count &&
        validEmail(emailOf(env.ADMIN_EMAIL)) &&
        validHash(env.ADMIN_PASSWORD_HASH)
      ) {
        const now = new Date().toISOString();
        await tx.query(
          "INSERT INTO app_users (id,email,name,role,password_hash,active,must_change_password,version,created_at,updated_at) VALUES (?,?,?,?,?,1,0,1,?,?)",
          [
            randomUUID(),
            emailOf(env.ADMIN_EMAIL),
            env.ADMIN_NAME || "Sistem Yöneticisi",
            "admin",
            env.ADMIN_PASSWORD_HASH,
            now,
            now,
          ],
        );
      }
    });
  }
  async function findEmail(email) {
    return (
      (
        await db.query("SELECT * FROM app_users WHERE email=?", [
          emailOf(email),
        ])
      ).rows[0] || null
    );
  }
  async function configured() {
    return (
      Number(
        (await db.query("SELECT COUNT(*) AS total FROM app_users")).rows[0]
          .total,
      ) > 0
    );
  }
  async function list() {
    return {
      users: (
        await db.query("SELECT * FROM app_users ORDER BY created_at, email")
      ).rows.map(publicUser),
      roles,
    };
  }
  async function record(tx, title, detail, actor) {
    const row = (
      await tx.query("SELECT revision, document FROM app_catalog WHERE id=1")
    ).rows[0];
    const doc = JSON.parse(row.document);
    audit(doc, title, detail, actor.email);
    await tx.query("UPDATE app_catalog SET revision=?,document=? WHERE id=1", [
      Number(row.revision) + 1,
      JSON.stringify(doc),
    ]);
  }
  async function requireAdmin(tx, actor) {
    const current = (
      await tx.query("SELECT * FROM app_users WHERE id=?", [actor.id])
    ).rows[0];
    if (!current?.active || !can(current, "users.manage"))
      throw new ApiError(403, "Kullanıcı yönetimi yetkiniz yok.", "FORBIDDEN");
  }
  async function save(body, id, actor) {
    return db.transaction(async (tx) => {
      await lock(tx);
      await requireAdmin(tx, actor);
      const old = id
        ? (await tx.query("SELECT * FROM app_users WHERE id=?", [id])).rows[0]
        : null;
      if (id && !old) throw new ApiError(404, "Kullanıcı bulunamadı.");
      if (old && Number(old.version) !== body.expectedVersion)
        throw new ApiError(
          409,
          "Kullanıcı başka bir işlemde değişti. Listeyi yenileyin.",
          "USER_CONFLICT",
        );
      const input = body.user || {},
        email = emailOf(input.email),
        name = typeof input.name === "string" ? input.name.trim() : "",
        role = input.role,
        active = input.active !== false;
      if (!validEmail(email) || !name || name.length > 100 || !roleFor(role))
        throw new ApiError(422, "Geçerli ad, e-posta ve rol gerekli.");
      const duplicate = (
        await tx.query("SELECT id FROM app_users WHERE email=?", [email])
      ).rows[0];
      if (duplicate && duplicate.id !== id)
        throw new ApiError(422, "Bu e-posta adresi kullanılıyor.");
      if (old?.id === actor.id && (!active || role !== old.role))
        throw new ApiError(
          409,
          "Kendi hesabınızın rolünü değiştiremez veya hesabınızı pasifleştiremezsiniz.",
        );
      if (
        old?.role === "admin" &&
        old.active &&
        (!active || role !== "admin")
      ) {
        const count = Number(
          (
            await tx.query(
              "SELECT COUNT(*) AS total FROM app_users WHERE role='admin' AND active=1",
            )
          ).rows[0].total,
        );
        if (count <= 1)
          throw new ApiError(409, "Son aktif yönetici kaldırılamaz.");
      }
      const now = new Date().toISOString();
      let userId = old?.id || randomUUID();
      if (old) {
        await tx.query(
          "UPDATE app_users SET email=?,name=?,role=?,active=?,version=?,updated_at=? WHERE id=?",
          [email, name, role, active ? 1 : 0, Number(old.version) + 1, now, id],
        );
        if (old.email !== email || old.role !== role || !active)
          await tx.query("DELETE FROM app_sessions WHERE email=?", [old.email]);
      } else {
        if (
          typeof input.password !== "string" ||
          input.password.length < 12 ||
          input.password.length > 512
        )
          throw new ApiError(422, "Geçici parola 12–512 karakter olmalı.");
        const hash = await hashPassword(input.password);
        await tx.query(
          "INSERT INTO app_users (id,email,name,role,password_hash,active,must_change_password,version,created_at,updated_at) VALUES (?,?,?,?,?,?,1,1,?,?)",
          [userId, email, name, role, hash, active ? 1 : 0, now, now],
        );
      }
      await record(
        tx,
        old ? "Kullanıcı güncellendi" : "Kullanıcı oluşturuldu",
        `${name} · ${email} · ${roleFor(role).name}`,
        actor,
      );
      return publicUser(
        (await tx.query("SELECT * FROM app_users WHERE id=?", [userId]))
          .rows[0],
      );
    });
  }
  async function reset(body, id, actor) {
    return db.transaction(async (tx) => {
      await lock(tx);
      await requireAdmin(tx, actor);
      const old = (await tx.query("SELECT * FROM app_users WHERE id=?", [id]))
        .rows[0];
      if (!old) throw new ApiError(404, "Kullanıcı bulunamadı.");
      if (id === actor.id)
        throw new ApiError(
          422,
          "Kendi parolanızı Hesabım bölümünden değiştirin.",
        );
      if (body.expectedVersion !== Number(old.version))
        throw new ApiError(409, "Kullanıcı değişti. Listeyi yenileyin.");
      if (
        typeof body.password !== "string" ||
        body.password.length < 12 ||
        body.password.length > 512
      )
        throw new ApiError(422, "Geçici parola 12–512 karakter olmalı.");
      const hash = await hashPassword(body.password);
      await tx.query(
        "UPDATE app_users SET password_hash=?,must_change_password=1,version=?,updated_at=? WHERE id=?",
        [hash, Number(old.version) + 1, new Date().toISOString(), id],
      );
      await tx.query("DELETE FROM app_sessions WHERE email=?", [old.email]);
      await record(tx, "Kullanıcı parolası sıfırlandı", old.email, actor);
      return { ok: true };
    });
  }
  async function password(body, actor) {
    return db.transaction(async (tx) => {
      await lock(tx);
      const old = (
        await tx.query("SELECT * FROM app_users WHERE id=?", [actor.id])
      ).rows[0];
      if (
        !old?.active ||
        !(await checkPassword(body.currentPassword, old.password_hash))
      )
        throw new ApiError(422, "Mevcut parola hatalı.");
      if (
        typeof body.newPassword !== "string" ||
        body.newPassword.length < 12 ||
        body.newPassword.length > 512
      )
        throw new ApiError(422, "Yeni parola 12–512 karakter olmalı.");
      if (body.newPassword === body.currentPassword)
        throw new ApiError(422, "Yeni parola mevcut paroladan farklı olmalı.");
      const hash = await hashPassword(body.newPassword);
      await tx.query(
        "UPDATE app_users SET password_hash=?,must_change_password=0,version=?,updated_at=? WHERE id=?",
        [hash, Number(old.version) + 1, new Date().toISOString(), old.id],
      );
      await tx.query("DELETE FROM app_sessions WHERE email=?", [old.email]);
      await record(tx, "Hesap parolası değiştirildi", old.email, actor);
      return publicUser(
        (await tx.query("SELECT * FROM app_users WHERE id=?", [old.id]))
          .rows[0],
      );
    });
  }
  async function profile(body, actor) {
    return db.transaction(async (tx) => {
      await lock(tx);
      const old = (
        await tx.query("SELECT * FROM app_users WHERE id=?", [actor.id])
      ).rows[0];
      if (!old?.active)
        throw new ApiError(401, "Oturum açmanız gerekiyor.", "UNAUTHORIZED");
      if (body.expectedVersion !== Number(old.version))
        throw new ApiError(
          409,
          "Profiliniz başka bir işlemde güncellendi. Sayfayı yenileyin.",
          "USER_CONFLICT",
        );
      const name =
        typeof body.name === "string"
          ? body.name.trim().replace(/\s+/g, " ")
          : "";
      if (!name || name.length > 100)
        throw new ApiError(422, "Ad soyad 1–100 karakter olmalıdır.");
      await tx.query(
        "UPDATE app_users SET name=?,version=?,updated_at=? WHERE id=?",
        [name, Number(old.version) + 1, new Date().toISOString(), old.id],
      );
      await record(tx, "Profil güncellendi", name, actor);
      return publicUser(
        (await tx.query("SELECT * FROM app_users WHERE id=?", [old.id]))
          .rows[0],
      );
    });
  }
  async function preferences(body, actor) {
    return db.transaction(async (tx) => {
      await lock(tx);
      const old = (
        await tx.query("SELECT * FROM app_users WHERE id=?", [actor.id])
      ).rows[0];
      if (!old?.active)
        throw new ApiError(401, "Oturum açmanız gerekiyor.", "UNAUTHORIZED");
      if (body.expectedVersion !== Number(old.version))
        throw new ApiError(
          409,
          "Hesap bilgileriniz değişti. Sayfayı yenileyin.",
          "USER_CONFLICT",
        );
      if (!["light", "dark"].includes(body.theme))
        throw new ApiError(422, "Açık veya koyu tema seçin.");
      if (body.theme !== old.theme) {
        await tx.query(
          "UPDATE app_users SET theme=?,version=?,updated_at=? WHERE id=?",
          [
            body.theme,
            Number(old.version) + 1,
            new Date().toISOString(),
            old.id,
          ],
        );
        await record(
          tx,
          "Görünüm tercihi güncellendi",
          body.theme === "dark" ? "Koyu tema" : "Açık tema",
          actor,
        );
      }
      return publicUser(
        (await tx.query("SELECT * FROM app_users WHERE id=?", [old.id]))
          .rows[0],
      );
    });
  }
  async function avatar(body, actor, remove = false) {
    let thumbnail;
    if (!remove) {
      const data=decodeImageUpload(body);
      try {thumbnail=(await createDerivatives(data,['thumb']))[0];}
      catch {throw new ApiError(422,"Profil görseli çözümlenemedi veya 40 megapiksel sınırını aşıyor.");}
    }
    return db.transaction(async (tx) => {
      await lock(tx);
      const old = (
        await tx.query("SELECT * FROM app_users WHERE id=?", [actor.id])
      ).rows[0];
      if (!old?.active)
        throw new ApiError(401, "Oturum açmanız gerekiyor.", "UNAUTHORIZED");
      if (body.expectedVersion !== Number(old.version))
        throw new ApiError(
          409,
          "Profiliniz başka bir işlemde güncellendi. Sayfayı yenileyin.",
          "USER_CONFLICT",
        );
      if (remove && !Number(old.avatar_version)) return publicUser(old);
      if (remove)
        await tx.query("DELETE FROM app_user_avatars WHERE user_id=?", [
          old.id,
        ]);
      else
        await tx.query(
          "INSERT INTO app_user_avatars (user_id,mime_type,data) VALUES (?,?,?) ON CONFLICT (user_id) DO UPDATE SET mime_type=excluded.mime_type,data=excluded.data",
          [old.id, body.mimeType, body.data],
        );
      const version = Number(old.version) + 1;
      await tx.query(
        "UPDATE app_users SET avatar_version=?,version=?,updated_at=? WHERE id=?",
        [remove ? 0 : version, version, new Date().toISOString(), old.id],
      );
      if (!remove) await tx.query("INSERT INTO app_user_avatar_thumbnails (user_id,version,data) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET version=excluded.version,data=excluded.data",[old.id,version,thumbnail.data]);
      await record(
        tx,
        remove ? "Profil fotoğrafı kaldırıldı" : "Profil fotoğrafı güncellendi",
        old.name,
        actor,
      );
      return publicUser(
        (await tx.query("SELECT * FROM app_users WHERE id=?", [old.id]))
          .rows[0],
      );
    });
  }
  async function avatarContent(actor, size = '', request) {
    const url=request && new URL(request.url);
    const versioned=!!url?.searchParams.get('v') && !!url?.searchParams.get('user');
    if (size && size !== 'thumb') throw new ApiError(422,"Geçersiz profil görseli boyutu.");
    if (size === 'thumb') {
      let cached=(await db.query("SELECT t.data FROM app_user_avatar_thumbnails t JOIN app_users u ON u.id=t.user_id WHERE t.user_id=? AND t.version=u.avatar_version",[actor.id])).rows[0];
      if(!cached) {
        const original=(await db.query("SELECT a.data,u.avatar_version FROM app_user_avatars a JOIN app_users u ON u.id=a.user_id WHERE a.user_id=?",[actor.id])).rows[0];
        if(original)try {
          const derivative=(await createDerivatives(Buffer.from(original.data,'base64'),['thumb']))[0];
          await db.query("INSERT INTO app_user_avatar_thumbnails (user_id,version,data) SELECT id,?,? FROM app_users WHERE id=? AND avatar_version=? ON CONFLICT(user_id) DO UPDATE SET version=excluded.version,data=excluded.data",[original.avatar_version,derivative.data,actor.id,original.avatar_version]);
          cached=derivative;
        }catch {}
      }
      if(cached)return imageResponse(Buffer.from(cached.data,'base64'),'image/webp',request,{versioned});
    }
    const row = (
      await db.query(
        "SELECT mime_type,data FROM app_user_avatars WHERE user_id=?",
        [actor.id],
      )
    ).rows[0];
    if (!row) throw new ApiError(404, "Profil fotoğrafı bulunamadı.");
    return imageResponse(Buffer.from(row.data,"base64"),row.mime_type,request,{versioned});

  }
  return {
    initialize,
    findEmail,
    configured,
    list,
    save,
    reset,
    password,
    profile,
    preferences,
    avatar,
    avatarContent,
  };
}
