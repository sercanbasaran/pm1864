import { packagingShape, packagingVolume } from "./packaging-volume.js";
export const MIN_BASE_FILL = 95;
export const MAX_LAYOUT_PIECES = 500;
const EPS = 1e-7;
const positive = (n) => Number.isFinite(n) && n > 0;
export const orientationCounts = (item) => ({
  horizontal: item.horizontal ?? item.quantity - (item.vertical ?? 0),
  vertical: item.vertical ?? 0,
});
export function orientationIssue(item) {
  if (!Object.hasOwn(item, "horizontal") && !Object.hasOwn(item, "vertical"))
    return "";
  if (
    ["horizontal", "vertical"].some(
      (key) => Object.hasOwn(item, key) && !Number.isInteger(item[key]),
    )
  )
    return "Yatay ve dikey adetleri tam sayı olmalıdır.";
  const { horizontal, vertical } = orientationCounts(item);
  return !Number.isInteger(horizontal) ||
    horizontal < 0 ||
    !Number.isInteger(vertical) ||
    vertical < 0 ||
    horizontal + vertical !== item.quantity
    ? "Yatay ve dikey adetlerin toplamı ürün miktarına eşit, negatif olmayan tam sayılar olmalıdır."
    : "";
}
function productSize(product) {
  if (!["Dilim", "Adet", "Kap"].includes(product?.unitPricing?.unit))
    return {
      reason:
        "Grid için ürünün dilim / adet / kap birimini ve birim ölçülerini tanımlayın.",
    };
  const d = product.dimensions;
  if (![d?.length, d?.width, d?.height].every(positive))
    return { reason: "Ürünün uzunluk, genişlik ve yükseklik bilgileri eksik." };
  if (!positive(product.unitPricing.weight))
    return { reason: "Ürünün birim gramaj bilgisi eksik." };
  return {
    ...d,
    weight: product.unitPricing.weight,
    area: d.length * d.width,
    volume: d.length * d.width * d.height,
  };
}
function contained(a, b) {
  return (
    a.x >= b.x - EPS &&
    a.y >= b.y - EPS &&
    a.x + a.w <= b.x + b.w + EPS &&
    a.y + a.h <= b.y + b.h + EPS
  );
}
function splitFree(free, placed) {
  const next = [];
  for (const r of free) {
    if (
      placed.x >= r.x + r.w - EPS ||
      placed.x + placed.w <= r.x + EPS ||
      placed.y >= r.y + r.h - EPS ||
      placed.y + placed.h <= r.y + EPS
    ) {
      next.push(r);
      continue;
    }
    if (placed.x > r.x + EPS) next.push({ ...r, w: placed.x - r.x });
    if (placed.x + placed.w < r.x + r.w - EPS)
      next.push({
        ...r,
        x: placed.x + placed.w,
        w: r.x + r.w - placed.x - placed.w,
      });
    if (placed.y > r.y + EPS) next.push({ ...r, h: placed.y - r.y });
    if (placed.y + placed.h < r.y + r.h - EPS)
      next.push({
        ...r,
        y: placed.y + placed.h,
        h: r.y + r.h - placed.y - placed.h,
      });
  }
  return next.filter(
    (r, i) =>
      r.w > EPS &&
      r.h > EPS &&
      !next.some(
        (other, j) =>
          j !== i && contained(r, other) && (!contained(other, r) || j < i),
      ),
  );
}
function inside(shape, p) {
  if (
    p.x < -EPS ||
    p.y < -EPS ||
    p.x + p.w > shape.width + EPS ||
    p.y + p.h > shape.length + EPS
  )
    return false;
  if (!shape.circle) return true;
  const r = shape.width / 2;
  return [
    [p.x, p.y],
    [p.x + p.w, p.y],
    [p.x, p.y + p.h],
    [p.x + p.w, p.y + p.h],
  ].every(([x, y]) => (x - r) ** 2 + (y - r) ** 2 <= r * r + EPS);
}
function findPosition(free, piece, shape, mode = "short") {
  let best = null;
  for (const r of free)
    for (const orientation of piece.orientation === "auto"
      ? ["horizontal", "vertical"]
      : [piece.orientation]) {
      const w = orientation === "vertical" ? piece.width : piece.length,
        h = orientation === "vertical" ? piece.length : piece.width;
      if (w > r.w + EPS || h > r.h + EPS) continue;
      const candidates = [{ x: r.x, y: r.y }];
      if (shape.circle) {
        const radius = shape.width / 2;
        for (const y of new Set([
          r.y,
          r.y + r.h - h,
          Math.max(r.y, Math.min(r.y + r.h - h, radius - h / 2)),
        ])) {
          const farthest = Math.max(
            Math.abs(y - radius),
            Math.abs(y + h - radius),
          );
          if (farthest > radius) continue;
          const half = Math.sqrt(
            Math.max(0, radius * radius - farthest * farthest),
          );
          candidates.push(
            { x: Math.max(r.x, radius - half), y },
            { x: Math.min(r.x + r.w - w, radius + half - w), y },
          );
        }
      }
      for (const { x, y } of candidates) {
        const p = { ...piece, x, y, w, h, orientation };
        if (!contained(p, r) || !inside(shape, p)) continue;
        const short = Math.min(r.w - w, r.h - h),
          long = Math.max(r.w - w, r.h - h);
        const score =
          mode === "bottom" ? [y + h, x, short, long] : [short, long, y, x];
        if (
          !best ||
          score.some(
            (n, i) =>
              n < best.score[i] - EPS &&
              score
                .slice(0, i)
                .every((m, j) => Math.abs(m - best.score[j]) < EPS),
          )
        )
          best = { ...p, score };
      }
    }
  return best;
}
function arrange(pieces, shape) {
  const orders = [
    (a, b) =>
      Number(b.orientation === "vertical") -
        Number(a.orientation === "vertical") || b.area - a.area,
    (a, b) => b.area - a.area,
    (a, b) =>
      Math.max(b.length, b.width) - Math.max(a.length, a.width) ||
      b.area - a.area,
    (a, b) =>
      Math.min(b.length, b.width) - Math.min(a.length, a.width) ||
      b.area - a.area,
    (a, b) => a.productOrder - b.productOrder || b.area - a.area,
  ];
  let best;
  for (const order of orders)
    for (const mode of ["short", "bottom"]) {
      let free = [{ x: 0, y: 0, w: shape.width, h: shape.length }];
      const placements = [],
        unplaced = [];
      for (const piece of [...pieces].sort(order)) {
        const placed =
          piece.height > shape.height + EPS
            ? null
            : findPosition(free, piece, shape, mode);
        if (placed) {
          placements.push(placed);
          free = splitFree(free, placed);
        } else unplaced.push(piece);
      }
      const placedArea = placements.reduce((n, p) => n + p.area, 0);
      if (
        !best ||
        placedArea > best.placedArea + EPS ||
        (placedArea === best.placedArea &&
          placements.length > best.placements.length)
      )
        best = { free, placements, unplaced, placedArea };
      if (!unplaced.length) return best;
    }
  return best;
}
function fillProduct(free, product, shape, budget, orientation = "auto") {
  const size = productSize(product);
  if (size.reason || size.height > shape.height + EPS) return [];
  const placed = [];
  let spaces = free;
  const max = Math.min(
    MAX_LAYOUT_PIECES,
    Math.max(0, Math.floor(budget / size.weight + EPS)),
  );
  for (let i = 0; i < max; i++) {
    const p = findPosition(
      spaces,
      { ...size, productId: product.id, orientation },
      shape,
    );
    if (!p) break;
    placed.push(p);
    spaces = splitFree(spaces, p);
  }
  return placed;
}
export function boxLayout(
  box,
  items = [],
  products = [],
  { autoOrient = false } = {},
) {
  if (!box)
    return { ready: false, reason: "Yerleşim için kutu seçin.", valid: false };
  if (
    !Array.isArray(items) ||
    items.length > 50 ||
    items.some(
      (item) => !item || typeof item !== "object" || Array.isArray(item),
    )
  )
    return {
      ready: false,
      valid: false,
      reason: "Yerleşim ürünleri geçersiz.",
    };
  if (
    items.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > MAX_LAYOUT_PIECES,
    )
  )
    return {
      ready: false,
      valid: false,
      reason: `Her ürün için 1–${MAX_LAYOUT_PIECES} arasında tam sayı adet girin.`,
    };
  if (new Set(items.map((item) => item.productId)).size !== items.length)
    return {
      ready: false,
      valid: false,
      reason: "Aynı ürünün adetlerini tek satırda birleştirin.",
    };
  const volume = packagingVolume(box);
  if (!volume)
    return {
      ready: false,
      reason:
        "Kutunun kullanılabilir iç ölçülerini Ambalaj Merkezi’nde tamamlayın.",
      valid: false,
    };
  const circle = packagingShape(box) === "cylinder";
  const shape = {
    circle,
    width: circle ? box.diameter : box.length,
    length: circle ? box.diameter : box.width,
    height: box.height,
  };
  const totalArea = circle
    ? Math.PI * (shape.width / 2) ** 2
    : shape.width * shape.length;
  const totalQuantity = items.reduce(
    (sum, item) =>
      sum +
      (Number.isInteger(item.quantity) ? item.quantity : MAX_LAYOUT_PIECES + 1),
    0,
  );
  if (totalQuantity > MAX_LAYOUT_PIECES)
    return {
      ready: false,
      reason: `Grid en fazla ${MAX_LAYOUT_PIECES} dilim / adet için oluşturulabilir.`,
      valid: false,
    };
  const issues = [],
    pieces = [];
  let usedWeight = 0,
    usedVolume = 0,
    requestedArea = 0;
  items.forEach((item, index) => {
    const product = products.find((p) => p.id === item.productId),
      size = productSize(product);
    const issue =
      size.reason ||
      (!Number.isInteger(item.quantity) || item.quantity <= 0
        ? "Pozitif tam sayı adet girin."
        : orientationIssue(item));
    if (issue) {
      issues.push(`${product?.name || "Ürün"}: ${issue}`);
      return;
    }
    const counts = orientationCounts(item);
    for (let n = 0; n < item.quantity; n++)
      pieces.push({
        ...size,
        productId: item.productId,
        productOrder: index,
        pieceIndex: n,
        orientation:
          autoOrient ||
          (!Object.hasOwn(item, "horizontal") &&
            !Object.hasOwn(item, "vertical"))
            ? "auto"
            : n < counts.horizontal
              ? "horizontal"
              : "vertical",
      });
    usedWeight += size.weight * item.quantity;
    usedVolume += size.volume * item.quantity;
    requestedArea += size.area * item.quantity;
  });
  if (issues.length)
    return { ready: false, reason: issues.join(" "), valid: false };
  const packed = arrange(pieces, shape);
  const basePercent = (packed.placedArea / totalArea) * 100;
  const maxWeight = positive(box.maxProductWeight)
    ? box.maxProductWeight
    : null;
  const overweight = maxWeight !== null && usedWeight > maxWeight + EPS;
  const reason = packed.unplaced.length
    ? `${packed.unplaced.length} dilim / adet otomatik yerleşimde kutuya sığmıyor. Adetleri, yönleri veya kutuyu değiştirin.`
    : overweight
      ? "Kutu için tanımlı maksimum ürün kilogramı aşıldı."
      : maxWeight === null
        ? "Kilogram kontrolü için kutunun maksimum ürün ağırlığını Ambalaj Merkezi’nde tanımlayın."
        : basePercent + EPS < MIN_BASE_FILL
          ? `Taban doluluğu en az %${MIN_BASE_FILL} olmalıdır. Uygun ürün ekleyin veya daha küçük kutu seçin.`
          : "";
  const capacity = {
    ...packed,
    shape,
    ready: true,
    valid: !reason,
    reason,
    basePercent,
    requestedBasePercent: (requestedArea / totalArea) * 100,
    totalArea,
    totalVolume: volume.cm3,
    usedVolume: usedVolume / 1000,
    remainingVolume: Math.max(0, volume.cm3 - usedVolume / 1000),
    volumePercent: (usedVolume / (volume.cm3 * 1000)) * 100,
    usedWeight,
    maxWeight,
    remainingWeight:
      maxWeight === null ? null : Math.max(0, maxWeight - usedWeight),
    overweight,
    overCapacity: !!packed.unplaced.length || overweight,
    items,
  };
  const cache = new Map();
  capacity.forProduct = (product) => {
    if (cache.has(product.id)) return cache.get(product.id);
    const size = productSize(product);
    let result;
    if (size.reason) result = { reason: size.reason };
    else {
      const all = fillProduct(
        [{ x: 0, y: 0, w: shape.width, h: shape.length }],
        product,
        shape,
        maxWeight ?? Infinity,
      );
      const budget =
        maxWeight === null ? Infinity : Math.max(0, maxWeight - usedWeight);
      const remaining = capacity.overCapacity
        ? []
        : fillProduct(packed.free, product, shape, budget).slice(
            0,
            MAX_LAYOUT_PIECES - totalQuantity,
          );
      const h = capacity.overCapacity
        ? []
        : fillProduct(packed.free, product, shape, budget, "horizontal").slice(
            0,
            MAX_LAYOUT_PIECES - totalQuantity,
          );
      const v = capacity.overCapacity
        ? []
        : fillProduct(packed.free, product, shape, budget, "vertical").slice(
            0,
            MAX_LAYOUT_PIECES - totalQuantity,
          );
      result = {
        maximum: all.length,
        additional: remaining.length,
        horizontalAdditional: h.length,
        verticalAdditional: v.length,
        placements: remaining,
      };
    }
    cache.set(product.id, result);
    return result;
  };
  return capacity;
}
export function layoutItemsWithAutoOrientation(items, capacity) {
  return items.map((item) => {
    const placements =
      capacity.placements?.filter((p) => p.productId === item.productId) || [];
    if (placements.length !== item.quantity) return item;
    return {
      ...item,
      horizontal: placements.filter((p) => p.orientation === "horizontal")
        .length,
      vertical: placements.filter((p) => p.orientation === "vertical").length,
    };
  });
}
export function layoutRecommendations(
  capacity,
  box,
  items,
  products,
  isAllowed = () => true,
) {
  if (
    !capacity.ready ||
    capacity.maxWeight === null ||
    capacity.overCapacity ||
    capacity.basePercent >= MIN_BASE_FILL
  )
    return [];
  const suggestions = [];
  for (const product of products
    .filter((p) => p.status === "Aktif" && isAllowed(p))
    .slice(0, 100)) {
    const estimate = capacity.forProduct(product),
      area = product.dimensions?.length * product.dimensions?.width;
    if (!estimate.additional || !area) continue;
    const needed = Math.max(
      1,
      Math.ceil(
        ((MIN_BASE_FILL / 100) * capacity.totalArea -
          capacity.placedArea -
          EPS) /
          area,
      ),
    );
    const quantity = Math.min(needed, estimate.additional),
      added = estimate.placements.slice(0, quantity);
    const old = items.find((item) => item.productId === product.id);
    const previous = old
      ? orientationCounts(old)
      : { horizontal: 0, vertical: 0 };
    // Legacy auto-oriented items must retain the orientations actually displayed.
    if (
      old &&
      !Object.hasOwn(old, "horizontal") &&
      !Object.hasOwn(old, "vertical")
    ) {
      previous.horizontal = capacity.placements.filter(
        (p) => p.productId === product.id && p.orientation === "horizontal",
      ).length;
      previous.vertical = old.quantity - previous.horizontal;
    }
    const horizontal = added.filter(
        (p) => p.orientation === "horizontal",
      ).length,
      vertical = quantity - horizontal;
    const next = {
      productId: product.id,
      quantity: (old?.quantity || 0) + quantity,
      horizontal: previous.horizontal + horizontal,
      vertical: previous.vertical + vertical,
    };
    const nextItems = old
      ? items.map((item) => (item.productId === product.id ? next : item))
      : [...items, next];
    if (nextItems.length > 50) continue;
    const check = boxLayout(box, nextItems, products);
    if (!check.ready || check.overCapacity) continue;
    suggestions.push({
      product,
      quantity,
      horizontal,
      vertical,
      items: nextItems,
      basePercent: check.basePercent,
      completes: check.valid,
    });
  }
  return suggestions
    .sort(
      (a, b) =>
        Number(b.completes) - Number(a.completes) ||
        Math.abs(100 - a.basePercent) - Math.abs(100 - b.basePercent) ||
        a.quantity - b.quantity,
    )
    .slice(0, 3);
}
export function variantBoxLayoutIssue(variant, box, products, ownerId) {
  const items = Array.isArray(variant.items)
    ? variant.items
    : [
        {
          productId: variant.sourceProductId ?? ownerId,
          quantity: variant.quantity ?? variant.slices ?? 1,
        },
      ];
  return boxLayout(box, items, products).reason || "";
}
