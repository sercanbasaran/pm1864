import { slugify } from "./catalog.js";
export const PRODUCT_IDENTITY_VERSION = 1;
export const productSlug = (product) =>
  `${slugify(product.name) || "urun"}-${product.productCode}`;
export function upgradeProductIdentity(doc) {
  if (doc.productIdentityVersion === PRODUCT_IDENTITY_VERSION) return false;
  const next = structuredClone(doc),
    used = new Set();
  next.productIdentityBackup = next.products.map((p) => ({
    id: p.id,
    productCode: p.productCode,
    publicSlug: p.publicSlug,
  }));
  for (const p of next.products) {
    if (!/^\d{10}$/.test(p.productCode || "")) {
      const match = p.sku?.match(/^(?:HM)?(\d{4})\.(\d{3})(\d{3})$/);
      if (!match)
        throw Error(
          "Ürün kodu geçişi için geçerli kategori ve sıra kodları bulunamadı: " +
            p.id,
        );
      p.productCode = match.slice(1).join("");
    }
    if (used.has(p.productCode))
      throw Error("Tekrarlanan ürün kodu: " + p.productCode);
    used.add(p.productCode);
    p.publicSlug ||= productSlug(p);
  }
  next.productIdentityVersion = PRODUCT_IDENTITY_VERSION;
  Object.assign(doc, next);
  return true;
}
