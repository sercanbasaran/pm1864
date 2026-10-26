import { nextCategoryCode, validateCategory } from "../../catalog.js";
import { categorySalesAvailability } from "../../sales-availability.js";

export function categoryPromotion(category, categories, products = []) {
  if (!category) throw new Error("Kategori bulunamadı.");
  if (!category.parentId) throw new Error("Bu kategori zaten ana kategori.");
  const parent = categories.find((c) => c.id === category.parentId);
  if (!parent) throw new Error("Üst kategori bulunamadı.");
  if (categories.some((c) => c.parentId === category.id))
    throw new Error("Alt kategorisi bulunan bir kayıt dönüştürülemez.");
  const code = nextCategoryCode(categories);
  if (!code) throw new Error("Kullanılabilir ana kategori kodu bulunamadı.");
  const channels = categorySalesAvailability(category, categories);
  const promoted = {
    ...category,
    parentId: "",
    code,
    active: !!category.active && !!parent.active,
    salesAvailability: channels,
  };
  const error = validateCategory(promoted, categories);
  if (error) throw new Error(error);
  return {
    category: promoted,
    parent,
    channels,
    productCount: products.filter(
      (p) =>
        p.categoryId === category.id ||
        (!p.categoryId && p.category === category.name),
    ).length,
  };
}
