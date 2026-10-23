export const SKU_PREFIX = "HM";
export const SKU_SCHEMA_VERSION = 2;
export const displaySku = (value) =>
  typeof value === "string" ? value.replace(/^HM(?=\d{3,4}\.)/, "") : "";
export const productSkuPattern = /^HM\d{4}\.\d{6}$/;
export const variantSkuPattern = /^HM\d{4}\.\d{6}\.\d{2}$/;

export function allocateProductCode(doc, category) {
  const root = category?.parentId
    ? doc.categories.find((c) => c.id === category.parentId)
    : category;
  const subcategoryCode = category?.parentId ? category.code : "000";
  if (!root || !/^\d{4}$/.test(root.code) || !/^\d{3}$/.test(subcategoryCode))
    throw new Error("SKU için geçerli ana ve alt kategori kodları gerekli.");
  const group = root.code + "." + subcategoryCode;
  doc.nextProductNumbers ||= {};
  let next = Math.max(1, Number(doc.nextProductNumbers[group]) || 1);
  for (const p of doc.products) {
    if (p.sku?.startsWith(SKU_PREFIX + group) && productSkuPattern.test(p.sku))
      next = Math.max(next, Number(p.sku.slice(-3)) + 1);
  }
  if (next > 999)
    throw new Error(
      "Bu kategori kod grubunda 999 ürün kodu sınırına ulaşıldı.",
    );
  doc.nextProductNumbers[group] = next + 1;
  const productCode = String(next).padStart(3, "0");
  return {
    productCode: root.code + subcategoryCode + productCode,
    sku: SKU_PREFIX + group + productCode,
  };
}

// Applied inside the database migration transaction. Work on a copy so a
// validation failure also leaves callers' in-memory documents untouched.
export function upgradeSku(doc) {
  if (doc.skuSchemaVersion === SKU_SCHEMA_VERSION) return false;
  if (doc.skuSchemaVersion != null && ![0, 1].includes(doc.skuSchemaVersion))
    throw new Error("Desteklenmeyen SKU şema sürümü.");
  const next = structuredClone(doc);
  if (next.skuSchemaVersion === 1) {
    next.skuWidthMigrationBackup = {
      categories: next.categories.map(({ id, code }) => ({ id, code })),
      products: next.products.map((p) => ({
        id: p.id,
        sku: p.sku,
        variants: p.variants.map(({ id, sku }) => ({ id, sku })),
      })),
      nextProductNumbers: { ...next.nextProductNumbers },
    };
    upgradeCategoryWidths(next);
    const counters = {};
    for (const [key, value] of Object.entries(next.nextProductNumbers || {})) {
      const match = key.match(/^(\d{3,4})\.(\d{3})$/);
      if (!match || !Number.isInteger(value) || value < 1 || value > 1000)
        throw new Error("SKU geçişinde geçersiz ürün sayacı: " + key);
      const group = match[1].padStart(4, "0") + "." + match[2];
      counters[group] = Math.max(counters[group] || 1, value);
    }
    next.nextProductNumbers = counters;
    const used = new Set();
    for (const p of next.products) {
      p.sku = widenSku(p.sku);
      if (!productSkuPattern.test(p.sku) || used.has(p.sku))
        throw new Error(
          "SKU geçişinde geçersiz veya tekrarlanan ürün kodu: " + p.id,
        );
      used.add(p.sku);
      for (const v of p.variants) {
        v.sku = widenSku(v.sku);
        if (
          !variantSkuPattern.test(v.sku) ||
          used.has(v.sku) ||
          !v.sku.startsWith(p.sku + ".")
        )
          throw new Error(
            "SKU geçişinde geçersiz veya tekrarlanan varyant kodu: " + v.id,
          );
        used.add(v.sku);
      }
    }
  } else {
    // Original pre-pattern catalogs still receive the original one-time
    // numbering migration, using the four-digit root format from the start.
    next.skuMigrationBackup = {
      products: next.products.map((p) => ({
        id: p.id,
        productCode: p.productCode,
        sku: p.sku,
        nextVariantNumber: p.nextVariantNumber,
        variants: p.variants.map((v) => ({ id: v.id, sku: v.sku })),
      })),
      categories: next.categories.map(({ id, code }) => ({ id, code })),
      settings: { ...next.settings },
    };
    upgradeCategoryWidths(next);
    next.nextProductNumbers = {};
    const ordered = [...next.products].sort(
      (a, b) => Number(a.id) - Number(b.id),
    );
    for (const p of ordered) {
      const category = next.categories.find((c) => c.id === p.categoryId);
      if (!category)
        throw new Error(
          "SKU geçişi için ürünün kategorisi bulunamadı: " + p.id,
        );
      if (p.variants.length > 99)
        throw new Error("SKU geçişinde 99 varyant sınırı aşıldı: " + p.id);
      p.publicCardCode ||= p.productCode || `P${String(p.id).padStart(6, "0")}`;
      Object.assign(p, allocateProductCode(next, category));
      p.variants.forEach((v, i) => {
        v.sku = p.sku + "." + String(i + 1).padStart(2, "0");
      });
      p.nextVariantNumber = p.variants.length + 1;
    }
  }
  next.settings = { ...next.settings, skuPrefix: SKU_PREFIX };
  next.skuSchemaVersion = SKU_SCHEMA_VERSION;
  Object.assign(doc, next);
  return true;
}
function widenSku(sku) {
  return typeof sku === "string" ? sku.replace(/^HM(\d{3})\./, "HM0$1.") : "";
}
function upgradeCategoryWidths(doc) {
  const used = new Set();
  for (const c of doc.categories) {
    if (!c.parentId && /^\d{3}$/.test(c.code)) c.code = c.code.padStart(4, "0");
    if (!(c.parentId ? /^\d{3}$/ : /^\d{4}$/).test(c.code) || used.has(c.code))
      throw new Error(
        "SKU geçişinde geçersiz veya tekrarlanan kategori kodu: " + c.id,
      );
    used.add(c.code);
  }
}
