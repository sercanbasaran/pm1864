import { packagingShape, packagingVolume } from "./packaging-volume.js";

const positive = (value) => Number.isFinite(value) && value > 0;
const floor = (value) => Math.max(0, Math.floor(value + 1e-9));
const pieceUnits = ["Dilim", "Adet", "Kap"];

function piece(product) {
  if (!pieceUnits.includes(product?.unitPricing?.unit))
    return { reason: "Dilim / adet / kap birimi tanımlanmalı." };
  const d = product.dimensions;
  if (![d?.length, d?.width, d?.height].every(positive))
    return { reason: "Ürünün uzunluk, genişlik ve yükseklik bilgileri eksik." };
  return {
    ...d,
    area: d.length * d.width,
    volume: d.length * d.width * d.height,
    weight: product.unitPricing.weight,
  };
}

// Estimates only: one upright layer, with 90° rotation on the base allowed.
// Mixed contents use remaining base area as well as volume and weight budgets.
export function packagingCapacity(box, items = [], products = []) {
  if (!box) return { ready: false, reason: "Kapasite hesabı için kutu seçin." };
  const volume = packagingVolume(box);
  if (!volume)
    return {
      ready: false,
      reason: "Kutunun ölçü bilgilerini Ambalaj Merkezi’nde tamamlayın.",
    };
  const cylinder = packagingShape(box) === "cylinder";
  const totalVolume = volume.cm3 * 1000;
  const totalArea = cylinder
    ? Math.PI * (box.diameter / 2) ** 2
    : box.length * box.width;
  const weightLimited = positive(box.maxProductWeight);
  let usedArea = 0,
    usedVolume = 0,
    usedWeight = 0;
  const issues = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    const size = piece(product);
    if (
      size.reason ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      (weightLimited && !positive(size.weight))
    ) {
      issues.push(
        `${product?.name || "Ürün"}: ${size.reason || "Adet veya birim gramaj bilgisi eksik / geçersiz."}`,
      );
      continue;
    }
    usedArea += size.area * item.quantity;
    usedVolume += size.volume * item.quantity;
    usedWeight += (positive(size.weight) ? size.weight : 0) * item.quantity;
    if (!fits(size))
      issues.push(`${product.name}: Dilim ölçüleri kutuya sığmıyor.`);
  }
  function fits(size) {
    return (
      size.height <= box.height &&
      (cylinder
        ? Math.hypot(size.length, size.width) <= box.diameter
        : (size.length <= box.length && size.width <= box.width) ||
          (size.width <= box.length && size.length <= box.width))
    );
  }
  const ready = issues.length === 0;
  const result = {
    ready,
    reason: issues.join(" "),
    totalVolume: totalVolume / 1000,
    usedVolume: ready ? usedVolume / 1000 : null,
    remainingVolume: ready
      ? Math.max(0, totalVolume - usedVolume) / 1000
      : null,
    volumePercent: ready ? (usedVolume / totalVolume) * 100 : null,
    basePercent: ready ? (usedArea / totalArea) * 100 : null,
    overCapacity:
      ready &&
      (usedArea > totalArea + 1e-6 ||
        usedVolume > totalVolume + 1e-6 ||
        (weightLimited && usedWeight > box.maxProductWeight + 1e-6)),
  };
  result.forProduct = (product) => {
    const size = piece(product);
    if (size.reason) return { reason: size.reason };
    if (weightLimited && !positive(size.weight))
      return { reason: "Ürünün birim gramaj bilgisi eksik." };
    if (!fits(size))
      return {
        maximum: 0,
        additional: 0,
        reason: "Dilim ölçüleri kutuya sığmıyor.",
      };
    const baseMaximum = cylinder
      ? floor(totalArea / size.area)
      : Math.max(
          floor(box.length / size.length) * floor(box.width / size.width),
          floor(box.length / size.width) * floor(box.width / size.length),
        );
    const maximum = Math.min(
      baseMaximum,
      floor(totalVolume / size.volume),
      weightLimited ? floor(box.maxProductWeight / size.weight) : Infinity,
    );
    if (!ready)
      return {
        maximum,
        reason:
          "Kalan kapasite için eklenen ürünlerin ölçü ve adet bilgilerini kontrol edin.",
      };
    const already = items
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    return {
      maximum,
      additional: Math.min(
        Math.max(0, maximum - already),
        floor((totalArea - usedArea) / size.area),
        floor((totalVolume - usedVolume) / size.volume),
        weightLimited
          ? floor((box.maxProductWeight - usedWeight) / size.weight)
          : Infinity,
      ),
    };
  };
  return result;
}

export function capacityProductLabel(capacity, product) {
  if (!capacity?.forProduct) return capacity?.reason || "";
  const estimate = capacity.forProduct(product);
  const unit = product.unitPricing?.unit?.toLocaleLowerCase("tr-TR") || "adet";
  if (estimate.additional === undefined) return estimate.reason;
  if (estimate.reason) return estimate.reason;
  return `Boş kutu: ≈ ${estimate.maximum} ${unit} · Şu an ≈ ${estimate.additional} ${unit} daha eklenebilir`;
}
