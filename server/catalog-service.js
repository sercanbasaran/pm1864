import {
  salesAvailability,
  effectiveSales,
} from "../src/sales-availability.js";
import {
  productCardCode,
  productCardEligible,
  productCardData,
} from "../src/product-card.js";
import {
  productInformationFields,
  validateProductInformation,
} from "../src/product-information.js";
import {
  categoryOf,
  rootOf,
  defaultSubcategory,
  upgradeHierarchy,
  selectable,
} from "../src/hierarchy.js";
import { bulkPrice } from "../src/catalog-tools.js";
import { randomUUID } from "node:crypto";
import { slugify, validateCategory, validateProduct } from "../src/catalog.js";
export class ApiError extends Error {
  constructor(status, message, code = "REQUEST_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const seedCatalog = () => ({
  categories: [
    ["Baklavalar", "100"],
    ["Lokumlar", "200"],
    ["Kadayıflar", "300"],
    ["Çikolata & Draje", "400"],
    ["Kahve & Çay", "800"],
  ].map(([name, code]) => ({
    id: "cat-" + code,
    name,
    code,
    slug: slugify(name),
    description: "",
    parentId: "",
    active: true,
  })),
  products: [],
  logs: [],
  settings: { skuPrefix: "HM" },
  nextProductId: 1,
});
const text = (v, max = 200) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
export function publicCatalog(doc, revision) {
  return {
    revision,
    categories: doc.categories,
    products: doc.products.map(
      ({ channels, channelVersions, dirty, ...p }) => ({
        ...p,
        salesAvailability: salesAvailability(p.salesAvailability),
        effectiveSales: effectiveSales(p),
        variants: p.variants.map((v) => ({
          ...v,
          salesAvailability: salesAvailability(
            v.salesAvailability,
            undefined,
            true,
          ),
          effectiveSales: effectiveSales(p, v),
        })),
        productCode: p.productCode || `P${String(p.id).padStart(6, "0")}`,
      }),
    ),
    logs: doc.logs,
    settings: { skuPrefix: doc.settings.skuPrefix },
  };
}
export function audit(doc, title, detail, actor) {
  doc.logs.unshift({
    id: randomUUID(),
    title,
    detail,
    actor,
    time: new Date().toISOString(),
    type: "info",
  });
  doc.logs = doc.logs.slice(0, 1000);
}
export function createCatalogService(db) {
  async function read() {
    return db.transaction(async (tx) => {
      const row = (
        await tx.query("SELECT revision, document FROM app_catalog WHERE id=1")
      ).rows[0];
      return publicCatalog(JSON.parse(row.document), Number(row.revision));
    });
  }
  async function mutate(expected, actor, fn) {
    return db.transaction(async (tx) => {
      const row = (
        await tx.query(
          "SELECT revision, document FROM app_catalog WHERE id=1" +
            (tx.dialect === "postgres" ? " FOR UPDATE" : ""),
        )
      ).rows[0];
      if (!Number.isInteger(expected) || Number(row.revision) !== expected)
        throw new ApiError(
          409,
          "Katalog başka bir işlemde güncellendi. Verileri yenileyip yeniden deneyin.",
          "REVISION_CONFLICT",
        );
      const doc = JSON.parse(row.document);
      await fn(doc, tx);
      upgradeHierarchy(doc);
      const document = JSON.stringify(doc);
      if (document === row.document)
        return publicCatalog(doc, Number(row.revision));
      const revision = Number(row.revision) + 1;
      await tx.query(
        "UPDATE app_catalog SET revision=?, document=? WHERE id=1 AND revision=?",
        [revision, document, Number(row.revision)],
      );
      return publicCatalog(doc, revision);
    });
  }
  async function saveCategory(body, id, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      const old = id ? doc.categories.find((c) => c.id === id) : null;
      if (id && !old) throw new ApiError(404, "Kategori bulunamadı.");
      const input = body.category || {},
        c = {
          id: old?.id || randomUUID(),
          name: text(input.name, 70),
          code: old?.code || text(input.code, 20),
          slug: slugify(text(input.slug, 100)),
          description: text(input.description, 400),
          parentId: text(input.parentId, 100),
          active: input.active !== false,
        };
      if (
        old?.parentId &&
        !c.parentId &&
        doc.products.some((p) => p.categoryId === old.id)
      )
        throw new ApiError(
          422,
          "Ürün bağlı alt kategori ana kategoriye dönüştürülemez.",
        );
      const error = validateCategory(c, doc.categories);
      if (error) throw new ApiError(422, error);
      if (old) {
        doc.categories = doc.categories.map((o) => (o.id === id ? c : o));
        if (c.name !== old.name)
          for (const p of doc.products.filter(
            (p) =>
              p.categoryId === old.id ||
              (!p.categoryId && p.category === old.name),
          )) {
            p.category = c.name;
            p.version++;
            p.updated = new Date().toISOString();
          }
      } else doc.categories.push(c);
      audit(
        doc,
        old ? "Kategori güncellendi" : "Kategori oluşturuldu",
        `${c.name} · ${c.code}`,
        actor,
      );
    });
  }
  async function saveProduct(body, id, actor) {
    return mutate(body.expectedRevision, actor, async (doc, tx) => {
      const old = id ? doc.products.find((p) => p.id === Number(id)) : null;
      if (id && !old) throw new ApiError(404, "Ürün bulunamadı.");
      const input = body.product || {};
      const informationError = validateProductInformation(input);
      if (informationError) throw new ApiError(422, informationError);
      const information = Object.fromEntries(
        productInformationFields.map((f) => [
          f.key,
          text(
            input[f.key] === undefined ? old?.[f.key] : input[f.key],
            f.maxLength,
          ),
        ]),
      );
      if (Array.isArray(input.variants) && input.variants.length > 50)
        throw new ApiError(422, "Bir üründe en fazla 50 varyant olabilir.");
      if (
        Array.isArray(input.variants) &&
        input.variants.some(
          (v) => !v || typeof v !== "object" || Array.isArray(v),
        )
      )
        throw new ApiError(422, "Geçersiz varyant verisi.");
      let c = input.categoryId
        ? doc.categories.find((c) => c.id === input.categoryId)
        : doc.categories.find((c) => c.name === input.category);
      if (input.categoryId && !c)
        throw new ApiError(422, "Alt kategori bulunamadı.");
      if (c && !c.parentId) {
        if (input.categoryId)
          throw new ApiError(422, "Ürün için bir alt kategori seçin.");
        c = defaultSubcategory(doc, c);
      }
      if (!c) throw new ApiError(422, "Alt kategori seçin.");
      if ((!old || old.categoryId !== c.id) && !selectable(c, doc.categories))
        throw new ApiError(
          422,
          "Aktif bir ana kategori ve alt kategori seçin.",
        );
      const productId = old?.id || doc.nextProductId,
        p = {
          id: productId,
          name: text(input.name, 160),
          category: c.name,
          categoryId: c.id,
          mediaId: text(input.mediaId, 100),
          description: text(input.description, 4000),
          ...information,
          salesAvailability: input.salesAvailability,
          status: input.status === "Aktif" ? "Aktif" : "Taslak",
          customImage: text(input.customImage, 2000),
          image: Number.isInteger(input.image) ? input.image : 0,
          variants: Array.isArray(input.variants)
            ? input.variants
                .slice(0, 50)
                .map((v) => ({
                  id: v.id,
                  size: text(v.size, 30),
                  price: v.price,
                  weight: v.weight,
                  salesAvailability: v.salesAvailability,
                  unit:
                    v.unit ??
                    old?.variants.find((o) => o.id === v.id)?.unit ??
                    "Adet",
                  packaging:
                    v.packaging ??
                    old?.variants.find((o) => o.id === v.id)?.packaging ??
                    "",
                  slices: v.slices,
                  active: v.active !== false,
                }))
            : [],
          isNew: !old,
        };
      if (p.mediaId) {
        const asset = (
          await tx.query("SELECT id FROM app_media WHERE id=?", [p.mediaId])
        ).rows[0];
        if (!asset) throw new ApiError(422, "Seçili medya bulunamadı.");
        p.customImage = "/api/media/" + asset.id + "/content";
      }
      if (p.customImage && !p.mediaId) {
        let url;
        try {
          url = new URL(p.customImage);
        } catch {
          throw new ApiError(422, "Geçerli bir görsel URL’si girin.");
        }
        if (!["http:", "https:"].includes(url.protocol))
          throw new ApiError(422, "Görsel URL’si HTTP veya HTTPS olmalı.");
      }
      const error = validateProduct(p, doc.categories);
      if (error) throw new ApiError(422, error.message);
      p.salesAvailability = salesAvailability(
        p.salesAvailability,
        old?.salesAvailability,
      );
      p.variants = p.variants.map((v) => ({
        ...v,
        salesAvailability: salesAvailability(
          v.salesAvailability,
          old?.variants.find((o) => o.id === v.id)?.salesAvailability,
          true,
        ),
      }));
      if (
        p.variants.some(
          (v) => v.price > 1e8 || v.weight > 1e7 || v.slices > 1e5,
        )
      )
        throw new ApiError(
          422,
          "Varyant değerleri izin verilen sınırı aşıyor.",
        );
      delete p.isNew;
      p.productCode =
        old?.productCode || `P${String(productId).padStart(6, "0")}`;
      p.sku =
        old?.sku ||
        `${doc.settings.skuPrefix}-${rootOf(c, doc.categories).code}-${String(productId).padStart(4, "0")}`;
      let next = old?.nextVariantNumber || 1;
      const seen = new Set();
      p.variants = p.variants.map((v) => {
        let previous = v.id
          ? old?.variants.find((o) => o.id === v.id)
          : old?.variants.find(
              (o) =>
                o.size.toLocaleLowerCase("tr") ===
                v.size.toLocaleLowerCase("tr"),
            );
        if (v.id && !previous)
          throw new ApiError(422, "Varyant bu ürüne ait değil.");
        if (previous && seen.has(previous.id))
          throw new ApiError(422, "Aynı varyant birden fazla gönderilemez.");
        if (previous) seen.add(previous.id);
        return {
          ...v,
          id: previous?.id || randomUUID(),
          sku: previous?.sku || `${p.sku}-V${String(next++).padStart(4, "0")}`,
        };
      });
      p.publicCardEnabled = old?.publicCardEnabled === true;
      p.nextVariantNumber = next;
      p.version = (old?.version || 0) + 1;
      p.updated = new Date().toISOString();
      if (old)
        doc.products = doc.products.map((o) => (o.id === old.id ? p : o));
      else {
        doc.products.unshift(p);
        doc.nextProductId++;
      }
      audit(
        doc,
        old ? "Ürün güncellendi" : "Ürün oluşturuldu",
        `${p.name} · ${p.sku}`,
        actor,
      );
    });
  }
  async function bulk(body, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      const { ids, percent, direction } = body;
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        ids.length > 2000 ||
        !Number.isFinite(percent) ||
        percent <= 0 ||
        percent > 1000 ||
        !["increase", "decrease"].includes(direction) ||
        (direction === "decrease" && percent >= 100)
      )
        throw new ApiError(422, "Geçersiz toplu fiyat güncellemesi.");
      const selected = doc.products.filter((p) => ids.includes(p.id));
      if (selected.length !== new Set(ids).size)
        throw new ApiError(422, "Seçili ürünlerin bir kısmı bulunamadı.");
      if (
        selected.some((p) =>
          p.variants.some((v) => bulkPrice(v.price, percent, direction) > 1e8),
        )
      )
        throw new ApiError(
          422,
          "Güncellenen fiyat izin verilen üst sınırı aşıyor.",
        );
      for (const p of selected) {
        p.variants = p.variants.map((v) => ({
          ...v,
          price: bulkPrice(v.price, percent, direction),
        }));
        p.version++;
        p.updated = new Date().toISOString();
      }
      audit(
        doc,
        "Toplu fiyat güncellemesi",
        `${selected.length} ürün · %${percent} ${direction === "increase" ? "artış" : "indirim"}`,
        actor,
      );
    });
  }
  async function settings(body, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      const s = body.settings;
      if (
        !s ||
        typeof s.skuPrefix !== "string" ||
        !/^[A-Z0-9]{1,8}$/.test(s.skuPrefix)
      )
        throw new ApiError(422, "1–8 karakter SKU öneki gerekli.");
      doc.settings = { skuPrefix: s.skuPrefix };
      audit(
        doc,
        "Katalog ayarları güncellendi",
        `SKU öneki: ${s.skuPrefix}`,
        actor,
      );
    });
  }
  async function prices(body, id, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      const product = doc.products.find((p) => p.id === Number(id));
      if (!product) throw new ApiError(404, "Ürün bulunamadı.");
      if (
        !Array.isArray(body.prices) ||
        body.prices.length !== product.variants.length ||
        body.prices.some(
          (v) =>
            !Number.isFinite(v) ||
            v <= 0 ||
            v > 1e8 ||
            Math.abs(v * 100 - Math.round(v * 100)) > 0.00001,
        )
      )
        throw new ApiError(
          422,
          "Her varyant için en fazla iki ondalık basamaklı, pozitif fiyat girin.",
        );
      if (product.variants.every((v, i) => v.price === body.prices[i])) return;
      const before = product.variants
        .map((v) => `${v.size}: ${v.price}`)
        .join(", ");
      product.variants = product.variants.map((v, i) => ({
        ...v,
        price: body.prices[i],
      }));
      product.version++;
      product.updated = new Date().toISOString();
      audit(
        doc,
        "Varyant fiyatları güncellendi",
        `${product.name} · ${before} → ${product.variants.map((v) => `${v.size}: ${v.price}`).join(", ")} TRY`,
        actor,
      );
    });
  }
  async function publishedProduct(code) {
    const catalog = await read(),
      product = catalog.products.find((p) => productCardCode(p) === code);
    if (
      !product ||
      product.publicCardEnabled !== true ||
      !productCardEligible(product, catalog.categories)
    )
      throw new ApiError(
        404,
        "Ürün kartı bulunamadı veya yayından kaldırıldı.",
        "NOT_FOUND",
      );
    return product;
  }
  async function publicCard(code) {
    const catalog = await read(),
      product = catalog.products.find((p) => productCardCode(p) === code);
    if (
      !product ||
      product.publicCardEnabled !== true ||
      !productCardEligible(product, catalog.categories)
    )
      throw new ApiError(
        404,
        "Ürün kartı bulunamadı veya yayından kaldırıldı.",
        "NOT_FOUND",
      );
    const image = product.mediaId
      ? "/api/public/products/" + encodeURIComponent(code) + "/image"
      : /^https?:\/\//i.test(product.customImage || "")
        ? product.customImage
        : "";
    return productCardData(product, catalog.categories, image);
  }
  async function publishCard(body, id, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      const product = doc.products.find((p) => p.id === Number(id));
      if (!product) throw new ApiError(404, "Ürün bulunamadı.");
      if (typeof body.enabled !== "boolean")
        throw new ApiError(422, "Kartın yayın durumunu belirtin.");
      if (body.enabled && !productCardEligible(product, doc.categories))
        throw new ApiError(
          422,
          "Yayınlamak için ürün, ana kategori ve alt kategori aktif olmalı; en az bir aktif varyant bulunmalıdır.",
        );
      if ((product.publicCardEnabled === true) === body.enabled) return;
      product.publicCardEnabled = body.enabled;
      product.version++;
      product.updated = new Date().toISOString();
      audit(
        doc,
        body.enabled
          ? "Ürün kartı yayınlandı"
          : "Ürün kartı yayından kaldırıldı",
        `${product.name} · ${productCardCode(product)}`,
        actor,
      );
    });
  }
  return {
    read,
    mutate,
    saveCategory,
    saveProduct,
    bulk,
    settings,
    prices,
    publishedProduct,
    publicCard,
    publishCard,
  };
}
