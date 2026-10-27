import { hasUnitPricing } from "./unit-pricing.js";
import { nutritionRows, parseNutrition, serializeNutrition } from "./nutrition.js";
import { satietyEntries } from "./satiety.js";
export const packagingOptions = ["Metal kutu", "Karton kutu", "Tabakta servis"];
export const defaultConsumables = () => ["Peçete", "Kürdan bayrak", "Tabak servis kağıdı", "Kolonyalı mendil"].map((name, i) => ({ id: "consumable-" + (i + 1), name, active: true }));
export const variantInfoFields = ["ingredients", "allergens", "nutrition", "servingSuggestion", "storageConditions", "longTermStorage"];
export function variantItems(v) {
  return Array.isArray(v.items) ? v.items : [{ productId: v.sourceProductId, quantity: v.quantity }];
}
export function calculateVariant(v, products, consumables) {
  const items = variantItems(v);
  if (!items.length || items.length > 50 || new Set(items.map(item => item?.productId)).size !== items.length) throw Error("Bir veya daha fazla farklı ürün seçin.");
  let totalPrice = 0, totalWeight = 0, totalSlices = 0, allSlices = true;
  const sources = items.map(item => {
    const product = products.find(p => p.id === item?.productId);
    if (!product || !hasUnitPricing(product.unitPricing)) throw Error("Seçilen ürünlerin birim fiyat ve gramaj bilgilerini tamamlayın.");
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 100000 || (["Dilim", "Kap", "Adet"].includes(product.unitPricing.unit) && !Number.isInteger(item.quantity))) throw Error("Geçerli bir ürün birim adedi girin. Dilim, kap ve adet tam sayı olmalıdır.");
    totalPrice += product.unitPricing.price * item.quantity;
    const weight = product.unitPricing.weight * item.quantity;
    totalWeight += weight;
    if (product.unitPricing.unit === "Dilim") totalSlices += item.quantity; else allSlices = false;
    return { product, weight };
  });
  if (!packagingOptions.includes(v.packaging)) throw Error("Ambalaj / servis şekli seçin.");
  const calculatedPrice = Math.round(totalPrice * 100) / 100, weight = Math.round(totalWeight * 1000) / 1000;
  if (v.priceOverride != null && (!Number.isFinite(v.priceOverride) || v.priceOverride <= 0 || v.priceOverride > 1e8 || Math.abs(v.priceOverride * 100 - Math.round(v.priceOverride * 100)) > .00001)) throw Error("Satış fiyatı pozitif ve en fazla iki ondalıklı olmalıdır.");
  if (!Array.isArray(v.consumables) || v.consumables.length > 100 || new Set(v.consumables.map(c => c?.id)).size !== v.consumables.length || v.consumables.some(c => !consumables.some(d => d.id === c?.id) || !Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > 100000)) throw Error("Sarf malzeme ve adetlerini kontrol edin.");
  const autoInfo = Array.isArray(v.items) ? deriveVariantInformation(v, products) : null;
  if (autoInfo) delete autoInfo.nutritionComplete;
  return { ...v, ...(Array.isArray(v.items) ? { items, sourceProductId: items[0].productId, quantity: items[0].quantity, information: { ...autoInfo, ...(v.informationOverrides || {}) } } : {}), calculatedPrice, price: v.priceOverride ?? calculatedPrice, weight, unit: sources.length === 1 ? sources[0].product.unitPricing.unit : "Adet", slices: allSlices ? totalSlices : 0 };
}
export function deriveVariantInformation(v, products) {
  const sources = variantItems(v).map(item => ({ product: products.find(p => p.id === item.productId), quantity: item.quantity }));
  const fields = {};
  for (const key of variantInfoFields.filter(k => k !== "nutrition")) {
    const groups = new Map();
    for (const source of sources) {
      const value = source.product?.[key]?.trim();
      if (!value) continue;
      const normalized = value.normalize("NFC").replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
      const group = groups.get(normalized);
      if (group) group.names.push(source.product.name);
      else groups.set(normalized, { value, names: [source.product.name] });
    }
    fields[key] = [...groups.values()].map(group => sources.length > 1 && groups.size > 1 ? `${group.names.join(" / ")}: ${group.value}` : group.value).join("\n");
  }
  const parsed = sources.map(s => ({ ...s, weight: s.product?.unitPricing?.weight * s.quantity, nutrition: parseNutrition(s.product?.nutrition || "").values }));
  const complete = parsed.length > 0 && parsed.every(s => Number.isFinite(s.weight) && s.weight > 0 && nutritionRows.every(r => s.nutrition[r.key] !== "" && Number.isFinite(Number(s.nutrition[r.key]))));
  if (sources.length === 1 && sources[0].product?.nutrition) fields.nutrition = sources[0].product.nutrition;
  else if (complete) {
    const total = parsed.reduce((sum, s) => sum + s.weight, 0);
    fields.nutrition = serializeNutrition(Object.fromEntries(nutritionRows.map(r => [r.key, Number((parsed.reduce((sum, s) => sum + Number(s.nutrition[r.key]) * s.weight, 0) / total).toFixed(2))])));
  } else fields.nutrition = "";
  const levels = new Map();
  for (const source of sources) for (const entry of satietyEntries(source.product?.satiety)) if (entry?.ingredientId && Number.isInteger(entry.level)) levels.set(entry.ingredientId, Math.max(levels.get(entry.ingredientId) || 0, entry.level));
  return { ...fields, satiety: [...levels].map(([ingredientId, level]) => ({ ingredientId, level })), nutritionComplete: complete };
}
