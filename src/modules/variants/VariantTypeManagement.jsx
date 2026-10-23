import React, { useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import { Plus, Trash } from "@phosphor-icons/react";
import Card from "../../components/ui/Card.jsx";
import {
  Button,
  Input,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
} from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
export default function VariantTypeManagement({ canWrite }) {
  const { variantTypes = [], products, busy, mutate, notify } = useCatalog();
  const [name, setName] = useState(""),
    [error, setError] = useState("");
  async function add(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    try {
      await mutate("/variant-types", { name });
      setName("");
      notify("Varyant tipi eklendi.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function remove(type) {
    if (busy) return;
    setError("");
    try {
      await mutate(
        "/variant-types/" + encodeURIComponent(type.id),
        {},
        "DELETE",
      );
      notify("Varyant tipi kaldırıldı.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Card className="variant-type-manager">
      <div className="panel-title">
        <div>
          <h2>Varyant tipleri</h2>
          <p>
            Ürün eklerken seçilecek tipleri yönetin. Dilim tipi için pozitif tam
            sayı adet zorunludur.
          </p>
        </div>
        <SlBadge>{variantTypes.length} tip</SlBadge>
      </div>
      {canWrite && (
        <form className="variant-type-form" onSubmit={add}>
          <Input
            label="Yeni varyant tipi"
            placeholder="Örn. Hediye seti"
            required
            maxLength={50}
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !name.trim()}
          >
            <Plus size={17} />
            Varyant tipi ekle
          </Button>
        </form>
      )}
      {error && (
        <SlAlert open variant="danger">
          {error}
        </SlAlert>
      )}
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Varyant tipi listesi"
      >
        <Table aria-label="Varyant tipleri">
          <TableHead>
            <TableRow>
              <TableHeading scope="col">Tip adı</TableHeading>
              <TableHeading scope="col">Dilim adedi</TableHeading>
              <TableHeading scope="col">Kullanım</TableHeading>
              {canWrite && <TableHeading scope="col">İşlem</TableHeading>}
            </TableRow>
          </TableHead>
          <TableBody>
            {variantTypes.map((type) => {
              const count = products.reduce(
                (total, p) =>
                  total + p.variants.filter((v) => v.typeId === type.id).length,
                0,
              );
              return (
                <TableRow key={type.id}>
                  <TableHeading scope="row">{type.name}</TableHeading>
                  <TableCell>
                    {type.requiresQuantity ? "Zorunlu" : "İsteğe bağlı"}
                  </TableCell>
                  <TableCell>{count} varyant</TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button
                        type="button"
                        size="small"
                        disabled={busy || count > 0}
                        aria-label={type.name + " varyant tipini kaldır"}
                        title={
                          count
                            ? "Kullanılan tip kaldırılamaz. Önce varyantların tipini değiştirin."
                            : "Varyant tipini kaldır"
                        }
                        onClick={() => remove(type)}
                      >
                        <Trash size={16} />
                        Kaldır
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!variantTypes.length && (
              <TableRow>
                <TableCell colSpan={canWrite ? 4 : 3}>
                  Henüz varyant tipi yok.
                  {canWrite ? " Ürün eklemek için önce bir tip oluşturun." : ""}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
