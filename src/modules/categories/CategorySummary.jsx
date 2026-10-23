import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import ManagementSummary from "../../components/ui/ManagementSummary.jsx";
import Card from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { categoryActive, categorySummary } from "./category-list.js";

export default function CategorySummary({ categories, products, onQuality }) {
  const data = categorySummary(categories, products);
  return (
    <SlDetails
      open
      summary="Kategori özeti"
      className="category-summary-accordion"
    >
      <div className="category-summary-content">
        <ManagementSummary
          label="Kategori özeti"
          items={[
            {
              label: "Aktif ana kategori sayısı",
              value: categories.filter(
                (c) => !c.parentId && categoryActive(c, categories),
              ).length,
              detail: "Tüm satış kanalları",
            },
            {
              label: "Aktif alt kategori sayısı",
              value: categories.filter(
                (c) => c.parentId && categoryActive(c, categories),
              ).length,
              detail: "Ana kategorisi de aktif olanlar",
            },
          ]}
        />
        <div className="category-channel-grid">
          {data.channels.map((channel) => (
            <Card key={channel.key}>
              <h3>{channel.label}</h3>
              <dl className="category-channel-stats">
                <div>
                  <dt>Aktif Ana Kategori Sayısı</dt>
                  <dd>{channel.main}</dd>
                </div>
                <div>
                  <dt>Aktif Alt Kategori Sayısı</dt>
                  <dd>{channel.children}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
        <Card>
          <h3>Tamamlanacak kategori kayıtları</h3>
          <p className="muted">
            Aşağıdaki bilgilendirmelere tıklayarak ilgili kategorileri
            listeleyebilirsiniz.
          </p>
          <div className="category-quality-actions">
            {[
              ["description", "Açıklaması olmayan kategoriler"],
              ["identity", "Adı, kodu veya bağlantı bilgisi eksik kategoriler"],
              ["empty", "Ürün bağlanmamış kategoriler"],
            ].map(([key, label]) => (
              <Button
                type="button"
                key={key}
                className="overview-task"
                onClick={() => onQuality(key)}
              >
                <span>{label}</span>
                <strong>{data.quality[key]}</strong>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </SlDetails>
  );
}
