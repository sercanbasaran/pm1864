import React, { useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Modal from "../../components/ui/Modal.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { salesChannels } from "../../sales-availability.js";
import { categoryPromotion } from "./category-promotion.js";

export default function CategoryPromotion({
  category,
  categories,
  products,
  revision,
  onClose,
  onPromote,
}) {
  const [snapshot] = useState(() => {
    try {
      return {
        plan: categoryPromotion(category, categories, products),
        revision,
      };
    } catch (error) {
      return { error: error.message, revision };
    }
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const stale = revision !== snapshot.revision;
  const plan = snapshot.plan;
  async function confirm() {
    if (busy || stale || !plan) return;
    setBusy(true);
    setError("");
    try {
      const result = await onPromote(category.id, {
        code: plan.category.code,
        previewRevision: snapshot.revision,
      });
      if (!result)
        setError("Kategori dönüştürülemedi. Önizlemeyi yeniden açıp deneyin.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Ana kategoriye dönüştür" onClose={onClose} busy={busy}>
      {plan && (
        <>
          <p>
            <strong>{plan.category.name}</strong>,{" "}
            <strong>{plan.parent.name}</strong> kategorisinden ayrılarak
            bağımsız ana kategori olacak.
          </p>
          <dl className="category-channel-stats">
            <div>
              <dt>Kategori kodu</dt>
              <dd>
                {category.code} → {plan.category.code}
              </dd>
            </div>
            <div>
              <dt>Bağlı ürün</dt>
              <dd>{plan.productCount}</dd>
            </div>
            <div>
              <dt>Kategori durumu</dt>
              <dd>{plan.category.active ? "Aktif" : "Pasif"}</dd>
            </div>
          </dl>
          <p>
            Ürünler bu kategoriye bağlı kalır. Mevcut ürün ve varyant kodları,
            kategori bağlantısı ve QR adresleri korunur. Yeni ürünlerin kodları
            yeni ana kategori koduyla oluşturulur.
          </p>
          <p>
            Üst kategoriden gelen aktiflik ve satış kanalı kısıtlamaları
            korunur. Daha sonra kategori ayarlarından değiştirebilirsiniz.
          </p>
          <div className="table-scroll">
            <table aria-label="Dönüştürme sonrası satış kanalları">
              <thead>
                <tr>
                  <th>Satış kanalı</th>
                  <th>Şimdi</th>
                  <th>Dönüşüm sonrası</th>
                </tr>
              </thead>
              <tbody>
                {salesChannels.map(({ key, label }) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    <td>{plan.channels[key] ? "Etkin" : "Kapalı"}</td>
                    <td>{plan.channels[key] ? "Etkin" : "Kapalı"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {(error || snapshot.error || stale) && (
        <SlAlert open variant="danger">
          {stale
            ? "Katalog değişti. Pencereyi kapatıp önizlemeyi yeniden açın."
            : error || snapshot.error}
        </SlAlert>
      )}
      <div slot="footer">
        <Button type="button" disabled={busy} onClick={onClose}>
          Vazgeç
        </Button>{" "}
        <Button
          type="button"
          variant="primary"
          disabled={busy || stale || !plan}
          loading={busy}
          onClick={confirm}
        >
          Dönüştürmeyi onayla
        </Button>
      </div>
    </Modal>
  );
}
