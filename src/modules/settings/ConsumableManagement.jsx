import React, { useState } from "react";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { defaultConsumables } from "../../variant-composition.js";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import Card from "../../components/ui/Card.jsx";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
export default function ConsumableManagement({ canWrite }) {
  const {
    consumables = defaultConsumables(),
    products = [],
    busy,
    mutate,
    notify,
  } = useCatalog();
  const [draft, setDraft] = useState({ name: "", active: true }),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    try {
      await mutate(
        "/consumables" + (draft.id ? "/" + draft.id : ""),
        draft,
        draft.id ? "PUT" : "POST",
      );
      setDraft({ name: "", active: true });
      setError("");
      notify("Sarf malzeme kaydedildi.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Card>
      <h2>Sarf Malzemeler</h2>
      <p>
        Varyantlara adet ile eklenen malzemeleri yönetin. Pasif malzemeler yeni
        seçimlerde görünmez.
      </p>
      {canWrite && (
        <form onSubmit={save}>
          <Input
            label="Sarf malzeme adı"
            required
            maxLength={80}
            disabled={busy}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Select
            label="Durum"
            disabled={busy}
            value={draft.active ? "active" : "inactive"}
            onChange={(e) =>
              setDraft({ ...draft, active: e.target.value === "active" })
            }
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </Select>
          <Button disabled={busy || !draft.name.trim()}>Kaydet</Button>
          {draft.id && (
            <Button
              type="button"
              onClick={() => setDraft({ name: "", active: true })}
            >
              Vazgeç
            </Button>
          )}
        </form>
      )}
      {error && (
        <SlAlert open variant="danger">
          {error}
        </SlAlert>
      )}
      <ul>
        {consumables.map((c) => (
          <li key={c.id}>
            {c.name} · {c.active ? "Aktif" : "Pasif"} ·{" "}
            {products.reduce(
              (n, p) =>
                n +
                p.variants.filter((v) =>
                  v.consumables?.some((item) => item.id === c.id),
                ).length,
              0,
            )}{" "}
            varyant{" "}
            {canWrite && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => setDraft({ ...c })}
              >
                Düzenle
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
