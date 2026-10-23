import {
  CategoryChannelSwitches,
  CategoryChannelSummary,
} from "../../components/ui/SalesChannels.jsx";
import { salesAvailability } from "../../sales-availability.js";
import CategorySummary from "./CategorySummary.jsx";
import CategoryFilters from "./CategoryFilters.jsx";
import {
  categoryRows,
  categoryProductCount,
  emptyCategoryFilters,
} from "./category-list.js";
import Card from "../../components/ui/Card.jsx";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import ActionBar from "../../components/ui/ActionBar.jsx";
import EditorPage from "../../components/layout/EditorPage.jsx";
import {
  Button,
  Input,
  Select,
  Textarea,
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
  Check,
  PencilSimple,
  FolderSimple,
  ArrowRight,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import {
  slugify,
  nextCategoryCode,
  nextSubcategoryCode,
  validateCategory,
} from "../../catalog.js";
import { roots } from "../../hierarchy.js";
export default function CategoryManager({
  categories,
  products,
  onSave,
  onProducts,
  onNewProduct,
  readOnly = false,
  canCreateProduct = true,
  skuPrefix = "HM",
  route = "categories",
  onNavigate,
  onClose,
}) {
  const [draft, setDraft] = useState(null),
    [filters, setFilters] = useState({ ...emptyCategoryFilters }),
    [sort, setSort] = useState({ key: "hierarchy", direction: "asc" }),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const main = roots(categories);
  const suggestedSlug = (name, parentId) =>
    slugify(
      (parentId ? main.find((c) => c.id === parentId)?.slug + "-" : "") + name,
    );
  function start(category, parentId = "") {
    onNavigate(
      "categories/" +
        (category
          ? category.id + "/edit"
          : "new" +
            (parentId ? "?parent=" + encodeURIComponent(parentId) : "")),
    );
  }
  function close() {
    setDraft(null);
    setError("");
    onClose();
  }
  useEffect(() => {
    const [path, query = ""] = route.split("?"),
      [, id, action] = path.split("/");
    if (!id) {
      setDraft(null);
      return;
    }
    if (readOnly) {
      setDraft(null);
      return;
    }
    const category = categories.find((c) => c.id === id && action === "edit"),
      parentId = new URLSearchParams(query).get("parent") || "";
    if (id !== "new" && !category) {
      setDraft(null);
      return;
    }
    setError("");
    setDraft(
      category
        ? {
            ...category,
            salesAvailability: salesAvailability(
              category.salesAvailability,
              undefined,
              true,
            ),
            isNew: false,
          }
        : {
            id: crypto.randomUUID(),
            name: "",
            code: parentId
              ? nextSubcategoryCode(categories, parentId)
              : nextCategoryCode(categories),
            slug: "",
            description: "",
            parentId,
            active: true,
            salesAvailability: salesAvailability(undefined, undefined, true),
            isNew: true,
          },
    );
  }, [route, readOnly]);
  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setError("");
    const message = validateCategory(draft, categories);
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    try {
      const clean = {
        ...draft,
        name: draft.name.trim().replace(/\s+/g, " "),
        slug: slugify(draft.slug),
      };
      delete clean.isNew;
      if (await onSave(clean, draft.isNew)) close();
      else
        setError("Kategori kaydedilemedi. Bildirimdeki hatayı kontrol edin.");
    } finally {
      setSaving(false);
    }
  }
  const addAction = !readOnly ? (
    <Button
      type="button"
      variant="primary"
      className="btn"
      onClick={() => start()}
    >
      <Plus size={17} />
      Yeni kategori ekle
    </Button>
  ) : null;
  const noCodeAvailable = Boolean(draft?.isNew && !draft.code);
  const saveAction = draft ? (
    <Button
      variant="primary"
      className="btn"
      disabled={saving || noCodeAvailable}
      type="submit"
    >
      <Check size={17} />
      {draft.isNew ? "Kategoriyi oluştur" : "Değişiklikleri kaydet"}
    </Button>
  ) : null;
  const rows = categoryRows(categories, products, filters, sort);
  function sortColumn(key, label) {
    const selected = sort.key === key;
    return (
      <TableHeading
        scope="col"
        aria-sort={
          selected
            ? sort.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <Button
          type="button"
          size="small"
          className="category-sort-button"
          onClick={() =>
            setSort({
              key,
              direction: selected && sort.direction === "asc" ? "desc" : "asc",
            })
          }
        >
          {label}
          <span aria-hidden="true">
            {selected ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕"}
          </span>
        </Button>
      </TableHeading>
    );
  }
  return (
    <>
      {!route.split("?")[0].includes("/") && (
        <section className="category-module">
          <div className="category-module-heading">
            <h2>Kategori yönetimi</h2>
            {addAction}
          </div>
          <CategorySummary
            categories={categories}
            products={products}
            onQuality={(quality) =>
              setFilters({ ...emptyCategoryFilters, quality })
            }
          />
          <Card className="category-list-card">
            <div className="category-toolbar">
              <div>
                <h2>Kategori listesi</h2>
                <p>
                  {main.length} ana kategori · {categories.length - main.length}{" "}
                  alt kategori
                </p>
              </div>
              <div className="search">
                <Input
                  prefix={<MagnifyingGlass size={17} />}
                  aria-label="Kategori ara"
                  placeholder="Ana kategori, alt kategori veya kod ara"
                  value={filters.query}
                  onChange={(e) =>
                    setFilters({ ...filters, query: e.target.value })
                  }
                />
              </div>
            </div>
            <CategoryFilters
              categories={categories}
              filters={filters}
              onChange={setFilters}
            />
            <div className="category-results">
              <span>
                {rows.length} / {categories.length} kategori gösteriliyor
              </span>
              <Button
                type="button"
                size="small"
                onClick={() => setSort({ key: "hierarchy", direction: "asc" })}
              >
                Hiyerarşik sıraya dön
              </Button>
            </div>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Kategori listesi"
            >
              <Table className="category-table" aria-label="Kategoriler">
                <TableHead>
                  <TableRow>
                    {sortColumn("name", "Kategori adı")}
                    {sortColumn("code", "Kod")}
                    {sortColumn("type", "Tür")}
                    {sortColumn("status", "Durum")}
                    {sortColumn("channels", "Satış kanalları")}
                    {sortColumn("count", "Ürün sayısı")}
                    <TableHeading scope="col">İşlemler</TableHeading>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((category) => {
                    const parent = main.find((c) => c.id === category.parentId),
                      isChild = Boolean(category.parentId),
                      active = category.active && (!isChild || parent?.active),
                      count = categoryProductCount(
                        category,
                        categories,
                        products,
                      );
                    return (
                      <TableRow
                        key={category.id}
                        className={isChild ? undefined : "category-main-row"}
                      >
                        <TableHeading scope="row">
                          <div
                            className={
                              "category-table-name" +
                              (isChild ? " category-table-child" : "")
                            }
                          >
                            <FolderSimple size={18} aria-hidden="true" />
                            <div>
                              <span>{category.name}</span>
                              {parent && <small>{parent.name}</small>}
                              {category.description && (
                                <small className="category-table-description">
                                  {category.description}
                                </small>
                              )}
                            </div>
                          </div>
                        </TableHeading>
                        <TableCell>{category.code}</TableCell>
                        <TableCell>
                          {isChild ? "Alt kategori" : "Ana kategori"}
                        </TableCell>
                        <TableCell>
                          <SlBadge variant={active ? "success" : "neutral"}>
                            {active ? "Aktif" : "Pasif"}
                          </SlBadge>
                          {isChild && category.active && !parent?.active && (
                            <small className="category-status-note">
                              Ana kategori pasif
                            </small>
                          )}
                        </TableCell>
                        <TableCell>
                          <CategoryChannelSummary
                            category={category}
                            categories={categories}
                          />
                        </TableCell>
                        <TableCell>
                          <SlBadge>{count}</SlBadge>
                        </TableCell>
                        <TableCell>
                          <div className="category-table-actions">
                            {!readOnly && (
                              <>
                                <Button
                                  type="button"
                                  size="small"
                                  aria-label={
                                    (parent ? parent.name + " / " : "") +
                                    category.name +
                                    " düzenle"
                                  }
                                  onClick={() => start(category)}
                                >
                                  <PencilSimple size={15} />
                                  Düzenle
                                </Button>
                                {!isChild && (
                                  <Button
                                    type="button"
                                    size="small"
                                    onClick={() => start(null, category.id)}
                                  >
                                    <Plus size={15} />
                                    Alt kategori ekle
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              type="button"
                              size="small"
                              onClick={() => onProducts(category.id)}
                            >
                              {isChild ? "Ürünler" : "Tüm ürünler"}
                              <ArrowRight size={15} />
                            </Button>
                            {canCreateProduct && (
                              <Button
                                type="button"
                                size="small"
                                disabled={!active}
                                onClick={() => onNewProduct(category.id)}
                              >
                                <Plus size={15} />
                                Ürün ekle
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!rows.length && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="empty">
                          <FolderSimple size={32} />
                          <h3>Kategori bulunamadı</h3>
                          <p>
                            {Object.entries(filters).some(
                              ([key, value]) => key !== "channelState" && value,
                            )
                              ? "Aramanızı veya filtrelerinizi değiştirerek yeniden deneyin."
                              : "Yeni kategori ekleyerek başlayın."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
          {!readOnly && <ActionBar position="bottom">{addAction}</ActionBar>}
        </section>
      )}
      {draft && (
        <EditorPage
          title={draft.isNew ? "Kategori ekle" : "Kategori düzenle"}
          busy={saving}
          onClose={close}
        >
          <form onSubmit={save}>
            <ActionBar>{saveAction}</ActionBar>
            <fieldset className="editor-fields" disabled={saving}>
              <div className="editor-content">
                <div>
                  <Select
                    label="Ana kategori"
                    aria-label="Ana kategori"
                    value={draft.parentId}
                    disabled={!draft.isNew && !draft.parentId}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        parentId: e.target.value,
                        code: draft.isNew
                          ? e.target.value
                            ? nextSubcategoryCode(categories, e.target.value)
                            : nextCategoryCode(categories)
                          : draft.code,
                        slug: draft.isNew
                          ? suggestedSlug(draft.name, e.target.value)
                          : draft.slug,
                      })
                    }
                  >
                    <option
                      value=""
                      disabled={!draft.isNew && !!draft.parentId}
                    >
                      Ana kategori olarak oluştur
                    </option>
                    {main
                      .filter((c) => c.id !== draft.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                  </Select>
                </div>
                {error && (
                  <SlAlert open variant="danger" className="form-error">
                    {error}
                  </SlAlert>
                )}
                {noCodeAvailable && (
                  <SlAlert open variant="warning">
                    {draft.parentId
                      ? "Ana kategori kodunun son üç hanesinden sonraki aralıkta boş alt kategori kodu kalmadı. Başka bir ana kategori seçin."
                      : "Kullanılabilir kategori kodu bulunamadı."}
                  </SlAlert>
                )}
                <div>
                  <Input
                    label="Kategori adı"
                    required
                    autoFocus
                    maxLength={70}
                    value={draft.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setDraft({
                        ...draft,
                        name,
                        slug:
                          draft.isNew &&
                          (!draft.slug ||
                            draft.slug ===
                              suggestedSlug(draft.name, draft.parentId))
                            ? suggestedSlug(name, draft.parentId)
                            : draft.slug,
                      });
                    }}
                  />
                </div>
                <div>
                  <div>
                    <Input
                      label="Kategori kodu"
                      aria-label="Kategori kodu"
                      required
                      pattern={draft.parentId ? "[0-9]{3}" : "[0-9]{4}"}
                      readOnly={!draft.isNew}
                      maxLength={draft.parentId ? 3 : 4}
                      value={draft.code}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          code: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, draft.parentId ? 3 : 4),
                        })
                      }
                    />
                    <small className="input-help">
                      {draft.isNew
                        ? draft.parentId
                          ? "Üç haneli kod, ana kategori kodunun son üç hanesinden sonraki ilk boş değer olarak önerilir."
                          : "Dört haneli kod otomatik önerilir: 0100, 0200, …, 1000, 1100. Kayıttan sonra değiştirilemez."
                        : "Ürün kodlarını korumak için kayıt sonrası sabittir."}
                    </small>
                  </div>
                </div>
                <div>
                  <Input
                    label="Kategori bağlantısı"
                    required
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: slugify(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Textarea
                    label="Açıklama"
                    rows={3}
                    maxLength={400}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </div>
                <div className="category-active">
                  <Input
                    label="Kategori aktif"
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) =>
                      setDraft({ ...draft, active: e.target.checked })
                    }
                  />
                  <div>
                    <p>
                      Pasif ana kategoriye ve alt kategorilerine yeni ürün
                      eklenemez.
                    </p>
                  </div>
                </div>
                <CategoryChannelSwitches
                  category={draft}
                  categories={categories}
                  disabled={saving}
                  onChange={(salesAvailability) =>
                    setDraft({ ...draft, salesAvailability })
                  }
                />
                <div className="sku-preview">
                  <div>
                    <small>HİYERARŞİ</small>
                    <strong>
                      {draft.parentId
                        ? main.find((c) => c.id === draft.parentId)?.name +
                          " / "
                        : ""}
                      {draft.name || "Kategori adı"}
                    </strong>
                    <p>Ürün ve varyant kodları sunucuda oluşturulur.</p>
                  </div>
                </div>
              </div>
            </fieldset>
            <div className="editor-footer">
              <Button
                type="button"
                className="btn"
                disabled={saving}
                onClick={close}
              >
                Vazgeç
              </Button>
              <ActionBar position="bottom">{saveAction}</ActionBar>
            </div>
          </form>
        </EditorPage>
      )}
      {route.includes("/") && !draft && (
        <EditorPage title="Kategori bulunamadı" onClose={onClose}>
          <p>Kategori bulunamadı veya düzenleme yetkiniz yok.</p>
        </EditorPage>
      )}
    </>
  );
}
