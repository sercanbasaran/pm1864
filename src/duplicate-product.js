import { productInformationFields } from "./product-information.js";

// Only editable content is copied; server-owned identities are always allocated on save.
export function duplicateProduct(source) {
  const draft = {
    isNew: true,
    name: `${source.name.slice(0, 152).trimEnd()} (Kopya)`,
    status: "Taslak",
    publicCardEnabled: false,
    variants: [],
  };
  for (const key of [
    "categoryId",
    "category",
    "mainCategoryId",
    "description",
    "unitPricing",
    "portion",
    "dimensions",
    "satiety",
    "salesAvailability",
    "images",
    "mediaId",
    "customImage",
    "image",
    ...productInformationFields.map((field) => field.key),
  ]) {
    if (source[key] !== undefined) draft[key] = structuredClone(source[key]);
  }
  return draft;
}
