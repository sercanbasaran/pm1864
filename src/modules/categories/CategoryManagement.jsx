import SlSwitch from "@shoelace-style/shoelace/dist/react/switch/index.js";
import CategoryGallery from "./CategoryGallery.jsx";
import { categoryPageUrl } from "./category-page.js";
import {
  CategoryChannelSwitches,
  CategoryChannelSummary,
} from "../../components/ui/SalesChannels.jsx";
import {
  salesChannels,
  categorySalesAvailability,
  salesAvailability,
} from "../../sales-availability.js";
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
function EditableField({
  children,
  label,
  value,
  creating,
  enabled,
  editing,
  busy,
  onEdit,
  onSave,
  onCancel,
  displayAction,
  empty,
}) {
  return (
    <section
      className="category-field-card"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        {creating || editing ? (
          children
        ) : (
          <dl
            style={{
              margin: 0,
              padding: "0 0 16px",

              overflowWrap: "anywhere",
            }}
          >
            <dt
              style={{
                fontSize: "0.875rem",
                color: "var(--sl-color-neutral-600)",
                marginBottom: 8,
              }}
            >
              {label}
            </dt>
            <dd style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {value || "—"}
            </dd>
          </dl>
        )}
      </div>
      {displayAction ||
        (enabled && (
          <div style={{ display: "flex", gap: 8 }}>
            {editing ? (
              <>
                <Button
                  type="button"
                  size="small"
                  variant="primary"
                  disabled={busy}
                  onClick={onSave}
                >
                  Kaydet
                </Button>
                <Button
                  type="button"
                  size="small"
                  disabled={busy}
                  onClick={onCancel}
                >
                  Vazgeç
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="small"
                aria-label={label + (empty ? " ekle" : " düzenle")}
                disabled={busy}
                onClick={onEdit}
              >
                <PencilSimple size={15} />
                {empty ? "Ekle" : "Düzenle"}
              </Button>
            )}
          </div>
        ))}
    </section>
  );
}
export default function CategoryManager({
  categories,
  products,
  onSave,
  onProducts,
  onNewProduct,
  readOnly = false,
  canCreateProduct = true,
  onRefresh,
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
  const [editingField, setEditingField] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
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
    setEditingField(null);
    setDraft(
      category
        ? {
            ...category,
            salesAvailability: salesAvailability(
              category.salesAvailability,
              undefined,
              true,
            ),
            visibility: category.visibility || "private",
            images: category.images || [],
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
            visibility: "private",
            images: [],
            isNew: true,
          },
    );
  }, [route, readOnly]);
  function cancelField() {
    const original = categories.find((c) => c.id === draft.id);
    if (original)
      setDraft({
        ...original,
        salesAvailability: salesAvailability(
          original.salesAvailability,
          undefined,
          true,
        ),
        isNew: false,
      });
    setEditingField(null);
    setError("");
  }
  async function saveField(field) {
    if (saving || editingField !== field) return;
    return persistField(field, draft[field]);
  }
  async function persistField(field, nextValue, sourceCategories = categories) {
    if (saving) return false;
    if (draft.isNew) {
      setDraft({ ...draft, [field]: nextValue });
      return true;
    }
    const original = sourceCategories.find((c) => c.id === draft.id);
    if (!original) return false;
    const value =
      field === "name"
        ? String(nextValue).trim().replace(/\s+/g, " ")
        : field === "slug"
          ? slugify(nextValue)
          : nextValue;
    const clean = { ...original, [field]: value };
    const message = validateCategory(clean, sourceCategories);
    if (message) {
      setError(message);
      return false;
    }
    setSaving(true);
    setError("");
    try {
      if (await onSave(clean, false)) {
        setDraft({ ...clean, isNew: false });
        setEditingField(null);
        return true;
      } else
        setError("Kategori kaydedilemedi. Bildirimdeki hatayı kontrol edin.");
      return false;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }
  function fieldProps(field, label, locked = false) {
    const values = {
      parentId: draft.parentId
        ? main.find((c) => c.id === draft.parentId)?.name
        : "Ana kategori",
      name: draft.name,
      code: <SlBadge variant="neutral">{draft.code}</SlBadge>,
      slug: (
        <div className="category-link-display">
          <a href={categoryPageUrl(draft)} target="_blank" rel="noreferrer">
            {categoryPageUrl(draft)}
          </a>
          <Button
            type="button"
            size="small"
            aria-label="Kategori bağlantısını kopyala"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(categoryPageUrl(draft));
                setCopyStatus("Bağlantı kopyalandı.");
              } catch {
                setCopyStatus(
                  "Bağlantı kopyalanamadı. URL’yi seçerek kopyalayabilirsiniz.",
                );
              }
            }}
          >
            Kopyala
          </Button>
          <span role="status">{copyStatus}</span>
        </div>
      ),
      description: draft.description,
      active: (
        <SlBadge variant={draft.active ? "success" : "neutral"}>
          {draft.active ? "Aktif" : "Pasif"}
        </SlBadge>
      ),
      visibility: draft.visibility === "public" ? "Public" : "Private",
      salesAvailability: (
        <div className="sales-summary">
          {salesChannels
            .filter(
              ({ key }) => categorySalesAvailability(draft, categories)[key],
            )
            .map(({ key, label }) => (
              <SlBadge key={key} variant="success">
                {label}
              </SlBadge>
            ))}
        </div>
      ),
    };
    return {
      label,
      value: values[field],
      creating: draft.isNew,
      enabled: !draft.isNew && !locked,
      empty:
        field === "visibility"
          ? false
          : field === "salesAvailability"
            ? !salesChannels.some(
                ({ key }) => categorySalesAvailability(draft, categories)[key],
              )
            : !draft[field],
      editing: editingField === field,
      busy: saving,
      onEdit: () => {
        cancelField();
        setEditingField(field);
      },
      onSave: () => saveField(field),
      onCancel: cancelField,
    };
  }
  async function save(e) {
    e.preventDefault();
    if (!draft.isNew) {
      if (editingField) await saveField(editingField);
      return;
    }
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
  const saveAction = draft?.isNew ? (
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
              setFilters({ ...emptyCategoryFilters, quality: [quality] })
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
                              ([key, value]) =>
                                key !== "channelState" &&
                                (Array.isArray(value)
                                  ? value.length > 0
                                  : !!value),
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
                <EditableField
                  {...fieldProps("active", "Kategori durumu", true)}
                  creating={false}
                  displayAction={
                    <SlSwitch
                      aria-label="Kategori durumu"
                      checked={draft.active}
                      disabled={saving}
                      onSlChange={(e) =>
                        persistField("active", e.target.checked)
                      }
                    />
                  }
                />
                <EditableField {...fieldProps("code", "Kategori kodu", true)}>
                  <div>
                    <Input
                      label="Kategori kodu"
                      aria-label="Kategori kodu"
                      required
                      pattern={draft.parentId ? "[0-9]{3}" : "[0-9]{4}"}
                      readOnly={!draft.isNew}
                      disabled={!draft.isNew}
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
                </EditableField>

                <EditableField
                  {...fieldProps("parentId", "Kategori türü", !draft.parentId)}
                >
                  <Select
                    disabled={
                      !draft.isNew &&
                      (editingField !== "parentId" || !draft.parentId)
                    }
                    label="Kategori türü"
                    aria-label="Kategori türü"
                    value={draft.parentId}
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
                </EditableField>
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
                <EditableField {...fieldProps("name", "Kategori adı")}>
                  <Input
                    disabled={!draft.isNew && editingField !== "name"}
                    label="Kategori adı"
                    required
                    autoFocus={draft.isNew}
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
                </EditableField>
                <EditableField {...fieldProps("slug", "Kategori bağlantısı")}>
                  <Input
                    disabled={!draft.isNew && editingField !== "slug"}
                    label="Kategori bağlantısı"
                    required
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: slugify(e.target.value) })
                    }
                  />
                </EditableField>
                <EditableField {...fieldProps("description", "Açıklama")}>
                  <Textarea
                    disabled={!draft.isNew && editingField !== "description"}
                    label="Açıklama"
                    rows={3}
                    maxLength={400}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </EditableField>
                <EditableField
                  {...fieldProps("salesAvailability", "Satış kanalları")}
                >
                  <CategoryChannelSwitches
                    category={draft}
                    categories={categories}
                    disabled={
                      saving ||
                      (!draft.isNew && editingField !== "salesAvailability")
                    }
                    onChange={(salesAvailability) =>
                      setDraft({ ...draft, salesAvailability })
                    }
                  />
                </EditableField>
                <EditableField
                  {...fieldProps("visibility", "Bağlantı erişimi")}
                >
                  <Select
                    label="Bağlantı erişimini seçin"
                    value={draft.visibility || "private"}
                    onChange={(e) =>
                      setDraft({ ...draft, visibility: e.target.value })
                    }
                  >
                    <option value="private">
                      Private — yalnızca giriş yapan kullanıcılar
                    </option>
                    <option value="public">
                      Public — bağlantıya sahip herkes
                    </option>
                  </Select>
                </EditableField>
                <section className="category-field-card category-images-card">
                  <h3>Kategori görselleri</h3>
                  <CategoryGallery
                    images={draft.images || []}
                    disabled={saving}
                    onRefresh={onRefresh}
                    onChange={(images, latestCategories) =>
                      persistField(
                        "images",
                        images,
                        latestCategories || categories,
                      )
                    }
                  />
                </section>
              </div>
            </fieldset>
            <div className="editor-footer">
              <Button
                type="button"
                className="btn"
                disabled={saving}
                onClick={close}
              >
                Listeye dön
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
