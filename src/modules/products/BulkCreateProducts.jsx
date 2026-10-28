import React, { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { SalesChannelSwitches } from "../../components/ui/SalesChannels.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { selectable } from "../../hierarchy.js";
import { validateProduct } from "../../catalog.js";
import UnitPricing from "./UnitPricing.jsx";
import "./bulk-products.css";

const emptyRow = () => ({ name: "", rootId: "", childId: "", unitPricing: null, salesAvailability: { store: false, online: false, foodDelivery: false } });
export default function BulkCreateProducts({ onClose }) {
  const { categories, products, variantTypes, mutate, notify } = useCatalog();
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [result, setResult] = useState("");
  const active = categories.filter(category => selectable(category, categories));
  const roots = active.filter(category => !category.parentId);
  function update(index, patch) { setRows(previous => previous.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  async function save() {
    setError(""); setResult("");
    const names = new Set(products.map(p => p.name.trim().toLocaleLowerCase("tr-TR")));
    const drafts = [];
    for (const [index, row] of rows.entries()) {
      const categoryId = row.childId || row.rootId;
      const category = active.find(c => c.id === categoryId);
      const product = { isNew: true, name: row.name.trim(), categoryId, category: category?.name || "", status: "Taslak", variants: [], unitPricing: row.unitPricing, salesAvailability: row.salesAvailability };
      const issue = validateProduct(product, categories, variantTypes);
      if (issue) { setError(`${index + 1}. ürün: ${issue.message}`); return; }
      const key = product.name.toLocaleLowerCase("tr-TR");
      if (names.has(key)) { setError(`${index + 1}. ürün: Ürün adı zaten mevcut veya tekrarlanıyor.`); return; }
      names.add(key); drafts.push(product);
    }
    setSaving(true);
    let count = 0;
    for (const product of drafts) {
      try { await mutate("/products", { product }, "POST"); count++; }
      catch (e) { setRows(rows.slice(count)); setError(`${count + 1}. ürün kaydedilemedi: ${e.message}`); setResult(`${count} ürün oluşturuldu.`); setSaving(false); return; }
    }
    notify(`${count} ürün oluşturuldu.`); onClose();
  }
  return <Modal title="Çoklu ürün ekle" onClose={onClose} busy={saving} wide className="bulk-products-dialog"><div className="bulk-products bulk-create-products">
    <p>Ürünler taslak olarak oluşturulur. Birim fiyatı ve satış kanallarını şimdi veya daha sonra düzenleyebilirsiniz.</p>
    {rows.map((row, index) => <section className="bulk-create-card" key={index}>
      <div className="bulk-create-header"><h3>Ürün {index + 1}</h3><Button type="button" size="small" disabled={saving || rows.length === 1} onClick={() => setRows(rows.filter((_, i) => i !== index))}>Ürünü kaldır</Button></div>
      <div className="bulk-create-identity">
        <Input label="Ürün adı" aria-label={`${index + 1}. ürün adı`} required maxLength={160} value={row.name} disabled={saving} onChange={e => update(index, { name: e.target.value })} />
        <Select label="Ana kategori" aria-label={`${index + 1}. ürün ana kategorisi`} required value={row.rootId} disabled={saving} onChange={e => update(index, { rootId: e.target.value, childId: "" })}><option value="">Ana kategori seçin</option>{roots.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select label="Alt kategori" aria-label={`${index + 1}. ürün alt kategorisi`} value={row.childId} disabled={saving || !row.rootId} onChange={e => update(index, { childId: e.target.value })}><option value="">Alt kategori seçin (isteğe bağlı)</option>{active.filter(c => c.parentId === row.rootId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      </div>
      <div className="bulk-create-details"><section><h4>Birim fiyatı</h4><UnitPricing value={row.unitPricing} editing onChange={unitPricing => update(index, { unitPricing })} /></section>
        <section><SalesChannelSwitches product={{ categoryId: row.childId || row.rootId, status: "Taslak", salesAvailability: row.salesAvailability }} categories={categories} disabled={saving} onChange={salesAvailability => update(index, { salesAvailability })} /></section></div>
    </section>)}
    {error && <p role="alert">{error}</p>}{result && <p role="status">{result}</p>}
    <div className="bulk-products-actions"><Button type="button" disabled={saving || rows.length >= 50} onClick={() => setRows([...rows, emptyRow()])}>Ürün ekle</Button><Button type="button" variant="primary" disabled={saving} onClick={save}>Ürünleri oluştur</Button></div>
  </div></Modal>;
}
