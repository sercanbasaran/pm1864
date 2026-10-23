export const categoryPagePath = (category) =>
  "/kategori/" + encodeURIComponent(category.slug);
export const categoryPageUrl = (category) =>
  new URL(categoryPagePath(category), window.location.origin).href;
