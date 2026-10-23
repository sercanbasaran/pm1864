import {
  CategoryChannelSwitches,
  CategoryChannelSummary,
} from "../../components/ui/SalesChannels.jsx";
import { salesAvailability } from "../../sales-availability.js";
import ManagementSummary from "../../components/ui/ManagementSummary.jsx";
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
import { roots, categoryMatches } from "../../hierarchy.js";
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
    [query, setQuery] = useState(""),
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
  const matches = (c) =>
    `${c.name} ${c.code}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr"));
  const visible = main.filter(
    (c) =>
      matches(c) ||
      categories.some((child) => child.parentId === c.id && matches(child)),
  );
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
  const activeMain = main.filter((c) => c.active).length;
  const activeChildren = categories.filter(
    (c) =>
      c.parentId &&
      c.active &&
      main.some((parent) => parent.id === c.parentId && parent.active),
  ).length;
  const rows = visible.flatMap((root) => [
    root,
    ...categories.filter(
      (c) => c.parentId === root.id && (matches(root) || matches(c)),
    ),
  ]);
  return (
    <>
      {!route.split("?")[0].includes("/") && (
        <section className="category-module">
          <ManagementSummary
            label="Kategori özeti"
            items={[
              {
                label: "Aktif kategori sayısı",
                value: activeMain,
                detail: main.length + " ana kategori içinde",
              },
              {
                label: "Aktif alt kategori sayısı",
                value: activeChildren,
                detail: "Ana kategorisi de aktif olan alt kategoriler",
              },
            ]}
            title="Kategorilerinizi yönetin"
            description="Ürünlerinizi ana kategorilere veya isteğe bağlı alt kategorilere bağlayın."
            action={addAction}
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
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
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
                    <TableHeading scope="col">Kategori adı</TableHeading>
                    <TableHeading scope="col">Kod</TableHeading>
                    <TableHeading scope="col">Tür</TableHeading>
                    <TableHeading scope="col">Durum</TableHeading>
                    <TableHeading scope="col">Satış kanalları</TableHeading>
                    <TableHeading scope="col">Ürün sayısı</TableHeading>
                    <TableHeading scope="col">İşlemler</TableHeading>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((category) => {
                    const parent = main.find((c) => c.id === category.parentId),
                      isChild = Boolean(category.parentId),
                      active = category.active && (!isChild || parent?.active),
                      count = products.filter((p) =>
                        isChild
                          ? p.categoryId === category.id
                          : categoryMatches(p, category.id, categories),
                      ).length;
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
                        <TableCell><SlBadge>{count}</SlBadge></TableCell>
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
                            {query
                              ? "Aramanızı değiştirerek yeniden deneyin."
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
                    <option value="">Ana kategori olarak oluştur</option>
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
                      ? "Bu ana kategorinin kodundan büyük boş üç haneli kod kalmadı. Başka bir ana kategori seçin."
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
                      pattern="[0-9]{3}"
                      readOnly={!draft.isNew}
                      maxLength={3}
                      value={draft.code}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          code: e.target.value.replace(/\D/g, "").slice(0, 3),
                        })
                      }
                    />
                    <small className="input-help">
                      {draft.isNew
                        ? draft.parentId
                          ? "Kod, ana kategori kodundan sonraki ilk boş kod olarak önerilir."
                          : "Kod otomatik önerilir; kayıttan sonra değiştirilemez."
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
