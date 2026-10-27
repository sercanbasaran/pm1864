import { effectiveSales } from "./sales-availability.js";
import { hasUnitPricing, normalizeUnitPricing } from "./unit-pricing.js";
import { displaySku } from "./sku.js";
import { defaultVariantTypes, variantTypeName } from "./variant-types.js";
import { categoryOf, rootOf, categoryPath } from "./hierarchy.js";
import { productInformationFields } from "./product-information.js";
import { defaultSatietyProducts, resolvedSatiety } from "./satiety.js";

export const productCardCode = (product) =>
  product.publicCardCode ||
  product.productCode ||
  `P${String(product.id).padStart(6, "0")}`;
export const productCardPath = (product) =>
  "/p/" + encodeURIComponent(product.publicSlug || productCardCode(product));

export function productCardEligible(product, categories) {
  const category = categoryOf(product, categories),
    root = rootOf(category, categories);
  return (
    product.status === "Aktif" &&
    !!category?.active &&
    !!root?.active &&
    (!product.variants.length ||
      product.variants.some((v) => v.active !== false))
  );
}

// Explicit public fields only. Never return catalog records, audit data or media IDs.
export function productCardData(
  product,
  categories,
  image = product.customImage || "",
  variantTypes = defaultVariantTypes(),
  satietyProducts = defaultSatietyProducts(),
) {
  return {
    productCode: product.productCode || productCardCode(product),
    sku: displaySku(product.sku),
    name: product.name,
    category: categoryPath(categoryOf(product, categories), categories),
    description: product.description || "",
    salesAvailability: effectiveSales(product, undefined, categories),
    unitPricing: hasUnitPricing(product.unitPricing)
      ? normalizeUnitPricing(product.unitPricing)
      : null,
    satiety: resolvedSatiety(product.satiety, satietyProducts),
    customImage: image,
    ...Object.fromEntries(
      productInformationFields.map((field) => [
        field.key,
        product[field.key] || "",
      ]),
    ),
    variants: product.variants
      .filter((v) => v.active !== false)
      .map((v) => ({
        sku: displaySku(v.sku),
        size: v.size,
        typeName: variantTypeName(v, variantTypes),
        weight: v.weight,
        unit: v.unit || "Adet",
        packaging: v.packaging || "",
        slices: v.slices,
        price: v.price,
      })),
  };
}

export function variantCardEligible(product, variant, categories, products = [product]) {
  if (!variant || variant.active === false) return false;
  const ids = Array.isArray(variant.items) && variant.items.length ? variant.items.map(item => item.productId) : [variant.sourceProductId ?? product.id];
  return ids.every(id => products.some(item => item.id === id && item.status === "Aktif"));
}
export function variantCardData(product, variant, categories, products = [], satietyProducts = defaultSatietyProducts()) {
  const information = variant.information || product;
  const items = (variant.items || [{ productId: variant.sourceProductId ?? product.id, quantity: variant.quantity ?? 1 }]).map((item) => {
    const source = products.find((p) => p.id === item.productId) || (item.productId === product.id ? product : null);
    return { name: source?.name || "Ürün", quantity: item.quantity, unit: source?.unitPricing?.unit || "Adet" };
  });
  return {
    productCode: displaySku(variant.sku),
    name: variant.size,
    category: "",
    description: items.map((item) => item.name).join(" · "),
    variantPricing: { price: variant.price, weight: variant.weight, packaging: variant.packaging || "" },
    variantContents: items,
    salesAvailability: effectiveSales(product, variant, categories),
    satiety: resolvedSatiety(information.satiety, satietyProducts),
    ...Object.fromEntries(productInformationFields.map((field) => [field.key, information[field.key] || ""])),
    images: variant.images || [],
    customImage: product.customImage || "",
    variants: [],
    isVariantCard: true,
  };
}
