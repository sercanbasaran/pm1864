import React, { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { readTransferFile, downloadTransfer, formatLabel } from "../transfer/transfer.js";
import { newVariant } from "./VariantFields.jsx";
import { calculateVariant, defaultConsumables } from "../../variant-composition.js";
import { validateProduct } from "../../catalog.js";
import { defaultPackagingItems, isBoxVariant, isPortionVariant } from "../packaging/packaging-data.js";

const columns = ["Ürün kodu", "Varyant adı", "Varyant tipi", "Ürünler ve miktarlar", "Ambalaj / servis", "Kutu tipi", "Satış fiyatı", "Durum"];
const n = value => Number(String(value ?? "").trim().replace(",", "."));
export async function exportVariants(rows, types, products, boxes, format) {
  const data = rows.map(({p, v}) => [
    p.productCode, v.size, types.find(t => t.id === v.typeId)?.name || "",
    (v.items || [{productId: v.sourceProductId ?? p.id, quantity: v.quantity ?? 1}]).map(item => `${products.find(product => product.id === item.productId)?.productCode || ""}:${item.quantity}`).join(";"),
    v.packaging || "", boxes.find(box => box.id === v.packagingId)?.name || "", v.price, v.active !== false ? "Aktif" : "Pasif"
  ]);
  await downloadTransfer(columns, data, format, "varyantlar", "Varyantlar");
}
export default function VariantExcel({ onClose, format = "xls", manualOnly = false, sourceVariant, sourceProduct }) {
  const { products, categories, variantTypes, packagingItems = defaultPackagingItems(), consumables = defaultConsumables(), mutate, notify } = useCatalog();
  const [rows, setRows] = useState([]), [error, setError] = useState(""), [working, setWorking] = useState(false), [result, setResult] = useState("");
  const [manual, setManual] = useState(() => [sourceVariant ? {
    "Ürün kodu": sourceProduct.productCode, "Varyant adı": `${sourceVariant.size.slice(0, 39)} Kopya`,
    "Varyant tipi": variantTypes.find(t => t.id === sourceVariant.typeId)?.name || "",
    "Ürünler ve miktarlar": (sourceVariant.items || [{productId: sourceVariant.sourceProductId ?? sourceProduct.id, quantity: sourceVariant.quantity ?? 1}]).map(item => `${products.find(p => p.id === item.productId)?.productCode || ""}:${item.quantity}`).join(";"),
    "Ambalaj / servis": sourceVariant.packaging || "", "Kutu tipi": packagingItems.find(b => b.id === sourceVariant.packagingId)?.name || "",
    "Satış fiyatı": String(sourceVariant.price ?? ""), "Durum": sourceVariant.active === false ? "Pasif" : "Aktif"
  } : {}]);
  const updateManual = (index, key, value) => { setRows([]); setManual(previous => previous.map((row, i) => {
    if (i !== index) return row;
    const next = { ...row, [key]: value };
    if (key === "Ürün kodu" && row["Ürünler ve miktarlar"]?.startsWith(`${row["Ürün kodu"]}:`) && !row["Ürünler ve miktarlar"].includes(";")) next["Ürünler ve miktarlar"] = `${value}:${row["Ürünler ve miktarlar"].split(":")[1]}`;
    return next;
  })); };
  async function read(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setRows([]); setError(""); setResult(""); setWorking(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw Error("Dosya en fazla 5 MB olabilir.");
      const data = await readTransferFile(file, format);
      parseRows(data);
    } catch (e) { setError(e.message || "Dosya okunamadı."); }
    setWorking(false);
  }
  function parseRows(data, lineOffset = 2) {
      setError(""); setResult("");
      const groups = new Map();
      const parsed = data.map((row, index) => {
        let issue = "", product, variant;
        try {
          const code = String(row["Ürün kodu"] || "").trim();
          product = products.find(p => String(p.productCode) === code);
          if (!product) throw Error("Ürün kodu bulunamadı.");
          const typeName = String(row["Varyant tipi"] || "").trim();
          const type = variantTypes.find(t => t.name.toLocaleLowerCase("tr-TR") === typeName.toLocaleLowerCase("tr-TR"));
          if (!type) throw Error("Varyant tipi bulunamadı.");
          const name = String(row["Varyant adı"] || "").trim();
          if (!name || name.length > 45) throw Error("Varyant adı 1–45 karakter olmalı.");
          const itemsText = String(row["Ürünler ve miktarlar"] || "").trim();
          const items = (itemsText || `${code}:1`).split(";").map(part => {
            const pair = part.trim().split(":");
            const member = products.find(p => String(p.productCode) === pair[0]?.trim());
            if (pair.length !== 2 || !member) throw Error("Ürünler ve miktarlar alanını ürün kodu:miktar biçiminde girin.");
            return { productId: member.id, quantity: n(pair[1]) };
          });
          const boxName = String(row["Kutu tipi"] || "").trim();
          const box = packagingItems.find(b => b.active && b.name.toLocaleLowerCase("tr-TR") === boxName.toLocaleLowerCase("tr-TR"));
          if (isBoxVariant({typeId: type.id}, variantTypes) && !box) throw Error("Aktif kutu tipi seçin.");
          const packaging = isPortionVariant({typeId: type.id}, variantTypes) ? "Tabakta servis" : box ? (box.material === "Karton" ? "Karton kutu" : "Metal kutu") : String(row["Ambalaj / servis"] || "").trim();
          const price = String(row["Satış fiyatı"] ?? "").trim();
          const status = String(row["Durum"] || "Aktif").trim();
          if (!["Aktif", "Pasif"].includes(status)) throw Error("Durum Aktif veya Pasif olmalı.");
          variant = calculateVariant({ ...newVariant(), ...(sourceVariant ? { images: sourceVariant.images || [], consumables: sourceVariant.consumables || [] } : {}), size: name, typeId: type.id, sourceProductId: items[0].productId, items, packaging, ...(box ? {packagingId: box.id} : {}), priceOverride: price ? n(price) : null, active: status === "Aktif" }, products, consumables);
          const previous = groups.get(product.id) || [];
          const names = [...product.variants, ...previous].map(v => v.size.toLocaleLowerCase("tr-TR"));
          if (names.includes(name.toLocaleLowerCase("tr-TR"))) throw Error("Aynı isimde varyant zaten var veya dosyada tekrarlanıyor.");
          const invalid = validateProduct({...product, variants: [...product.variants, ...previous, variant]}, categories, variantTypes);
          if (invalid) throw Error(invalid.message);
          groups.set(product.id, [...previous, variant]);
        } catch (e) { issue = e.message; }
        return { line: index + lineOffset, product, variant, issue };
      });
      setRows(parsed);
  }
  async function save() {
    if (!rows.length || rows.some(r => r.issue)) return;
    setWorking(true); setError(""); let count = 0;
    const ids = [...new Set(rows.map(r => r.product.id))];
    for (const id of ids) {
      const product = products.find(p => p.id === id), additions = rows.filter(r => r.product.id === id);
      try { await mutate(`/products/${id}`, {product: {...product, variants: [...product.variants, ...additions.map(r => r.variant)]}}, "PUT"); count += additions.length; }
      catch (e) { setRows(rows.filter(r => !ids.slice(0, ids.indexOf(id)).includes(r.product.id))); setResult(`${count} varyant kaydedildi; ${product.name}: ${e.message}`); setWorking(false); return; }
    }
    setRows([]); setResult(`${count} varyant ${manualOnly ? "oluşturuldu" : "içe aktarıldı"}.`); notify(`${count} varyant ${manualOnly ? "oluşturuldu" : "içe aktarıldı"}.`); setWorking(false); if (manualOnly) onClose();
  }
  return <Modal title="Çoklu varyant ekle" onClose={onClose} busy={working} wide className="variant-bulk-dialog">
    {!manualOnly && <p>Her satır yeni bir varyant oluşturur. Ürün kodlarını metin olarak yazın. Birden fazla ürün için <strong>ürün kodu:miktar;ürün kodu:miktar</strong> kullanın. Kutu varyantlarında aktif kutu tipi adını girin; boş satış fiyatı otomatik hesaplanır.</p>}
    {manualOnly && <section className="bulk-variant-editor" aria-label="Çoğaltılacak varyantlar">
      <div className="bulk-variant-intro"><h3>Varyantları düzenleyin</h3><p>Her kart bir yeni varyant oluşturur. Satış fiyatını boş bırakırsanız ürün fiyatından hesaplanır.</p></div>
      {manual.map((row, index) => {
        const type = variantTypes.find(t => t.name === row["Varyant tipi"]);
        const boxType = isBoxVariant({ typeId: type?.id }, variantTypes);
        const portionType = isPortionVariant({ typeId: type?.id }, variantTypes);
        const pieces = String(row["Ürünler ve miktarlar"] || "").split(";");
        const single = pieces.length === 1;
        const quantity = single && pieces[0].includes(":") ? pieces[0].split(":")[1] : "";
        const field = (label, child) => <label className="bulk-variant-field"><span>{label}</span>{child}</label>;
        return <section className="bulk-variant-card" key={index}>
          <div className="bulk-variant-card-header"><strong>Varyant {index + 1}</strong><Button type="button" size="small" disabled={manual.length === 1 || working} onClick={() => { setRows([]); setManual(manual.filter((_, i) => i !== index)); }}>Kaldır</Button></div>
          <div className="bulk-variant-grid">
            {field("Ürün", <select aria-label={`${index + 1}. satır Ürün kodu`} value={row["Ürün kodu"] || ""} onChange={e => updateManual(index, "Ürün kodu", e.target.value)}><option value="">Ürün seçin</option>{products.map(p => <option key={p.id} value={p.productCode}>{p.name} · {p.productCode}</option>)}</select>)}
            {field("Varyant adı", <input aria-label={`${index + 1}. satır Varyant adı`} maxLength={45} value={row["Varyant adı"] || ""} onChange={e => updateManual(index, "Varyant adı", e.target.value)} />)}
            {field("Varyant tipi", <select aria-label={`${index + 1}. satır Varyant tipi`} value={row["Varyant tipi"] || ""} onChange={e => updateManual(index, "Varyant tipi", e.target.value)}><option value="">Tür seçin</option>{variantTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select>)}
            {single ? field("Ürün miktarı", <input aria-label={`${index + 1}. satır Ürün miktarı`} type="number" min="0.001" step="any" value={quantity} onChange={e => updateManual(index, "Ürünler ve miktarlar", `${row["Ürün kodu"] || ""}:${e.target.value}`)} />) : field("Ürünler ve miktarları", <input aria-label={`${index + 1}. satır Ürünler ve miktarlar`} value={row["Ürünler ve miktarlar"] || ""} onChange={e => updateManual(index, "Ürünler ve miktarlar", e.target.value)} />)}
            {boxType ? field("Kutu tipi", <select aria-label={`${index + 1}. satır Kutu tipi`} value={row["Kutu tipi"] || ""} onChange={e => updateManual(index, "Kutu tipi", e.target.value)}><option value="">Kutu tipi seçin</option>{packagingItems.filter(b => b.active).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select>) : portionType ? field("Servis şekli", <input value="Tabakta servis" disabled />) : field("Ambalaj / servis", <select aria-label={`${index + 1}. satır Ambalaj / servis`} value={row["Ambalaj / servis"] || ""} onChange={e => updateManual(index, "Ambalaj / servis", e.target.value)}><option value="">Seçin</option>{["Metal kutu", "Karton kutu", "Tabakta servis"].map(value => <option key={value}>{value}</option>)}</select>)}
            {field("Satış fiyatı (₺)", <input aria-label={`${index + 1}. satır Satış fiyatı`} type="number" min="0.01" step="0.01" placeholder="Otomatik hesapla" value={row["Satış fiyatı"] || ""} onChange={e => updateManual(index, "Satış fiyatı", e.target.value)} />)}
            {field("Durum", <select aria-label={`${index + 1}. satır Durum`} value={row["Durum"] || "Aktif"} onChange={e => updateManual(index, "Durum", e.target.value)}><option>Aktif</option><option>Pasif</option></select>)}
          </div>
          {!single && <p className="bulk-variant-note">Birden fazla ürün: ürün kodu:miktar çiftlerini noktalı virgülle ayırın.</p>}
          {rows[index]?.issue && <p className="bulk-variant-error" role="alert">{rows[index].issue}</p>}
        </section>;
      })}
      <div className="bulk-variant-actions"><Button type="button" disabled={manual.length >= 50 || working} onClick={() => { setRows([]); setManual([...manual, { ...manual[manual.length - 1], "Varyant adı": "" }]); }}>Varyant ekle</Button><Button type="button" variant="primary" disabled={working} onClick={() => parseRows(manual, 1)}>Varyantları kontrol et</Button></div>
    </section>}
    {!manualOnly && <><Button type="button" onClick={() => downloadTransfer(columns, [], format, "varyant-sablonu", "Varyantlar").catch(() => setError("Şablon hazırlanamadı."))}>{formatLabel(format)} şablonunu indir</Button>
    <p><label>{formatLabel(format)} dosyası seçin <input type="file" accept={format === "xls" ? ".xls,.xlsx" : `.${format}`} onChange={read} disabled={working} /></label></p></>}
    {error && <p role="alert">{error}</p>}{result && <p role="status">{result}</p>}
    {!!rows.length && <><p>{rows.length} satır · {rows.filter(r => r.issue).length} hatalı</p><div className="table-scroll" style={{maxHeight:"20rem", overflow:"auto"}}><table><thead><tr><th>Satır</th><th>Ürün</th><th>Varyant</th><th>Kontrol</th></tr></thead><tbody>{rows.map(r => <tr key={r.line}><td>{r.line}</td><td>{r.product?.name || "—"}</td><td>{r.variant?.size || "—"}</td><td>{r.issue || "Hazır"}</td></tr>)}</tbody></table></div><p>Hatalı satırları düzeltip yeniden kontrol edin. Her ürün ayrı kaydedilir.</p><Button type="button" variant="primary" disabled={working || rows.some(r => r.issue)} onClick={save}>{manualOnly ? "Varyantları oluştur" : "Varyantları içe aktar"}</Button></>}
  </Modal>;
}
