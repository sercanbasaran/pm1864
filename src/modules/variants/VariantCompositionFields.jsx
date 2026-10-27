import "./variant-composition.css";
import React, { useEffect, useState } from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import { Button, Input, Select, Textarea } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import MediaGallery from "../categories/CategoryGallery.jsx";
import ProductSatiety from "../products/ProductSatiety.jsx";
import VariantProductPicker from "./VariantProductPicker.jsx";
import { defaultPackagingItems, isBoxVariant } from "../packaging/packaging-data.js";
import { productInformationFields } from "../../product-information.js";
import { calculateVariant, defaultConsumables, deriveVariantInformation, packagingOptions } from "../../variant-composition.js";
import { hasUnitPricing } from "../../unit-pricing.js";
import { money } from "../../catalog-tools.js";

const steps = ["Varyant türü", "Ürünler", "Fiyat ve ambalaj", "Ürün bilgileri"];
export default function VariantCompositionFields({ product, onChange, disabled, focusVariantId = "", initialStep = 0, onReady }) {
  const { products, categories, variantTypes, satietyProducts, packagingItems = defaultPackagingItems(), consumables = defaultConsumables(), refresh } = useCatalog();
  const [step, setStep] = useState(initialStep), [error, setError] = useState("");
  const index = focusVariantId ? product.variants.findIndex(v => String(v.id) === focusVariantId) : product.variants.findIndex(v => !v.id);
  const i = index < 0 ? 0 : index, v = product.variants[i];
  useEffect(() => { onReady?.(!!v?.id || step === steps.length - 1); }, [step, onReady, v?.id]);
  if (!v) return <p>Varyant bulunamadı.</p>;
  const isBox = isBoxVariant(v, variantTypes);
  const selectedBox = packagingItems.find(item => item.id === v.packagingId);
  const items = Array.isArray(v.items) ? v.items : [{ productId: v.sourceProductId ?? product.id, quantity: v.quantity ?? (v.slices || 1) }];
  const update = patch => onChange({ ...product, variants: product.variants.map((item, n) => n === i ? { ...item, ...patch } : item) });
  const updateItems = next => update({ items: next, sourceProductId: next[0]?.productId, quantity: next[0]?.quantity });
  const derived = deriveVariantInformation({ ...v, items }, products);
  const overrides = v.informationOverrides ?? v.information ?? {};
  const information = { ...derived, ...overrides };
  const updateInfo = (key, value) => update({ items, sourceProductId: items[0].productId, quantity: items[0].quantity, informationOverrides: { ...overrides, [key]: value } });
  let calculated, calculationError;
  try { calculated = calculateVariant({ ...v, items, consumables: v.consumables || [] }, products, consumables); } catch (e) { calculationError = e.message; }
  function next() {
    setError("");
    if (step === 0 && (!v.typeId || !v.size.trim())) return setError("Varyant türünü ve adını girin.");
    if (step === 0 && isBox && !v.id && !selectedBox) return setError("Kutu tipi seçin.");
    if (step === 1 && (!items.length || items.some(item => { const source = products.find(p => p.id === item.productId); return !source || !hasUnitPricing(source.unitPricing) || !Number.isFinite(item.quantity) || item.quantity <= 0 || (["Dilim", "Kap", "Adet"].includes(source.unitPricing.unit) && !Number.isInteger(item.quantity)); }))) return setError("Her ürün için geçerli birim fiyatı, gramaj ve miktar girin.");
    if (step === 2 && !calculated) return setError(calculationError);
    if (step === 2) update({ items, sourceProductId: items[0].productId, quantity: items[0].quantity, consumables: v.consumables || [], images: v.images || [], informationOverrides: overrides });
    setStep(n => Math.min(n + 1, steps.length - 1));
  }
  return <fieldset disabled={disabled} className="variant-composition-fields">
    <nav className="variant-wizard-steps" aria-label={v.id ? "Varyant düzenleme bölümleri" : "Varyant oluşturma adımları"}>{steps.map((name, n) => v.id ? <button key={name} type="button" aria-current={n === step ? "step" : undefined} onClick={() => { setError(""); setStep(n); }}><b>{n + 1}</b> {name}</button> : <span key={name} aria-current={n === step ? "step" : undefined}><b>{n + 1}</b> {name}</span>)}</nav>
    {error && <p className="variant-wizard-error" role="alert">{error}</p>}
    {step === 0 && <section className="variant-wizard-section"><h3>Varyant türü ve adı</h3><p>Örneğin porsiyon veya kutu seçin ve varyanta bir ad verin.</p><div className="variant-basic-grid">
      <Select label="Varyant türü" value={v.typeId || ""} onChange={e => update({typeId:e.target.value, packagingId: ""})}><option value="">Tür seçin</option>{variantTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
      <Input label="Varyant adı" maxLength={30} required value={v.size} onChange={e => update({size:e.target.value})} />
      {isBox && <Select label="Kutu tipi" value={v.packagingId || ""} onChange={e => { const box = packagingItems.find(item => item.id === e.target.value); update({packagingId:e.target.value, ...(box ? {packaging:box.material === "Karton" ? "Karton kutu" : "Metal kutu"} : {})}); }}><option value="">Kutu tipi seçin</option>{packagingItems.filter(item => item.active || item.id === v.packagingId).map(item => <option key={item.id} value={item.id}>{item.name}{item.active ? "" : " (Pasif)"}</option>)}</Select>}
    </div></section>}
    {step === 1 && <section className="variant-wizard-section"><h3>Varyantın içindeki ürünler</h3><p>Her ürünün varyanttaki miktarını birimi üzerinden belirleyin.</p>
      {items.map((item, n) => { const source = products.find(p => p.id === item.productId); return <div className="variant-wizard-item variant-selected-product" key={item.productId}><div><strong>{source?.name || "Ürün bulunamadı"}</strong><small>{source?.unitPricing ? `${money(source.unitPricing.price)} / ${source.unitPricing.unit} · ${source.unitPricing.weight} g` : "Birim fiyatı veya gramajı eksik"}</small></div><Input label={`Miktar (${source?.unitPricing?.unit || "birim"})`} aria-label={`${source?.name || "Ürün"} miktarı`} type="number" min={0.001} step="any" value={item.quantity} onChange={e => updateItems(items.map((x,j) => j === n ? {...x,quantity:Number(e.target.value)} : x))} />{n > 0 && <Button type="button" aria-label={`${source?.name || "Ürün"} kaldır`} onClick={() => updateItems(items.filter((_,j) => j !== n))}>Kaldır</Button>}</div>; })}
      <VariantProductPicker products={products} categories={categories} exclude={items.map(item => item.productId)} disabled={items.length >= 50} onSelect={selected => updateItems([...items, {productId:selected.id, quantity:1}])} />
    </section>}
    {step === 2 && <section className="variant-wizard-section"><h3>Fiyat ve ambalaj</h3><p>Fiyat ve gramaj seçilen ürünlere göre hesaplanır.</p><div className="variant-basic-grid"><Select label="Ambalaj / servis şekli" value={v.packaging || ""} onChange={e => update({items, sourceProductId: items[0]?.productId, quantity: items[0]?.quantity, consumables: v.consumables || [], images: v.images || [], packaging:e.target.value})}><option value="">Seçin</option>{packagingOptions.map(p => <option key={p}>{p}</option>)}</Select><Input label="Satış fiyatı düzeltmesi (isteğe bağlı)" type="number" min={0.01} step={0.01} value={v.priceOverride ?? ""} onChange={e => update({items, sourceProductId: items[0]?.productId, quantity: items[0]?.quantity, consumables: v.consumables || [], images: v.images || [], priceOverride:e.target.value === "" ? null : Number(e.target.value)})} /></div>
      {calculated ? <div className="variant-calculation"><div><small>Hesaplanan fiyat</small><strong>{money(calculated.calculatedPrice)}</strong></div><div><small>Net gramaj</small><strong>{calculated.weight} g</strong></div><div><small>Satış fiyatı</small><strong>{money(calculated.price)}</strong></div></div> : <p role="status">{calculationError}</p>}
      <small>Fiyat düzeltmesi boşsa hesaplanan fiyat kullanılır. Net gramaja ambalaj ve sarf malzemeler dahil değildir.</small>
    </section>}
    {step === 3 && <section className="variant-wizard-section"><h3>Ürün bilgileri</h3><p>Bilgiler seçilen ürünlerden alınır. Bir alanı düzenlediğinizde kendi girdiğiniz değer kullanılır.</p>
      {!derived.nutritionComplete && <p role="status">Bazı ürünlerin besin değerleri eksik. 100 g için otomatik hesaplama yapılmadı; bilgileri tamamlayın veya elle girin.</p>}
      {items.length > 1 && <p>Doygunlukta aynı içerik için en yüksek ürün seviyesi önerilir. Besin değerleri net gramaja göre ağırlıklı hesaplanır.</p>}
      {productInformationFields.map(field => <Textarea key={field.key} label={field.label} rows={3} maxLength={field.maxLength} value={information[field.key] || ""} onChange={e => updateInfo(field.key,e.target.value)} />)}
      <h4>Doygunluk bilgisi</h4><ProductSatiety editing value={information.satiety || []} definitions={satietyProducts} onChange={value => updateInfo("satiety",value)} />
      <Button type="button" onClick={() => update({items, sourceProductId:items[0].productId, quantity:items[0].quantity, informationOverrides:{}})}>Bilgileri ürünlerden yeniden al</Button>
      <SlDetails summary={`Varyant görselleri · ${(v.images || []).length} görsel`} className="variant-optional-section"><p>Seçilen ürünlerin görsellerinden seçin veya yeni görsel ekleyin.</p><div className="variant-photo-options">{items.flatMap(item => products.find(p=>p.id===item.productId)?.images || []).filter((image,n,list) => list.findIndex(x => x.id === image.id) === n).map(image => <label key={image.id}><img src={image.url} alt="Ürün görseli" /><input type="checkbox" checked={(v.images || []).some(x=>x.id===image.id)} onChange={e => update({images:e.target.checked ? [...(v.images || []),image] : (v.images || []).filter(x=>x.id!==image.id)})} /> Seç</label>)}</div><MediaGallery label="Varyant" images={v.images || []} disabled={disabled} onRefresh={refresh} onChange={images => { update({images}); return true; }} /></SlDetails>
      <SlDetails summary={`Sarf malzemeler · ${(v.consumables || []).length} çeşit`} className="variant-optional-section">{(v.consumables || []).map((item,n) => <div className="variant-wizard-item" key={item.id}><strong>{consumables.find(c=>c.id===item.id)?.name || "Sarf malzeme"}</strong><Input label="Adet" type="number" min={1} step={1} value={item.quantity} onChange={e=>update({consumables:v.consumables.map((c,k)=>k===n?{...c,quantity:Number(e.target.value)}:c)})}/><Button type="button" onClick={()=>update({consumables:v.consumables.filter((_,k)=>k!==n)})}>Kaldır</Button></div>)}<Select label="Sarf malzeme ekle" value="" onChange={e=>{if(e.target.value)update({consumables:[...(v.consumables || []),{id:e.target.value,quantity:1}]});}}><option value="">Sarf malzeme seçin</option>{consumables.filter(c=>c.active && !(v.consumables || []).some(item=>item.id===c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></SlDetails>
    </section>}
    <div className="variant-wizard-navigation">{step > 0 && <Button type="button" onClick={() => {setError("");setStep(n=>n-1);}}>Geri</Button>}{step < steps.length - 1 && <Button type="button" variant="primary" onClick={next}>Devam et</Button>}</div>
  </fieldset>;
}
