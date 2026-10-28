import { Select } from "../../components/ui/Controls.jsx";
import React from "react";
import { roots, categoryOf, rootOf, selectable } from "../../hierarchy.js";
export default function CategoryFields({ product, categories, onChange }) {
  const c = categoryOf(product, categories),
    parent = product.mainCategoryId || rootOf(c, categories)?.id || "",
    children = categories.filter((c) => c.parentId === parent);
  function choose(id) {
    const leaf = categories.find((c) => c.id === (id || parent));
    onChange({
      ...product,
      categoryId: leaf?.id || "",
      category: leaf?.name || "",
      mainCategoryId: parent,
    });
  }
  return (
    <div className="form-grid">
      <div>
        <Select
          label="Ana kategori"
          aria-label="Ürün ana kategorisi"
          value={parent}
          onChange={(e) =>
            onChange({
              ...product,
              mainCategoryId: e.target.value,
              categoryId: e.target.value,
              category:
                categories.find((c) => c.id === e.target.value)?.name || "",
            })
          }
        >
          <option value="">Ana kategori seçin</option>
          {roots(categories).map((root) => (
            <option
              key={root.id}
              value={root.id}
              disabled={!root.active && root.id !== parent}
            >
              {root.name}
              {!root.active ? " (Pasif)" : ""}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Select
          label="Alt kategori"
          aria-label="Ürün alt kategorisi"
          value={c?.parentId === parent ? c.id : ""}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">Alt kategori yok (00)</option>
          {children.map((child) => (
            <option
              key={child.id}
              value={child.id}
              disabled={
                !selectable(child, categories) &&
                child.id !== product.categoryId
              }
            >
              {child.name}
              {!child.active ? " (Pasif)" : ""}
            </option>
          ))}
        </Select>
        {parent && !children.length && (
          <small className="input-help">
            Ürün doğrudan ana kategoriye eklenir. Ürün kodunda alt kategori
            bölümü 00 olur.
          </small>
        )}
      </div>
    </div>
  );
}
