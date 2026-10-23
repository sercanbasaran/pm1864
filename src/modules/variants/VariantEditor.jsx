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
    const next = { ...current, variants: draft.variants };
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
          <ProductVariantsTable product={current} variantTypes={variantTypes} />
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
        <ProductVariantsTable
          product={draft}
          variantTypes={variantTypes}
          categories={categories}
          editing
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
