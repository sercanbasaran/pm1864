import { deriveVariantInformation } from "../../variant-composition.js";
import { productQualityChecks } from "../products/product-quality.js";
import { isBoxVariant } from "../packaging/packaging-data.js";

export const variantQualityChecks = [
  {
    key: "type",
    label: "Türü eksik varyantlar",
    missing: (v, p, types) => !types.some((t) => t.id === v.typeId),
  },
  {
    key: "image",
    label: "Görseli olmayan varyantlar",
    missing: (v) => !v.images?.length,
  },
  {
    key: "composition",
    label: "Ürün bilgisi eksik varyantlar",
    missing: (v, p) =>
      !v.items?.length ||
      v.items.some(
        (item) =>
          !p.some((source) => source.id === item.productId) ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0,
      ),
  },
  {
    key: "pricing",
    label: "Fiyat veya gramajı eksik varyantlar",
    missing: (v) =>
      !Number.isFinite(v.price) ||
      v.price <= 0 ||
      !Number.isFinite(v.weight) ||
      v.weight <= 0,
  },
  {
    key: "packaging",
    label: "Ambalaj veya servis bilgisi eksik varyantlar",
    missing: (v, p, types) =>
      !v.packaging || (isBoxVariant(v, types) && !v.packagingId),
  },
  ...productQualityChecks
    .filter((c) =>
      [
        "ingredients",
        "allergens",
        "nutrition",
        "servingSuggestion",
        "storageConditions",
        "longTermStorage",
        "satiety",
      ].includes(c.key),
    )
    .map((c) => ({
      key: c.key,
      label: c.label
        .replace("ürünler", "varyantlar")
        .replace("baklavalar", "baklava varyantları"),
      missing: (v, products, types, owner) => {
        const info =
          v.information ||
          deriveVariantInformation(
            {
              ...v,
              items: v.items || [
                {
                  productId: v.sourceProductId ?? owner?.id,
                  quantity: v.quantity || v.slices || 1,
                },
              ],
            },
            products,
          );
        const ids = v.items?.map((item) => item.productId) || [
          v.sourceProductId ?? owner?.id,
        ];
        const members = products.filter((p) => ids.includes(p.id));
        return c.missing({
          ...info,
          ...(v.informationOverrides || {}),
          category: members.map((p) => p.category || "").join(" "),
          name: members.map((p) => p.name || "").join(" "),
        });
      },
    })),
];
export function missingVariantInformation(v, key, products, types = [], owner) {
  return variantQualityChecks.some(
    (c) =>
      (key === "any" || c.key === key) && c.missing(v, products, types, owner),
  );
}
