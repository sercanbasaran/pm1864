import React, { useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import { Plus, PencilSimple } from "@phosphor-icons/react";
import Card from "../../components/ui/Card.jsx";
import {
  Button,
  Input,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
} from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import {
  satietyTypes,
  satietyEntries,
  defaultSatietyProducts,
} from "../../satiety.js";
import SatietyIndicator from "../products/SatietyIndicator.jsx";
const empty = () => ({ name: "", icon: "general", active: true });
export default function SatietyProductManagement({ canWrite }) {
  const {
    satietyProducts = defaultSatietyProducts(),
    products = [],
    busy,
    mutate,
    notify,
  } = useCatalog();
  const [draft, setDraft] = useState(empty),
    [error, setError] = useState("");
  function reset() {
    setDraft(empty());
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (busy || !canWrite) return;
    setError("");
    try {
      await mutate(
        "/satiety-products" +
          (draft.id ? "/" + encodeURIComponent(draft.id) : ""),
        draft,
        draft.id ? "PUT" : "POST",
      );
      notify(
        draft.id ? "Doygunluk ürünü güncellendi." : "Doygunluk ürünü eklendi.",
      );
      reset();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Card>
      <h2>Doygunluk Ürünleri</h2>
      <p>
        Ürünlerde yoğunluğu gösterilecek içerikleri ve simgelerini yönetin.
        Pasif tanımlar yeni eklemelerde listelenmez; mevcut ürünlerdeki bilgiler
        korunur.
      </p>
      {canWrite && (
        <form onSubmit={save} className="satiety-definition-form">
          <Input
            label="Doygunluk ürünü adı"
            placeholder="Örn. Çikolata, Çilek, Vişne"
            maxLength={60}
            required
            disabled={busy}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Select
            label="Simge"
            disabled={busy}
            value={draft.icon}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          >
            {satietyTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            label="Tanım durumu"
            disabled={busy}
            value={draft.active ? "active" : "inactive"}
            onChange={(e) =>
              setDraft({ ...draft, active: e.target.value === "active" })
            }
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </Select>
          <div className="satiety-definition-actions">
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !draft.name.trim()}
            >
              {draft.id ? <PencilSimple size={17} /> : <Plus size={17} />}
              {draft.id ? "Tanımı kaydet" : "Doygunluk ürünü ekle"}
            </Button>
            {draft.id && (
              <Button type="button" disabled={busy} onClick={reset}>
                Vazgeç
              </Button>
            )}
          </div>
        </form>
      )}
      {error && (
        <SlAlert open variant="danger">
          {error}
        </SlAlert>
      )}
      <div
        className="table-scroll"
        role="region"
        aria-label="Doygunluk ürünleri listesi"
        tabIndex={0}
      >
        <Table aria-label="Doygunluk ürünleri">
          <TableHead>
            <TableRow>
              <TableHeading>Ad</TableHeading>
              <TableHeading>Simge</TableHeading>
              <TableHeading>Durum</TableHeading>
              <TableHeading>Kullanım</TableHeading>
              {canWrite && <TableHeading>İşlem</TableHeading>}
            </TableRow>
          </TableHead>
          <TableBody>
            {satietyProducts.map((d) => (
              <TableRow key={d.id}>
                <TableHeading scope="row">{d.name}</TableHeading>
                <TableCell>
                  <SatietyIndicator
                    value={{ type: d.icon, level: 1 }}
                    label={d.name}
                    compact
                  />
                </TableCell>
                <TableCell>{d.active ? "Aktif" : "Pasif"}</TableCell>
                <TableCell>
                  {
                    products.filter((p) =>
                      satietyEntries(p.satiety).some(
                        (e) => e.ingredientId === d.id,
                      ),
                    ).length
                  }{" "}
                  ürün
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <Button
                      type="button"
                      size="small"
                      disabled={busy}
                      aria-label={d.name + " doygunluk ürününü düzenle"}
                      onClick={() => {
                        setDraft({ ...d });
                        setError("");
                      }}
                    >
                      <PencilSimple size={16} />
                      Düzenle
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
