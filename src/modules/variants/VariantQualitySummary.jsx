import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import { Button } from "../../components/ui/Controls.jsx";
import {
  variantQualityChecks,
  missingVariantInformation,
} from "./variant-quality.js";
import "../products/product-quality.css";
export default function VariantQualitySummary({
  rows,
  products,
  types,
  selected,
  onSelect,
}) {
  const count = (key) =>
    rows.filter(({ p, v }) =>
      missingVariantInformation(v, key, products, types, p),
    ).length;
  return (
    <SlDetails
      summary={`Tamamlanacak varyant kayıtları · ${count("any")} varyant`}
      className="product-quality-summary"
    >
      <div className="product-quality-actions">
        {[
          { key: "any", label: "Eksik bilgili tüm varyantlar" },
          ...variantQualityChecks,
        ].map((c) => (
          <Button
            key={c.key}
            type="button"
            size="small"
            variant={selected === c.key ? "primary" : "default"}
            aria-pressed={selected === c.key}
            onClick={() => onSelect(selected === c.key ? "" : c.key)}
          >
            <span>{c.label}</span>
            <SlBadge pill variant={count(c.key) ? "warning" : "neutral"}>
              {count(c.key)}
            </SlBadge>
          </Button>
        ))}
        {selected && (
          <Button type="button" size="small" onClick={() => onSelect("")}>
            Eksik bilgi filtresini temizle
          </Button>
        )}
      </div>
    </SlDetails>
  );
}
