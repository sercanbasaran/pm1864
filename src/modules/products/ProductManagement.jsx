import { variantTypeName } from "../../variant-types.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import ManagementSummary from "../../components/ui/ManagementSummary.jsx";
import Card from "../../components/ui/Card.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
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
import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  MagnifyingGlass,
  List,
  GridFour,
  DownloadSimple,
  Tag,
  PencilSimple,
  QrCode,
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
import { money, downloadCSV } from "../../catalog-tools.js";
import ProductImage from "../../components/ui/ProductImage.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
export default function ProductManagement({
  user,
  focus,
  onEdit,
  onNew,
  onBulk,
  onCard,
}) {
  const { products, categories, variantTypes, busy } = useCatalog(),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [quality, setQuality] = useState(""),
    [sort, setSort] = useState("updated"),
    [view, setView] = useState("list"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState([]),
    [filters, setFilters] = useState(false),
    search = useRef(null);
  const write = can(user, "products.write"),
    price = can(user, "prices.write");
  useEffect(() => {
    setCategory(focus?.category || "");
    setStatus(focus?.status || "");
    setQuality(focus?.quality || "");
    setQuery("");
    setPage(1);
    setFilters(!!focus?.quality);
    setSelected([]);
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
        (!quality ||
          (quality === "image" ? !p.customImage : !p.description?.trim())) &&
        `${p.name} ${p.productCode} ${p.sku} ${p.variants.map((v) => v.size + " " + v.sku).join(" ")}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr")),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "tr")
        : sort === "price-asc"
          ? Math.min(...a.variants.map((v) => v.price)) -
            Math.min(...b.variants.map((v) => v.price))
          : sort === "price-desc"
            ? Math.min(...b.variants.map((v) => v.price)) -
              Math.min(...a.variants.map((v) => v.price))
            : new Date(b.updated) - new Date(a.updated),
    );
  const current = Math.min(page, Math.max(1, Math.ceil(visible.length / 8))),
    shown = visible.slice((current - 1) * 8, current * 8),
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
  function exportRows() {
    downloadCSV(
      [
        [
          "Ürün",
          "Ürün kodu",
          "SKU",
          "Ana kategori / Alt kategori",
          "Varyant",
          "Varyant SKU",
          "Varyant tipi",
          "Dilim adedi",
          "Gramaj (g)",
          "Birim",
          "Ambalaj",
          "Fiyat TRY",
          "Durum",
          ...salesChannels.map((c) => c.label),
        ],
        ...visible.flatMap((p) =>
          p.variants.map((v) => [
            p.name,
            p.productCode,
            p.sku,
            categoryPath(categoryOf(p, categories), categories),
            v.size,
            v.sku,
            variantTypeName(v, variantTypes),
            v.slices,
            v.weight,
            v.unit || "Adet",
            v.packaging || "",
            v.price,
            p.status,
            ...salesChannels.map((c) =>
              effectiveSales(p, v, categories)[c.key] ? "Açık" : "Kapalı",
            ),
          ]),
        ),
      ],
      "HM1864_Urunler.csv",
    );
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
      <Card className="catalog">
        <div className="catalog-heading">
          <div>
            <h2>Ürün listesi</h2>
            <p>
              {visible.length} ürün listeleniyor · {products.length} kayıtlı
              ürün
            </p>
          </div>
          <Button type="button" onClick={exportRows}>
            <DownloadSimple size={16} />
            Dışa aktar
          </Button>
        </div>
        <div className="tabs">
          {[{ id: "", name: "Tüm ürünler" }, ...roots(categories)].map((c) => (
            <Button
              key={c.id}
              className={category === c.id ? "selected" : ""}
              onClick={() => filter(setCategory, c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
        <div className="toolbar">
          <div className="search">
            <Input
              prefix={<MagnifyingGlass size={17} />}
              ref={search}
              aria-label="Ürün ara"
              placeholder="Ürün adı, kod veya SKU ara"
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
              <option value="price-asc">Fiyat: düşükten yükseğe</option>
              <option value="price-desc">Fiyat: yüksekten düşüğe</option>
            </Select>
            <Button className="btn" onClick={() => setFilters(!filters)}>
              Filtrele
            </Button>
            <Button
              className="icon-btn"
              aria-label="Liste görünümü"
              onClick={() => setView("list")}
            >
              <List size={18} />
            </Button>
            <Button
              className="icon-btn"
              aria-label="Kart görünümü"
              onClick={() => setView("grid")}
            >
              <GridFour size={18} />
            </Button>
          </div>
        </div>
        {filters && (
          <div className="filter-panel">
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
              <option value="image">Görseli olmayanlar</option>
              <option value="description">Açıklaması olmayanlar</option>
            </Select>
            <Button className="text-btn" onClick={clear}>
              Filtreleri temizle
            </Button>
          </div>
        )}
        {price && (
          <div className="selection-bar">
            <strong>
              {selected.length
                ? selected.length + " ürün seçildi"
                : visible.length + " ürün listeleniyor"}
            </strong>
            <Button
              disabled={busy || !visible.length}
              onClick={() =>
                onBulk(selected.length ? selected : visible.map((p) => p.id))
              }
            >
              <Tag size={16} />
              Toplu fiyat güncelle
            </Button>
            {!!selected.length && (
              <Button onClick={() => setSelected([])}>Seçimi kaldır</Button>
            )}
          </div>
        )}
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
                      disabled={!price}
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
                  <TableHeading>FİYAT</TableHeading>
                  <TableHeading>DURUM</TableHeading>
                  <TableHeading>SATIŞ KANALLARI</TableHeading>
                  <TableHeading>İŞLEMLER</TableHeading>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Input
                        type="checkbox"
                        disabled={!price}
                        aria-label={p.name + " seç"}
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        className="product-cell"
                        onClick={() => onEdit(p)}
                      >
                        <ProductImage product={p} />
                        <div>
                          <strong title={p.name}>{p.name}</strong>
                          <small>
                            {p.productCode} · {p.sku} · {p.variants.length}{" "}
                            varyant
                          </small>
                        </div>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <SlTag>
                        {categoryPath(categoryOf(p, categories), categories)}
                      </SlTag>
                    </TableCell>
                    <TableCell>
                      {money(Math.min(...p.variants.map((v) => v.price)))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>
                      <SalesChannelSummary categories={categories} product={p} />
                    </TableCell>
                    <TableCell>
                      <div className="product-list-actions">
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
                <ProductImage product={p} />
                <StatusBadge status={p.status} />
                <h3 title={p.name}>{p.name}</h3>
                <small>
                  {p.productCode} · {p.sku}
                </small>
                <p className="product-summary-category">
                  {categoryPath(categoryOf(p, categories), categories)}
                </p>
                <strong>
                  {money(Math.min(...p.variants.map((v) => v.price)))}
                </strong>
                <div className="product-summary-actions">
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
        <Pagination total={visible.length} page={current} onChange={setPage} />
      </Card>
      {write && <ActionBar position="bottom">{addAction}</ActionBar>}
    </section>
  );
}
