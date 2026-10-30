export function suggestedVariantName(product, typeId, types = []) {
  const name = product?.name?.trim();
  const type = types.find((item) => item.id === typeId)?.name?.trim();
  if (!name || !type) return "";
  const suffix = ` [${type}]`;
  return (
    Array.from(name)
      .slice(0, Math.max(0, 45 - Array.from(suffix).length))
      .join("")
      .trimEnd() + suffix
  );
}

export function variantNameFromContents(variant, owner, products, types) {
  const id = variant?.items?.length
    ? variant.items[0].productId
    : (variant?.sourceProductId ?? owner.id);
  const product =
    products.find((item) => String(item.id) === String(id)) ||
    (String(owner.id) === String(id) ? owner : null);
  return suggestedVariantName(product, variant?.typeId, types);
}
