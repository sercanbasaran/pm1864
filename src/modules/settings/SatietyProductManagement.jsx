import React, { useRef, useState } from "react";
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
  satietyIconUrl,
} from "../../satiety.js";
import SatietyIndicator from "../products/SatietyIndicator.jsx";
import { uploadFile } from "../media/media-api.js";
import useImageDrop from "../../components/ui/useImageDrop.js";
import { imageUrl } from "../../image-sizes.js";
const empty = () => ({
  name: "",
  icon: "general",
  iconMediaId: "",
  active: true,
});
export default function SatietyProductManagement({ canWrite }) {
  const {
    satietyProducts = defaultSatietyProducts(),
    products = [],
    busy,
    mutate,
    notify,
    refresh,
  } = useCatalog();
  const [draft, setDraft] = useState(empty),
    [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null),
    uploadLock = useRef(false);
  const blocked = busy || uploading;
  async function upload(files) {
    if (!canWrite || busy || uploadLock.current || !files.length) return;
    uploadLock.current = true;
    setUploading(true);
    setError("");
    try {
      if (files.length !== 1) throw new Error("Tek bir renkli simge yükleyin.");
      const { asset } = await uploadFile(files[0]);
      await refresh();
      setDraft((current) => ({ ...current, iconMediaId: asset.id }));
    } catch (e) {
      setError(e.message);
    } finally {
      uploadLock.current = false;
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  const { dragging, dropProps } = useImageDrop(upload, blocked || !canWrite);
  function reset() {
    setDraft(empty());
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (busy || uploadLock.current || !canWrite) return;
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
            disabled={blocked}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Select
            label="Hazır simge (yedek)"
            disabled={blocked}
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
            disabled={blocked}
            value={draft.active ? "active" : "inactive"}
            onChange={(e) =>
              setDraft({ ...draft, active: e.target.value === "active" })
            }
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </Select>
          <section
            className={`satiety-icon-upload image-drop-target${dragging ? " is-dragging" : ""}`}
            {...dropProps}
            aria-label="Doygunluk simgesi yükleme"
            aria-busy={uploading}
          >
            <h3>Renkli simge yükle</h3>
            <p>
              Önerilen ölçü ve çözünürlük: 512 × 512 piksel, kare (1:1). DPI
              şartı yoktur. Şeffaf arka planlı PNG veya WEBP önerilir; JPEG ve
              GIF de desteklenir. En fazla 2 MB. GIF dosyalarının ilk karesi
              kullanılır.
            </p>
            <p>
              Yalnızca renkli görsel yükleyin. Seçilmeyen seviyeler sistem
              tarafından gri tonlamalı gösterilir. Yüklenen görsel hazır
              simgenin yerine kullanılır.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              aria-label="Renkli doygunluk simgesi seç"
              disabled={blocked}
              onChange={(e) => upload(Array.from(e.target.files || []))}
            />
            <small role="status">
              {uploading
                ? "Simge yükleniyor…"
                : "Simgeyi buraya sürükleyin veya dosya seçin."}
            </small>
            <SatietyIndicator
              value={{ type: draft.icon, level: 3 }}
              label={draft.name || "Simge önizlemesi"}
              iconUrl={
                draft.iconMediaId
                  ? imageUrl(
                      `/api/media/${encodeURIComponent(draft.iconMediaId)}/content`,
                      "thumb",
                    )
                  : ""
              }
            />
            {draft.iconMediaId && (
              <Button
                type="button"
                disabled={blocked}
                onClick={() =>
                  setDraft((current) => ({ ...current, iconMediaId: "" }))
                }
              >
                Yüklenen simgeyi kaldır
              </Button>
            )}
          </section>
          <div className="satiety-definition-actions">
            <Button
              type="submit"
              variant="primary"
              disabled={blocked || !draft.name.trim()}
            >
              {draft.id ? <PencilSimple size={17} /> : <Plus size={17} />}
              {draft.id ? "Tanımı kaydet" : "Doygunluk ürünü ekle"}
            </Button>
            {draft.id && (
              <Button type="button" disabled={blocked} onClick={reset}>
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
                    iconUrl={satietyIconUrl(d)}
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
                      disabled={blocked}
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
