import React, { useState } from "react";
import { useCatalog } from "../../app/CatalogContext.jsx";
import Card from "../../components/ui/Card.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import {
  defaultPackagingMethods,
  resolvePackagingMethod,
} from "./packaging-methods.js";
export default function PackagingMethodManagement({ canWrite }) {
  const {
    packagingMethods = defaultPackagingMethods(),
    products = [],
    busy,
    mutate,
    notify,
  } = useCatalog();
  const [draft, setDraft] = useState(null),
    [error, setError] = useState("");
  const usage = (method) =>
    products.reduce(
      (n, p) =>
        n +
        (p.variants || []).filter(
          (v) =>
            resolvePackagingMethod(v.packaging, packagingMethods)?.id ===
            method.id,
        ).length,
      0,
    );
  async function save(e) {
    e.preventDefault();
    try {
      await mutate(
        "/packaging-methods" + (draft.id ? "/" + draft.id : ""),
        draft,
        draft.id ? "PUT" : "POST",
      );
      setDraft(null);
      setError("");
      notify("Ambalaj / servis şekli kaydedildi.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function remove(method) {
    try {
      await mutate("/packaging-methods/" + method.id, {}, "DELETE");
      setError("");
      notify("Ambalaj / servis şekli kaldırıldı.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Card>
      <div className="panel-title">
        <h2>Ambalaj / Servis Şekilleri</h2>
        {canWrite && (
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft({ name: "", active: true });
              setError("");
            }}
          >
            Yeni şekil ekle
          </Button>
        )}
      </div>
      <p>
        Varyantlarda seçilebilecek ambalaj ve servis şekillerini yönetin. Kutu
        ölçüleri ve görselleri “Kutular ve Ambalajlar” bölümünde yönetilir.
        Pasif seçenekler yeni varyantlarda kullanılamaz. Kullanılan ve temel
        kutu/porsiyon seçenekleri silinemez; pasife alınabilir.
      </p>
      {error && <p role="alert">{error}</p>}
      {draft && (
        <form className="editor-fields" onSubmit={save}>
          <Input
            label="Ambalaj / servis şekli adı"
            value={draft.name}
            required
            maxLength={120}
            disabled={busy}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Select
            label="Durum"
            value={draft.active ? "active" : "inactive"}
            disabled={busy}
            onChange={(e) =>
              setDraft({ ...draft, active: e.target.value === "active" })
            }
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </Select>
          <div>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !draft.name.trim()}
            >
              Kaydet
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Vazgeç
            </Button>
          </div>
        </form>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Durum</th>
              <th>Kullanım</th>
              {canWrite && <th>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {packagingMethods.map((method) => (
              <tr key={method.id}>
                <td>{method.name}</td>
                <td>{method.active ? "Aktif" : "Pasif"}</td>
                <td>{usage(method)} varyant</td>
                {canWrite && (
                  <td>
                    <Button
                      type="button"
                      disabled={busy}
                      aria-label={method.name + " düzenle"}
                      onClick={() => {
                        setDraft({ ...method });
                        setError("");
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        busy || usage(method) > 0 || method.kind !== "custom"
                      }
                      aria-label={method.name + " kaldır"}
                      onClick={() => remove(method)}
                    >
                      Kaldır
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
