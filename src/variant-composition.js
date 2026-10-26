import { hasUnitPricing } from "./unit-pricing.js";
export const packagingOptions = ["Metal kutu", "Karton kutu", "Tabakta servis"];
export const defaultConsumables = () =>
  ["Peçete", "Kürdan bayrak", "Tabak servis kağıdı", "Kolonyalı mendil"].map(
    (name, i) => ({ id: "consumable-" + (i + 1), name, active: true }),
  );
export function calculateVariant(v, products, consumables) {
  const source = products.find((p) => p.id === v.sourceProductId);
  if (!source || !hasUnitPricing(source.unitPricing))
    throw Error("Seçilen ürünün birim fiyat ve gramaj bilgilerini tamamlayın.");
  if (
    !Number.isFinite(v.quantity) ||
    v.quantity <= 0 ||
    v.quantity > 100000 ||
    (["Dilim", "Kap", "Adet"].includes(source.unitPricing.unit) &&
      !Number.isInteger(v.quantity))
  )
    throw Error(
      "Geçerli bir ürün birim adedi girin. Dilim, kap ve adet tam sayı olmalıdır.",
    );
  if (!packagingOptions.includes(v.packaging))
    throw Error("Ambalaj / servis şekli seçin.");
  const calculatedPrice =
    Math.round(source.unitPricing.price * v.quantity * 100) / 100;
  const weight =
    Math.round(source.unitPricing.weight * v.quantity * 1000) / 1000;
  if (
    v.priceOverride != null &&
    (!Number.isFinite(v.priceOverride) ||
      v.priceOverride <= 0 ||
      v.priceOverride > 1e8 ||
      Math.abs(v.priceOverride * 100 - Math.round(v.priceOverride * 100)) >
        0.00001)
  )
    throw Error("Satış fiyatı pozitif ve en fazla iki ondalıklı olmalıdır.");
  if (
    !Array.isArray(v.consumables) ||
    v.consumables.length > 100 ||
    new Set(v.consumables.map((c) => c?.id)).size !== v.consumables.length ||
    v.consumables.some(
      (c) =>
        !consumables.some((d) => d.id === c?.id) ||
        !Number.isInteger(c.quantity) ||
        c.quantity < 1 ||
        c.quantity > 100000,
    )
  )
    throw Error("Sarf malzeme ve adetlerini kontrol edin.");
  return {
    ...v,
    calculatedPrice,
    price: v.priceOverride ?? calculatedPrice,
    weight,
    unit: source.unitPricing.unit,
    slices: source.unitPricing.unit === "Dilim" ? v.quantity : 0,
  };
}
