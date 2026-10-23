import React from "react";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import Card from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { can } from "../../permissions.js";
import { visibleChildren } from "../../app/modules.js";
import { useCatalog } from "../../app/CatalogContext.jsx";

export default function ModuleHome({ group, user, onNavigate }) {
  const { products, categories } = useCatalog();
  const counts = {
    categories: `${categories.length} kategori`,
    products: `${products.length} ürün`,
    variants: `${products.reduce((total, product) => total + product.variants.length, 0)} varyant`,
    codes: `${products.length} ürün kodu`,
    prices: `${products.reduce((total, product) => total + product.variants.length, 0)} varyant fiyatı`,
  };
  return (
    <section
      className="module-home-grid"
      aria-label={group.label + " alt modülleri"}
    >
      {visibleChildren(group, user, can).map((module) => (
        <Card key={module.id} className="module-home-card">
          <module.icon size={28} aria-hidden="true" />
          <h2>{module.label}</h2>
          <p>
            {module.description ||
              "Ürün ve varyant fiyatlarını tekil veya toplu olarak güncelleyin."}
          </p>
          <SlTag variant={module.status === "planned" ? "neutral" : "success"}>
            {module.status === "planned"
              ? "Hazırlık aşamasında"
              : counts[module.id] || "Kullanıma hazır"}
          </SlTag>
          <Button
            type="button"
            onClick={() => onNavigate(module.id)}
            aria-label={module.label + " alt modülünü aç"}
          >
            Alt modülü aç
          </Button>
        </Card>
      ))}
    </section>
  );
}
