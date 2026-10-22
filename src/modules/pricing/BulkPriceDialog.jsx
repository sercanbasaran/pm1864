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
    [error, setError] = useState("");
  const selected = products.filter((p) => ids.includes(p.id));
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
    try {
      await mutate("/prices/bulk", { ids, percent: value, direction });
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
      disabled={busy || !selected.length}
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
              onChange={(e) => setDirection(e.target.value)}
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
              onChange={(e) => setPercent(e.target.value)}
            />
          </div>
        </div>
        <div className="bulk-preview">
          <strong>Değişiklik önizlemesi</strong>
          {selected.flatMap((p) =>
            p.variants.map((v) => (
              <div key={v.id}>
                <span>
                  {p.name} · {v.size}
                </span>
                <span>
                  {money(v.price)} →{" "}
                  <b>{money(bulkPrice(v.price, Number(percent), direction))}</b>
                </span>
              </div>
            )),
          )}
        </div>
        <ActionBar position="bottom">{saveAction}</ActionBar>
      </form>
    </Modal>
  );
}
