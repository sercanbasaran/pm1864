import { displaySku } from "./sku.js";
import { defaultVariantTypes, variantTypeName } from "./variant-types.js";
import { categoryOf, rootOf, categoryPath } from "./hierarchy.js";
import { productInformationFields } from "./product-information.js";
import { hasSatiety } from "./satiety.js";

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
) {
  return {
    productCode: product.productCode || productCardCode(product),
    sku: displaySku(product.sku),
    name: product.name,
    category: categoryPath(categoryOf(product, categories), categories),
    description: product.description || "",
    satiety: hasSatiety(product.satiety)
      ? { type: product.satiety.type, level: product.satiety.level }
      : null,
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
