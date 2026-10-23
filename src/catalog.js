import { defaultVariantTypes } from "./variant-types.js";
import { validateSalesAvailability } from "./sales-availability.js";
import { validateProductInformation } from "./product-information.js";
export const variantUnits = [
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
  const used = new Set(categories.map((c) => c.code));
  return (
    Array.from({ length: 9 }, (_, i) => String((i + 1) * 100)).find(
      (c) => !used.has(c),
    ) ||
    Array.from({ length: 899 }, (_, i) => String(i + 101)).find(
      (c) => !used.has(c),
    ) ||
    ""
  );
}
export function nextSubcategoryCode(categories, parentId) {
  const parent = categories.find((c) => c.id === parentId && !c.parentId);
  if (!parent || !/^\d{3}$/.test(parent.code)) return "";
  const used = new Set(categories.map((c) => c.code));
  for (let value = Number(parent.code) + 1; value <= 999; value++) {
    const code = String(value).padStart(3, "0");
    if (!used.has(code)) return code;
  }
  return "";
}
export function validateCategory(draft, categories) {
  const salesError = validateSalesAvailability(draft.salesAvailability);
  if (salesError) return salesError;
  if (!draft.name.trim()) return "Kategori adı gerekli.";
  if (!/^\d{3}$/.test(draft.code))
    return "Kategori kodu 100–999 arasında üç rakam olmalı.";
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
  if (others.some((c) => c.code === draft.code))
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
  if (!product.variants.length)
    return { tab: "Varyant & fiyat", message: "En az bir varyant gerekli." };
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
      (variant.size.trim() || "Varyant").slice(0, 30 - suffix.length) + suffix;
    count++;
  } while (names.has(normalizeName(size)));
  const { id, sku, ...fields } = variant;
  return { ...fields, size };
}
