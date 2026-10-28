// Empty text/collections are missing. Zero and false are deliberate values.
export const isMissing = value => value == null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length);
export function fillMissing(existing, incoming) {
  if (isMissing(existing)) return isMissing(incoming) ? structuredClone(existing) : structuredClone(incoming);
  if (existing && incoming && typeof existing === "object" && typeof incoming === "object" && !Array.isArray(existing) && !Array.isArray(incoming)) {
    const result = structuredClone(existing);
    for (const key of Object.keys(incoming)) if (!["__proto__", "constructor", "prototype"].includes(key)) result[key] = fillMissing(existing[key], incoming[key]);
    return result;
  }
  return structuredClone(existing);
}
export const normalizedCode = value => String(value ?? "").trim().replace(/^HM(?=\d)/, "");
export function matchingProduct(products, code) {
  const normalized = normalizedCode(code);
  if (!normalized) return undefined;
  const matches = products.filter(p => [p.productCode, p.sku, ...(p.legacyProductCodes || [])].some(value => normalizedCode(value) === normalized));
  if (matches.length > 1) throw Error("Ürün kodu birden fazla kayıtla eşleşiyor.");
  return matches[0];
}
