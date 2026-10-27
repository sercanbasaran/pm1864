import React from "react";
import ManagementSummary from "../../components/ui/ManagementSummary.jsx";
import { categoryActive } from "./category-list.js";

export default function CategoryTotals({ categories, action }) {
  const active = categories.filter((category) => categoryActive(category, categories));
  return (
    <ManagementSummary
      label="Kategori özeti"
      title="Kategorilerinizi yönetin"
      description="Ana ve alt kategorileri oluşturun ve düzenleyin."
      action={action}
      items={[
        { label: "Aktif ana kategori", value: active.filter((category) => !category.parentId).length, detail: "Aktif ana kategoriler" },
        { label: "Aktif alt kategori", value: active.filter((category) => category.parentId).length, detail: "Aktif alt kategoriler" },
      ]}
    />
  );
}
