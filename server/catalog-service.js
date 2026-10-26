import { categoryPromotion } from "../src/modules/categories/category-promotion.js";
import {
  productSlug,
  PRODUCT_IDENTITY_VERSION,
} from "../src/product-identity.js";
import {
  SKU_PREFIX,
  SKU_SCHEMA_VERSION,
  displaySku,
  allocateProductCode,
} from "../src/sku.js";
import { defaultVariantTypes } from "../src/variant-types.js";
import {
  salesAvailability,
  effectiveSales,
  categorySalesAvailability,
  validateSalesAvailability,
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
  upgradeHierarchy,
  selectable,
} from "../src/hierarchy.js";
import { bulkPrice } from "../src/catalog-tools.js";
import { randomUUID } from "node:crypto";
import {
  slugify,
  normalizeName,
  validateCategory,
  validateProduct,
} from "../src/catalog.js";
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
    code: code.padStart(4, "0"),
    slug: slugify(name),
    description: "",
    parentId: "",
    active: true,
  })),
  variantTypes: defaultVariantTypes(),
  products: [],
  logs: [],
  settings: { skuPrefix: "HM" },
  nextProductId: 1,
  skuSchemaVersion: SKU_SCHEMA_VERSION,
  nextProductNumbers: {},
  productIdentityVersion: PRODUCT_IDENTITY_VERSION,
});
const text = (v, max = 200) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
export function publicCatalog(doc, revision) {
  return {
    revision,
    categories: doc.categories.map((c) => ({
      ...c,
      salesAvailability: salesAvailability(
        c.salesAvailability,
        undefined,
        true,
      ),
      effectiveSales: categorySalesAvailability(c, doc.categories),
    })),
    variantTypes: doc.variantTypes,
    products: doc.products.map(
      ({ channels, channelVersions, dirty, ...p }) => ({
        ...p,
        sku: displaySku(p.sku),
        salesAvailability: salesAvailability(p.salesAvailability),
        effectiveSales: effectiveSales(p, undefined, doc.categories),
        variants: p.variants.map((v) => ({
          ...v,
          sku: displaySku(v.sku),
          salesAvailability: salesAvailability(
            v.salesAvailability,
            undefined,
            true,
          ),
          effectiveSales: effectiveSales(p, v, doc.categories),
        })),
        productCode: p.productCode,
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
    return mutate(body.expectedRevision, actor, async (doc, tx) => {
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
          visibility: input.visibility ?? old?.visibility ?? "private",
          images: input.images ?? old?.images ?? [],
          salesAvailability: salesAvailability(
            input.salesAvailability,
            old?.salesAvailability,
            true,
          ),
        };
      if (!["private", "public"].includes(c.visibility))
        throw new ApiError(
          422,
          "Bağlantı erişimi private veya public olmalıdır.",
        );
      if (
        !Array.isArray(c.images) ||
        c.images.length > 30 ||
        c.images.some((image) => !image || typeof image.id !== "string")
      )
        throw new ApiError(422, "En fazla 30 kategori görseli eklenebilir.");
      c.images = [...new Set(c.images.map((image) => image.id))].map((id) => ({
        id,
        url: "/api/media/" + encodeURIComponent(id) + "/content",
      }));
      for (const image of c.images) {
        if (
          !(await tx.query("SELECT id FROM app_media WHERE id=?", [image.id]))
            .rows[0]
        )
          throw new ApiError(422, "Kategori görseli bulunamadı.");
      }
      if (old && Boolean(old.parentId) !== Boolean(c.parentId))
        throw new ApiError(
          422,
          "Ana/alt kategori türü kayıt sonrası değiştirilemez.",
        );
      const error =
        validateSalesAvailability(input.salesAvailability) ||
        validateCategory(c, doc.categories);
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
  async function promoteCategory(body, id, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      if (body.previewRevision !== body.expectedRevision)
        throw new ApiError(
          409,
          "Dönüştürme önizlemesi güncel değil. Yeniden açıp kontrol edin.",
          "REVISION_CONFLICT",
        );
      const old = doc.categories.find((c) => c.id === id);
      if (!old) throw new ApiError(404, "Kategori bulunamadı.");
      let plan;
      try {
        plan = categoryPromotion(old, doc.categories, doc.products);
      } catch (e) {
        throw new ApiError(422, e.message);
      }
      if (body.code !== plan.category.code)
        throw new ApiError(
          409,
          "Ana kategori kodu değişti. Dönüştürme önizlemesini yeniden açın.",
          "REVISION_CONFLICT",
        );
      doc.categories = doc.categories.map((c) =>
        c.id === id ? plan.category : c,
      );
      audit(
        doc,
        "Ana kategoriye dönüştürüldü",
        `${old.name} · ${plan.parent.name} / ${old.code} → ${plan.category.code} · ${plan.productCount} ürün · mevcut ürün kodları korundu`,
        actor,
      );
    });
  }
  async function addVariantType(body, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      const name =
        typeof body.name === "string"
          ? body.name.trim().replace(/\s+/g, " ")
          : "";
      if (!name || name.length > 50)
        throw new ApiError(422, "Varyant tipi adı 1–50 karakter olmalıdır.");
      if (
        doc.variantTypes.some(
          (type) => normalizeName(type.name) === normalizeName(name),
        )
      )
        throw new ApiError(422, "Bu varyant tipi zaten var.");
      if (doc.variantTypes.length >= 50)
        throw new ApiError(422, "En fazla 50 varyant tipi oluşturabilirsiniz.");
      doc.variantTypes.push({
        id: randomUUID(),
        name,
        requiresQuantity: normalizeName(name) === "dilim",
      });
      audit(doc, "Varyant tipi eklendi", name, actor);
    });
  }
  async function removeVariantType(body, id, actor) {
    return mutate(body.expectedRevision, actor, (doc) => {
      const type = doc.variantTypes.find((type) => type.id === id);
      if (!type) throw new ApiError(404, "Varyant tipi bulunamadı.");
      if (
        doc.products.some((product) =>
          product.variants.some((variant) => variant.typeId === id),
        )
      )
        throw new ApiError(
          409,
          "Bu varyant tipi kullanılıyor. Önce bağlı varyantların tipini değiştirin.",
          "VARIANT_TYPE_IN_USE",
        );
      doc.variantTypes = doc.variantTypes.filter((type) => type.id !== id);
      audit(doc, "Varyant tipi kaldırıldı", type.name, actor);
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
        throw new ApiError(422, "Kategori bulunamadı.");
      if (!c) throw new ApiError(422, "Kategori seçin.");
      if ((!old || old.categoryId !== c.id) && !selectable(c, doc.categories))
        throw new ApiError(422, "Aktif bir kategori seçin.");
      const productId = old?.id || doc.nextProductId,
        p = {
          id: productId,
          name: text(input.name, 160),
          category: c.name,
          categoryId: c.id,
          mediaId: text(
            input.mediaId === undefined ? old?.mediaId : input.mediaId,
            100,
          ),
          description: text(input.description, 4000),
          ...information,
          salesAvailability: input.salesAvailability,
          status: input.status === "Aktif" ? "Aktif" : "Taslak",
          customImage: text(
            input.customImage === undefined
              ? old?.customImage
              : input.customImage,
            2000,
          ),
          image: Number.isInteger(input.image) ? input.image : 0,
          variants: Array.isArray(input.variants)
            ? input.variants.slice(0, 50).map((v) => ({
                id: v.id,
                size: text(v.size, 30),
                typeId: typeof v.typeId === "string" ? v.typeId : "",
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
                slices: v.slices ?? 0,
                active: v.active !== false,
              }))
            : [],
          isNew: !old,
        };
      const imageInput = input.images ?? old?.images ?? [];
      if (
        !Array.isArray(imageInput) ||
        imageInput.length > 30 ||
        imageInput.some((image) => !image || typeof image.id !== "string")
      )
        throw new ApiError(422, "En fazla 30 ürün görseli eklenebilir.");
      p.images = [...new Set(imageInput.map((image) => image.id))].map(
        (id) => ({
          id,
          url: "/api/media/" + encodeURIComponent(id) + "/content",
        }),
      );
      for (const image of p.images) {
        if (
          !(await tx.query("SELECT id FROM app_media WHERE id=?", [image.id]))
            .rows[0]
        )
          throw new ApiError(422, "Ürün görseli bulunamadı.");
      }
      const imagesChanged =
        input.images !== undefined &&
        JSON.stringify(input.images.map((image) => image.id)) !==
          JSON.stringify((old?.images || []).map((image) => image.id));
      const coverChanged =
        input.mediaId !== undefined && input.mediaId !== (old?.mediaId || "");
      if (
        input.images !== undefined &&
        (!coverChanged || imagesChanged) &&
        (imagesChanged || p.images.length > 0 || !p.customImage)
      ) {
        p.mediaId = p.images[0]?.id || "";
        p.customImage =
          p.images[0]?.url ||
          (typeof input.customImage === "string" &&
          input.customImage.startsWith("/api/media/")
            ? ""
            : text(input.customImage, 2000));
      } else if (coverChanged) {
        p.images = p.mediaId
          ? [
              {
                id: p.mediaId,
                url: "/api/media/" + encodeURIComponent(p.mediaId) + "/content",
              },
              ...p.images.filter(
                (image) => image.id !== p.mediaId && image.id !== old?.mediaId,
              ),
            ]
          : [];
      } else if (
        p.mediaId &&
        !p.images.some((image) => image.id === p.mediaId)
      ) {
        p.images.unshift({
          id: p.mediaId,
          url: "/api/media/" + encodeURIComponent(p.mediaId) + "/content",
        });
      }
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
      const error = validateProduct(p, doc.categories, doc.variantTypes);
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
      try {
        Object.assign(
          p,
          old
            ? { productCode: old.productCode, sku: old.sku }
            : allocateProductCode(doc, c),
        );
      } catch (error) {
        throw new ApiError(422, error.message, "SKU_RANGE_EXHAUSTED");
      }
      p.publicSlug = productSlug(p);
      p.slugHistory = [
        ...new Set([
          ...(old?.slugHistory || []),
          ...(old?.publicSlug && old.publicSlug !== p.publicSlug
            ? [old.publicSlug]
            : []),
        ]),
      ];
      p.publicCardCode =
        old?.publicCardCode ||
        old?.productCode ||
        `P${String(productId).padStart(6, "0")}`;
      let next = Math.max(1, Number(old?.nextVariantNumber) || 1);
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
        if (!previous && next > 99)
          throw new ApiError(
            422,
            "Bu üründe 99 varyant kodu sınırına ulaşıldı.",
            "SKU_RANGE_EXHAUSTED",
          );
        return {
          ...v,
          id: previous?.id || randomUUID(),
          sku: previous?.sku || `${p.sku}.${String(next++).padStart(2, "0")}`,
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
        `${p.name} · ${displaySku(p.sku)}`,
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
      if (!s || s.skuPrefix !== SKU_PREFIX)
        throw new ApiError(422, "SKU kodlama öneki sabittir.");
      doc.settings = { ...doc.settings, skuPrefix: SKU_PREFIX };
      audit(
        doc,
        "Katalog ayarları güncellendi",
        "Kodlama ayarları doğrulandı.",
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
  async function categoryPage(slug, authenticated = false, assetId = "") {
    const catalog = await read();
    const category = catalog.categories.find((c) => c.slug === slug);
    if (
      !category ||
      !category.active ||
      (category.parentId &&
        !catalog.categories.find((c) => c.id === category.parentId)?.active)
    )
      throw new ApiError(404, "Kategori bulunamadı.", "NOT_FOUND");
    if (category.visibility !== "public" && !authenticated)
      throw new ApiError(401, "Bu kategori için giriş yapın.", "UNAUTHORIZED");
    const ids = new Set([
      category.id,
      ...catalog.categories
        .filter((c) => c.parentId === category.id && c.active)
        .map((c) => c.id),
    ]);
    const products = catalog.products.filter(
      (p) =>
        ids.has(
          p.categoryId ||
            catalog.categories.find((c) => c.name === p.category)?.id,
        ) && productCardEligible(p, catalog.categories),
    );
    const imageIds = new Set([
      ...(category.images || []).map((image) => image.id),
      ...products.map((p) => p.mediaId).filter(Boolean),
    ]);
    if (assetId) {
      if (!imageIds.has(assetId))
        throw new ApiError(404, "Görsel bulunamadı.", "NOT_FOUND");
      return assetId;
    }
    const imageUrl = (id) =>
      "/api/category-pages/" +
      encodeURIComponent(slug) +
      "/images/" +
      encodeURIComponent(id);
    return {
      name: category.name,
      description: category.description || "",
      images: (category.images || []).map((image) => ({
        id: image.id,
        url: imageUrl(image.id),
      })),
      products: products.map((p) =>
        productCardData(
          p,
          catalog.categories,
          p.mediaId
            ? imageUrl(p.mediaId)
            : /^https?:\/\//i.test(p.customImage || "")
              ? p.customImage
              : "",
          catalog.variantTypes,
        ),
      ),
    };
  }
  async function productPage(code, authenticated = false, assetId = "") {
    const catalog = await read();
    const product = catalog.products.find(
      (p) =>
        productCardCode(p) === code ||
        p.publicSlug === code ||
        p.slugHistory?.includes(code),
    );
    if (!product || !productCardEligible(product, catalog.categories))
      throw new ApiError(404, "Ürün bulunamadı.", "NOT_FOUND");
    if (!product.publicCardEnabled && !authenticated)
      throw new ApiError(401, "Bu ürün için giriş yapın.", "UNAUTHORIZED");
    const images = product.images?.length
      ? product.images
      : product.mediaId
        ? [{ id: product.mediaId }]
        : [];
    if (assetId) {
      if (
        !images.some((image) => image.id === assetId) &&
        product.mediaId !== assetId
      )
        throw new ApiError(404, "Görsel bulunamadı.", "NOT_FOUND");
      return assetId;
    }
    const imageUrl = (id) =>
      "/api/product-pages/" +
      encodeURIComponent(code) +
      "/images/" +
      encodeURIComponent(id);
    return {
      ...productCardData(
        product,
        catalog.categories,
        product.mediaId
          ? imageUrl(product.mediaId)
          : /^https?:\/\//i.test(product.customImage || "")
            ? product.customImage
            : "",
        catalog.variantTypes,
      ),
      images: images.map((image) => ({
        id: image.id,
        url: imageUrl(image.id),
      })),
    };
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
    return productCardData(
      product,
      catalog.categories,
      image,
      catalog.variantTypes,
    );
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
          "Yayınlamak için ürün ve bağlı olduğu kategoriler aktif olmalı; en az bir aktif varyant bulunmalıdır.",
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
    addVariantType,
    removeVariantType,
    saveCategory,
    promoteCategory,
    saveProduct,
    bulk,
    settings,
    prices,
    categoryPage,
    productPage,
    publishedProduct,
    publicCard,
    publishCard,
  };
}
