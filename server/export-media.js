// Temporary anonymous image access is limited to images included in variant exports.
export function exportMediaAllowed(doc, id) {
  if (doc.settings?.publicExportImages !== true) return false;
  const products = doc.products || [];
  const usedProducts = new Set();
  const usedBoxes = new Set();
  const variants = [];
  for (const owner of products)
    for (const variant of owner.variants || []) {
      variants.push(variant);
      usedProducts.add(String(owner.id));
      for (const item of variant.items || [
        { productId: variant.sourceProductId ?? owner.id },
      ])
        usedProducts.add(String(item.productId));
      if (variant.packagingId) usedBoxes.add(variant.packagingId);
    }
  const references = (record) => {
    if (
      record.mediaId === id ||
      record.images?.some((image) => image.id === id)
    )
      return true;
    return [
      record.customImage,
      record.imageUrl,
      ...(record.images || []).map((image) => image.url),
    ].some((value) => {
      if (typeof value !== "string") return false;
      // Local media paths only; external hosts do not grant access to local files.
      return (
        value.split(/[?#]/)[0] ===
        `/api/media/${encodeURIComponent(id)}/content`
      );
    });
  };
  return (
    variants.some(references) ||
    products.some((p) => usedProducts.has(String(p.id)) && references(p)) ||
    (doc.packagingItems || []).some(
      (box) => usedBoxes.has(box.id) && references(box),
    )
  );
}
