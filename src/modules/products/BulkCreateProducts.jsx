import React, { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { categoryPath, selectable } from "../../hierarchy.js";
import { validateProduct } from "../../catalog.js";
import "./bulk-products.css";

export default function BulkCreateProducts({ onClose }) {
  const { categories, products, variantTypes, mutate, notify } = useCatalog();
  const [rows, setRows] = useState([{ name: "", categoryId: "" }]);
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [result, setResult] = useState("");
  const active = categories.filter(category => selectable(category, categories));
  function update(index, patch) { setRows(previous => previous.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  async function save() {
    setError(""); setResult("");
    const names = new Set(products.map(p => p.name.trim().toLocaleLowerCase("tr-TR")));
    const drafts = [];
    for (const [index, row] of rows.entries()) {
      const category = active.find(c => c.id === row.categoryId);
      const product = { isNew: true, name: row.name.trim(), categoryId: row.categoryId, category: category?.name || "", status: "Taslak", variants: [] };
      const issue = validateProduct(product, categories, variantTypes);
      if (issue) { setError(`${index + 1}. satır: ${issue.message}`); return; }
      const key = product.name.toLocaleLowerCase("tr-TR");
      if (names.has(key)) { setError(`${index + 1}. satır: Ürün adı zaten mevcut veya tekrarlanıyor.`); return; }
      names.add(key); drafts.push(product);
    }
    setSaving(true);
    let count = 0;
    for (const product of drafts) {
      try { await mutate("/products", { product }, "POST"); count++; }
      catch (e) { setRows(rows.slice(count)); setError(`${count + 1}. satır kaydedilemedi: ${e.message}`); setResult(`${count} ürün oluşturuldu.`); setSaving(false); return; }
    }
    notify(`${count} ürün oluşturuldu.`); onClose();
  }
  return <Modal title="Çoklu ürün ekle" onClose={onClose} busy={saving} wide className="bulk-products-dialog"><div className="bulk-products">
    <p>Ürünleri taslak olarak oluşturun; fiyat, görsel ve diğer bilgileri daha sonra tamamlayabilirsiniz. Her ürün ayrı kaydedilir.</p>
    {rows.map((row, index) => <div className="bulk-products-grid" key={index}>
      <Input label={`${index + 1}. ürün adı`} maxLength={160} value={row.name} onChange={e => update(index, { name: e.target.value })} />
      <Select label="Kategori" value={row.categoryId} onChange={e => update(index, { categoryId: e.target.value })}><option value="">Kategori seçin</option>{active.map(c => <option key={c.id} value={c.id}>{categoryPath(c, categories)}</option>)}</Select>
      <Button type="button" disabled={saving || rows.length === 1} onClick={() => setRows(rows.filter((_, i) => i !== index))}>Satırı kaldır</Button>
    </div>)}
    {error && <p role="alert">{error}</p>}{result && <p role="status">{result}</p>}
    <div className="bulk-products-actions"><Button type="button" disabled={saving || rows.length >= 50} onClick={() => setRows([...rows, {name:"", categoryId:""}])}>Satır ekle</Button><Button type="button" variant="primary" disabled={saving} onClick={save}>Ürünleri oluştur</Button></div>
  </div></Modal>;
}
