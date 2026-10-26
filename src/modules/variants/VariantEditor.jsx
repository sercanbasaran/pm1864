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

export default function VariantEditor({ product, readOnly = false, onClose }) {
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
    product.variants.some((v) => !v.id),
  );
  const [error, setError] = useState("");
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
          v.sourceProductId !== undefined
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
      <p>{current.name}</p>
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
              product={current}
              variantTypes={variantTypes}
            />
            <VariantCompositionSummary variants={current.variants} />
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
      >
        <VariantCompositionFields
          product={draft}
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
