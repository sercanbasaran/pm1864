import React, { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { categoryMatches, categoryOf, categoryPath } from "../../hierarchy.js";
import { hasUnitPricing } from "../../unit-pricing.js";
import { money } from "../../catalog-tools.js";

export default function VariantProductPicker({ products, categories, exclude = [], requireCapacity = false, onSelect, disabled = false }) {
  const [query, setQuery] = useState(""), [category, setCategory] = useState("");
  const ordered = categories.filter(c => !c.parentId).flatMap(root => [root, ...categories.filter(c => c.parentId === root.id)]);
  const matches = products.filter(p => p.status === "Aktif" && hasUnitPricing(p.unitPricing) && (!requireCapacity || p.variants.length < 50) && !exclude.includes(p.id) && categoryMatches(p, category, categories) && `${p.name} ${p.productCode || ""}`.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")));
  return <section className="variant-product-picker" aria-label="Ürün seçimi">
    <div className="variant-product-picker-filters">
      <Input label="Ürün ara" aria-label="Varyant için ürün ara" placeholder="Ürün adı veya kodu" prefix={<MagnifyingGlass size={16} />} value={query} onChange={e => setQuery(e.target.value)} />
      <Select label="Kategori" aria-label="Varyant ürün kategorisi" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tüm kategoriler</option>{ordered.map(c => <option key={c.id} value={c.id}>{c.parentId ? "↳ " : ""}{c.name} · {c.code}</option>)}</Select>
    </div>
    <p className="variant-product-picker-count" role="status">{matches.length} uygun ürün{matches.length > 25 ? " · İlk 25 sonuç gösteriliyor, aramanızı daraltın" : ""}</p>
    <div className="variant-product-picker-results">{matches.slice(0,25).map(p => <div className="variant-product-picker-row" key={p.id}>
      <div><strong>{p.name}</strong><small>{p.productCode || "—"} · {categoryPath(categoryOf(p,categories),categories)}</small><small>{money(p.unitPricing.price)} / {p.unitPricing.unit} · ≈ {p.unitPricing.weight} g</small></div>
      <Button type="button" disabled={disabled} aria-label={`${p.name} seç`} onClick={() => onSelect(p)}>Ekle →</Button>
    </div>)}{!matches.length && <p>Uygun ürün bulunamadı. Aramayı veya kategori filtresini değiştirin.</p>}</div>
  </section>;
}
