import ProductIdentity from "../../components/ui/ProductIdentity.jsx";
import useSessionFilter from "../../hooks/useSessionFilter.js";
import SlTooltip from "@shoelace-style/shoelace/dist/react/tooltip/index.js";
import { money } from "../../catalog-tools.js";
import FormatMenu from "../transfer/FormatMenu.jsx";
import { downloadTransfer } from "../transfer/transfer.js";
import BulkCreateProducts from "./BulkCreateProducts.jsx";
import BulkProducts from "./BulkProducts.jsx";
import TableText from "../../components/ui/TableText.jsx";
import ProductImport, { productTransferColumns } from "./ProductImport.jsx";
import "./product-management.css";
import ProductQualitySummary from "./ProductQualitySummary.jsx";
import {
  productQualityChecks,
  missingProductInformation,
} from "./product-quality.js";
import UnitPricing from "./UnitPricing.jsx";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import ManagementSummary from "../../components/ui/ManagementSummary.jsx";
import Card from "../../components/ui/Card.jsx";
import { salesChannels } from "../../sales-availability.js";
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
import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  MagnifyingGlass,
  List,
  GridFour,
  Tag,
  PencilSimple,
  QrCode,
  Copy,
} from "@phosphor-icons/react";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { can } from "../../permissions.js";
import {
  roots,
  categoryOf,
  rootOf,
  categoryPath,
  categoryMatches,
} from "../../hierarchy.js";
import ProductImage from "../../components/ui/ProductImage.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
export default function ProductManagement({
  user,
  focus,
  onEdit,
  onNew,
  onDuplicate,
  onBulk,
  onCard,
  onCreateVariant,
  onFocusConsumed,
}) {
  const { products, categories, variantTypes, busy, notify } = useCatalog(),
    [query, setQuery] = useSessionFilter("products:query", ""),
    [category, setCategory] = useSessionFilter("products:category", ""),
    [status, setStatus] = useSessionFilter("products:status", ""),
    [quality, setQuality] = useSessionFilter("products:quality", ""),
    [sort, setSort] = useState("updated"),
    [view, setView] = useState(() => { try { return sessionStorage.getItem("product-list-view") === "grid" ? "grid" : "list"; } catch { return "list"; } }),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [selected, setSelected] = useState([]),
    [filters, setFilters] = useSessionFilter("products:panel-open", false),
    [importOpen, setImportOpen] = useState(""),
    [bulkProductsOpen, setBulkProductsOpen] = useState(false),
    [bulkCreateOpen, setBulkCreateOpen] = useState(false),
    search = useRef(null);
  useEffect(() => { try { sessionStorage.setItem("product-list-view", view); } catch {} }, [view]);
  useEffect(() => { if (query || category || status || quality) setFilters(true); }, []);
  const write = can(user, "products.write"),
    price = can(user, "prices.write");
  useEffect(() => {
    if (!focus) return;
    setCategory(focus?.category || "");
    setStatus(focus?.status || "");
    setQuality(focus?.quality || "");
    setQuery("");
    setPage(1);
    setFilters(!!(focus?.quality || focus?.category || focus?.status));
    setSelected([]);
    onFocusConsumed?.();
  }, [focus]);
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === "/" &&
        !e
          .composedPath()
          .some((node) =>
            node.matches?.(
              'input,textarea,select,sl-input,sl-textarea,sl-select,[contenteditable="true"]',
            ),
          ) &&
        !document.querySelector('[role="dialog"]')
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const visible = products
    .filter(
      (p) =>
        categoryMatches(p, category, categories) &&
        (!status || p.status === status) &&
        (!quality || missingProductInformation(p, quality)) &&
        `${p.name} ${p.productCode} ${p.variants.map((v) => v.size).join(" ")}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr")),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "tr")
        : sort === "price-asc"
          ? (a.unitPricing?.price ?? 0) - (b.unitPricing?.price ?? 0)
          : sort === "price-desc"
            ? (b.unitPricing?.price ?? 0) - (a.unitPricing?.price ?? 0)
            : new Date(b.updated) - new Date(a.updated),
    );
  const current = Math.min(page, Math.max(1, Math.ceil(visible.length / pageSize))),
    shown = visible.slice((current - 1) * pageSize, current * pageSize),
    parent =
      rootOf(
        categories.find((c) => c.id === category || c.name === category),
        categories,
      )?.id || "";
  function filter(set, value) {
    set(value);
    setPage(1);
    setSelected([]);
  }
  function clear() {
    setQuery("");
    setCategory("");
    setStatus("");
    setQuality("");
    setPage(1);
    setSelected([]);
  }
  function toggle(id) {
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id],
    );
  }
  async function exportRows(format) {
    const rows = visible.map(p => {
      const category = categoryOf(p, categories);
      const root = rootOf(category, categories);
      const code = category?.parentId ? `${root?.code || ""}${category.code || ""}` : category?.code || "";
      const sales = p.salesAvailability || {};
      return [p.name, code, p.description || "", p.status, p.unitPricing?.unit || "", p.unitPricing?.price ?? "", p.unitPricing?.weight ?? "", p.ingredients || "", p.allergens || "", p.nutrition || "", p.servingSuggestion || "", p.storageConditions || "", p.longTermStorage || "", p.productCode || "", ...salesChannels.map(c => sales[c.key] ? "Açık" : "Kapalı")];
    });
    try { await downloadTransfer(productTransferColumns, rows, format, "urunler", "Ürünler"); }
    catch { notify("Dışa aktarma dosyası hazırlanamadı."); }
  }
  const addAction = write ? (
    <Button
      type="button"
      variant="primary"
      className="btn"
      onClick={() => onNew()}
    >
      <Plus size={16} />
      Yeni ürün
    </Button>
  ) : null;
  return (
    <section className="product-module">
      <ManagementSummary
        label="Ürün özeti"
        items={[
          {
            label: "Toplam ürün sayısı",
            value: products.length,
            detail:
              products.reduce((total, p) => total + p.variants.length, 0) +
              " varyant",
          },
          {
            label: "Aktif ürün sayısı",
            value: products.filter((p) => p.status === "Aktif").length,
            detail: "Aktif durumundaki ürünler",
          },
          {
            label: "Taslak ürün sayısı",
            value: products.filter((p) => p.status === "Taslak").length,
            detail: "Hazırlık aşamasındaki ürünler",
          },
        ]}
        title="Ürünlerinizi yönetin"
        description="Ürün bilgilerini, varyantları ve kategori ilişkilerini yönetin."
        action={addAction}
      />
      <ProductQualitySummary
        products={products}
        selected={quality}
        onSelect={(key) => {
          setQuality(key);
          setPage(1);
          setSelected([]);
          setFilters(true);
        }}
      />
      <Card className="catalog">
        <div className="catalog-heading">
          <div>
            <h2>Ürün listesi</h2>
            <p>
              {visible.length} ürün listeleniyor · {products.length} kayıtlı
              ürün
            </p>
          </div>
          <div className="product-catalog-actions">
            {write && <Button type="button" onClick={() => setBulkCreateOpen(true)}>Çoklu ürün ekle</Button>}
            {write && <FormatMenu direction="import" onSelect={setImportOpen} />}
            <FormatMenu direction="export" disabled={!visible.length} onSelect={exportRows} />
          </div>
        </div>
        <div className="toolbar">
          <div className="search">
            <Input
              prefix={<MagnifyingGlass size={17} />}
              ref={search}
              label="Ürün ara"
              aria-label="Ürün ara"
              placeholder="Ürün adı veya ürün kodu ara"
              value={query}
              onChange={(e) => filter(setQuery, e.target.value)}
            />
            <kbd>/</kbd>
          </div>
          <div className="toolbar-right">
            <Select
              aria-label="Durum filtresi"
              value={status}
              onChange={(e) => filter(setStatus, e.target.value)}
            >
              <option value="">Tüm durumlar</option>
              <option>Aktif</option>
              <option>Taslak</option>
            </Select>
            <Select
              aria-label="Ürün sıralaması"
              value={sort}
              onChange={(e) => filter(setSort, e.target.value)}
            >
              <option value="updated">Son güncellenen</option>
              <option value="name">Ürün adı A–Z</option>
              <option value="price-asc">Birim fiyat: düşükten yükseğe</option>
              <option value="price-desc">Birim fiyat: yüksekten düşüğe</option>
            </Select>
            <Button
              type="button"
              className="btn"
              aria-expanded={filters}
              aria-controls="product-filter-panel"
              onClick={() => setFilters(!filters)}
            >
              {filters ? "Filtreleri Kapat" : "Filtreleri Aç"}
            </Button>
            <Button
              className="icon-btn"
              aria-label="Liste görünümü"
              aria-pressed={view === "list" ? "true" : "false"}
              variant={view === "list" ? "primary" : "default"}
              onClick={() => setView("list")}
            >
              <List size={18} />
            </Button>
            <Button
              className="icon-btn"
              aria-label="Kart görünümü"
              aria-pressed={view === "grid" ? "true" : "false"}
              variant={view === "grid" ? "primary" : "default"}
              onClick={() => setView("grid")}
            >
              <GridFour size={18} />
            </Button>
          </div>
        </div>
        {filters && (
          <div className="filter-panel" id="product-filter-panel">
            <Select
              aria-label="Katalog ana kategorisi"
              value={parent}
              onChange={(e) => filter(setCategory, e.target.value)}
            >
              <option value="">Tüm ana kategoriler</option>
              {roots(categories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Katalog alt kategorisi"
              value={
                categories.find((c) => c.id === category)?.parentId
                  ? category
                  : ""
              }
              onChange={(e) => filter(setCategory, e.target.value || parent)}
            >
              <option value="">Tüm alt kategoriler</option>
              {categories
                .filter((c) => c.parentId && (!parent || c.parentId === parent))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryPath(c, categories)}
                  </option>
                ))}
            </Select>
            <Select
              aria-label="İçerik eksikliği"
              value={quality}
              onChange={(e) => filter(setQuality, e.target.value)}
            >
              <option value="">Tüm ürünler</option>
              <option value="any">Eksik bilgili tüm ürünler</option>
              {productQualityChecks.map((check) => (
                <option key={check.key} value={check.key}>
                  {check.label}
                </option>
              ))}
            </Select>
            <Button className="text-btn" onClick={clear}>
              Filtreleri temizle
            </Button>
          </div>
        )}
        {(price || write) && (
          <div className="selection-bar">
            <strong>
              {selected.length
                ? selected.length + " ürün seçildi"
                : "Toplu işlem için ürün seçebilirsiniz"}
            </strong>
            <Button type="button" disabled={busy || !selected.length} onClick={() => setBulkProductsOpen(true)}>Toplu ürün işlemleri</Button>
            {price && <Button
              disabled={busy || !visible.length}
              onClick={() =>
                onBulk(selected.length ? selected : visible.map((p) => p.id))
              }
            >
              <Tag size={16} />
              Toplu fiyat güncelle
            </Button>}
            {!!selected.length && (
              <Button onClick={() => setSelected([])}>Seçimi kaldır</Button>
            )}
          </div>
        )}
        {(price || write) && view === "grid" && shown.length > 0 && <div className="product-grid-select-all"><Input type="checkbox" aria-label="Sayfadaki tüm ürünleri seç" checked={shown.every((p) => selected.includes(p.id))} onChange={() => setSelected(shown.every((p) => selected.includes(p.id)) ? selected.filter((id) => !shown.some((p) => p.id === id)) : [...new Set([...selected, ...shown.map((p) => p.id)])])} /><span>Sayfadaki tüm ürünleri seç</span></div>}
        {view === "list" ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Kaydırılabilir tablo"
          >
            <Table className="product-table" aria-label="Ürünler">
              <TableHead>
                <TableRow>
                  <TableHeading>
                    <Input
                      type="checkbox"
                      disabled={!price && !write}
                      aria-label="Sayfadaki tüm ürünleri seç"
                      checked={
                        !!shown.length &&
                        shown.every((p) => selected.includes(p.id))
                      }
                      onChange={() =>
                        setSelected(
                          shown.every((p) => selected.includes(p.id))
                            ? selected.filter(
                                (id) => !shown.some((p) => p.id === id),
                              )
                            : [
                                ...new Set([
                                  ...selected,
                                  ...shown.map((p) => p.id),
                                ]),
                              ],
                        )
                      }
                    />
                  </TableHeading>
                  <TableHeading>ÜRÜN</TableHeading>
                  <TableHeading>KATEGORİ</TableHeading>
                  <TableHeading>BİRİM FİYAT</TableHeading>
                  <TableHeading>DURUM</TableHeading>
                  <TableHeading>İŞLEMLER</TableHeading>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Input
                        type="checkbox"
                        disabled={!price && !write}
                        aria-label={p.name + " seç"}
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <SlTooltip placement="top" content={[p.name, categoryPath(categoryOf(p, categories), categories), p.productCode ? `Kod: ${p.productCode}` : "", p.unitPricing?.price ? `Birim fiyat: ${money(p.unitPricing.price)} / ${p.unitPricing.unit}` : "", `${p.variants.length} varyant`, p.status].filter(Boolean).join(" · ")}>
                      <ProductIdentity product={p} onClick={() => onEdit(p)}>
                        <strong><TableText value={p.name} /></strong>
                        <small>{p.productCode} · {p.variants.length} varyant</small>
                      </ProductIdentity>
                      </SlTooltip>
                    </TableCell>
                    <TableCell>
                      <SlTag size="small">
                        <TableText value={categoryPath(categoryOf(p, categories), categories)} />
                      </SlTag>
                    </TableCell>
                    <TableCell>
                      {<UnitPricing value={p.unitPricing} compact />}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>
                      <div className="product-list-actions">
                        {write && (
                          <Button
                            type="button"
                            className="icon-btn"
                            aria-label={p.name + " ürününü çoğalt"}
                            title="Ürün çoğalt"
                            disabled={busy}
                            onClick={() => onDuplicate(p)}
                          >
                            <Copy size={18} />
                          </Button>
                        )}
                        {write && <Button type="button" className="icon-btn" aria-label={p.name + " için varyant oluştur"} title="Varyant oluştur" disabled={busy || p.variants.length >= 50} onClick={() => onCreateVariant(p)}><Plus size={18} /></Button>}
                        <Button
                          type="button"
                          className="icon-btn"
                          aria-label={p.name + " ürün kartı ve QR"}
                          onClick={() => onCard(p)}
                        >
                          <QrCode size={18} />
                        </Button>
                        <Button
                          className="icon-btn"
                          aria-label={
                            p.name + (write ? " düzenle" : " görüntüle")
                          }
                          onClick={() => onEdit(p)}
                        >
                          <PencilSimple size={18} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="product-grid">
            {shown.map((p) => (
              <Card className="product-summary-card" key={p.id}>
                {(price || write) && <div className="product-grid-selection"><Input type="checkbox" aria-label={p.name + " seç"} checked={selected.includes(p.id)} onChange={() => toggle(p.id)} /></div>}
                <button type="button" className="product-summary-image-link" aria-label={p.name + " detayını aç"} onClick={() => onEdit(p)}>
                  <ProductImage product={p} size="tile" />
                </button>
                <StatusBadge status={p.status} />
                <div className="product-summary-meta"><SlTag size="small">{p.productCode}</SlTag><SlTag size="small">{p.variants.length} varyant</SlTag></div>
                <div className="product-summary-category"><SlTag size="small">{categoryPath(categoryOf(p, categories), categories)}</SlTag></div>
                <h3 title={p.name}>{p.name}</h3>
                <UnitPricing value={p.unitPricing} compact />
                <div className="product-summary-actions">
                  {write && (
                    <Button
                      type="button"
                      aria-label={p.name + " ürününü çoğalt"}
                      disabled={busy}
                      onClick={() => onDuplicate(p)}
                    >
                      <Copy size={16} /> Ürün çoğalt
                    </Button>
                  )}
                  {write && <Button type="button" disabled={busy || p.variants.length >= 50} onClick={() => onCreateVariant(p)}><Plus size={16} /> Varyant oluştur</Button>}
                  <Button type="button" onClick={() => onEdit(p)}>
                    <PencilSimple size={16} />
                    {write ? "Düzenle" : "Görüntüle"}
                  </Button>
                  <Button
                    type="button"
                    aria-label={p.name + " ürün kartı ve QR"}
                    onClick={() => onCard(p)}
                  >
                    <QrCode size={16} />
                    Ürün kartı ve QR
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        {!shown.length && (
          <EmptyState
            title="Ürün bulunamadı"
            description="Arama veya kategori filtrelerini değiştirin."
          >
            <Button className="btn" onClick={clear}>
              Filtreleri temizle
            </Button>
          </EmptyState>
        )}
        <div className="product-list-footer">
          <div className="product-page-size">
          <Select
            aria-label=""
            value={String(pageSize)}
            onChange={(e) => filter(setPageSize, Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={String(size)}>{size}</option>
            ))}
          </Select>
          </div>
          <Pagination total={visible.length} page={current} pageSize={pageSize} onChange={setPage} />
        </div>
      </Card>
      {bulkCreateOpen && <BulkCreateProducts onClose={() => setBulkCreateOpen(false)} />}
      {bulkProductsOpen && <BulkProducts ids={selected} canEditProducts={write} canEditPrices={price} onClose={() => setBulkProductsOpen(false)} onDone={() => { setBulkProductsOpen(false); setSelected([]); }} />}
      {importOpen && <ProductImport format={importOpen} onClose={() => setImportOpen("")} />}
    </section>
  );
}
