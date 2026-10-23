import SlProgressBar from "@shoelace-style/shoelace/dist/react/progress-bar/index.js";
import Card from "../../components/ui/Card.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { roots } from "../../hierarchy.js";
import React from "react";
import {
  Package,
  ArrowRight,
  Image,
  TextAlignLeft,
  Clock,
  Plus,
} from "@phosphor-icons/react";
import { catalogSummary, dateTime } from "../../catalog-tools.js";
export default function Overview({
  products,
  categories,
  logs,
  onBrowse,
  onActivity,
  onNewProduct,
  canCreate,
}) {
  const data = catalogSummary(products, categories),
    max = Math.max(1, ...data.groups.map((c) => c.count));
  const addAction = canCreate ? (
    <Button
      type="button"
      variant="primary"
      className="btn"
      onClick={() => onNewProduct()}
    >
      <Plus size={16} />
      Ürün ekle
    </Button>
  ) : null;
  return (
    <div className="overview-grid">
      <Card className="panel overview-lead">
        <h2>
          {products.length
            ? "Kataloğunuzu tamamlayın."
            : "İlk ürününüzü oluşturun."}
        </h2>
        <p>
          {products.length} ürün, {data.variants} varyant ve{" "}
          {roots(categories).filter((c) => c.active).length} aktif ana kategori.
          Bu panel kayıtlı verilerinizle güncellenir.
        </p>
        <div className="overview-actions">
          <Button className="btn" onClick={() => onBrowse({})}>
            Ürünleri git
            <ArrowRight size={16} />
          </Button>
          {canCreate && <ActionBar position="middle">{addAction}</ActionBar>}
        </div>
      </Card>
      <Card className="panel">
        <div className="panel-title">
          <h2>Tamamlanacak kayıtlar</h2>
        </div>
        {[
          [Clock, "Taslak ürünler", data.drafts.length, { status: "Taslak" }],
          [
            Image,
            "Görseli olmayan ürünler",
            data.withoutImages.length,
            { quality: "image" },
          ],
          [
            TextAlignLeft,
            "Açıklaması olmayan ürünler",
            data.withoutDescriptions.length,
            { quality: "description" },
          ],
        ].map(([Icon, label, count, filter]) => (
          <Button
            className="overview-task"
            key={label}
            onClick={() => onBrowse(filter)}
          >
            <Icon size={20} />
            <span>{label}</span>
            <strong>{count}</strong>
            <ArrowRight size={16} />
          </Button>
        ))}
      </Card>
      <Card className="panel">
        <div className="panel-title">
          <h2>Kategori dağılımı</h2>
          <span className="muted">Ürün adedi</span>
        </div>
        {data.groups.map((c) => (
          <div className="category-distribution" key={c.id}>
            <Button onClick={() => onBrowse({ category: c.id })}>
              <span>
                {c.name}
                {!c.active && " (Pasif)"}
              </span>
              <strong>{c.count}</strong>
            </Button>
            <SlProgressBar
              aria-label={c.name + " ürün oranı"}
              value={(c.count / max) * 100}
            />
          </div>
        ))}
        {!categories.length && <p className="muted">Henüz kategori yok.</p>}
      </Card>
      <Card className="panel">
        <div className="panel-title">
          <h2>Son işlemler</h2>
          <Button className="text-btn" onClick={onActivity}>
            Tümünü gör
            <ArrowRight size={15} />
          </Button>
        </div>
        {logs.slice(0, 5).map((log) => (
          <div className="overview-log" key={log.id}>
            <strong>{log.title}</strong>
            <p>{log.detail}</p>
            <small>
              {log.actor} · {dateTime(log.time)}
            </small>
          </div>
        ))}
        {!logs.length && (
          <div className="empty">
            <Package size={28} />
            <h3>Henüz işlem yok</h3>
            <p>İlk kaydınız burada görünecek.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
