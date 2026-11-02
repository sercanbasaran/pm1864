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
