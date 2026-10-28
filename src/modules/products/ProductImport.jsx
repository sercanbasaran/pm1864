import React, { useState } from "react";
import { readTransferFile, downloadTransfer, formatLabel } from "../transfer/transfer.js";
import Modal from "../../components/ui/Modal.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { validateProduct } from "../../catalog.js";
import { useCatalog } from "../../app/CatalogContext.jsx";

export const productTransferColumns = [
  "Ürün adı",
  "Kategori kodu",
  "Kısa açıklama",
  "Durum",
  "Birim",
  "Birim fiyat",
  "Birim gramaj (g)",
  "İçindekiler",
  "Alerjen uyarısı",
  "Besin değerleri",
  "Servis önerisi",
  "Saklama koşulları",
  "Uzun süreli muhafaza",
  "Ürün kodu",
  "Mağaza",
  "E-Mağaza",
  "Sipariş Platformları",
];
const number = (value) =>
  typeof value === "number"
    ? value
    : Number(
        String(value ?? "")
          .trim()
          .replace(",", "."),
      );
export default function ProductImport({ onClose, format = "xls" }) {
  const { categories, variantTypes, products, mutate, notify } = useCatalog();
  const [rows, setRows] = useState([]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [result, setResult] = useState(null);
  async function template() {
    try { await downloadTransfer(productTransferColumns, [], format, "urun-ice-aktarma-sablonu", "Ürünler"); }
    catch { setError("Şablon hazırlanamadı. Yeniden deneyin."); }
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
      const seen = new Set(
        products.map((p) => p.name.trim().toLocaleLowerCase("tr-TR")),
      );
      const parsed = data.map((row, index) => {
        const code = String(row["Kategori kodu"] || "").trim();
        const matches = categories.filter((c) => {
          const parent = categories.find((p) => p.id === c.parentId);
          return c.parentId
            ? parent &&
                String(parent.code || "") + String(c.code || "") === code
            : String(c.code || "") === code;
        });
        const category = matches.length === 1 ? matches[0] : null;
        const unit = String(row["Birim"] || "").trim();
        const hasPrice =
          String(row["Birim fiyat"] || "").trim() ||
          unit ||
          String(row["Birim gramaj (g)"] || "").trim();
        const product = {
          isNew: true,
          name: String(row["Ürün adı"] || "").trim(),
          categoryId: category?.id || "",
          category: category?.name || "",
          description: String(row["Kısa açıklama"] || "").trim(),
          status: String(row["Durum"] || "Taslak").trim(),
          variants: [],
          unitPricing: hasPrice
            ? {
                unit,
                price: number(row["Birim fiyat"]),
                weight:
                  unit === "Kilogram"
                    ? 1000
                    : unit === "Gram"
                      ? 1
                      : number(row["Birim gramaj (g)"]),
              }
            : null,
        };
        for (const [column, key] of [
          ["İçindekiler", "ingredients"],
          ["Alerjen uyarısı", "allergens"],
          ["Besin değerleri", "nutrition"],
          ["Servis önerisi", "servingSuggestion"],
          ["Saklama koşulları", "storageConditions"],
          ["Uzun süreli muhafaza", "longTermStorage"],
        ])
          product[key] = String(row[column] || "").trim();
        const channelEntries = [["Mağaza", "store"], ["E-Mağaza", "online"], ["Sipariş Platformları", "foodDelivery"]];
        const channelValues = channelEntries.filter(([label]) => String(row[label] ?? "").trim() !== "");
        if (channelValues.length) product.salesAvailability = Object.fromEntries(channelValues.map(([label, key]) => [key, String(row[label]).trim() === "Açık"]));
        const invalidChannel = channelValues.some(([label]) => !["Açık", "Kapalı"].includes(String(row[label]).trim()));
        const normalized = product.name.toLocaleLowerCase("tr-TR");
        let issue = !category
          ? "Kategori kodu bulunamadı veya birden fazla kategoriyle eşleşiyor."
          : !["Aktif", "Taslak"].includes(product.status)
            ? "Durum Aktif veya Taslak olmalı."
            : invalidChannel
              ? "Satış kanalı Açık veya Kapalı olmalı."
            : seen.has(normalized)
              ? "Bu isimde bir ürün zaten var veya dosyada tekrar ediyor."
              : validateProduct(product, categories, variantTypes)?.message ||
                "";
        if (normalized) seen.add(normalized);
        return { line: index + 2, product, issue };
      });
      setRows(parsed);
    } catch (e) {
      setError(e.message || "Dosya okunamadı.");
    }
    event.target.value = "";
    setSaving(false);
  }
  async function save() {
    if (!rows.length || rows.some((r) => r.issue)) return;
    setSaving(true);
    setError("");
    let count = 0;
    for (const row of rows) {
      try {
        await mutate("/products", { product: row.product }, "POST");
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
        Şablonu indirip ürünleri doldurun. Ana kategori için 4 haneli kodu, alt
        kategori için ana kategori kodu ve 3 haneli alt kategori kodunu birlikte
        yazın (ör. 0100010). Kod hücrelerini metin biçiminde tutun. Yeni ürün
        kodları sistem tarafından oluşturulur.
      </p>
      <Button type="button" onClick={template}>
        {formatLabel(format)} şablonunu indir
      </Button>
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
                  <th>Kontrol</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.product.name || "—"}</td>
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
