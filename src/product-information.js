// Shared product-level editorial fields, used by the form and API validation.
export const productInformationFields = [
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
  return "";
}
