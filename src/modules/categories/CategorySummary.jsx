import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import CategoryTotals from "./CategoryTotals.jsx";
import CategoryChannelStats from "./CategoryChannelStats.jsx";
import CategoryQualitySummary from "./CategoryQualitySummary.jsx";
import { categorySummary } from "./category-list.js";
import "./category-summary.css";

export default function CategorySummary({ categories, products, onQuality }) {
  const data = categorySummary(categories, products);
  return (
    <SlDetails
      open
      summary="Kategori özeti"
      className="category-summary-accordion"
    >
      <div className="category-summary-content">
        <CategoryTotals categories={categories} />
        <CategoryChannelStats channels={data.channels} />
        <CategoryQualitySummary quality={data.quality} onQuality={onQuality} />
      </div>
    </SlDetails>
  );
}
