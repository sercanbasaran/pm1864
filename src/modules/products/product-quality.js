import { hasUnitPricing } from "../../unit-pricing.js";
import { hasSatiety } from "../../satiety.js";
import { parseNutrition } from "../../nutrition.js";
const blank = (value) => typeof value !== "string" || !value.trim();
export const productQualityChecks = [
  {
    key: "image",
    label: "Görseli olmayan ürünler",
    missing: (p) => !p.images?.length && !p.mediaId && !p.customImage,
  },
  {
    key: "description",
    label: "Açıklaması olmayan ürünler",
    missing: (p) => blank(p.description),
  },
  {
    key: "ingredients",
    label: "İçindekiler bilgisi eksik ürünler",
    missing: (p) => blank(p.ingredients),
  },
  {
    key: "allergens",
    label: "Alerjen bilgisi eksik ürünler",
    missing: (p) => blank(p.allergens),
  },
  {
    key: "nutrition",
    label: "Besin değerleri eksik ürünler",
    missing: (p) =>
      Object.values(parseNutrition(p.nutrition || "").values).some(
        (v) => v === "",
      ),
  },
  {
    key: "unitPricing",
    label: "Birim fiyat veya birim bilgisi eksik ürünler",
    missing: (p) => !hasUnitPricing(p.unitPricing),
  },
  {
    key: "servingSuggestion",
    label: "Servis önerisi eksik ürünler",
    missing: (p) => blank(p.servingSuggestion),
  },
  {
    key: "storageConditions",
    label: "Saklama bilgisi eksik ürünler",
    missing: (p) => blank(p.storageConditions),
  },
  {
    key: "longTermStorage",
    label: "Uzun süreli muhafaza bilgisi eksik ürünler",
    missing: (p) => blank(p.longTermStorage),
  },
  {
    key: "satiety",
    label: "Doygunluk bilgisi olmayan baklavalar",
    missing: (p) =>
      /baklava/i.test(p.category || p.name || "") && !hasSatiety(p.satiety),
  },
];
export function missingProductInformation(product, key) {
  return key === "any"
    ? productQualityChecks.some((c) => c.missing(product))
    : !!productQualityChecks.find((c) => c.key === key)?.missing(product);
}
