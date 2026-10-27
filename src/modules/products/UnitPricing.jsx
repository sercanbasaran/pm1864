import React from "react";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { money } from "../../catalog-tools.js";
import { productUnits, countedUnit, hasUnitPricing } from "../../unit-pricing.js";
export default function UnitPricing({ value, editing = false, onChange, compact = false }) {
  const pricing = value || { price: null, unit: "", weight: null };
  if (!editing) {
    if (!hasUnitPricing(value)) return <>—</>;
    return <div className="unit-pricing-summary"><strong>{money(value.price)} / {value.unit.toLocaleLowerCase("tr-TR")}</strong>{!compact && <span>≈ {new Intl.NumberFormat("tr-TR").format(value.weight)} g / {value.unit.toLocaleLowerCase("tr-TR")}</span>}</div>;
  }
  function update(patch) { onChange({ ...pricing, ...patch }); }
  return <div className="unit-pricing-fields">
    <Select label="Ürün birimi" value={pricing.unit} required onChange={e => update({ unit: e.target.value, weight: countedUnit(e.target.value) ? (countedUnit(pricing.unit) ? pricing.weight : null) : e.target.value === "Kilogram" ? 1000 : 1 })}>
      <option value="">Birim seçin</option>{productUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
    </Select>
    <Input label="Birim fiyat (₺)" aria-label="Birim fiyat" type="number" min={.01} max={1e8} step={.01} required value={pricing.price ?? ""} onChange={e => update({ price: e.target.value === "" ? null : Number(e.target.value) })} />
    {countedUnit(pricing.unit) ? <Input label={"1 " + pricing.unit.toLocaleLowerCase("tr-TR") + " gramajı (g)"} aria-label="Birim gramajı" type="number" min={.001} max={1e7} step="any" required value={pricing.weight ?? ""} onChange={e => update({ weight: e.target.value === "" ? null : Number(e.target.value) })} /> : pricing.unit && <p className="input-help">1 {pricing.unit.toLocaleLowerCase("tr-TR")} = {pricing.unit === "Kilogram" ? "1.000" : "1"} g</p>}
    <p className="input-help">Fiyatı seçilen birimin bir tanesi için girin. Dilim, kap ve adet gramajı bir tanenin net ağırlığıdır.</p>
    {value && <Button type="button" size="small" onClick={() => onChange(null)}>Birim fiyat bilgisini temizle</Button>}
  </div>;
}
