import React, { useState } from "react";
import { Input, Textarea, Select } from "../../components/ui/Controls.jsx";
import CategoryGallery from "../categories/CategoryGallery.jsx";
import { storeStatuses } from "./store-fields.js";
export default function StoreForm({
  draft,
  setDraft,
  busy,
  onUploadingChange,
  refresh,
}) {
  const [servicesText, setServicesText] = useState(() =>
    (draft.services || []).join(", "),
  );
  const update = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <>
      <section className="store-form-section">
        <h3>Mağaza bilgileri</h3>
        <div className="store-form-grid">
          <Input
            label="Mağaza adı"
            required
            maxLength={100}
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <Input
            label="Mağaza kodu"
            placeholder="Boşsa otomatik oluşturulur"
            maxLength={80}
            value={draft.code || ""}
            onChange={(e) => update("code", e.target.value.toUpperCase())}
          />
          <Input
            label="Mağaza tipi"
            required
            placeholder="Örn. Cadde Mağaza, AVM Mağaza"
            maxLength={100}
            value={draft.storeType || ""}
            onChange={(e) => update("storeType", e.target.value)}
          />
          <Select
            label="Aktif durumu"
            value={draft.status}
            onChange={(e) => {
              update("status", e.target.value);
              update("active", e.target.value === "Aktif");
            }}
          >
            {storeStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
        </div>
      </section>
      <section className="store-form-section">
        <h3>Konum ve adres</h3>
        <div className="store-form-grid">
          <Input
            label="Ülke"
            required
            maxLength={100}
            value={draft.country || ""}
            onChange={(e) => update("country", e.target.value)}
          />
          <Input
            label="Şehir"
            required
            maxLength={100}
            value={draft.city || ""}
            onChange={(e) => update("city", e.target.value)}
          />
          <Input
            label="İlçe / Bölge"
            required
            maxLength={100}
            value={draft.district || ""}
            onChange={(e) => update("district", e.target.value)}
          />
          <Textarea
            label="Tam adres"
            required
            maxLength={1000}
            value={draft.address || ""}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
      </section>
      <section className="store-form-section">
        <h3>İletişim ve hizmetler</h3>
        <div className="store-form-grid">
          <Input
            label="Telefon"
            type="tel"
            placeholder="Örn. +90 212 000 00 00"
            maxLength={80}
            value={draft.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
          />
          <Input
            label="Çalışma saatleri"
            placeholder="Örn. 08:00 - 02:00, 7/24"
            maxLength={300}
            value={draft.openingHours || ""}
            onChange={(e) => update("openingHours", e.target.value)}
          />
          <Textarea
            label="Hizmetler"
            placeholder="Hizmetleri virgülle ayırın: Wi-Fi, Masaya Servis, WC"
            maxLength={6000}
            value={servicesText}
            onChange={(e) => {
              setServicesText(e.target.value);
              update(
                "services",
                e.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              );
            }}
          />
          <Textarea
            label="Açıklama"
            maxLength={1000}
            value={draft.description || ""}
            onChange={(e) => update("description", e.target.value)}
          />
          <Textarea
            label="Bilgi notu"
            placeholder="Eksik iletişim bilgileri veya diğer notlar"
            maxLength={2000}
            value={draft.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
        <small>
          Telefon veya çalışma saati bilinmiyorsa alanı boş bırakabilirsiniz.
          Gece yarısını geçen, sezonluk ve güne göre değişen çalışma saatlerini
          metin olarak yazın.
        </small>
      </section>
      <section className="store-form-section store-photos">
        <h3>Mağaza fotoğrafları</h3>
        <p>
          En fazla 30 fotoğraf. PNG, JPEG, WEBP veya GIF; fotoğraf başına en
          fazla 2 MB. Sürükleyip bırakabilir veya dosya seçebilirsiniz. İlk
          fotoğraf listede kapak olarak gösterilir.
        </p>
        <CategoryGallery
          images={draft.images || []}
          label="Mağaza"
          disabled={busy}
          maxImages={30}
          onUploadingChange={onUploadingChange}
          onRefresh={refresh}
          onChange={(images) => {
            update("images", images);
            return true;
          }}
        />
      </section>
    </>
  );
}
