import { prepareSkuV3 } from "./migrations/sku-v3.js";
export const SKU_PREFIX = "HM";
export const SKU_SCHEMA_VERSION = 3;
export const displaySku = (value) => typeof value === "string" ? value.replace(/^HM(?=\d{3,4}\.)/, "") : "";
export const productSkuPattern = /^\d{4}\.\d{3}$/;
export const variantSkuPattern = /^\d{4}\.\d{5}$/;
export function allocateProductCode(doc, category) {
  const root = category?.parentId ? doc.categories.find(c => c.id === category.parentId) : category;
  const sub = category?.parentId ? category.code : "00";
  if (!root || !/^[1-9]\d$/.test(root.code) || !(category?.parentId ? /^[1-9]\d$/ : /^00$/).test(sub)) throw Error("Geçerli iki haneli kategori kodları gerekli.");
  const group = root.code + sub;
  doc.nextProductNumbers ||= {};
  let next = Math.max(100, Number(doc.nextProductNumbers[group]) || 100);
  for (const p of doc.products) if (productSkuPattern.test(p.sku) && p.sku.startsWith(group + ".")) next = Math.max(next, Number(p.sku.slice(-3)) + 1);
  if (!Number.isInteger(next) || next > 999) throw Error("Bu kategori kod grubunda 900 ürün kodu sınırına ulaşıldı.");
  doc.nextProductNumbers[group] = next + 1;
  return {productCode: group + next, sku: `${group}.${next}`};
}
export function upgradeSku(doc) {
  if (doc.skuSchemaVersion === SKU_SCHEMA_VERSION) return false;
  if (doc.skuSchemaVersion != null && ![0,1,2].includes(doc.skuSchemaVersion)) throw Error("Desteklenmeyen SKU şema sürümü.");
  const next = prepareSkuV3(doc);
  next.settings = {...next.settings, skuPrefix: SKU_PREFIX};
  Object.assign(doc, next);
  return true;
}
