import React, { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { salesChannels } from "../../sales-availability.js";
import { useCatalog } from "../../app/CatalogContext.jsx";
import "../products/bulk-products.css";

export default function BulkVariants({
  ids,
  canWrite,
  canEditPrices,
  onClose,
  onDone,
}) {
  const { mutate, busy, notify } = useCatalog();
  const [channels, setChannels] = useState({});
  const [active, setActive] = useState("");
  const [mode, setMode] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  async function save() {
    if (busy) return;
    const changes = {};
    if (canWrite && Object.keys(channels).length) changes.channels = channels;
    if (canWrite && active) changes.active = active === "active";
    if (canEditPrices && mode)
      changes.price = { mode, value: value === "" ? null : Number(value) };
    if (!Object.keys(changes).length) {
      setError("En az bir alan seçin.");
      return;
    }
    if (
      changes.price &&
      (!Number.isFinite(changes.price.value) || changes.price.value <= 0)
    ) {
      setError("Geçerli bir fiyat veya yüzde girin.");
      return;
    }
    try {
      await mutate("/variants/bulk", { ids, changes }, "POST");
      notify(`${ids.length} varyant güncellendi.`);
      onDone();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Modal
      title="Toplu varyant işlemleri"
      onClose={onClose}
      busy={busy}
      wide
      className="bulk-variants-dialog"
    >
      <div className="bulk-products">
        <p>
          {ids.length} varyant seçildi. “Değiştirme” seçilen alanlar korunur.
        </p>
        {canWrite && (
          <div className="bulk-products-grid">
            {salesChannels.map(({ key, label }) => (
              <Select
                key={key}
                label={label}
                value={
                  channels[key] === undefined
                    ? ""
                    : channels[key]
                      ? "on"
                      : "off"
                }
                onChange={(e) =>
                  setChannels((prev) => {
                    const next = { ...prev };
                    if (!e.target.value) delete next[key];
                    else next[key] = e.target.value === "on";
                    return next;
                  })
                }
              >
                <option value="">Değiştirme</option>
                <option value="on">Açık</option>
                <option value="off">Kapalı</option>
              </Select>
            ))}
            <Select
              label="Varyant durumu"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            >
              <option value="">Değiştirme</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </Select>
          </div>
        )}
        {canEditPrices && (
          <div className="bulk-products-grid">
            <Select
              label="Fiyat güncelleme"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setValue("");
              }}
            >
              <option value="">Değiştirme</option>
              <option value="fixed">Sabit fiyat belirle (₺)</option>
              <option value="increase">Yüzde artır</option>
              <option value="decrease">Yüzde azalt</option>
            </Select>
            {mode && (
              <Input
                label={
                  mode === "fixed" ? "Satış fiyatı (₺)" : "Değişim oranı (%)"
                }
                type="number"
                min="0.01"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </div>
        )}
        {mode && (
          <p>Güncellenen satış fiyatları manuel fiyat olarak korunur.</p>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="bulk-products-actions">
          <Button type="button" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={save}
          >
            Güncelle
          </Button>
        </div>
      </div>
    </Modal>
  );
}
