import { Select } from "../../components/ui/Controls.jsx";
import React from "react";
import { roots, categoryOf, rootOf, selectable } from "../../hierarchy.js";
export default function CategoryFields({ product, categories, onChange }) {
  const c = categoryOf(product, categories),
    parent = product.mainCategoryId || rootOf(c, categories)?.id || "",
    children = categories.filter((c) => c.parentId === parent);
  function choose(id) {
    const leaf = categories.find((c) => c.id === id);
    onChange({
      ...product,
      categoryId: id,
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
              categoryId: "",
              category: "",
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
          <option value="">Alt kategori seçin</option>
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
            Bu ana kategoriye önce bir alt kategori ekleyin.
          </small>
        )}
      </div>
    </div>
  );
}
