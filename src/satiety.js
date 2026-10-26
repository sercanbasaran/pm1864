export const satietyTypes = [
  { value: "pistachio", label: "Fıstık", metric: "Fıstık yoğunluğu" },
  { value: "walnut", label: "Ceviz", metric: "Ceviz yoğunluğu" },
  { value: "general", label: "Genel", metric: "Doygunluk seviyesi" },
];
export const satietyLevels = [
  "Çok hafif",
  "Hafif",
  "Orta",
  "Yoğun",
  "Çok yoğun",
];

export function validateSatiety(value) {
  if (value === undefined || value === null) return "";
  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    !satietyTypes.some((type) => type.value === value.type) ||
    (value.level !== null &&
      (!Number.isInteger(value.level) || value.level < 1 || value.level > 5)) ||
    Object.keys(value).some((key) => !["type", "level"].includes(key))
  )
    return "Doygunluk bilgisi: gösterim türünü ve 1–5 arasında bir tam sayı seçin.";
  return "";
}

export function hasSatiety(value) {
  return !!value && !validateSatiety(value) && Number.isInteger(value.level);
}

// Only the suggested illustration is inferred. A product's level is never inferred.
export function suggestedSatietyType(product, categoryName = "") {
  const text =
    `${categoryName} ${product.category || ""} ${product.name || ""}`.toLocaleLowerCase(
      "tr-TR",
    );
  if (text.includes("cevizli")) return "walnut";
  if (text.includes("fıstıklı")) return "pistachio";
  return "general";
}
