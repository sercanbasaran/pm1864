import { createLocalizationService } from "./localization-service.js";
import { ApiError } from "./errors.js";
import { readJsonBody } from "./http/json-body.js";
import { createMediaService } from "./media-service.js";
import { openDatabase, migrate } from "./db.js";
import {
  createCatalogService,
  seedCatalog,
} from "./catalog-service.js";
import {
  checkPassword,
  cookie,
  digest,
  newSessionToken,
  readCookie,
} from "./security.js";
import { createUserService, publicUser } from "./users.js";
import { can } from "../src/permissions.js";
const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
const dummyHash = "scrypt:" + "0".repeat(32) + ":" + "0".repeat(128);
export async function createApp({ env = process.env, database } = {}) {
  const db = database || (await openDatabase(env));
  await migrate(db, seedCatalog());
  const media = createMediaService(db),
    service = createCatalogService(db),
    users = createUserService(db, env);
  const localization = createLocalizationService(db, service, env);
  await users.initialize();
  async function session(request) {
    const token = readCookie(request);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const row = (
      await db.query(
        "SELECT email, expires_at FROM app_sessions WHERE token_hash=?",
        [digest(token)],
      )
    ).rows[0];
    if (!row || Number(row.expires_at) <= Date.now()) return null;
    const user = await users.findEmail(row.email);
    return user?.active ? publicUser(user) : null;
  }
  async function issueSession(user) {
    const token = newSessionToken();
    await db.transaction(async (tx) => {
      await tx.query(
        "SELECT revision FROM app_catalog WHERE id=1" +
          (tx.dialect === "postgres" ? " FOR UPDATE" : ""),
      );
      const current = (
        await tx.query("SELECT active,version FROM app_users WHERE id=?", [
          user.id,
        ])
      ).rows[0];
      if (!current?.active || Number(current.version) !== user.version)
        throw new ApiError(
          401,
          "Hesap bilgileri değişti. Yeniden giriş yapın.",
          "UNAUTHORIZED",
        );
      await tx.query("DELETE FROM app_sessions WHERE expires_at<?", [
        Date.now(),
      ]);
      await tx.query(
        "INSERT INTO app_sessions (token_hash,email,expires_at) VALUES (?,?,?)",
        [digest(token), user.email, Date.now() + 28800000],
      );
    });
    return token;
  }
  async function handle(request) {
    try {
      const url = new URL(request.url),
        route = url.pathname
          .replace(/^\/\.netlify\/functions\/api/, "/api")
          .replace(/\/$/, ""),
        method = request.method.toUpperCase();
      if (route === "/api/health" && method === "GET")
        return json({ ok: true, service: "pm1864", database: db.dialect });
      const categoryRoute = route.match(
        /^\/api\/category-pages\/([^/]+)(?:\/images\/([a-zA-Z0-9-]+))?$/,
      );
      if (categoryRoute && method === "GET") {
        const user = await session(request);
        const allowed =
          !!user && !user.mustChangePassword && can(user, "catalog.read");
        const page = await service.categoryPage(
          decodeURIComponent(categoryRoute[1]),
          allowed,
          categoryRoute[2],
        );
        if (categoryRoute[2]) return media.content(page, url.searchParams.get("size") || "", request);
        return json({ category: page });
      }
      const productPageRoute = route.match(
        /^\/api\/product-pages\/([a-zA-Z0-9-]+)(?:\/images\/([a-zA-Z0-9-]+))?$/,
      );
      if (productPageRoute && method === "GET") {
        const user = await session(request);
        const allowed =
          !!user && !user.mustChangePassword && can(user, "catalog.read");
        const page = await service.productPage(
          productPageRoute[1],
          allowed,
          productPageRoute[2],
        );
        if (productPageRoute[2]) return media.content(page, url.searchParams.get("size") || "", request);
        return json({ product: page });
      }
      const variantPageRoute = route.match(/^\/api\/variant-pages\/([a-zA-Z0-9-]+)(?:\/images\/([a-zA-Z0-9-]+))?$/);
      if (variantPageRoute && method === "GET") {
        const user = await session(request);
        const allowed = !!user && !user.mustChangePassword && can(user, "catalog.read");
        const page = await service.variantPage(variantPageRoute[1], allowed, variantPageRoute[2]);
        if (variantPageRoute[2]) return media.content(page, url.searchParams.get("size") || "", request);
        return json({ product: page });
      }
      const publicRoute = route.match(
        /^\/api\/public\/products\/((?:P[0-9]{6,}|[0-9]{7}|[0-9]{10}))(\/image)?$/,
      );
      if (publicRoute && method === "GET") {
        if (!publicRoute[2])
          return json({ product: await service.publicCard(publicRoute[1]) });
        const product = await service.publishedProduct(publicRoute[1]);
        if (!product.mediaId)
          throw new ApiError(404, "Görsel bulunamadı.", "NOT_FOUND");
        return await media.content(product.mediaId, url.searchParams.get("size") || "", request);
      }
      if (route.startsWith("/api/public/") && method === "GET")
        throw new ApiError(
          404,
          "Ürün kartı bulunamadı veya yayından kaldırıldı.",
          "NOT_FOUND",
        );
      if (!(await users.configured()))
        throw new ApiError(
          503,
          "İlk yönetici hesabı yapılandırılmadı. ADMIN_EMAIL ve ADMIN_PASSWORD_HASH değerlerini tamamlayın.",
          "NOT_CONFIGURED",
        );
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
        request.headers.get("origin") !== (env.APP_ORIGIN || url.origin)
      )
        throw new ApiError(
          403,
          "İstek kaynağı doğrulanamadı.",
          "ORIGIN_REJECTED",
        );
      let body = {};
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const limit = ((route === "/api/media" && method === "POST") ||
          (route === "/api/profile/avatar" && method === "PUT")) ? 2900000 : 262144;
        body = await readJsonBody(request, limit);
      }

      const secure = url.protocol === "https:";
      if (route === "/api/login" && method === "POST") {
        const row = await users.findEmail(body.email),
          passwordOkay = await checkPassword(
            body.password,
            row?.password_hash || dummyHash,
          );
        if (!row?.active || !passwordOkay)
          throw new ApiError(
            401,
            "E-posta veya parola hatalı.",
            "INVALID_CREDENTIALS",
          );
        const user = publicUser(row),
          token = await issueSession(user);
        return json({ user }, 200, { "set-cookie": cookie(token, secure) });
      }
      const user = await session(request);
      if (!user)
        throw new ApiError(401, "Oturum açmanız gerekiyor.", "UNAUTHORIZED");
      if (route === "/api/session" && method === "GET") return json({ user });
      if (route === "/api/logout" && method === "POST") {
        await db.query("DELETE FROM app_sessions WHERE token_hash=?", [
          digest(readCookie(request)),
        ]);
        return json({ ok: true }, 200, {
          "set-cookie": cookie("", secure, true),
        });
      }
      if (route === "/api/password" && method === "POST") {
        const updated = await users.password(body, user);
        const token = await issueSession(updated);
        return json({ user: updated }, 200, {
          "set-cookie": cookie(token, secure),
        });
      }
      if (user.mustChangePassword)
        throw new ApiError(
          403,
          "Devam etmeden önce geçici parolanızı değiştirin.",
          "PASSWORD_CHANGE_REQUIRED",
        );
      const requirePermission = (permission) => {
        if (!can(user, permission))
          throw new ApiError(403, "Bu işlem için yetkiniz yok.", "FORBIDDEN");
      };
      if (route === "/api/catalog" && method === "GET") {
        requirePermission("catalog.read");
        return json({ catalog: await service.read() });
      }
      if (route === "/api/users" && method === "GET") {
        requirePermission("users.manage");
        return json(await users.list());
      }
      if (route === "/api/users" && method === "POST") {
        requirePermission("users.manage");
        return json({ user: await users.save(body, null, user) }, 201);
      }
      if (route === "/api/media/thumbnails" && method === "POST") {
        requirePermission("media.write");
        return json(await media.backfill(body));
      }
      if (route === "/api/media" && method === "GET") {
        requirePermission("catalog.read");
        return json(await media.list());
      }
      if (route === "/api/media" && method === "POST") {
        requirePermission("media.write");
        return json(await media.upload(body, user.email), 201);
      }
      let assetRoute = route.match(
        /^\/api\/media\/([a-zA-Z0-9-]+)(\/content)?$/,
      );
      if (assetRoute) {
        const id = assetRoute[1];
        if (assetRoute[2] && method === "GET") {
          requirePermission("catalog.read");
          return await media.content(id, url.searchParams.get("size") || "", request);
        }
        if (!assetRoute[2] && method === "PATCH") {
          requirePermission("media.write");
          return json(await media.rename(id, body, user.email));
        }
        if (!assetRoute[2] && method === "DELETE") {
          requirePermission("media.write");
          return json(await media.remove(id, body, user.email));
        }
      }
      let match;
      if (
        (match = route.match(/^\/api\/users\/([^/]+)$/)) &&
        method === "PUT"
      ) {
        requirePermission("users.manage");
        return json({
          user: await users.save(body, decodeURIComponent(match[1]), user),
        });
      }
      if (
        (match = route.match(/^\/api\/users\/([^/]+)\/password$/)) &&
        method === "POST"
      ) {
        requirePermission("users.manage");
        return json(
          await users.reset(body, decodeURIComponent(match[1]), user),
        );
      }
      if (route === "/api/preferences" && method === "PATCH")
        return json({ user: await users.preferences(body, user) });
      if (route === "/api/profile/avatar") {
        if (method === "GET") {
          if (
            url.searchParams.has("user") &&
            url.searchParams.get("user") !== user.id
          )
            throw new ApiError(404, "Profil fotoğrafı bulunamadı.");
          return await users.avatarContent(user, url.searchParams.get("size") || "", request);
        }
        if (method === "PUT" || method === "DELETE")
          return json({
            user: await users.avatar(body, user, method === "DELETE"),
          });
      }
      if (route === "/api/profile" && method === "PATCH")
        return json({ user: await users.profile(body, user) });
      let catalog;
      if (route === "/api/localization" && method === "GET") {
        requirePermission("catalog.read");
        return json(await localization.view());
      } else if (route === "/api/localization/rates" && method === "POST") {
        requirePermission("settings.write");
        catalog = await localization.rates(body, user.email);
      } else if (route === "/api/localization/translate" && method === "POST") {
        requirePermission("products.write");
        catalog = await localization.translate(body, user.email);
      } else if ((match = route.match(/^\/api\/regional-definitions\/(currencies|languages)\/([a-zA-Z-]+)$/)) && method === "PUT") {
        requirePermission("settings.write");
        catalog = await service.saveRegionalDefinition(body, match[2], match[1], user.email);
      } else if ((match = route.match(/^\/api\/managed-channels\/(stores|digital-stores|food-platforms)(?:\/([a-zA-Z0-9-]+))?$/)) && ["POST", "PUT", "DELETE"].includes(method)) {
        requirePermission("settings.write");
        if ((method === "POST") === !!match[2]) throw new ApiError(405, "Geçersiz kanal işlemi.");
        catalog = await service.manageChannel(body, match[2], match[1], method, user.email);
      } else if (route === "/api/consumables" && method === "POST") {
        requirePermission("settings.write");
        catalog = await service.saveConsumable(body, null, user.email);
      } else if (
        (match = route.match(/^\/api\/consumables\/([^/]+)$/)) &&
        method === "PUT"
      ) {
        requirePermission("settings.write");
        catalog = await service.saveConsumable(
          body,
          decodeURIComponent(match[1]),
          user.email,
        );
      } else if (route === "/api/satiety-products" && method === "POST") {
        requirePermission("settings.write");
        catalog = await service.saveSatietyProduct(body, null, user.email);
      } else if (
        (match = route.match(/^\/api\/satiety-products\/([^/]+)$/)) &&
        method === "PUT"
      ) {
        requirePermission("settings.write");
        catalog = await service.saveSatietyProduct(
          body,
          decodeURIComponent(match[1]),
          user.email,
        );
      } else if (route === "/api/packaging" && method === "POST") {
        requirePermission("products.write");
        catalog = await service.savePackaging(body, null, user.email);
      } else if ((match = route.match(/^\/api\/packaging\/([^/]+)$/)) && method === "PUT") {
        requirePermission("products.write");
        catalog = await service.savePackaging(body, decodeURIComponent(match[1]), user.email);
      } else if ((match = route.match(/^\/api\/packaging\/([^/]+)$/)) && method === "DELETE") {
        requirePermission("products.write");
        catalog = await service.removePackaging(body, decodeURIComponent(match[1]), user.email);
      } else if (route === "/api/variant-types" && method === "POST") {
        requirePermission("products.write");
        catalog = await service.addVariantType(body, user.email);
      } else if (
        (match = route.match(/^\/api\/variant-types\/([^/]+)$/)) &&
        method === "DELETE"
      ) {
        requirePermission("products.write");
        catalog = await service.removeVariantType(
          body,
          decodeURIComponent(match[1]),
          user.email,
        );
      } else if (
        (match = route.match(/^\/api\/categories\/([^/]+)\/promote$/)) &&
        method === "POST"
      ) {
        requirePermission("categories.write");
        catalog = await service.promoteCategory(
          body,
          decodeURIComponent(match[1]),
          user.email,
        );
      } else if (route === "/api/categories" && method === "POST") {
        requirePermission("categories.write");
        catalog = await service.saveCategory(body, null, user.email);
      } else if (
        (match = route.match(/^\/api\/categories\/([^/]+)$/)) &&
        method === "PUT"
      ) {
        requirePermission("categories.write");
        catalog = await service.saveCategory(
          body,
          decodeURIComponent(match[1]),
          user.email,
        );
      } else if (route === "/api/products/bulk" && method === "POST") {
        if (body.changes?.channels !== undefined || body.changes?.unit !== undefined) requirePermission("products.write");
        if (body.changes?.price !== undefined) requirePermission("prices.write");
        catalog = await service.bulkProducts(body, user.email);
      } else if (route === "/api/products" && method === "POST") {
        requirePermission("products.write");
        catalog = await service.saveProduct(body, null, user.email);
      } else if (
        (match = route.match(/^\/api\/products\/(\d+)$/)) &&
        method === "PUT"
      ) {
        requirePermission("products.write");
        catalog = await service.saveProduct(body, match[1], user.email);
      } else if (
        (match = route.match(/^\/api\/products\/(\d+)\/card$/)) &&
        method === "PATCH"
      ) {
        requirePermission("products.write");
        catalog = await service.publishCard(body, match[1], user.email);
      } else if ((match = route.match(/^\/api\/variants\/([a-zA-Z0-9-]+)\/card$/)) && method === "PATCH") {
        requirePermission("products.write");
        catalog = await service.publishVariantCard(body, match[1], user.email);
      } else if ((match = route.match(/^\/api\/variants\/([a-zA-Z0-9-]+)$/)) && method === "DELETE") {
        requirePermission("products.write");
        catalog = await service.deleteVariant(body, match[1], user.email);
      } else if (route === "/api/prices/bulk" && method === "POST") {
        requirePermission("prices.write");
        catalog = await service.bulk(body, user.email);
      } else if (
        (match = route.match(/^\/api\/prices\/products\/(\d+)$/)) &&
        method === "PATCH"
      ) {
        requirePermission("prices.write");
        catalog = await service.prices(body, match[1], user.email);
      } else if (route === "/api/settings" && method === "PATCH") {
        requirePermission("settings.write");
        catalog = await service.settings(body, user.email);
      } else
        throw new ApiError(
          404,
          "API yolu veya metodu bulunamadı.",
          "NOT_FOUND",
        );
      return json({ catalog });
    } catch (e) {
      if (e instanceof ApiError)
        return json({ error: { code: e.code, message: e.message } }, e.status);
      console.error("pm1864 API error:", e.code || e.name);
      return json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Sunucu işlemi tamamlayamadı. Yeniden deneyin.",
          },
        },
        500,
      );
    }
  }
  return { handle, service, media, users, db, close: () => db.close() };
}
let instance;
export async function getApp() {
  if (!instance)
    instance = createApp().catch((e) => {
      instance = null;
      throw e;
    });
  return instance;
}
export async function handler(request) {
  try {
    return await (await getApp()).handle(request);
  } catch (e) {
    console.error("pm1864 initialization:", e.code || e.name);
    return json(
      {
        error: {
          code: "NOT_CONFIGURED",
          message:
            "Veritabanı bağlantısı kurulamadı. DATABASE_URL ve ilk yönetici ayarlarını kontrol edin.",
        },
      },
      503,
    );
  }
}
