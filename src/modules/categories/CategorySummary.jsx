import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import CategoryChannelStats from "./CategoryChannelStats.jsx";
import { categorySummary } from "./category-list.js";
import "./category-summary.css";

export default function CategorySummary({ categories, products }) {
  const data = categorySummary(categories, products);
  return (
    <SlDetails
      summary={
        "Kategori özeti · " +
        categories.filter((c) => !c.parentId).length +
        " ana kategori · " +
        categories.filter((c) => c.parentId).length +
        " alt kategori"
      }
      className="category-summary-accordion"
    >
      <div className="category-summary-content">
        <CategoryChannelStats channels={data.channels} />
      </div>
    </SlDetails>
  );
}
