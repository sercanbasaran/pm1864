import React from "react";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { defaultConsumables } from "../../variant-composition.js";
import { money } from "../../catalog-tools.js";
import MediaGallery from "../categories/CategoryGallery.jsx";
export default function VariantCompositionSummary({ variants }) {
  const { products = [], consumables = defaultConsumables() } = useCatalog();
  return (
    <div>
      {variants
        .filter((v) => v.sourceProductId !== undefined)
        .map((v) => (
          <section key={v.id || v.size} className="category-field-card">
            <div>
              <h3>{v.size}</h3>
              <p>
                {products.find((p) => p.id === v.sourceProductId)?.name} ·{" "}
                {v.quantity} {v.unit} · {v.weight} g
              </p>
              <p>
                Hesaplanan fiyat: {money(v.calculatedPrice)} · Satış fiyatı:{" "}
                {money(v.price)}
              </p>
              <p>
                {v.packaging === "Tabakta servis" ? "Servis şekli" : "Ambalaj"}:{" "}
                {v.packaging}
              </p>
              {v.images?.length > 0 && (
                <MediaGallery
                  images={v.images}
                  label="Varyant"
                  editable={false}
                />
              )}
              <ul>
                {v.consumables?.map((c) => (
                  <li key={c.id}>
                    {consumables.find((d) => d.id === c.id)?.name ||
                      "Sarf malzeme"}
                    : {c.quantity} adet
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
    </div>
  );
}
