import { countedUnit, productUnits } from "./unit-pricing.js";
export function validatePortion(value, pricing) {
  if (value == null) return "";
  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !["quantity", "unit"].includes(key)) ||
    !productUnits.includes(value.unit) ||
    value.unit !== pricing?.unit ||
    !Number.isFinite(value.quantity) ||
    value.quantity <= 0 ||
    value.quantity > 100000 ||
    (countedUnit(value.unit) && !Number.isInteger(value.quantity))
  )
    return "Porsiyon: ürünün biriminde 0’dan büyük bir miktar girin. Dilim, kap ve adet tam sayı olmalıdır.";
  return "";
}
export const hasPortion = (product) =>
  !!product?.portion && !validatePortion(product.portion, product.unitPricing);
export const portionDefinition = (product) =>
  hasPortion(product)
    ? `1 kişilik: ${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 }).format(product.portion.quantity)} ${product.portion.unit.toLocaleLowerCase("tr-TR")}`
    : "Porsiyon bilgisi girilmedi";
export function variantPortionCount(variant, products, owner) {
  if (Array.isArray(variant.items) && !variant.items.length) return null;
  const items = variant.items?.length
    ? variant.items
    : [
        {
          productId: variant.sourceProductId ?? owner?.id,
          quantity: variant.quantity,
        },
      ];
  let total = 0;
  for (const item of items) {
    const product = products.find(
      (p) => String(p.id) === String(item.productId),
    );
    if (!hasPortion(product)) return null;
    // Old variants can have only their net weight or slice count saved.
    const quantity =
      item.quantity ??
      (variant.items?.length
        ? NaN
        : product.unitPricing.unit === "Dilim" && variant.slices > 0
          ? variant.slices
          : variant.weight / product.unitPricing.weight);
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    total += quantity / product.portion.quantity;
  }
  return Number.isFinite(total) && total > 0 ? total : null;
}
export const portionCountLabel = (count) =>
  Number.isFinite(count) && count > 0
    ? count < 0.01
      ? "0,01 kişilik porsiyondan az"
      : `≈ ${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(count)} kişilik`
    : "Porsiyon hesaplanamadı";
