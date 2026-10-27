import React, { useState } from "react";
import EditorPage from "../../components/layout/EditorPage.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { newVariant } from "./VariantFields.jsx";
import VariantEditor from "./VariantEditor.jsx";
import VariantProductPicker from "./VariantProductPicker.jsx";
import "./variant-composition.css";

export default function VariantCreatePage({ onClose }) {
  const { products, categories, variantTypes } = useCatalog();
  const [typeId, setTypeId] = useState(""), [name, setName] = useState(""), [step, setStep] = useState(0), [owner, setOwner] = useState(null);
  if (owner) {
    const draft = { ...structuredClone(owner), variants: [...structuredClone(owner.variants), { ...newVariant(), size: name.trim(), typeId, sourceProductId: owner.id, items: [{ productId: owner.id, quantity: 1 }] }] };
    return <VariantEditor product={draft} initialStep={1} onClose={onClose} />;
  }
  return <EditorPage title="Varyant oluştur" onClose={onClose}>
    <div className="variant-editor-layout">
      <nav className="variant-wizard-steps" aria-label="Varyant oluşturma adımları">{["Varyant türü", "Ürünler", "Fiyat ve ambalaj", "Ürün bilgileri"].map((label, i) => <span key={label} aria-current={i === step ? "step" : undefined}><b>{i + 1}</b> {label}</span>)}</nav>
      {step === 0 ? <section className="variant-wizard-section"><h3>Varyant türü ve adı</h3><p>Örneğin porsiyon veya kutu seçin ve varyanta bir ad verin.</p><div className="variant-basic-grid"><Select label="Varyant türü" value={typeId} onChange={e => setTypeId(e.target.value)}><option value="">Tür seçin</option>{variantTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select><Input label="Varyant adı" maxLength={30} value={name} onChange={e => setName(e.target.value)} /></div>{!variantTypes.length && <p>Önce Sistem Ayarları bölümünden varyant tipi ekleyin.</p>}<div className="variant-wizard-navigation"><Button type="button" variant="primary" disabled={!typeId || !name.trim()} onClick={() => setStep(1)}>Devam et</Button></div></section> : <section className="variant-wizard-section"><h3>İlk ürünü seçin</h3><p>İlk ürünü seçin; daha sonra farklı kategorilerden ürünler de ekleyebilirsiniz.</p><VariantProductPicker products={products} categories={categories} requireCapacity onSelect={setOwner} /><div className="variant-wizard-navigation"><Button type="button" onClick={() => setStep(0)}>Geri</Button></div></section>}
    </div>
  </EditorPage>;
}
