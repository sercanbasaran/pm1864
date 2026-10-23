export const SKU_PREFIX = "HM";
export const SKU_SCHEMA_VERSION = 1;
export const displaySku = (value) =>
  typeof value === "string" ? value.replace(/^HM(?=\d{3}\.)/, "") : "";
export const productSkuPattern = /^HM\d{3}\.\d{6}$/;
export const variantSkuPattern = /^HM\d{3}\.\d{6}\.\d{2}$/;

export function allocateProductCode(doc, category) {
  const root = doc.categories.find((c) => c.id === category.parentId);
  if (!root || !/^\d{3}$/.test(root.code) || !/^\d{3}$/.test(category.code))
    throw new Error("SKU için geçerli ana ve alt kategori kodları gerekli.");
  const group = root.code + "." + category.code;
  doc.nextProductNumbers ||= {};
  let next = Math.max(1, Number(doc.nextProductNumbers[group]) || 1);
  for (const p of doc.products) {
    if (p.sku?.startsWith(SKU_PREFIX + group) && productSkuPattern.test(p.sku))
      next = Math.max(next, Number(p.sku.slice(-3)) + 1);
  }
  if (next > 999)
    throw new Error("Bu alt kategoride 999 ürün kodu sınırına ulaşıldı.");
  doc.nextProductNumbers[group] = next + 1;
  const productCode = String(next).padStart(3, "0");
  return { productCode, sku: SKU_PREFIX + group + productCode };
}

// Called once in the same database transaction as the hierarchy migration.
export function upgradeSku(doc) {
  if (doc.skuSchemaVersion === SKU_SCHEMA_VERSION) return false;
  const backup = {
    products: doc.products.map((p) => ({
      id: p.id,
      productCode: p.productCode,
      sku: p.sku,
      nextVariantNumber: p.nextVariantNumber,
      variants: p.variants.map((v) => ({ id: v.id, sku: v.sku })),
    })),
    settings: { ...doc.settings },
  };
  doc.nextProductNumbers = {};
  const ordered = [...doc.products].sort((a, b) => Number(a.id) - Number(b.id));
  for (const p of ordered) {
    const category = doc.categories.find((c) => c.id === p.categoryId);
    if (!category?.parentId)
      throw new Error(
        "SKU geçişi için ürünün alt kategorisi bulunamadı: " + p.id,
      );
    if (p.variants.length > 99)
      throw new Error("SKU geçişinde 99 varyant sınırı aşıldı: " + p.id);
    p.publicCardCode ||= p.productCode || `P${String(p.id).padStart(6, "0")}`;
    Object.assign(p, allocateProductCode(doc, category));
    p.variants.forEach((v, i) => {
      v.sku = p.sku + "." + String(i + 1).padStart(2, "0");
    });
    p.nextVariantNumber = p.variants.length + 1;
  }
  doc.settings = { ...doc.settings, skuPrefix: SKU_PREFIX };
  doc.skuSchemaVersion = SKU_SCHEMA_VERSION;
  doc.skuMigrationBackup = backup;
  return true;
}
