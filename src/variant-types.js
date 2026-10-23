// Type IDs are stable; a variant's sales unit remains a separate field.
export const defaultVariantTypes = () => [
  { id: "type-item", name: "Adet", requiresQuantity: false },
  { id: "type-slice", name: "Dilim", requiresQuantity: true },
  { id: "type-portion", name: "Porsiyon", requiresQuantity: false },
  { id: "type-box", name: "Kutu", requiresQuantity: false },
  { id: "type-weight", name: "Gramaj", requiresQuantity: false },
];
export const variantTypeName = (variant, types) =>
  types.find((type) => type.id === variant.typeId)?.name || "Tip seçilmedi";
export function upgradeVariantTypes(doc) {
  if (Array.isArray(doc.variantTypes)) return false;
  doc.variantTypes = defaultVariantTypes();
  for (const product of doc.products || [])
    for (const variant of product.variants || []) {
      if (!variant.typeId)
        variant.typeId = variant.slices > 0 ? "type-slice" : "type-item";
    }
  return true;
}
