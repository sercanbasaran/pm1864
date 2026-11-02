export function separatorLayout(shape, values = []) {
  if (!Array.isArray(values) || values.length > 5)
    return { reason: "En fazla 2 yatay ve 3 dikey separatör eklenebilir." };
  if (
    values.some(
      (v) =>
        !v ||
        Object.keys(v).some(
          (key) => !["orientation", "position", "width"].includes(key),
        ) ||
        !["horizontal", "vertical"].includes(v.orientation) ||
        !Number.isFinite(v.position) ||
        v.position < 0 ||
        !Number.isFinite(v.width) ||
        v.width <= 0,
    )
  )
    return { reason: "Separatör yönü, konumu ve genişliği geçerli olmalıdır." };
  for (const orientation of ["horizontal", "vertical"]) {
    const list = values
        .filter((v) => v.orientation === orientation)
        .sort((a, b) => a.position - b.position),
      size = orientation === "vertical" ? shape.width : shape.length;
    if (list.length > (orientation === "horizontal" ? 2 : 3))
      return { reason: "En fazla 2 yatay ve 3 dikey separatör eklenebilir." };
    if (
      list.some(
        (v, i) =>
          v.position + v.width > size ||
          (i > 0 && list[i - 1].position + list[i - 1].width > v.position),
      )
    )
      return {
        reason:
          "Separatörler kutu sınırları içinde olmalı; aynı yöndeki separatörler üst üste gelmemelidir.",
      };
  }
  return {
    rectangles: values.map((v) =>
      v.orientation === "vertical"
        ? { x: v.position, y: 0, w: v.width, h: shape.length }
        : { x: 0, y: v.position, w: shape.width, h: v.width },
    ),
  };
}
export function circleRectangleArea(rect, diameter) {
  const r = diameter / 2;
  const primitive = (x) =>
    (x * Math.sqrt(Math.max(0, r * r - x * x)) +
      r * r * Math.asin(Math.max(-1, Math.min(1, x / r)))) /
    2;
  const quadrant = (x, y) => {
    const a = Math.min(r, Math.abs(x)),
      b = Math.min(r, Math.abs(y)),
      cut = Math.sqrt(Math.max(0, r * r - b * b)),
      flat = Math.min(a, cut);
    return (
      Math.sign(x) *
      Math.sign(y) *
      (b * flat + (a > cut ? primitive(a) - primitive(cut) : 0))
    );
  };
  const x = rect.x - r,
    y = rect.y - r;
  return (
    quadrant(x + rect.w, y + rect.h) -
    quadrant(x, y + rect.h) -
    quadrant(x + rect.w, y) +
    quadrant(x, y)
  );
}

export function alignSeparators(shape, values, direction, alignment) {
  const issue = separatorLayout(shape, values).reason;
  if (issue) return { reason: issue };
  const indices = values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.orientation === direction)
    .sort((a, b) => a.v.position - b.v.position);
  if (!indices.length)
    return { reason: "Önce bu yönde bir separatör ekleyin." };
  const size = direction === "vertical" ? shape.width : shape.length;
  const first = indices[0].v.position,
    last = indices.at(-1).v.position + indices.at(-1).v.width,
    extent = last - first;
  const delta =
    alignment === "start"
      ? -first
      : alignment === "end"
        ? size - last
        : (size - extent) / 2 - first;
  const result = values.map((v) => ({ ...v }));
  let cursor =
    (size - indices.reduce((sum, { v }) => sum + v.width, 0)) /
    (indices.length + 1);
  const gap = cursor;
  for (const { v, i } of indices) {
    result[i].position = alignment === "justify" ? cursor : v.position + delta;
    cursor += v.width + gap;
  }
  return { values: result };
}
export function fillWithSeparators(shape, values, placements) {
  const issue = separatorLayout(shape, values).reason;
  if (issue) return { reason: issue };
  const result = values.map((v) => ({ ...v }));
  for (const direction of ["vertical", "horizontal"]) {
    const size = direction === "vertical" ? shape.width : shape.length;
    const occupied = placements
      .map((p) =>
        direction === "vertical" ? [p.x, p.x + p.w] : [p.y, p.y + p.h],
      )
      .concat(
        values
          .filter((v) => v.orientation === direction)
          .map((v) => [v.position, v.position + v.width]),
      )
      .sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    const gaps = [];
    for (const [start, end] of occupied) {
      if (start - cursor >= 0.01)
        gaps.push({ position: cursor, width: start - cursor });
      cursor = Math.max(cursor, end);
    }
    if (size - cursor >= 0.01)
      gaps.push({ position: cursor, width: size - cursor });
    const remaining =
      (direction === "vertical" ? 3 : 2) -
      values.filter((v) => v.orientation === direction).length;
    result.push(
      ...gaps
        .sort((a, b) => b.width - a.width)
        .slice(0, remaining)
        .map((gap) => ({ ...gap, orientation: direction })),
    );
  }
  return { values: result, added: result.length - values.length };
}
