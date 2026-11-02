import { boxLayout } from "./box-layout.js";
export const packagingCapacity = boxLayout;
export function capacityProductLabel(capacity, product) {
  if (!capacity?.forProduct) return capacity?.reason || "";
  const estimate = capacity.forProduct(product);
  const unit = product.unitPricing?.unit?.toLocaleLowerCase("tr-TR") || "adet";
  if (estimate.reason) return estimate.reason;
  return `Boş kutu: ≈ ${estimate.maximum} ${unit} · Gridde ${estimate.additional} ${unit} daha eklenebilir (yatay ${estimate.horizontalAdditional} / dikey ${estimate.verticalAdditional})`;
}
