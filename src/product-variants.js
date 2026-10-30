// Composition is authoritative; the storage owner can differ from the contents.
export function variantsContainingProduct(product, products = [product]) {
  const seen = new Set();
  return products.flatMap((owner) =>
    (owner.variants || []).flatMap((variant) => {
      const ids = variant.items?.length
        ? variant.items.map((item) => item.productId)
        : [variant.sourceProductId ?? owner.id];
      const key = variant.id ?? variant;
      if (!ids.some((id) => String(id) === String(product.id)) || seen.has(key))
        return [];
      seen.add(key);
      return [{ owner, variant }];
    }),
  );
}
