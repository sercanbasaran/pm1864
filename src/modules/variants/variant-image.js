export function selectedVariantImage(variant) {
 const image=variant.images?.[0];
 return image?.url || (image?.id ? `/api/media/${encodeURIComponent(image.id)}/content` : '');
}
