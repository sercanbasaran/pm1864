import "./variant-management.css";
import Modal from "../../components/ui/Modal.jsx";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
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
import React, { useState } from "react";
import {
  Plus,
  Stack,
  MagnifyingGlass,
  PencilSimple,
} from "@phosphor-icons/react";
import { roots, categoryOf, rootOf, categoryPath } from "../../hierarchy.js";
import { money, downloadCSV } from "../../catalog-tools.js";
export default function VariantManager({
  products,
  categories,
  canWrite,
  onEdit,
}) {
  const { variantTypes = [] } = useCatalog();
  const [typeId, setTypeId] = useState("");
  const [creating, setCreating] = useState(false),
    [createId, setCreateId] = useState(""),
    [page, setPage] = useState(1);
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
        `${p.name} ${p.sku} ${v.size} ${v.sku} ${variantTypeName(v, variantTypes)}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr")),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 8)),
    current = Math.min(page, pages),
    shown = rows.slice((current - 1) * 8, current * 8);
  const addAction = canWrite ? (
    <Button
      type="button"
      variant="primary"
      onClick={() => {
        setCreateId("");
        setCreating(true);
      }}
    >
      <Plus size={16} />
      Varyant ekle
    </Button>
  ) : null;
  return (
    <section className="variant-module">
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
                  Varyantları indir
                </Button>
              </div>
            </div>
            <div className="module-toolbar">
              <div className="search">
                <Input
                  prefix={<MagnifyingGlass size={17} />}
                  aria-label="Varyant ara"
                  value={query}
                  label="Varyant ara"
                  placeholder="Ürün, varyant adı veya kod ara"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <SlDetails summary="Filtrele" className="variant-filters">
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
                  label="Durum"
                  aria-label="Varyant durumu"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tüm durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
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
            </SlDetails>
            <p className="muted">
              {rows.length} varyant listeleniyor ·{" "}
              {products.reduce((n, p) => n + p.variants.length, 0)} kayıtlı
              varyant
            </p>
            <div
              className="table-scroll variant-desktop-table"
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
                    <TableHeading />
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
                        {v.quantity ?? "—"} {v.unit || "Adet"}
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
                        <Button
                          className="btn"
                          onClick={() => onEdit(p, false)}
                        >
                          <PencilSimple size={15} />
                          {canWrite ? "Yönet" : "Görüntüle"}
                        </Button>
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
                <p>Filtreleri değiştirin veya bir ürüne varyant ekleyin.</p>
              </div>
            )}
            <div className="variant-mobile-cards">
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
                  <p>{p.name}</p>
                  <small>
                    {categoryPath(c, categories)} · {v.sku}
                  </small>
                  <dl>
                    <div>
                      <dt>Miktar</dt>
                      <dd>
                        {v.quantity ?? "—"} {v.unit}
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
                  <Button type="button" onClick={() => onEdit(p, false)}>
                    {canWrite ? "Yönet" : "Görüntüle"}
                  </Button>
                </article>
              ))}
            </div>
            {rows.length > 8 && (
              <Pagination
                total={rows.length}
                page={current}
                onChange={setPage}
              />
            )}
            {creating && (
              <Modal title="Yeni varyant" onClose={() => setCreating(false)}>
                <p>Önce birim fiyatı ve gramajı tamamlanmış bir ürün seçin.</p>
                <Select
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
                </Select>
                {!eligible.length && (
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
                    disabled={!eligible.some((p) => String(p.id) === createId)}
                    onClick={() => {
                      setCreating(false);
                      onEdit(
                        eligible.find((p) => String(p.id) === createId),
                        true,
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
