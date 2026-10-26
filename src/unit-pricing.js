export const productUnits = ["Dilim", "Kap", "Kilogram", "Gram", "Adet"];
export const countedUnit = (unit) => ["Dilim", "Kap", "Adet"].includes(unit);
export function validateUnitPricing(value) {
  if (value == null) return "";
  if (typeof value !== "object" || Array.isArray(value) || !productUnits.includes(value.unit) || !Number.isFinite(value.price) || value.price <= 0 || value.price > 1e8 || Math.abs(value.price * 100 - Math.round(value.price * 100)) > .00001 || Object.keys(value).some(k => !["price", "unit", "weight"].includes(k))) return "Birim fiyat: birim seçin ve 0’dan büyük, en fazla iki ondalıklı bir fiyat girin.";
  if (countedUnit(value.unit) && (!Number.isFinite(value.weight) || value.weight <= 0 || value.weight > 1e7)) return "Birim fiyat: dilim, kap ve adet için bir birimin gramajını gram olarak girin.";
  return "";
}
export function normalizeUnitPricing(value) {
  return value == null ? null : { price: value.price, unit: value.unit, weight: countedUnit(value.unit) ? value.weight : value.unit === "Kilogram" ? 1000 : 1 };
}
export const hasUnitPricing = (value) => !!value && !validateUnitPricing(value);
