import { boxLayout, placementData } from "./box-layout.js";
export const GRID_NAME_FONT = 3;
export function wrapGridName(name, width) {
  const max = Math.max(1, Math.floor((width - 2) / GRID_NAME_FONT));
  const tokens = String(name || "Ürün")
    .trim()
    .split(/\s+/)
    .flatMap((word) => {
      const chars = Array.from(word),
        parts = [];
      for (let i = 0; i < chars.length; i += max)
        parts.push(chars.slice(i, i + max).join(""));
      return parts;
    });
  const lines = [];
  let line = "";
  for (const word of tokens) {
    if (Array.from(line + (line ? " " : "") + word).length <= max)
      line += (line ? " " : "") + word;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
export function alignGridSelection(
  capacity,
  box,
  products,
  indices,
  axis,
  mode,
) {
  const selected = capacity.placements.filter((_, i) => indices.includes(i));
  if (!selected.length)
    return { reason: "Önce gridde bir veya daha fazla dilim seçin." };
  const key = axis === "horizontal" ? "x" : "y",
    size = axis === "horizontal" ? "w" : "h",
    span = axis === "horizontal" ? capacity.shape.width : capacity.shape.length;
  const low = Math.min(...selected.map((p) => p[key])),
    high = Math.max(...selected.map((p) => p[key] + p[size]));
  const delta =
    mode === "start"
      ? -low
      : mode === "end"
        ? span - high
        : (span - (high - low)) / 2 - low;
  const placements = placementData(capacity);
  if (mode === "justify") {
    const total = selected.reduce((sum, p) => sum + p[size], 0);
    if (total > span)
      return {
        reason: "Seçili dilimler bu yönde eşit aralıkla dağıtılamıyor.",
      };
    const gap = (span - total) / (selected.length + 1);
    let position = gap;
    const order = capacity.placements
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => indices.includes(i))
      .sort((a, b) => a.p[key] - b.p[key]);
    for (const { p, i } of order) {
      placements[i][key] = position;
      position += p[size] + gap;
    }
  } else
    indices.forEach((i) => {
      if (placements[i]) placements[i][key] += delta;
    });
  const check = boxLayout({ ...box, placements }, capacity.items, products);
  if (!check.ready || check.overCapacity)
    return { reason: check.reason || "Bu hizalama çakışma oluşturuyor." };
  return { placements, items: capacity.items };
}
