import { request } from "../../api.js";
import {
  productTransferColumns,
  productTransferFields,
  parseProductTransferRows,
  productReferenceSheets,
} from "./product-transfer.js";
export { productTransferColumns } from "./product-transfer.js";
import React, { useState } from "react";
import {
  readTransferFile,
  downloadTransfer,
  formatLabel,
} from "../transfer/transfer.js";
import Modal from "../../components/ui/Modal.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";

export default function ProductImport({ onClose, format = "xls" }) {
  const {
    categories,
    variantTypes,
    satietyProducts = [],
    products,
    revision,
    mutate,
    notify,
  } = useCatalog();
  const [rows, setRows] = useState([]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [result, setResult] = useState(null),
    [previewRevision, setPreviewRevision] = useState(null);
  async function template() {
    try {
      setSaving(true);
      const { assets = [] } = format === "xls" ? await request("/media") : {};
      await downloadTransfer(
        productTransferColumns,
        ["json", "xml"].includes(format)
          ? [productTransferColumns.map(() => "")]
          : [],
        format,
        "urun-ice-aktarma-sablonu",
        "Ürünler",
        productReferenceSheets(categories, satietyProducts, assets),
      );
    } catch {
      setError("Şablon hazırlanamadı. Yeniden deneyin.");
    } finally {
      setSaving(false);
    }
  }
  async function read(event) {
    setRows([]);
    setResult(null);
    setError("");
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Dosya en fazla 5 MB olabilir.");
      const data = await readTransferFile(file, format);
      const needsMedia = data.some((row) =>
        String(row["Görsel kimlikleri"] || "").trim(),
      );
      const media = needsMedia ? await request("/media") : null;
      const parsed = parseProductTransferRows(data, {
        products,
        categories,
        variantTypes,
        satietyProducts,
        mediaIds: media?.assets.map((asset) => asset.id),
      });
      setRows(parsed);
      setPreviewRevision(revision);
    } catch (e) {
      setError(e.message || "Dosya okunamadı.");
    }
    event.target.value = "";
    setSaving(false);
  }
  async function save() {
    if (!rows.length || rows.some((r) => r.issue)) return;
    if (previewRevision !== revision) {
      setError(
        "Katalog değişti. Dosyayı yeniden yükleyerek önizlemeyi yenileyin.",
      );
      return;
    }
    setSaving(true);
    setError("");
    let count = 0;
    for (const row of rows) {
      try {
        await mutate(
          row.product.id ? `/products/${row.product.id}` : "/products",
          { product: row.product },
          row.product.id ? "PUT" : "POST",
        );
        count++;
      } catch (e) {
        setResult({
          count,
          message: `${row.line}. satır kaydedilemedi: ${e.message}`,
        });
        setRows(rows.slice(count));
        setSaving(false);
        return;
      }
    }
    setRows([]);
    setResult({ count, message: "İçe aktarma tamamlandı." });
    setSaving(false);
    notify(`${count} ürün içe aktarıldı.`);
  }
  return (
    <Modal
      title={`${formatLabel(format)} ile ürün içe aktar`}
      onClose={onClose}
      busy={saving}
      wide
    >
      <p>
        Ana kategori kodunu “Kategori kodu”, alt kategori kodunu “Alt kategori
        kodu” sütununa ayrı ayrı 2 hane olarak girin (ör. 10 ve 11). Alt
        kategori boşsa ürün doğrudan ana kategoriye eklenir. Kod hücrelerini
        metin biçiminde tutun. Yeni ürün kodları sistem tarafından oluşturulur.
        Ürün kodu eşleşirse yalnızca eksik alanlar tamamlanır; dolu değerler,
        varyantlar ve mevcut görseller korunur.
      </p>
      <Button type="button" disabled={saving} onClick={template}>
        {formatLabel(format)} şablonunu indir
      </Button>
      <details>
        <summary>Şablon alanları ve kullanım kılavuzu</summary>
        <p>
          Excel şablonunda alan kılavuzu, kategori kodları, doygunluk tanımları
          ve görsel kimlikleri ayrı sayfalardadır. Yalnızca ilk “Ürünler”
          sayfası içe aktarılır. Diğer biçimlerde aynı sütun adlarını kullanın.
          Varyantlar ayrı içe aktarılır; yayın durumu ve sistem kodları bu
          şablondan değiştirilmez.
        </p>
        <p>
          Besin değerleri 100 g için ayrı sütunlara girilir. Doygunluk örneği:
          Fıstık:4; Muz:2. Porsiyon miktarı ürünün kendi birimindedir.
          Görselleri önce Kütüphane’ye yükleyip kimliklerini kullanın veya tek
          kapak görseli için HTTP/HTTPS bağlantısı girin.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Alan</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {productTransferFields.map(([name, detail]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p>
        <label>
          {formatLabel(format)} dosyası seçin{" "}
          <input
            type="file"
            accept={format === "xls" ? ".xls,.xlsx" : `.${format}`}
            onChange={read}
            disabled={saving}
          />
        </label>
      </p>
      {error && <p role="alert">{error}</p>}
      {result && (
        <p role="status">
          {result.count} ürün kaydedildi. {result.message}
        </p>
      )}
      {!!rows.length && (
        <>
          <p>
            {rows.length} satır incelendi. {rows.filter((r) => r.issue).length}{" "}
            satırda hata var.
          </p>
          <div style={{ maxHeight: "18rem", overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Satır</th>
                  <th>Ürün</th>
                  <th>Kategori</th>
                  <th>İşlem</th>
                  <th>Kontrol</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.product.name || "—"}</td>
                    <td>{r.product.category || "—"}</td>
                    <td>{r.action}</td>
                    <td>{r.issue || "Hazır"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Hatalı satırları dosyada düzeltip tekrar yükleyin.</p>
          <Button
            type="button"
            variant="primary"
            disabled={saving || rows.some((r) => r.issue)}
            onClick={save}
          >
            {saving ? "Aktarılıyor…" : "Ürünleri içe aktar"}
          </Button>
        </>
      )}
    </Modal>
  );
}
