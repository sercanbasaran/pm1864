import React from "react";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import { Button } from "../../components/ui/Controls.jsx";

const checks = [
  ["description", "Açıklaması olmayan kategoriler"],
  ["identity", "Adı, kodu veya bağlantı bilgisi eksik kategoriler"],
  ["empty", "Ürün bağlanmamış kategoriler"],
];
export default function CategoryQualitySummary({ quality, onQuality }) {
  return (
    <section
      className="category-summary-quality"
      aria-label="Tamamlanacak kategori kayıtları"
    >
      <h3>Tamamlanacak kayıtlar</h3>
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
    </section>
  );
}
