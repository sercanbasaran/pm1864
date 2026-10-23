import React, { useEffect, useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import SlSwitch from "@shoelace-style/shoelace/dist/react/switch/index.js";
import { Check } from "@phosphor-icons/react";
import ActionBar from "../../components/ui/ActionBar.jsx";
import BackToListButton from "../../components/ui/BackToListButton.jsx";
import EditableField from "../../components/ui/EditableField.jsx";
import { SalesChannelSwitches } from "../../components/ui/SalesChannels.jsx";
import {
  Button,
  Input,
  Select,
  Textarea,
} from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { validateProduct } from "../../catalog.js";
import { money } from "../../catalog-tools.js";
import { effectiveSales, salesChannels } from "../../sales-availability.js";
import { productCardPath } from "../../product-card.js";
import NutritionTable from "./NutritionTable.jsx";
import {
  productInformationFields,
  productDetailSteps,
  stepForProductError,
} from "../../product-information.js";
import { categoryOf, rootOf } from "../../hierarchy.js";
import CategoryFields from "../categories/CategoryFields.jsx";
import VariantFields from "../variants/VariantFields.jsx";
import MediaGallery from "../categories/CategoryGallery.jsx";
import EditorPage from "../../components/layout/EditorPage.jsx";

const normalize = (product) => ({
  ...structuredClone(product),
  images:
    product.images ||
    (product.mediaId
      ? [{ id: product.mediaId, url: product.customImage }]
      : []),
});
export default function ProductEditor({
  product,
  tab = "Genel bilgiler",
  readOnly = false,
  onClose,
}) {
  const catalog = useCatalog();
  const {
    categories,
    products = [],
    variantTypes,
    busy,
    mutate,
    notify,
    refresh,
  } = catalog;
  const current = products.find((p) => p.id === product.id) || product;
  const [draft, setDraft] = useState(() => normalize(product));
  const [active, setActive] = useState(
      productDetailSteps.some((step) => step.label === tab)
        ? tab
        : "Genel bilgiler",
    ),
    [error, setError] = useState("");
  const [editingField, setEditingField] = useState(
    !product.isNew &&
      product.variants.some((v) => !v.id) &&
      tab === "Varyant & fiyat"
      ? "variants"
      : null,
  );
  useEffect(() => {
    if (!product.isNew && !editingField) setDraft(normalize(current));
  }, [current, editingField, product.isNew]);
  function cancel() {
    setDraft(normalize(current));
    setEditingField(null);
    setError("");
  }
  function edit(field) {
    setDraft(normalize(current));
    setEditingField(field);
    setError("");
  }
  async function persist(field, value, snapshot) {
    if (busy || readOnly) return false;
    if (draft.isNew) {
      setDraft({ ...draft, [field]: value });
      return true;
    }
    const base = snapshot?.products.find((p) => p.id === current.id) || current;
    if (field === "publicCardEnabled") {
      try {
        await mutate(
          `/products/${current.id}/card`,
          { enabled: value },
          "PATCH",
        );
        setEditingField(null);
        notify("Bağlantı erişimi güncellendi.");
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      }
    }
    const patch =
      field === "category"
        ? {
            categoryId: draft.categoryId,
            category: draft.category,
            mainCategoryId: draft.mainCategoryId,
          }
        : field === "images"
          ? {
              images: value,
              mediaId: value[0]?.id || "",
              customImage: value[0]?.url || "",
            }
          : { [field]: value };
    const clean = { ...base, ...patch };
    const invalid = validateProduct(
      clean,
      snapshot?.categories || categories,
      snapshot?.variantTypes || variantTypes,
    );
    if (invalid) {
      setError(invalid.message);
      return false;
    }
    setError("");
    try {
      await mutate(`/products/${current.id}`, { product: clean }, "PUT");
      setDraft(normalize(clean));
      setEditingField(null);
      notify("Ürün kaydedildi.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  async function save(e) {
    e.preventDefault();
    if (!draft.isNew) {
      if (editingField) await persist(editingField, draft[editingField]);
      return;
    }
    if (busy || readOnly) return;
    const invalid = validateProduct(draft, categories, variantTypes);
    if (invalid) {
      setActive(stepForProductError(invalid));
      setError(invalid.message);
      return;
    }
    setError("");
    try {
      await mutate("/products", { product: draft }, "POST");
      notify("Ürün kaydedildi.");
      onClose();
    } catch (e) {
      setError(e.message);
    }
  }
  function field(field, label, value, children, empty = !draft[field]) {
    return (
      <EditableField
        key={field}
        label={label}
        value={value}
        empty={empty}
        creating={!!draft.isNew && !readOnly}
        enabled={!draft.isNew && !readOnly}
        editing={editingField === field && !readOnly}
        busy={busy}
        onEdit={() => edit(field)}
        onCancel={cancel}
        onSave={() => persist(field, draft[field])}
      >
        {children}
      </EditableField>
    );
  }
  const category = categoryOf(draft, categories),
    root = rootOf(category, categories);
  const url = draft.isNew
    ? ""
    : new URL(productCardPath(current), window.location.origin).href;
  const images = draft.images.length
    ? draft.images
    : draft.customImage && !draft.mediaId
      ? [{ id: "external", url: draft.customImage }]
      : [];
  const saveAction =
    draft.isNew && !readOnly ? (
      <Button type="submit" variant="primary" disabled={busy}>
        <Check size={17} />
        Ürünü oluştur
      </Button>
    ) : null;
  return (
    <EditorPage
      title={draft.isNew ? "Ürün ekle" : "Ürün düzenle"}
      busy={busy}
      onClose={onClose}
    >
      <div className="editor-tabs product-detail-steps" role="group" aria-label="Ürün bölümleri">
        {productDetailSteps.map(({ label }) => (
          <Button
            type="button"
            key={label}
            className={active === label ? "selected" : ""}
            aria-pressed={active === label}
            disabled={busy}
            onClick={() => {
              if (!draft.isNew) cancel();
              setActive(label);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <form onSubmit={save} noValidate>
        {saveAction && <ActionBar>{saveAction}</ActionBar>}
        {error && (
          <SlAlert open variant="danger" className="form-error">
            {error}
          </SlAlert>
        )}
        <fieldset className="editor-fields" disabled={busy}>
          <div className="editor-content">
            {active === "Genel bilgiler" ? (
              <>
                <EditableField
                  label="Ürün durumu"
                  value={
                    <SlBadge
                      variant={draft.status === "Aktif" ? "success" : "neutral"}
                    >
                      {draft.status}
                    </SlBadge>
                  }
                  displayAction={
                    <SlSwitch
                      className="category-status-switch"
                      aria-label="Ürün durumu"
                      checked={draft.status === "Aktif"}
                      disabled={busy || readOnly}
                      onSlChange={(e) =>
                        persist("status", e.target.checked ? "Aktif" : "Taslak")
                      }
                    />
                  }
                />
                <EditableField
                  label="Ürün kodu"
                  value={
                    draft.productCode ? (
                      <SlBadge variant="neutral">{draft.productCode}</SlBadge>
                    ) : (
                      "Kayıttan sonra oluşturulur."
                    )
                  }
                />
                <EditableField
                  label="SKU"
                  value={
                    draft.sku ? (
                      <SlBadge variant="neutral">{draft.sku}</SlBadge>
                    ) : (
                      "Kayıttan sonra oluşturulur."
                    )
                  }
                />
                {field(
                  "name",
                  "Ürün adı",
                  draft.name,
                  <Input
                    label="Ürün adını düzenleyin"
                    aria-label="Ürün adı"
                    required
                    maxLength={160}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />,
                )}
                {field(
                  "category",
                  "Kategori",
                  [root?.name, category?.parentId ? category.name : null]
                    .filter(Boolean)
                    .join(" / "),
                  <CategoryFields
                    product={draft}
                    categories={categories}
                    onChange={setDraft}
                  />,
                  !category,
                )}
                {field(
                  "description",
                  "Kısa açıklama",
                  draft.description,
                  <Textarea
                    label="Kısa açıklamayı düzenleyin"
                    aria-label="Kısa açıklama"
                    rows={4}
                    maxLength={4000}
                    value={draft.description || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />,
                )}
                {field(
                  "salesAvailability",
                  "Satış kanalları",
                  <div className="sales-summary">
                    {salesChannels
                      .filter(
                        ({ key }) =>
                          effectiveSales(draft, undefined, categories)[key],
                      )
                      .map(({ key, label }) => (
                        <SlBadge key={key} variant="success">
                          {label}
                        </SlBadge>
                      ))}
                  </div>,
                  <SalesChannelSwitches
                    categories={categories}
                    disabled={busy || readOnly}
                    product={draft}
                    onChange={(salesAvailability) =>
                      setDraft({ ...draft, salesAvailability })
                    }
                  />,
                  !salesChannels.some(
                    ({ key }) =>
                      effectiveSales(draft, undefined, categories)[key],
                  ),
                )}
                <EditableField
                  label="Ürün bağlantısı"
                  value={
                    url ? (
                      <div className="category-link-display">
                        <a href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                        <Button
                          type="button"
                          size="small"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(url);
                              notify("Ürün bağlantısı kopyalandı.");
                            } catch {
                              setError(
                                "Bağlantı kopyalanamadı. URL’yi seçerek kopyalayabilirsiniz.",
                              );
                            }
                          }}
                        >
                          Kopyala
                        </Button>
                      </div>
                    ) : (
                      "Kayıttan sonra oluşturulur."
                    )
                  }
                />
                {!draft.isNew ? (
                  field(
                    "publicCardEnabled",
                    "Bağlantı erişimi",
                    draft.publicCardEnabled ? "Herkese açık" : "Özel",
                    <Select
                      label="Bağlantı erişimini seçin"
                      value={draft.publicCardEnabled ? "public" : "private"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          publicCardEnabled: e.target.value === "public",
                        })
                      }
                    >
                      <option value="private">
                        Özel — yalnızca giriş yapan kullanıcılar
                      </option>
                      <option value="public">
                        Herkese açık — bağlantıya sahip herkes
                      </option>
                    </Select>,
                    false,
                  )
                ) : (
                  <EditableField label="Bağlantı erişimi" value="Özel" />
                )}
                <section className="category-field-card category-images-card">
                  <h3>Ürün görselleri</h3>
                  <MediaGallery
                    label="Ürün"
                    images={images}
                    editable={!readOnly}
                    disabled={busy || readOnly}
                    onRefresh={refresh}
                    onChange={(next, _, snapshot) =>
                      persist(
                        "images",
                        next.filter((image) => image.id !== "external"),
                        snapshot,
                      )
                    }
                  />
                </section>
                {field(
                  "variants",
                  "Varyantlar ve fiyatlar",
                  <div className="product-variant-summary">
                    {draft.variants.map((variant, i) => (
                      <div key={variant.id || i}>
                        <strong>{variant.size || "Yeni varyant"}</strong>{" "}
                        <SlBadge
                          variant={
                            variant.active !== false ? "success" : "neutral"
                          }
                        >
                          {variant.active !== false ? "Aktif" : "Pasif"}
                        </SlBadge>
                        <p>
                          {money(variant.price)} · {variant.weight} g ·{" "}
                          {variant.unit || "Adet"}
                        </p>
                        {variant.packaging && <p>{variant.packaging}</p>}
                        {variant.sku && (
                          <SlBadge variant="neutral">{variant.sku}</SlBadge>
                        )}
                      </div>
                    ))}
                  </div>,
                  <VariantFields
                    categories={categories}
                    disabled={busy || readOnly}
                    product={draft}
                    variantTypes={variantTypes}
                    onChange={setDraft}
                  />,
                  !draft.variants.length,
                )}
              </>
            ) : (
              productInformationFields
                .filter(
                  (info) =>
                    info.key ===
                    productDetailSteps.find((step) => step.label === active)
                      ?.key,
                )
                .map((info) =>
                  field(
                    info.key,
                    productDetailSteps.find((step) => step.label === active)
                      .label,
                    info.key === "nutrition" ? (
                      <NutritionTable value={draft.nutrition || ""} />
                    ) : (
                      draft[info.key]
                    ),
                    info.key === "nutrition" ? (
                      <NutritionTable
                        key={editingField || "nutrition-view"}
                        value={draft.nutrition || ""}
                        editing
                        onChange={(value) =>
                          setDraft({ ...draft, nutrition: value })
                        }
                      />
                    ) : (
                      <Textarea
                        label={info.label + " düzenleyin"}
                        aria-label={info.label}
                        rows={4}
                        maxLength={info.maxLength}
                        placeholder={info.placeholder}
                        value={draft[info.key] || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, [info.key]: e.target.value })
                        }
                      />
                    ),
                  ),
                )
            )}
          </div>
        </fieldset>
        <div className="editor-footer">
          <BackToListButton busy={busy} onClick={onClose} />
          {saveAction}
        </div>
      </form>
    </EditorPage>
  );
}
