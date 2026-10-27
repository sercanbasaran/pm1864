import VariantCompositionSummary from "./VariantCompositionSummary.jsx";
import VariantCompositionFields from "./VariantCompositionFields.jsx";
import {
  calculateVariant,
  defaultConsumables,
} from "../../variant-composition.js";
import React, { useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import EditorPage from "../../components/layout/EditorPage.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
import BackToListButton from "../../components/ui/BackToListButton.jsx";
import EditableField from "../../components/ui/EditableField.jsx";
import ProductVariantsTable from "../products/ProductVariantsTable.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { validateProduct } from "../../catalog.js";

export default function VariantEditor({ product, focusVariantId = "", readOnly = false, onClose }) {
  const {
    products = [],
    categories,
    variantTypes,
    consumables = defaultConsumables(),
    busy,
    mutate,
    notify,
  } = useCatalog();
  const current = products.find((p) => p.id === product.id) || product;
  const [draft, setDraft] = useState(() => structuredClone(product));
  const [editing, setEditing] = useState(() =>
    !readOnly && (!!focusVariantId || product.variants.some((v) => !v.id)),
  );
  const [error, setError] = useState("");
  const [wizardReady, setWizardReady] = useState(false);
  function cancel() {
    setDraft(structuredClone(current));
    setEditing(false);
    setError("");
  }
  async function save() {
    if (busy || readOnly) return;
    let next;
    try {
      next = {
        ...current,
        variants: draft.variants.map((v) =>
          v.sourceProductId !== undefined && (focusVariantId ? String(v.id) === focusVariantId : draft.variants.some((item) => !item.id) ? !v.id : true)
            ? calculateVariant(v, products, consumables)
            : v,
        ),
      };
    } catch (e) {
      setError(e.message);
      return;
    }
    const invalid = validateProduct(next, categories, variantTypes);
    if (invalid) {
      setError(invalid.message);
      return;
    }
    try {
      await mutate(`/products/${current.id}`, { product: next }, "PUT");
      setEditing(false);
      setError("");
      notify("Varyantlar kaydedildi.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <EditorPage title="Varyant düzenle" busy={busy} onClose={onClose}>
      <p className="variant-editor-context">Ürün: <strong>{current.name}</strong></p>
      {editing && <p className="variant-editor-hint">Önce temel bilgileri girin. Fiyat ve net gramaj ürün miktarına göre hesaplanır; görseller ve sarf malzemeler isteğe bağlıdır.</p>}
      {error && (
        <SlAlert open variant="danger">
          {error}
        </SlAlert>
      )}
      <EditableField
        label="Varyantlar ve fiyatlar"
        value={
          <div>
            <ProductVariantsTable
              product={focusVariantId ? { ...current, variants: current.variants.filter((v) => String(v.id) === focusVariantId) } : current}
              variantTypes={variantTypes}
            />
            <VariantCompositionSummary variants={focusVariantId ? current.variants.filter((v) => String(v.id) === focusVariantId) : current.variants} />
          </div>
        }
        empty={!current.variants.length}
        enabled={!readOnly}
        editing={editing && !readOnly}
        busy={busy}
        onEdit={() => {
          setDraft(structuredClone(current));
          setEditing(true);
          setError("");
        }}
        onCancel={cancel}
        onSave={save}
        saveDisabled={!wizardReady}
      >
        <VariantCompositionFields
          product={draft}
          focusVariantId={focusVariantId}
          onReady={setWizardReady}
          disabled={busy || readOnly}
          onChange={setDraft}
        />
      </EditableField>
      <ActionBar position="bottom">
        <BackToListButton busy={busy} onClick={onClose} />
      </ActionBar>
    </EditorPage>
  );
}
