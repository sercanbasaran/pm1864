export const nutritionRows = [
  { key: "energyKcal", label: "Enerji", unit: "kcal" },
  { key: "energyKj", label: "Enerji", unit: "kJ" },
  { key: "fat", label: "Yağ", unit: "g" },
  { key: "saturatedFat", label: "Doymuş yağ", unit: "g" },
  { key: "carbohydrate", label: "Karbonhidrat", unit: "g" },
  { key: "sugars", label: "Şeker", unit: "g" },
  { key: "fibre", label: "Lif", unit: "g" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "salt", label: "Tuz", unit: "g" },
];
const number = "(-?\\d+(?:[.,]\\d+)*(?:[eE][+-]?\\d+)?)";
export function parseNutrition(text = "") {
  const values = {};
  let remaining = text.replace(/^\s*100\s*g\s*için\s*:/i, "");
  for (const row of nutritionRows) {
    const pattern = row.key.startsWith("energy")
      ? new RegExp(number + "\\s*" + row.unit, "i")
      : new RegExp(
          "(?:^|[;:\\n])\\s*" + row.label + "\\s*:?\\s*" + number + "\\s*g",
          "i",
        );
    const match = remaining.match(pattern);
    let numeric = match?.[1] || "";
    if (numeric.includes(",") && numeric.includes("."))
      numeric =
        numeric.lastIndexOf(",") > numeric.lastIndexOf(".")
          ? numeric.replaceAll(".", "").replace(",", ".")
          : numeric.replaceAll(",", "");
    else numeric = numeric.replace(",", ".");
    values[row.key] = numeric;
    if (match) remaining = remaining.replace(match[0], ";");
  }
  remaining = remaining.replace(/^\s*100\s*g\s*için\s*:/i, "");
  if (values.energyKcal || values.energyKj)
    remaining = remaining.replace(/Enerji/i, "");
  const notes = remaining
    .split(/[;\n]/)
    .map((s) => s.replace(/^[\s/.,:]+|[\s/.,:]+$/g, ""))
    .filter(Boolean)
    .join("; ");
  return { values, notes };
}
export function serializeNutrition(values, notes = "") {
  const energy = nutritionRows
    .slice(0, 2)
    .filter((r) => values[r.key] !== "" && values[r.key] != null)
    .map((r) => String(values[r.key]).replace(".", ",") + " " + r.unit)
    .join(" / ");
  const parts = [
    energy ? "Enerji " + energy : "",
    ...nutritionRows
      .slice(2)
      .filter((r) => values[r.key] !== "" && values[r.key] != null)
      .map(
        (r) =>
          r.label +
          " " +
          String(values[r.key]).replace(".", ",") +
          " " +
          r.unit,
      ),
    notes.trim(),
  ].filter(Boolean);
  return parts.length ? "100 g için: " + parts.join("; ") + "." : "";
}
export function validateNutrition(text) {
  const { values } = parseNutrition(text);
  return Object.values(values).some(
    (v) => v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0),
  )
    ? "Besin değerleri sıfır veya pozitif sayı olmalıdır."
    : "";
}
