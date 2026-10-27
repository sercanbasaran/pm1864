import React, { useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import { PencilSimple } from "@phosphor-icons/react";
import EditorPage from "../../components/layout/EditorPage.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { validateProduct } from "../../catalog.js";
import { calculateVariant, defaultConsumables } from "../../variant-composition.js";
import { variantTypeName } from "../../variant-types.js";
import { money } from "../../catalog-tools.js";
import VariantCompositionFields from "./VariantCompositionFields.jsx";
import "./variant-composition.css";

export default function VariantEditor({ product, focusVariantId = "", readOnly = false, initialStep = 0, onClose }) {
  const { products = [], categories, variantTypes, consumables = defaultConsumables(), busy, mutate, notify } = useCatalog();
  const current = products.find((p) => p.id === product.id) || product;
  const [draft, setDraft] = useState(() => structuredClone(product));
  const [focus, setFocus] = useState(focusVariantId);
  const [editing, setEditing] = useState(() => !readOnly && (!!focusVariantId || product.variants.some((v) => !v.id)));
  const [error, setError] = useState(""), [wizardReady, setWizardReady] = useState(false);
  const selected = current.variants.find((v) => String(v.id) === focus);
  function selectVariant(variant) {
    setDraft(structuredClone(current)); setFocus(String(variant.id)); setWizardReady(false); setError(""); setEditing(!readOnly);
  }
  function cancel() {
    if (draft.variants.some((v) => !v.id)) { onClose(); return; }
    setDraft(structuredClone(current)); setEditing(false); setWizardReady(false); setError("");
  }
  async function save() {
    if (busy || readOnly || !wizardReady) return;
    const newVariant = draft.variants.some((item) => !item.id);
    let next;
    try {
      next = { ...current, variants: draft.variants.map((v) => v.sourceProductId !== undefined && (focus ? String(v.id) === focus : newVariant ? !v.id : true) ? calculateVariant(v, products, consumables) : v) };
    } catch (e) { setError(e.message); return; }
    const invalid = validateProduct(next, categories, variantTypes);
    if (invalid) { setError(invalid.message); return; }
    try {
      await mutate(`/products/${current.id}`, { product: next }, "PUT");
      setError(""); notify("Varyant kaydedildi.");
      if (newVariant) onClose(); else { setEditing(false); setWizardReady(false); }
    } catch (e) { setError(e.message); }
  }
  return <EditorPage title={editing ? (draft.variants.some((v) => !v.id) ? "Varyant oluştur" : "Varyant düzenle") : "Varyantlar"} busy={busy} onClose={onClose}>
    <div className="variant-editor-layout">
      <div className="variant-editor-intro"><span>Ürün</span><strong>{current.name}</strong>{current.productCode && <small>{current.productCode}</small>}</div>
      {error && <SlAlert open variant="danger">{error}</SlAlert>}
      {editing && !readOnly ? <>
        <p className="variant-editor-hint">Adımları tamamlayın. Fiyat ve gramaj ürün miktarına göre hesaplanır.</p>
        <VariantCompositionFields product={draft} focusVariantId={focus} initialStep={initialStep} onReady={setWizardReady} disabled={busy} onChange={setDraft} />
        <div className="variant-editor-save"><Button type="button" disabled={busy} onClick={cancel}>Vazgeç</Button><Button type="button" variant="primary" disabled={busy || !wizardReady} onClick={save}>Varyantı kaydet</Button></div>
      </> : selected ? <section className="variant-selected-summary">
        <div className="variant-selected-heading"><div><h3>{selected.size}</h3><small>{variantTypeName(selected, variantTypes)} · {selected.sku || "—"}</small></div><SlBadge variant={selected.active !== false ? "success" : "neutral"}>{selected.active !== false ? "Aktif" : "Pasif"}</SlBadge></div>
        <dl className="variant-selected-stats"><div><dt>Satış fiyatı</dt><dd>{money(selected.price)}</dd></div><div><dt>Net gramaj</dt><dd>{selected.weight} g</dd></div><div><dt>Ambalaj / servis</dt><dd>{selected.packagingName || selected.packaging || "—"}</dd></div></dl>
        <div className="variant-selected-actions">{!readOnly && <Button type="button" variant="primary" onClick={() => { setDraft(structuredClone(current)); setEditing(true); }}><PencilSimple size={16} /> Varyantı düzenle</Button>}<Button type="button" onClick={() => setFocus("")}>Diğer varyantları göster</Button></div>
      </section> : <section className="variant-choice-list" aria-label="Ürünün varyantları">
        <div><h3>Varyantlar</h3><p>İşlem yapmak istediğiniz varyantı seçin.</p></div>
        {current.variants.map((variant) => <div className="variant-choice-row" key={variant.id}><div className="variant-choice-identity"><strong>{variant.size}</strong><small>{variantTypeName(variant, variantTypes)} · {variant.sku || "—"}</small></div><span>{money(variant.price)}</span><span>{variant.weight} g</span><SlBadge variant={variant.active !== false ? "success" : "neutral"}>{variant.active !== false ? "Aktif" : "Pasif"}</SlBadge><Button type="button" aria-label={`${variant.size} ${readOnly ? "görüntüle" : "düzenle"}`} onClick={() => selectVariant(variant)}>{readOnly ? "Görüntüle" : "Düzenle"}</Button></div>)}
        {!current.variants.length && <p>Henüz varyant bulunmuyor.</p>}
      </section>}
    </div>
  </EditorPage>;
}
