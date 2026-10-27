import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import { categoryQuality } from "./category-list.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import { Button } from "../../components/ui/Controls.jsx";

const checks = [
  ["description", "Açıklaması olmayan kategoriler"],
  ["identity", "Adı, kodu veya bağlantı bilgisi eksik kategoriler"],
  ["empty", "Ürün bağlanmamış kategoriler"],
];
export default function CategoryQualitySummary({ categories, products, onQuality }) {
  const issues = categories.map((category) => categoryQuality(category, categories, products));
  const quality = Object.fromEntries(checks.map(([key]) => [key, issues.filter((issue) => issue[key]).length]));
  const total = issues.filter((issue) => Object.values(issue).some(Boolean)).length;
  return (
    <SlDetails
      summary={`Tamamlanacak kategori kayıtları · ${total} kategori`}
      className="category-summary-quality"
    >
      <div className="category-quality-actions">
        {checks.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="small"
            onClick={() => onQuality(key)}
          >
            <span>{label}</span>
            <SlBadge pill variant={quality[key] ? "warning" : "neutral"}>
              {quality[key]}
            </SlBadge>
          </Button>
        ))}
      </div>
    </SlDetails>
  );
}
