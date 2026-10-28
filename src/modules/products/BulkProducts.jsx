import React, { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { salesChannels } from "../../sales-availability.js";
import { productUnits, countedUnit } from "../../unit-pricing.js";
import { useCatalog } from "../../app/CatalogContext.jsx";
import "./bulk-products.css";

export default function BulkProducts({ ids, canEditProducts, canEditPrices, onClose, onDone }) {
  const { mutate, busy, notify } = useCatalog();
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [weight, setWeight] = useState("");
  const [channels, setChannels] = useState({});
  const [error, setError] = useState("");
  async function save() {
    const changes = {};
    if (price !== "") changes.price = Number(price);
    if (unit) { changes.unit = unit; if (countedUnit(unit)) changes.weight = Number(weight); }
    if (Object.keys(channels).length) changes.channels = channels;
    if (!Object.keys(changes).length) { setError("En az bir alan seçin."); return; }
    if (countedUnit(unit) && (!weight || Number(weight) <= 0)) { setError("Seçilen birim için gramaj girin."); return; }
    try { await mutate("/products/bulk", { ids, changes }, "POST"); notify(`${ids.length} ürün güncellendi.`); onDone(); }
    catch (e) { setError(e.message); }
  }
  return <Modal title="Toplu ürün işlemleri" onClose={onClose} busy={busy} wide className="bulk-products-dialog">
    <div className="bulk-products"><p>{ids.length} ürün seçildi. Boş bırakılan alanlar değişmez.</p>
      <div className="bulk-products-grid">
        {canEditPrices && <Input label="Birim fiyat (₺)" type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />}
        {canEditProducts && <Select label="Birim türü" value={unit} onChange={e => setUnit(e.target.value)}><option value="">Değiştirme</option>{productUnits.map(u => <option key={u}>{u}</option>)}</Select>}
        {canEditProducts && countedUnit(unit) && <Input label="Birimin yaklaşık gramajı (g)" type="number" min="0.001" step="any" value={weight} onChange={e => setWeight(e.target.value)} />}
      </div>
      {canEditProducts && <div className="bulk-products-grid">{salesChannels.map(({key, label}) => <Select key={key} label={label} value={channels[key] === undefined ? "" : channels[key] ? "on" : "off"} onChange={e => setChannels(prev => { const next = {...prev}; if (!e.target.value) delete next[key]; else next[key] = e.target.value === "on"; return next; })}><option value="">Değiştirme</option><option value="on">Açık</option><option value="off">Kapalı</option></Select>)}</div>}
      {error && <p role="alert">{error}</p>}
      <div className="bulk-products-actions"><Button type="button" onClick={onClose} disabled={busy}>Vazgeç</Button><Button type="button" variant="primary" onClick={save} disabled={busy}>Güncelle</Button></div>
    </div>
  </Modal>;
}
