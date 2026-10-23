export const salesChannels = [
  { key: "store", label: "Mağaza satışı" },
  { key: "online", label: "Online satış" },
  { key: "foodDelivery", label: "Yemek sipariş platformu satışı" },
];
export function validateSalesAvailability(value) {
  if (value === undefined) return "";
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.entries(value).some(
      ([key, v]) =>
        !salesChannels.some((c) => c.key === key) || typeof v !== "boolean",
    )
  )
    return "Satış kanalları yalnızca açık veya kapalı olarak belirtilmeli.";
  return "";
}
export function salesAvailability(value, previous, variant = false) {
  return Object.fromEntries(
    salesChannels.map(({ key }) => [
      key,
      value?.[key] ?? previous?.[key] ?? variant,
    ]),
  );
}
// Missing preferences on existing categories keep all channels available.
export function categorySalesAvailability(category, categories) {
  const values = salesAvailability(undefined, undefined, true);
  const seen = new Set();
  let current = category;
  if (!current) return salesAvailability();
  while (current) {
    if (seen.has(current.id)) return salesAvailability();
    seen.add(current.id);
    const preferences = salesAvailability(current.salesAvailability, undefined, true);
    for (const { key } of salesChannels) values[key] = values[key] && current.active !== false && preferences[key];
    if (!current.parentId) return values;
    current = categories.find(c => c.id === current.parentId);
    if (!current) return salesAvailability();
  }
  return values;
}
export function effectiveSales(product, variant, categories) {
  const parent = salesAvailability(product.salesAvailability),
    child = salesAvailability(variant?.salesAvailability, undefined, true),
    category = categories ? categorySalesAvailability(categories.find(c => product.categoryId ? c.id === product.categoryId : c.name === product.category), categories) : salesAvailability(undefined, undefined, true);
  return Object.fromEntries(
    salesChannels.map(({ key }) => [
      key,
      product.status === "Aktif" &&
        (!variant || variant.active !== false) &&
        category[key] &&
        parent[key] &&
        (!variant || child[key]),
    ]),
  );
}
