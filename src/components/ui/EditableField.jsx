import React from "react";
import { Plus, PencilSimple } from "@phosphor-icons/react";
import { Button } from "./Controls.jsx";
export default function EditableField({
  children,
  label,
  value,
  creating,
  enabled,
  editing,
  busy,
  onEdit,
  onSave,
  onCancel,
  displayAction,
  empty,
}) {
  return (
    <section
      className={
        "category-field-card" + (creating || editing ? " is-editing" : "")
      }
    >
      <div className="category-field-content">
        {creating || editing ? (
          children
        ) : (
          <dl className="category-field-value">
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
          </dl>
        )}
      </div>
      {displayAction ||
        (enabled && (
          <div className="category-field-actions">
            {editing ? (
              <>
                <Button
                  type="button"
                  size="small"
                  variant="primary"
                  disabled={busy}
                  onClick={onSave}
                >
                  Kaydet
                </Button>
                <Button
                  type="button"
                  size="small"
                  disabled={busy}
                  onClick={onCancel}
                >
                  Vazgeç
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="small"
                aria-label={label + (empty ? " ekle" : " düzenle")}
                disabled={busy}
                onClick={onEdit}
              >
                {empty ? <Plus size={15} /> : <PencilSimple size={15} />}
                {empty ? "Ekle" : "Düzenle"}
              </Button>
            )}
          </div>
        ))}
    </section>
  );
}
