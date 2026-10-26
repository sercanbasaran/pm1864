export const satietyTypes = [
  { value: "pistachio", label: "Fıstık", metric: "Fıstık yoğunluğu" },
  { value: "walnut", label: "Ceviz", metric: "Ceviz yoğunluğu" },
  { value: "chocolate", label: "Çikolata" },
  { value: "strawberry", label: "Çilek" },
  { value: "cherry", label: "Vişne" },
  { value: "general", label: "Genel", metric: "Doygunluk seviyesi" },
];
export const defaultSatietyProducts = () => [
  { id: "pistachio", name: "Fıstık", icon: "pistachio", active: true },
  { id: "walnut", name: "Ceviz", icon: "walnut", active: true },
];
export const satietyLevels = [
  "Çok hafif",
  "Hafif",
  "Orta",
  "Yoğun",
  "Çok yoğun",
];
export function satietyEntries(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [{ ingredientId: value.type, level: value.level }];
}
export function validateSatiety(value, definitions) {
  if (value == null) return "";
  if (
    !Array.isArray(value) &&
    (typeof value !== "object" ||
      !["pistachio", "walnut", "general"].includes(value.type) ||
      Object.keys(value).some((k) => !["type", "level"].includes(k)))
  )
    return "Doygunluk bilgisi: geçersiz bilgi.";
  const entries = satietyEntries(value);
  if (
    entries.length > 50 ||
    new Set(entries.map((e) => e?.ingredientId)).size !== entries.length ||
    entries.some(
      (e) =>
        !e ||
        typeof e.ingredientId !== "string" ||
        !e.ingredientId ||
        !Number.isInteger(e.level) ||
        e.level < 1 ||
        e.level > 5 ||
        Object.keys(e).some((k) => !["ingredientId", "level"].includes(k)) ||
        (definitions && !definitions.some((d) => d.id === e.ingredientId)),
    )
  )
    return "Doygunluk bilgisi: her ürün için farklı bir içerik ve 1–5 arasında tam sayı seviye seçin.";
  return "";
}
export function hasSatiety(value) {
  return satietyEntries(value).some(
    (e) => Number.isInteger(e?.level) && e.level >= 1 && e.level <= 5,
  );
}
export function suggestedSatietyType(product, categoryName = "") {
  const text =
    `${categoryName} ${product.category || ""} ${product.name || ""}`.toLocaleLowerCase(
      "tr-TR",
    );
  return text.includes("cevizli")
    ? "walnut"
    : text.includes("fıstıklı")
      ? "pistachio"
      : "general";
}
export function upgradeSatiety(doc) {
  const before = JSON.stringify([
    doc.satietyProducts,
    doc.products.map((p) => p.satiety),
  ]);
  doc.satietyProducts ??= defaultSatietyProducts();
  for (const p of doc.products) {
    if (p.satiety && !Array.isArray(p.satiety)) {
      const legacy = p.satiety;
      p.satiety = hasSatiety(legacy) ? satietyEntries(legacy) : [];
      if (
        p.satiety.length &&
        !doc.satietyProducts.some((d) => d.id === legacy.type)
      )
        doc.satietyProducts.push({
          id: legacy.type,
          name: "Genel",
          icon: "general",
          active: true,
        });
    }
  }
  return (
    before !==
    JSON.stringify([doc.satietyProducts, doc.products.map((p) => p.satiety)])
  );
}
export function resolvedSatiety(value, definitions = defaultSatietyProducts()) {
  return satietyEntries(value).flatMap((entry) => {
    const d = definitions.find((d) => d.id === entry.ingredientId);
    return d &&
      Number.isInteger(entry.level) &&
      entry.level >= 1 &&
      entry.level <= 5
      ? [{ ingredientId: d.id, name: d.name, icon: d.icon, level: entry.level }]
      : [];
  });
}
