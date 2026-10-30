import React, { useState } from "react";
import { Storefront } from "@phosphor-icons/react";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import { useCatalog } from "../../app/CatalogContext.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {
  Button,
  Input,
  Textarea,
  Select,
} from "../../components/ui/Controls.jsx";
import { imageUrl } from "../../image-sizes.js";
import StoreForm from "./StoreForm.jsx";
import { newStore, validateStore } from "./store-fields.js";
import "./channel-management.css";
export default function ChannelManagement({ kind, canWrite }) {
  const {
    managedChannels = [],
    storeImportReport,
    mutate,
    busy,
    notify,
    refresh,
  } = useCatalog();
  const empty = { name: "", description: "", active: true };
  const [draft, setDraft] = useState(null),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(null),
    [uploading, setUploading] = useState(false),
    [query, setQuery] = useState(""),
    [country, setCountry] = useState("");
  const stores = kind === "stores",
    blocked = busy || uploading;
  const title = {
    stores: "Mağazalar",
    "digital-stores": "E-Mağazalar",
    "food-platforms": "Sipariş Platformları",
  }[kind];
  const channels = managedChannels.filter((c) => c.kind === kind);
  const countries = [
    ...new Set(channels.map((c) => c.country).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "tr"));
  const visible = channels.filter(
    (c) =>
      !stores ||
      ((!country || c.country === country) &&
        [c.name, c.code, c.country, c.city, c.district, c.address]
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(query.toLocaleLowerCase("tr-TR"))),
  );
  function edit(c) {
    setError("");
    setDraft(
      stores
        ? {
            ...newStore(),
            ...c,
            status: c.status || (c.active ? "Aktif" : "Pasif"),
            images: [...(c.images || [])],
          }
        : { ...c },
    );
  }
  async function save(event) {
    event.preventDefault();
    if (blocked) return;
    try {
      if (stores) {
        const issue = validateStore(draft);
        if (issue) throw Error(issue);
      }
      await mutate(
        `/managed-channels/${kind}${draft.id ? "/" + draft.id : ""}`,
        draft,
        draft.id ? "PUT" : "POST",
      );
      setDraft(null);
      setError("");
      notify(stores ? "Mağaza kaydedildi." : "Kanal kaydedildi.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function remove() {
    try {
      await mutate(`/managed-channels/${kind}/${deleting.id}`, {}, "DELETE");
      setDeleting(null);
      notify("Kanal silindi.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Card>
      <div className="panel-title">
        <h2>{title}</h2>
        {canWrite && (
          <Button
            type="button"
            disabled={blocked}
            onClick={() => {
              setError("");
              setDraft(stores ? newStore() : { ...empty });
            }}
          >
            Yeni ekle
          </Button>
        )}
      </div>
      {error && !draft && !deleting && <p role="alert">{error}</p>}
      {stores && storeImportReport && (
        <p className="store-import-status">
          Excel aktarımı: {storeImportReport.created} yeni mağaza ·{" "}
          {storeImportReport.completed} kaydın eksikleri tamamlandı.
          {storeImportReport.conflicts.length > 0 && (
            <span role="alert">
              {" "}
              Eşleşmesi belirsiz mağazalar aktarılmadı:{" "}
              {storeImportReport.conflicts.join(", ")}
            </span>
          )}
        </p>
      )}
      {stores && (
        <div className="store-tools">
          <Input
            label="Mağaza ara"
            placeholder="Ad, kod, şehir veya adres"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select
            label="Ülke"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Tüm ülkeler</option>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <small>
            {visible.length} / {channels.length} mağaza
          </small>
        </div>
      )}
      {!channels.length && <p>Henüz kayıt eklenmedi.</p>}
      <div className={`table-scroll${stores ? " store-list" : ""}`}>
        <table>
          <thead>
            <tr>
              <th>{stores ? "Mağaza" : "Ad"}</th>
              <th>{stores ? "Konum" : "Açıklama"}</th>
              {stores && <th>İletişim ve hizmetler</th>}
              <th>Durum</th>
              {canWrite && <th>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id}>
                <td>
                  {stores ? (
                    <div className="store-identity">
                      {c.images?.length ? (
                        <img
                          src={imageUrl(c.images[0].url, "thumb")}
                          width={64}
                          height={64}
                          alt={c.name}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="store-image-placeholder">
                          <Storefront size={28} />
                        </span>
                      )}
                      <div>
                        <strong>{c.name}</strong>
                        <small>{c.code || "Kod belirtilmedi"}</small>
                        <small>
                          {c.storeType || "Mağaza tipi belirtilmedi"} ·{" "}
                          {c.images?.length || 0} fotoğraf
                        </small>
                      </div>
                    </div>
                  ) : (
                    c.name
                  )}
                </td>
                <td>
                  {stores ? (
                    <>
                      <strong>
                        {[c.country, c.city, c.district]
                          .filter(Boolean)
                          .join(" / ") || "Konum belirtilmedi"}
                      </strong>
                      <small>{c.address || "Adres belirtilmedi"}</small>
                      {c.description && <small>{c.description}</small>}
                    </>
                  ) : (
                    c.description || "—"
                  )}
                </td>
                {stores && (
                  <td>
                    <span>{c.phone || "Telefon bilgisi eksik"}</span>
                    <small>{c.openingHours || "Çalışma saatleri eksik"}</small>
                    {c.services?.length > 0 && (
                      <details>
                        <summary>Hizmetler ({c.services.length})</summary>
                        <ul>
                          {c.services.map((service) => (
                            <li key={service}>{service}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {c.notes && <small>{c.notes}</small>}
                  </td>
                )}
                <td>
                  <SlBadge variant={c.active ? "success" : "neutral"}>
                    {c.status || (c.active ? "Aktif" : "Pasif")}
                  </SlBadge>
                </td>
                {canWrite && (
                  <td>
                    <div className="store-row-actions">
                      <Button
                        type="button"
                        disabled={blocked}
                        onClick={() => edit(c)}
                      >
                        Düzenle
                      </Button>
                      <Button
                        type="button"
                        disabled={blocked}
                        onClick={() => {
                          setError("");
                          setDeleting(c);
                        }}
                      >
                        Sil
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!!channels.length && !visible.length && (
        <p>Aramaya uygun kayıt bulunamadı.</p>
      )}
      {draft && (
        <Modal
          title={
            stores
              ? draft.id
                ? "Mağaza düzenle"
                : "Mağaza ekle"
              : draft.id
                ? "Kanal düzenle"
                : "Kanal ekle"
          }
          busy={blocked}
          wide={stores}
          onClose={() => {
            if (!blocked) setDraft(null);
          }}
        >
          <form onSubmit={save}>
            <fieldset
              disabled={busy}
              className={stores ? "store-form-fields" : "editor-fields"}
            >
              {stores ? (
                <StoreForm
                  draft={draft}
                  setDraft={setDraft}
                  busy={busy}
                  onUploadingChange={setUploading}
                  refresh={refresh}
                />
              ) : (
                <>
                  <Input
                    label="Ad"
                    required
                    maxLength={100}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                  <Textarea
                    label="Açıklama"
                    maxLength={1000}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                  <Select
                    label="Durum"
                    value={draft.active ? "active" : "inactive"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        active: e.target.value === "active",
                      })
                    }
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </Select>
                </>
              )}
              {error && <p role="alert">{error}</p>}
              <div className="store-form-actions">
                <Button
                  type="button"
                  disabled={blocked}
                  onClick={() => setDraft(null)}
                >
                  Vazgeç
                </Button>
                <Button type="submit" variant="primary" disabled={blocked}>
                  Kaydet
                </Button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={stores ? "Mağaza sil" : "Kanal sil"}
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <p>{deleting.name} silinecek. Bu işlem geri alınamaz.</p>
          {error && <p role="alert">{error}</p>}
          <Button
            type="button"
            onClick={() => setDeleting(null)}
            disabled={busy}
          >
            Vazgeç
          </Button>{" "}
          <Button
            type="button"
            variant="danger"
            onClick={remove}
            disabled={busy}
          >
            Sil
          </Button>
        </Modal>
      )}
    </Card>
  );
}
