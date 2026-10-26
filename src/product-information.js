import { validateNutrition } from "./nutrition.js";
import { validateSatiety } from "./satiety.js";
// Shared product-level editorial fields, used by the form and API validation.
export const productInformationFields = [
  {
    key: "ingredients",
    label: "İçindekiler",
    maxLength: 4000,
    placeholder: "Ürünün içindekiler listesini girin.",
  },
  {
    key: "servingSuggestion",
    label: "Servis Önerisi",
    maxLength: 4000,
    placeholder: "Servis sıcaklığı, sunum ve eşlikçi önerilerini girin.",
  },
  {
    key: "nutrition",
    label: "Besin değerleri (100 g için)",
    maxLength: 4000,
    placeholder:
      "100 g için: Enerji … kcal / … kJ; Yağ … g; Doymuş yağ … g; Karbonhidrat … g; Şeker … g; Lif … g; Protein … g; Tuz … g.",
  },
  {
    key: "storageConditions",
    label: "Saklama koşulları",
    maxLength: 4000,
    placeholder:
      "Saklama sıcaklığı, ortam koşulları ve açıldıktan sonra tüketim bilgilerini girin.",
  },
  {
    key: "allergens",
    label: "Alerjen uyarısı",
    maxLength: 1000,
    placeholder:
      "İçerdiği alerjenleri ve varsa çapraz bulaşma uyarısını girin.",
  },
  {
    key: "longTermStorage",
    label: "Uzun süreli muhafaza",
    maxLength: 4000,
    placeholder:
      "Uzun süreli saklama yöntemi, süre, çözündürme ve tüketim talimatlarını girin.",
  },
];
export function validateProductInformation(product) {
  for (const field of productInformationFields) {
    const value = product[field.key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.length > field.maxLength)
    )
      return `${field.label}: en fazla ${field.maxLength} karakter metin girin.`;
  }
  return (
    validateSatiety(product.satiety) ||
    validateNutrition(product.nutrition || "")
  );
}

export const productDetailSteps = [
  { label: "Genel bilgiler", key: null },
  { label: "İçindekiler", key: "ingredients" },
  { label: "Alerjen uyarısı", key: "allergens" },
  { label: "Doygunluk bilgisi", key: "satiety" },
  { label: "Besin Değerleri", key: "nutrition" },
  { label: "Servis Önerisi", key: "servingSuggestion" },
  { label: "Saklama Koşulları", key: "storageConditions" },
  { label: "Uzun Süreli Muhafaza", key: "longTermStorage" },
];
export function stepForProductError(invalid) {
  if (invalid.tab === "Varyant & fiyat") return "Genel bilgiler";
  if (invalid.tab !== "Besin ve saklama") return invalid.tab;
  if (invalid.message.startsWith("Doygunluk bilgisi:"))
    return "Doygunluk bilgisi";
  const field = productInformationFields.find((info) =>
    invalid.message.startsWith(info.label),
  );
  return (
    productDetailSteps.find((step) => step.key === field?.key)?.label ||
    "Besin Değerleri"
  );
}
