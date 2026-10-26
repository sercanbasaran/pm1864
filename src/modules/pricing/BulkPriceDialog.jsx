import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import ActionBar from "../../components/ui/ActionBar.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import React, { useState } from "react";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { money, bulkPrice } from "../../catalog-tools.js";
import Modal from "../../components/ui/Modal.jsx";
export default function BulkPriceDialog({ ids, onClose }) {
  const { products, busy, mutate, notify } = useCatalog(),
    [percent, setPercent] = useState("10"),
    [direction, setDirection] = useState("increase"),
    [overrides, setOverrides] = useState({}),
    [error, setError] = useState("");
  const selected = products.filter((p) => ids.includes(p.id));
  const rows = selected.flatMap((p) => p.variants.map((v) => ({ p, v })));
  const validPercent =
    Number.isFinite(Number(percent)) &&
    Number(percent) > 0 &&
    Number(percent) <= 1000 &&
    (direction !== "decrease" || Number(percent) < 100);
  const finalPrice = (v) =>
    Object.prototype.hasOwnProperty.call(overrides, v.id)
      ? overrides[v.id]
      : validPercent
        ? String(bulkPrice(v.price, Number(percent), direction))
        : "";
  async function save(e) {
    e.preventDefault();
    setError("");
    const value = Number(percent);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 1000 ||
      (direction === "decrease" && value >= 100)
    ) {
      setError("Geçerli bir değişim yüzdesi girin.");
      return;
    }
    const prices = rows.map(({ p, v }) => ({
      productId: p.id,
      variantId: v.id,
      price: finalPrice(v) === "" ? null : Number(finalPrice(v)),
    }));
    if (
      prices.some(
        (row) =>
          !Number.isFinite(row.price) ||
          row.price <= 0 ||
          row.price > 1e8 ||
          Math.abs(row.price * 100 - Math.round(row.price * 100)) > 0.00001,
      )
    ) {
      setError(
        "Her satır için pozitif, en fazla iki ondalıklı geçerli fiyat girin.",
      );
      return;
    }
    try {
      await mutate("/prices/bulk", { ids, percent: value, direction, prices });
      notify("Varyant fiyatları güncellendi.");
      onClose();
    } catch (e) {
      setError(e.message);
    }
  }
  const saveAction = (
    <Button
      type="submit"
      variant="primary"
      className="btn full"
      disabled={busy || !rows.length || !validPercent}
    >
      Fiyatları güncelle
    </Button>
  );
  return (
    <Modal title="Toplu fiyat güncelleme" busy={busy} onClose={onClose}>
      <form className="bulk-form" onSubmit={save}>
        <ActionBar>{saveAction}</ActionBar>
        {error && (
          <SlAlert open variant="danger" className="form-error">
            {error}
          </SlAlert>
        )}
        <p>{selected.length} ürünün tüm varyantlarına uygulanır.</p>
        <div className="form-grid">
          <div>
            <Select
              label="İşlem"
              disabled={busy}
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setOverrides({});
              }}
            >
              <option value="increase">Fiyat artır</option>
              <option value="decrease">Fiyat düşür</option>
            </Select>
          </div>
          <div>
            <Input
              label="Değişim (%)"
              disabled={busy}
              required
              type="number"
              min="0.01"
              max={direction === "decrease" ? "99.99" : "1000"}
              step="0.01"
              value={percent}
              onChange={(e) => {
                setPercent(e.target.value);
                setOverrides({});
              }}
            />
          </div>
        </div>
        <div className="bulk-preview">
          <strong>Değişiklik önizlemesi</strong>
          <p>
            Yeni fiyatları elle düzeltebilirsiniz. Oran veya işlem değişirse
            elle düzeltmeler sıfırlanır ve fiyatlar yeniden hesaplanır.
          </p>
          {!rows.length && (
            <p>Seçilen ürünlerde fiyatı güncellenecek varyant bulunmuyor.</p>
          )}
          {rows.map(({ p, v }) => (
            <div key={v.id}>
              <span>
                {p.name} · {v.size}
                <small>Mevcut fiyat: {money(v.price)}</small>
              </span>
              <div>
                <Input
                  label={p.name + " · " + v.size + " yeni fiyat (₺)"}
                  type="number"
                  min={0.01}
                  max={1e8}
                  step={0.01}
                  required
                  disabled={busy || !validPercent}
                  value={finalPrice(v)}
                  onChange={(e) =>
                    setOverrides({ ...overrides, [v.id]: e.target.value })
                  }
                />
                {Object.prototype.hasOwnProperty.call(overrides, v.id) && (
                  <Button
                    type="button"
                    size="small"
                    disabled={busy}
                    onClick={() => {
                      const next = { ...overrides };
                      delete next[v.id];
                      setOverrides(next);
                    }}
                  >
                    Hesaplanan fiyata dön
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <ActionBar position="bottom">{saveAction}</ActionBar>
      </form>
    </Modal>
  );
}
