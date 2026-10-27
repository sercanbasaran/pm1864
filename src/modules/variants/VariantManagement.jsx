import ManagementSummary from "../../components/ui/ManagementSummary.jsx";
import "./variant-management.css";
import Modal from "../../components/ui/Modal.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import { hasUnitPricing } from "../../unit-pricing.js";
import VariantTypeManagement from "./VariantTypeManagement.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { variantTypeName } from "../../variant-types.js";
import SlTabGroup from "@shoelace-style/shoelace/dist/react/tab-group/index.js";
import SlTab from "@shoelace-style/shoelace/dist/react/tab/index.js";
import SlTabPanel from "@shoelace-style/shoelace/dist/react/tab-panel/index.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import Card from "../../components/ui/Card.jsx";
import { SalesChannelSummary } from "../../components/ui/SalesChannels.jsx";
import { salesChannels, effectiveSales } from "../../sales-availability.js";
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
import React, { useState } from "react";
import {
  Plus,
  Stack,
  MagnifyingGlass,
  PencilSimple,
  Copy,
  DownloadSimple,
  List,
  GridFour,
} from "@phosphor-icons/react";
import { roots, categoryOf, rootOf, categoryPath } from "../../hierarchy.js";
import { money, downloadCSV } from "../../catalog-tools.js";
export default function VariantManager({
  products,
  categories,
  canWrite,
  onEdit,
  onDuplicate,
}) {
  const { variantTypes = [] } = useCatalog();
  const [typeId, setTypeId] = useState("");
  const [creating, setCreating] = useState(false),
    [createId, setCreateId] = useState(""),
    [createTypeId, setCreateTypeId] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [filtersOpen, setFiltersOpen] = useState(false),
    [sort, setSort] = useState("updated"),
    [view, setView] = useState(() => { try { return sessionStorage.getItem("variant-list-view") === "grid" ? "grid" : "list"; } catch { return "list"; } });
  const eligible = products.filter(
    (p) =>
      p.status === "Aktif" &&
      hasUnitPricing(p.unitPricing) &&
      p.variants.length < 50,
  );
  function clearFilters() {
    setQuery("");
    setRoot("");
    setSub("");
    setProductId("");
    setStatus("");
    setTypeId("");
    setPage(1);
  }

  const [query, setQuery] = useState(""),
    [root, setRoot] = useState(""),
    [sub, setSub] = useState(""),
    [status, setStatus] = useState(""),
    [productId, setProductId] = useState("");
  const rows = products
    .flatMap((p) =>
      p.variants.map((v) => ({ p, v, c: categoryOf(p, categories) })),
    )
    .filter(
      ({ p, v, c }) =>
        (!typeId || v.typeId === typeId) &&
        (!root || rootOf(c, categories)?.id === root) &&
        (!sub || c?.id === sub) &&
        (!productId || String(p.id) === productId) &&
        (!status || (v.active !== false) === (status === "active")) &&
        `${p.name} ${p.productCode || ""} ${p.sku || ""} ${v.size} ${v.sku || ""} ${variantTypeName(v, variantTypes)}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr")),
    )
    .sort((a, b) => sort === "name" ? String(a.v.size).localeCompare(String(b.v.size), "tr") : sort === "price-asc" ? a.v.price - b.v.price : sort === "price-desc" ? b.v.price - a.v.price : (new Date(b.v.updated || b.p.updated || 0) - new Date(a.v.updated || a.p.updated || 0)));
  const hasFilters = !!(query || root || sub || productId || status || typeId);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)),
    current = Math.min(page, pages),
    shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const addAction = canWrite ? (
    <Button
      type="button"
      variant="primary"
      onClick={() => {
        setCreateId("");
        setCreateTypeId("");
        setCreating(true);
      }}
    >
      <Plus size={16} />
      Varyant ekle
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
            value: products.filter((p) => p.variants.length > 0).length,
            detail: "En az bir varyantı olan ürünler",
          },
        ]}
      />

      <SlTabGroup aria-label="Varyant modülü bölümleri">
        <SlTab slot="nav" panel="management" active>
          Varyant yönetimi
        </SlTab>
        <SlTab slot="nav" panel="types">
          Varyant tipleri
        </SlTab>
        <SlTabPanel name="management" active>
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
                <Button
                  type="button"
                  disabled={!rows.length}
                  className="btn"
                  onClick={() =>
                    downloadCSV(
                      [
                        [
                          "Ana kategori / Alt kategori",
                          "Ürün",
                          "Ürün SKU",
                          "Varyant",
                          "Varyant SKU",
                          "Varyant tipi",
                          "Gramaj (g)",
                          "Birim",
                          "Ambalaj",
                          "Dilim",
                          "Fiyat TRY",
                          "Durum",
                          ...salesChannels.map((c) => c.label),
                        ],
                        ...rows.map(({ p, v, c }) => [
                          categoryPath(c, categories),
                          p.name,
                          p.sku,
                          v.size,
                          v.sku,
                          variantTypeName(v, variantTypes),
                          v.weight,
                          v.unit || "Adet",
                          v.packaging || "",
                          v.slices,
                          v.price,
                          v.active !== false ? "Aktif" : "Pasif",
                          ...salesChannels.map((c) =>
                            effectiveSales(p, v, categories)[c.key]
                              ? "Açık"
                              : "Kapalı",
                          ),
                        ]),
                      ],
                      "HM1864_Varyantlar.csv",
                    )
                  }
                >
                  <DownloadSimple size={16} /> Dışa aktar
                </Button>
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
                  label="Ana kategori"
                  aria-label="Varyant ana kategorisi"
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
                  label="Alt kategori"
                  aria-label="Varyant alt kategorisi"
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
                  label="Ürün"
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
                    <TableHeading>ÜRÜN / KATEGORİ</TableHeading>
                    <TableHeading>VARYANT / SKU</TableHeading>
                    <TableHeading>VARYANT TİPİ</TableHeading>
                    <TableHeading>GRAMAJ / DİLİM</TableHeading>
                    <TableHeading>MİKTAR / SERVİS</TableHeading>
                    <TableHeading>SATIŞ FİYATI</TableHeading>
                    <TableHeading>DURUM</TableHeading>
                    <TableHeading>SATIŞ KANALLARI</TableHeading>
                    <TableHeading>İŞLEMLER</TableHeading>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shown.map(({ p, v, c }) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <strong>{p.name}</strong>
                        <small className="user-email">
                          {categoryPath(c, categories)}
                        </small>
                      </TableCell>
                      <TableCell>
                        <strong>{v.size}</strong>
                        <small className="user-email">{v.sku}</small>
                      </TableCell>
                      <TableCell>{variantTypeName(v, variantTypes)}</TableCell>
                      <TableCell>
                        {v.weight} g{v.slices > 0 ? ` / ${v.slices} dilim` : ""}
                      </TableCell>
                      <TableCell>
                        {v.items?.length > 1 ? `${v.items.length} ürün` : `${v.quantity ?? "—"} ${v.unit || "Adet"}`}
                        {v.items?.length > 1 && <small className="user-email">{v.items.map(item => { const source = products.find(product => product.id === item.productId); return `${source?.name || "Ürün"}: ${item.quantity} ${source?.unitPricing?.unit || "birim"}`; }).join(" · ")}</small>}
                        <small className="user-email">
                          {v.packaging || "Ambalaj belirtilmedi"}
                        </small>
                      </TableCell>
                      <TableCell>{money(v.price)}</TableCell>
                      <TableCell>
                        <SlBadge
                          variant={v.active !== false ? "success" : "neutral"}
                        >
                          {v.active !== false ? "Aktif" : "Pasif"}
                        </SlBadge>
                      </TableCell>
                      <TableCell>
                        <SalesChannelSummary
                          categories={categories}
                          product={p}
                          variant={v}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="variant-row-actions">
                        {canWrite && <Button type="button" className="icon-btn" aria-label={p.name + " " + v.size + " varyantını çoğalt"} title={p.variants.length >= 50 ? "Bir üründe en fazla 50 varyant olabilir" : "Varyantı çoğalt"} disabled={p.variants.length >= 50} onClick={() => onDuplicate(p, v)}><Copy size={16} /></Button>}
                        <Button
                          className="btn"
                          onClick={() => onEdit(p, false, v.id)}
                        >
                          <PencilSimple size={15} />
                          {canWrite ? "Yönet" : "Görüntüle"}
                        </Button>
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
              {shown.map(({ p, v, c }) => (
                <article key={v.id}>
                  <div>
                    <strong>{v.size}</strong>
                    <SlBadge
                      variant={v.active !== false ? "success" : "neutral"}
                    >
                      {v.active !== false ? "Aktif" : "Pasif"}
                    </SlBadge>
                  </div>
                  <p className="variant-card-product">{p.name}</p>
                  <small className="variant-card-meta">{categoryPath(c, categories)} · {v.sku || "—"}</small>
                  <small className="variant-card-type">{variantTypeName(v, variantTypes)}</small>
                  {v.items?.length > 1 && <small className="variant-card-meta">{v.items.map(item => { const source = products.find(product => product.id === item.productId); return `${source?.name || "Ürün"}: ${item.quantity} ${source?.unitPricing?.unit || "birim"}`; }).join(" · ")}</small>}
                  <dl>
                    <div>
                      <dt>Miktar</dt>
                      <dd>
                        {v.items?.length > 1 ? `${v.items.length} ürün` : `${v.quantity ?? "—"} ${v.unit || "Adet"}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Gramaj</dt>
                      <dd>{v.weight} g</dd>
                    </div>
                    <div>
                      <dt>Satış fiyatı</dt>
                      <dd>{money(v.price)}</dd>
                    </div>
                    <div>
                      <dt>Ambalaj / servis</dt>
                      <dd>{v.packaging || "—"}</dd>
                    </div>
                  </dl>
                  <div className="variant-card-actions">
                  {canWrite && <Button type="button" aria-label={p.name + " " + v.size + " varyantını çoğalt"} disabled={p.variants.length >= 50} onClick={() => onDuplicate(p, v)}><Copy size={16} /> Varyantı çoğalt</Button>}
                  <Button type="button" onClick={() => onEdit(p, false, v.id)}>
                    {canWrite ? "Yönet" : "Görüntüle"}
                  </Button>
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
            {creating && (
              <Modal title="Yeni varyant" onClose={() => setCreating(false)}>
                <p>Önce varyant türünü, ardından ilk ürünü seçin. Sonraki adımda başka ürünler ekleyebilirsiniz.</p>
                <Select label="Varyant türü" value={createTypeId} onChange={(e) => { setCreateTypeId(e.target.value); setCreateId(""); }}>
                  <option value="">Tür seçin</option>
                  {variantTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </Select>
                {createTypeId && <Select
                  label="Varyant oluşturulacak ürün"
                  value={createId}
                  onChange={(e) => setCreateId(e.target.value)}
                >
                  <option value="">Ürün seçin</option>
                  {eligible.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>}
                {createTypeId && !eligible.length && (
                  <p>
                    Uygun ürün bulunamadı. Ürünler bölümünden birim fiyat ve
                    gramaj bilgilerini tamamlayın.
                  </p>
                )}
                <div className="variant-header-actions">
                  <Button type="button" onClick={() => setCreating(false)}>
                    Vazgeç
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!createTypeId || !eligible.some((p) => String(p.id) === createId)}
                    onClick={() => {
                      setCreating(false);
                      onEdit(
                        eligible.find((p) => String(p.id) === createId),
                        true,
                        "",
                        createTypeId,
                      );
                    }}
                  >
                    Varyant oluştur
                  </Button>
                </div>
              </Modal>
            )}
          </Card>
        </SlTabPanel>
        <SlTabPanel name="types">
          <VariantTypeManagement canWrite={canWrite} />
        </SlTabPanel>
      </SlTabGroup>
    </section>
  );
}
