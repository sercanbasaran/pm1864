import React from "react";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import { categoryActive } from "./category-list.js";

export default function CategoryTotals({ categories }) {
  const active = categories.filter((c) => categoryActive(c, categories));
  return (
    <div
      className="category-summary-totals"
      role="group"
      aria-label="Aktif kategori sayıları"
    >
      <SlTag size="large">
        Ana kategori: {active.filter((c) => !c.parentId).length}
      </SlTag>
      <SlTag size="large">
        Alt kategori: {active.filter((c) => c.parentId).length}
      </SlTag>
    </div>
  );
}
