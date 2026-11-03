export const salesChannels = [
  { key: "store", label: "Mağaza" },
  { key: "online", label: "E-Mağaza" },
  { key: "foodDelivery", label: "Sipariş Platformları" },
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
export function effectiveSales(product, variant) {
  const variants = variant ? [variant] : product.variants || [];
  return Object.fromEntries(
    salesChannels.map(({ key }) => [
      key,
      variants.some(
        (v) =>
          v.active !== false &&
          salesAvailability(v.salesAvailability, undefined, true)[key],
      ),
    ]),
  );
}
