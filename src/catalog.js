import {validateProductDimensions} from "./product-dimensions.js";
import {validatePortion} from "./portions.js";
import { validateUnitPricing } from "./unit-pricing.js";
import { defaultVariantTypes } from "./variant-types.js";
import { validateSalesAvailability } from "./sales-availability.js";
import { validateProductInformation } from "./product-information.js";
export const variantUnits = [
  "Dilim",
  "Kap",
  "Adet",
  "Kilogram",
  "Gram",
  "Porsiyon",
  "Kutu",
  "Paket",
  "Litre",
  "Mililitre",
];
export const slugify = (value) =>
  value
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const normalizeName = (value) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
export function nextCategoryCode(categories) {
  const next = Math.max(9, ...categories.filter(c => !c.parentId).map(c => Number(c.code) || 0)) + 1;
  return next <= 99 ? String(next) : "";
}
export function nextSubcategoryCode(categories, parentId) {
  if (!categories.some(c => c.id === parentId && !c.parentId)) return "";
  const next = Math.max(9, ...categories.filter(c => c.parentId === parentId).map(c => Number(c.code) || 0)) + 1;
  return next <= 99 ? String(next) : "";
}
export function validateCategory(draft, categories) {
  const salesError = validateSalesAvailability(draft.salesAvailability);
  if (salesError) return salesError;
  if (!draft.name.trim()) return "Kategori adı gerekli.";
  if (!/^[1-9]\d$/.test(draft.code)) return "Kategori kodu 10–99 arasında iki rakam olmalı.";
  if (!slugify(draft.slug)) return "Geçerli bir kategori bağlantısı gerekli.";
  const others = categories.filter((c) => c.id !== draft.id);
  if (
    others.some(
      (c) =>
        (c.parentId || "") === (draft.parentId || "") &&
        normalizeName(c.name) === normalizeName(draft.name),
    )
  )
    return "Bu kategori adı zaten kullanılıyor.";
  if (others.some((c) => c.code === draft.code && (c.parentId || "") === (draft.parentId || "")))
    return "Bu kategori kodu zaten kullanılıyor.";
  if (others.some((c) => c.slug === slugify(draft.slug)))
    return "Bu kategori bağlantısı zaten kullanılıyor.";
  let parent = draft.parentId;
  const seen = new Set([draft.id]);
  while (parent) {
    if (seen.has(parent)) return "Üst kategori seçimi döngü oluşturamaz.";
    seen.add(parent);
    const found = categories.find((c) => c.id === parent);
    if (!found) return "Üst kategori bulunamadı.";
    parent = found.parentId;
  }
  if (draft.parentId) {
    const parent = categories.find((c) => c.id === draft.parentId);
    if (parent?.parentId)
      return "Alt kategori yalnızca ana kategoriye bağlanabilir.";
    if (categories.some((c) => c.parentId === draft.id))
      return "Alt kategorisi olan ana kategori taşınamaz.";
  }
  return "";
}
export function validateProduct(
  product,
  categories,
  variantTypes = defaultVariantTypes(),
) {
  if (!product.name.trim())
    return { tab: "Genel bilgiler", message: "Ürün adı gerekli." };
  if (
    !categories.some(
      (c) =>
        (product.categoryId
          ? c.id === product.categoryId
          : c.name === product.category) &&
        (!product.isNew ||
          (c.active &&
            (!c.parentId ||
              categories.find((r) => r.id === c.parentId)?.active))),
    )
  )
    return { tab: "Genel bilgiler", message: "Aktif bir kategori seçin." };
  const dimensionsError = validateProductDimensions(product.dimensions);
  if (dimensionsError) return {tab:"Genel bilgiler",message:dimensionsError};
  const unitPriceError = validateUnitPricing(product.unitPricing);
  if (unitPriceError) return { tab: "Genel bilgiler", message: unitPriceError };
  const portionError = validatePortion(product.portion, product.unitPricing);
  if (portionError) return {tab:"Genel bilgiler",message:portionError};
  const salesError =
    validateSalesAvailability(product.salesAvailability) ||
    product.variants
      .map((v) => validateSalesAvailability(v.salesAvailability))
      .find(Boolean);
  if (salesError) return { tab: "Genel bilgiler", message: salesError };
  const informationError = validateProductInformation(product);
  if (informationError)
    return { tab: "Besin ve saklama", message: informationError };
  if (product.variants.length > 50)
    return {
      tab: "Varyant & fiyat",
      message: "Bir üründe en fazla 50 varyant olabilir.",
    };
  if (product.variants.some((v) => typeof v.size === "string" && v.size.trim().length > 45)) return { tab: "Varyant & fiyat", message: "Varyant adı en fazla 45 karakter olabilir." };
  const names = product.variants.map((v) => normalizeName(v.size));
  if (names.some((n) => !n) || new Set(names).size !== names.length)
    return {
      tab: "Varyant & fiyat",
      message: "Varyant adları dolu ve birbirinden farklı olmalı.",
    };
  if (
    product.variants.some(
      (v) => !variantTypes.some((type) => type.id === v.typeId),
    )
  )
    return {
      tab: "Varyant & fiyat",
      message: "Her varyant için bir varyant tipi seçin.",
    };
  if (
    product.variants.some(
      (v) =>
        variantTypes.find((type) => type.id === v.typeId)?.requiresQuantity &&
        (!Number.isInteger(v.slices) || v.slices < 1 || v.slices > 100000),
    )
  )
    return {
      tab: "Varyant & fiyat",
      message: "Dilim tipi için 1–100.000 arasında tam sayı dilim adedi girin.",
    };
  if (
    product.variants.some(
      (v) =>
        !Number.isFinite(v.price) ||
        v.price <= 0 ||
        Math.abs(v.price * 100 - Math.round(v.price * 100)) > 0.00001 ||
        !Number.isFinite(v.weight) ||
        v.weight <= 0 ||
        !Number.isInteger(v.slices) ||
        v.slices < 0,
    )
  )
    return {
      tab: "Varyant & fiyat",
      message:
        "Her varyant için en fazla iki ondalıklı pozitif fiyat, pozitif gramaj ve sıfır veya pozitif tam dilim sayısı girin.",
    };
  if (
    product.variants.some(
      (v) =>
        (v.unit !== undefined && !variantUnits.includes(v.unit)) ||
        (v.packaging !== undefined &&
          (typeof v.packaging !== "string" || v.packaging.length > 120)),
    )
  )
    return {
      tab: "Varyant & fiyat",
      message:
        "Geçerli bir birim seçin. Ambalaj bilgisi en fazla 120 karakter olabilir.",
    };
  return null;
}

export function duplicateVariant(variant, variants) {
  const names = new Set(variants.map((v) => normalizeName(v.size)));
  let count = 1,
    size;
  do {
    const suffix = count === 1 ? " Kopya" : ` Kopya ${count}`;
    size =
      (variant.size.trim() || "Varyant").slice(0, 45 - suffix.length) + suffix;
    count++;
  } while (names.has(normalizeName(size)));
  const { id, sku, ...fields } = variant;
  return { ...fields, size };
}
