import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import { Button } from "../../components/ui/Controls.jsx";
import {
  productQualityChecks,
  missingProductInformation,
} from "./product-quality.js";
import "./product-quality.css";
export default function ProductQualitySummary({
  products,
  selected,
  onSelect,
}) {
  return (
    <SlDetails
      summary={
        "Tamamlanacak ürün kayıtları · " +
        products.filter((p) => missingProductInformation(p, "any")).length +
        " ürün"
      }
      className="product-quality-summary"
    >
      <div className="product-quality-actions">
        {[
          { key: "any", label: "Eksik bilgili tüm ürünler" },
          ...productQualityChecks,
        ].map((check) => {
          const count = products.filter((p) =>
            missingProductInformation(p, check.key),
          ).length;
          return (
            <Button
              type="button"
              size="small"
              key={check.key}
              aria-pressed={selected === check.key}
              className={selected === check.key ? "selected" : ""}
              onClick={() => onSelect(selected === check.key ? "" : check.key)}
            >
              <span>{check.label}</span>
              <SlBadge pill variant={count ? "warning" : "neutral"}>
                {count}
              </SlBadge>
            </Button>
          );
        })}
        {selected && (
          <Button type="button" size="small" onClick={() => onSelect("")}>
            Eksik bilgi filtresini temizle
          </Button>
        )}
      </div>
    </SlDetails>
  );
}
