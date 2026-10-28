import useSessionFilter from "../../hooks/useSessionFilter.js";
import SlTooltip from "@shoelace-style/shoelace/dist/react/tooltip/index.js";
import FormatMenu from "../transfer/FormatMenu.jsx";
import VariantExcel, { exportVariants } from "./VariantExcel.jsx";
import { defaultPackagingItems, isBoxVariant } from "../packaging/packaging-data.js";
import TableText from "../../components/ui/TableText.jsx";
import VariantQualitySummary from "./VariantQualitySummary.jsx";
import { missingVariantInformation } from "./variant-quality.js";
import ManagementSummary from "../../components/ui/ManagementSummary.jsx";
import "./variant-management.css";
import Pagination from "../../components/ui/Pagination.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { variantTypeName } from "../../variant-types.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import Modal from "../../components/ui/Modal.jsx";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Card from "../../components/ui/Card.jsx";
import ProductImage from "../../components/ui/ProductImage.jsx";
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
import React, { useEffect, useState } from "react";
import {
  Plus,
  Stack,
  MagnifyingGlass,
  PencilSimple,
  Copy,
  Trash,
  QrCode,
  List,
  GridFour,
} from "@phosphor-icons/react";
import { roots, categoryOf, rootOf, categoryPath } from "../../hierarchy.js";
import { money } from "../../catalog-tools.js";
export default function VariantManager({
  products,
  categories,
  canWrite,
  onEdit,
  onDuplicate,
  onCard,
  onCreate,
  relatedProducts,
}) {
  const { variantTypes = [], packagingItems = defaultPackagingItems(), mutate, notify, busy } = useCatalog();
  const [importOpen, setImportOpen] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState(null), [multiDuplicate, setMultiDuplicate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null), [deleteError, setDeleteError] = useState("");
  async function deleteSelected() {
    if (!deleteTarget || busy) return;
    try { await mutate(`/variants/${encodeURIComponent(deleteTarget.id)}`, {}, "DELETE"); setDeleteTarget(null); setDeleteError(""); notify("Varyant silindi."); }
    catch (error) { setDeleteError(error.message); }
  }
  function confirmDelete(v) { setDeleteError(""); setDeleteTarget(v); }
  const [typeId, setTypeId] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}type`, "");
  const [boxId, setBoxId] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}box`, "");
  const boxSelected = !!typeId && isBoxVariant({ typeId }, variantTypes);
  const [quality, setQuality] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}quality`, "");
  const sources = relatedProducts || products;
  const qualityRows = products.flatMap(p => p.variants.map(v => ({p, v})));
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [filtersOpen, setFiltersOpen] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}panel-open`, false),
    [sort, setSort] = useState("updated"),
    [view, setView] = useState(() => { try { return sessionStorage.getItem("variant-list-view") === "grid" ? "grid" : "list"; } catch { return "list"; } });
  function clearFilters() {
    setQuery("");
    setRoot("");
    setSub("");
    setProductId("");
    setStatus("");
    setTypeId("");
    setBoxId("");
    setQuality("");
    setPage(1);
  }

  const [query, setQuery] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}query`, ""),
    [root, setRoot] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}root`, ""),
    [sub, setSub] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}sub`, ""),
    [status, setStatus] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}status`, ""),
    [productId, setProductId] = useSessionFilter(`${relatedProducts ? `variants:product:${products[0]?.id}:` : "variants:list:"}product`, "");
  useEffect(() => { if (query || root || sub || status || productId || typeId || (boxSelected && boxId) || quality) setFiltersOpen(true); }, []);
  const itemProducts = (owner, variant) => {
    const ids = Array.isArray(variant.items) && variant.items.length
      ? variant.items.map((item) => item.productId)
      : [variant.sourceProductId ?? owner.id];
    return ids.map((id) => sources.find((product) => product.id === id)).filter(Boolean);
  };
  const includedProducts = new Set(products.flatMap((owner) => owner.variants.flatMap((variant) => itemProducts(owner, variant).map((item) => item.id))));
  const rows = products
    .flatMap((p) =>
      p.variants.map((v) => ({ p, v, members: itemProducts(p, v) })),
    )
    .filter(
      ({ p, v, members }) =>
        (!quality || missingVariantInformation(v, quality, sources, variantTypes, p)) &&
        (!typeId || v.typeId === typeId) &&
        (!boxSelected || !boxId || v.packagingId === boxId) &&
        (!(root || sub || productId) || members.some((item) => {
          const c = categoryOf(item, categories);
          return (!root || rootOf(c, categories)?.id === root) && (!sub || c?.id === sub) && (!productId || String(item.id) === productId);
        })) &&
        (!status || (v.active !== false) === (status === "active")) &&
        `${members.map((item) => `${item.name} ${item.productCode || ""}`).join(" ")} ${v.size} ${v.sku || ""} ${variantTypeName(v, variantTypes)}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr")),
    )
    .sort((a, b) => sort === "name" ? String(a.v.size).localeCompare(String(b.v.size), "tr") : sort === "price-asc" ? a.v.price - b.v.price : sort === "price-desc" ? b.v.price - a.v.price : (new Date(b.v.updated || b.p.updated || 0) - new Date(a.v.updated || a.p.updated || 0)));
  const hasFilters = !!(query || root || sub || productId || status || typeId || (boxSelected && boxId) || quality);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)),
    current = Math.min(page, pages),
    shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const addAction = canWrite ? (
    <Button
      type="button"
      variant="primary"
      onClick={onCreate}
    >
      <Plus size={16} />
      Varyant oluştur
    </Button>
  ) : null;
  return (
    <section className="variant-module">
      <ManagementSummary
        label="Varyant özeti"
        items={[
          {
            label: "Toplam varyant",
            value: products.reduce((n, p) => n + p.variants.length, 0),
            detail: "Kayıtlı tüm varyantlar",
          },
          {
            label: "Aktif varyant",
            value: products.reduce(
              (n, p) => n + p.variants.filter((v) => v.active !== false).length,
              0,
            ),
            detail: "Aktif durumundaki varyantlar",
          },
          {
            label: "Varyantlı ürün",
            value: includedProducts.size,
            detail: "Varyantların içeriğinde bulunan ürünler",
          },
        ]}
      />

      {duplicateTarget && !multiDuplicate && <Modal title="Varyant çoğalt" onClose={() => setDuplicateTarget(null)}><p>{duplicateTarget.v.size} varyantını nasıl çoğaltmak istersiniz?</p><Button type="button" onClick={() => { const target = duplicateTarget; setDuplicateTarget(null); onDuplicate(target.p, target.v); }}>Tek varyant çoğalt</Button> <Button type="button" variant="primary" onClick={() => setMultiDuplicate(true)}>Çoklu varyant çoğalt</Button></Modal>}
      {duplicateTarget && multiDuplicate && <VariantExcel manualOnly sourceVariant={duplicateTarget.v} sourceProduct={duplicateTarget.p} onClose={() => { setDuplicateTarget(null); setMultiDuplicate(false); }} />}
      {importOpen && <VariantExcel format={importOpen === "manual" ? "xls" : importOpen} manualOnly={importOpen === "manual"} onClose={() => setImportOpen("")} />}
      <VariantQualitySummary rows={qualityRows} products={sources} types={variantTypes} selected={quality} onSelect={value => {setQuality(value); setPage(1);}} />
          <Card className="panel variant-manager">
            <div className="panel-title">
              <div>
                <h2>Varyant yönetimi</h2>
                <p className="muted">
                  Ürün miktarına göre fiyat ve gramajı hesaplanan varyantları
                  yönetin.
                </p>
              </div>
              <div className="variant-header-actions">
                {addAction}
                {canWrite && <FormatMenu direction="import" onSelect={setImportOpen} />}
                <FormatMenu direction="export" disabled={!rows.length} onSelect={format => exportVariants(rows, variantTypes, sources, packagingItems, format).catch(() => notify("Dışa aktarma dosyası hazırlanamadı."))} />
              </div>
            </div>
            <div className="variant-list-toolbar">
              <Input prefix={<MagnifyingGlass size={17} />} aria-label="Varyant ara" value={query} label="Varyant ara" placeholder="Ürün, varyant adı veya kod ara" onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
              <Select label="Durum filtresi" aria-label="Varyant durum filtresi" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Tüm durumlar</option><option value="active">Aktif</option><option value="inactive">Pasif</option></Select>
              <Select label="Varyant sıralaması" aria-label="Varyant sıralaması" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="updated">Son güncellenen</option><option value="name">Varyant adı A–Z</option><option value="price-asc">Fiyat: düşükten yükseğe</option><option value="price-desc">Fiyat: yüksekten düşüğe</option></Select>
              <Button type="button" aria-expanded={filtersOpen} aria-controls="variant-filter-panel" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? "Filtreleri Kapat" : "Filtreleri Aç"}</Button>
              <Button type="button" className="icon-btn" aria-label="Liste görünümü" aria-pressed={view === "list" ? "true" : "false"} onClick={() => { setView("list"); try { sessionStorage.setItem("variant-list-view", "list"); } catch {} }}><List size={18} /></Button>
              <Button type="button" className="icon-btn" aria-label="Döşeme görünümü" aria-pressed={view === "grid" ? "true" : "false"} onClick={() => { setView("grid"); try { sessionStorage.setItem("variant-list-view", "grid"); } catch {} }}><GridFour size={18} /></Button>
            </div>
            <div id="variant-filter-panel" className="variant-filters" hidden={!filtersOpen}>
              <div className="variant-filter-grid">
                <Select
                  label="İçerikteki ana kategori"
                  aria-label="İçerikteki ana kategori"
                  value={root}
                  onChange={(e) => {
                    setRoot(e.target.value);
                    setSub("");
                    setProductId("");
                    setPage(1);
                  }}
                >
                  <option value="">Tüm ana kategoriler</option>
                  {roots(categories).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="İçerikteki alt kategori"
                  aria-label="İçerikteki alt kategori"
                  value={sub}
                  onChange={(e) => {
                    setSub(e.target.value);
                    setProductId("");
                    setPage(1);
                  }}
                >
                  <option value="">Tüm alt kategoriler</option>
                  {categories
                    .filter((c) => c.parentId && (!root || c.parentId === root))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {categoryPath(c, categories)}
                      </option>
                    ))}
                </Select>
                <Select
                  label="İçerikteki ürün"
                  aria-label="Varyant ürünü"
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tüm ürünler</option>
                  {products
                    .filter((p) => {
                      const c = categoryOf(p, categories);
                      return (
                        (!root || rootOf(c, categories)?.id === root) &&
                        (!sub || c?.id === sub)
                      );
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.productCode}
                      </option>
                    ))}
                </Select>
                <Select
                  label="Varyant tipi filtresi"
                  value={typeId}
                  onChange={(e) => {
                    setTypeId(e.target.value);
                    setBoxId("");
                    setPage(1);
                  }}
                >
                  <option value="">Tüm varyant tipleri</option>
                  {variantTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
                {boxSelected && <Select label="Kutu tipi" aria-label="Kutu tipi filtresi" value={boxId} onChange={(e) => { setBoxId(e.target.value); setPage(1); }}>
                  <option value="">Tüm kutu tipleri</option>
                  {packagingItems.map(box => <option key={box.id} value={box.id}>{box.name}{box.active === false ? " (pasif)" : ""}</option>)}
                </Select>}
              </div>
              <Button type="button" size="small" onClick={clearFilters}>
                Filtreleri temizle
              </Button>
            </div>
            <div className="variant-results" role="status">
              <span>{rows.length} varyant listeleniyor · {products.reduce((n, p) => n + p.variants.length, 0)} kayıtlı varyant</span>
              {hasFilters && <Button type="button" size="small" onClick={clearFilters}>Filtreleri temizle</Button>}
            </div>
            <div
              className={"table-scroll variant-desktop-table " + (view === "grid" ? "variant-view-hidden" : "")}
              hidden={!rows.length}
              tabIndex={0}
              role="region"
              aria-label="Kaydırılabilir tablo"
            >
              <Table aria-label="Varyantlar">
                <TableHead>
                  <TableRow>
                    <TableHeading>VARYANT</TableHeading>
                    <TableHeading>GRAMAJ / DİLİM</TableHeading>
                    <TableHeading>MİKTAR / SERVİS</TableHeading>
                    <TableHeading>SATIŞ FİYATI</TableHeading>
                    <TableHeading>DURUM</TableHeading>
                    <TableHeading>İŞLEMLER</TableHeading>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shown.map(({ p, v, members }) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <SlTooltip placement="top" content={[v.size, `Tür: ${variantTypeName(v, variantTypes)}`, members.length ? `Ürünler: ${members.map(item => item.name).join(", ")}` : "", v.weight ? `≈ ${v.weight} g` : "", `Fiyat: ${money(v.price)}`, v.active !== false ? "Aktif" : "Pasif"].filter(Boolean).join(" · ")}>
                        <Button type="button" className="product-cell variant-identity" aria-label={v.size + (canWrite ? " düzenle" : " görüntüle")} onClick={() => onEdit(p, false, v.id)}>
                          <ProductImage product={{ name: v.size, customImage: v.images?.[0]?.url || "" }} />
                          <div className="variant-cell-main"><strong><TableText value={v.size} /></strong><small><TableText value={`${v.sku || "—"} · ${variantTypeName(v, variantTypes)}`} /></small></div>
                        </Button>
                        </SlTooltip>
                      </TableCell>
                      <TableCell>
                        ≈ {v.weight} g{v.slices > 0 ? ` / ${v.slices} dilim` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="variant-serving-cell">
                          <span><TableText value={v.packagingName || v.packaging || "Ambalaj belirtilmedi"} /></span>
                          <SlTag size="small">{v.items?.length > 1 ? `${v.items.length} ürün` : `${v.quantity ?? "—"} ${v.unit || "Adet"}`}</SlTag>
                          {v.items?.length > 1 && v.slices > 0 && <SlTag size="small">{v.slices} dilim</SlTag>}
                        </div>
                      </TableCell>
                      <TableCell><div className="variant-price-cell"><strong>{money(v.price)}</strong><small>Hesaplanan: {Number.isFinite(v.calculatedPrice) ? money(v.calculatedPrice) : "—"}</small></div></TableCell>
                      <TableCell>
                        <SlBadge
                          variant={v.active !== false ? "success" : "neutral"}
                        >
                          {v.active !== false ? "Aktif" : "Pasif"}
                        </SlBadge>
                      </TableCell>
                      <TableCell>
                        <div className="variant-row-actions">
                        {canWrite && <Button type="button" className="icon-btn" aria-label={p.name + " " + v.size + " varyantını çoğalt"} title={p.variants.length >= 50 ? "Bir üründe en fazla 50 varyant olabilir" : "Varyantı çoğalt"} disabled={p.variants.length >= 50} onClick={() => setDuplicateTarget({p, v})}><Copy size={16} /></Button>}
                        <Button type="button" className="icon-btn" aria-label={p.name + " " + v.size + " varyant kartı ve QR"} title="Varyant kartı ve QR" onClick={() => onCard(p, v)}><QrCode size={18} /></Button>
                        <Button type="button" className="icon-btn" aria-label={p.name + " " + v.size + (canWrite ? " düzenle" : " görüntüle")} title={canWrite ? "Düzenle" : "Görüntüle"} onClick={() => onEdit(p, false, v.id)}><PencilSimple size={18} /></Button>
                        {canWrite && <Button type="button" className="icon-btn" aria-label={v.size + " varyantını sil"} title="Varyantı sil" onClick={() => confirmDelete(v)}><Trash size={18} /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!rows.length && (
              <div className="empty">
                <Stack size={30} />
                <h3>Varyant bulunamadı</h3>
                <p>{hasFilters ? "Arama veya filtrelerinizi değiştirerek tekrar deneyin." : "Henüz eklenmiş bir varyant bulunmuyor."}</p>
                {hasFilters && <Button type="button" onClick={clearFilters}>Filtreleri temizle</Button>}
              </div>
            )}
            <div className={"variant-mobile-cards " + (view === "grid" ? "variant-view-grid" : "")}>
              {shown.map(({ p, v, members }) => (
                <article key={v.id}>
                  <div>
                    <strong>{v.size}</strong>
                    <SlBadge
                      variant={v.active !== false ? "success" : "neutral"}
                    >
                      {v.active !== false ? "Aktif" : "Pasif"}
                    </SlBadge>
                  </div>
                  <p className="variant-card-product">{members.map((item) => item.name).join(" · ") || "Ürün bulunamadı"}</p>
                  <small className="variant-card-meta">{v.sku || "—"}</small>
                  <small className="variant-card-type">{variantTypeName(v, variantTypes)}</small>
                  {v.items?.length > 1 && <small className="variant-card-meta">{v.items.map(item => { const source = sources.find(product => product.id === item.productId); return `${source?.name || "Ürün"}: ${item.quantity} ${source?.unitPricing?.unit || "birim"}`; }).join(" · ")}</small>}
                  <dl>
                    <div>
                      <dt>Miktar</dt>
                      <dd>
                        {v.items?.length > 1 ? `${v.items.length} ürün` : `${v.quantity ?? "—"} ${v.unit || "Adet"}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Gramaj</dt>
                      <dd>≈ {v.weight} g</dd>
                    </div>
                    <div>
                      <dt>Satış fiyatı</dt>
                      <dd>{money(v.price)}</dd>
                    </div>
                    <div>
                      <dt>Ambalaj / servis</dt>
                      <dd>{v.packagingName || v.packaging || "—"}</dd>
                    </div>
                  </dl>
                  <div className="variant-card-actions">
                  {canWrite && <Button type="button" aria-label={p.name + " " + v.size + " varyantını çoğalt"} disabled={p.variants.length >= 50} onClick={() => setDuplicateTarget({p, v})}><Copy size={16} /> Varyantı çoğalt</Button>}
                  <Button type="button" aria-label={p.name + " " + v.size + " varyant kartı ve QR"} onClick={() => onCard(p, v)}><QrCode size={16} /> Varyant kartı ve QR</Button>
                  <Button type="button" onClick={() => onEdit(p, false, v.id)}>
                    {canWrite ? "Düzenle" : "Görüntüle"}
                  </Button>
                  {canWrite && <Button type="button" aria-label={v.size + " varyantını sil"} onClick={() => confirmDelete(v)}><Trash size={16} /> Varyantı sil</Button>}
                  </div>
                </article>
              ))}
            </div>
            <div className="variant-list-footer">
              <Select aria-label="Sayfa başına varyant" value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50, 100].map(size => <option key={size} value={String(size)}>{size}</option>)}
              </Select>
              <Pagination total={rows.length} page={current} pageSize={pageSize} onChange={setPage} />
            </div>
          </Card>

      {deleteTarget && <Modal title="Varyantı sil" busy={busy} onClose={() => { setDeleteTarget(null); setDeleteError(""); }}>
        <p><strong>{deleteTarget.size}</strong> varyantını silmek istediğinizden emin misiniz?{deleteTarget.publicCardEnabled && " Yayınlanan varyant kartı ve QR bağlantısı da erişilemez olacak."}</p>
        {deleteError && <SlAlert open variant="danger">{deleteError}</SlAlert>}
        <div className="variant-delete-actions"><Button type="button" disabled={busy} onClick={() => setDeleteTarget(null)}>Vazgeç</Button><Button type="button" variant="danger" disabled={busy} onClick={deleteSelected}>Varyantı sil</Button></div>
      </Modal>}
    </section>
  );
}
