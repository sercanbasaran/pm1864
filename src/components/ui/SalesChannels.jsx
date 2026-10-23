import React from "react";
import SlSwitch from "@shoelace-style/shoelace/dist/react/switch/index.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import {
  salesChannels,
  salesAvailability,
  effectiveSales,
  categorySalesAvailability,
} from "../../sales-availability.js";
export function SalesChannelSwitches({
  product,
  variant,
  categories,
  onChange,
  disabled = false,
}) {
  const preferences = salesAvailability(
      (variant || product).salesAvailability,
      undefined,
      !!variant,
    ),
    parent = salesAvailability(product.salesAvailability),
    category = categories
      ? categorySalesAvailability(
          categories.find((c) =>
            product.categoryId
              ? c.id === product.categoryId
              : c.name === product.category,
          ),
          categories,
        )
      : salesAvailability(undefined, undefined, true);
  return (
    <div className="sales-controls">
      <h3>Satış kanalları</h3>
      <p>
        {variant
          ? "Üründe kapalı olan kanal varyantta açılamaz. Varyant tercihleri korunur."
          : "Anahtarlar satış uygunluğunu belirler. Taslak ürünler ve pasif varyantlar satışa kapalıdır."}
      </p>
      {salesChannels.map(({ key, label }) => {
        const blocked =
          !category[key] ||
          (!!variant &&
            (!parent[key] ||
              product.status !== "Aktif" ||
              variant.active === false));
        return (
          <div key={key} className="sales-switch-row">
            <SlSwitch
              aria-label={label}
              checked={!blocked && preferences[key]}
              disabled={disabled || blocked}
              onSlChange={(e) =>
                onChange({ ...preferences, [key]: e.target.checked })
              }
            >
              {label}
            </SlSwitch>
            {blocked && (
              <small>
                {!category[key]
                  ? "Kategori düzeyinde kapalı"
                  : !parent[key]
                    ? "Ürün düzeyinde kapalı"
                    : product.status !== "Aktif"
                      ? "Ürün taslak durumunda"
                      : "Varyant pasif"}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}
function SalesChannelTags({ values }) {
  return (
    <div className="sales-summary">
      {salesChannels.map(({ key, label }) => {
        const enabled = values[key];
        return (
          <SlTag
            key={key}
            size="small"
            title={label}
            variant={enabled ? "success" : "neutral"}
            className={"sales-channel-tag" + (enabled ? "" : " is-disabled")}
            aria-disabled={enabled ? "false" : "true"}
            aria-label={label + ": " + (enabled ? "Etkin" : "Devre dışı")}
          >
            {label}
          </SlTag>
        );
      })}
    </div>
  );
}
export function SalesChannelSummary({ product, variant, categories }) {
  return (
    <SalesChannelTags values={effectiveSales(product, variant, categories)} />
  );
}

export function CategoryChannelSwitches({
  category,
  categories,
  onChange,
  disabled = false,
}) {
  const preferences = salesAvailability(
    category.salesAvailability,
    undefined,
    true,
  );
  const parent = category.parentId
    ? categorySalesAvailability(
        categories.find((c) => c.id === category.parentId),
        categories,
      )
    : salesAvailability(undefined, undefined, true);
  return (
    <div className="sales-controls">
      <h3>Satış kanalları</h3>
      <p>
        Kategorinin geçerli olduğu satış kanallarını seçin. Üst kategoride
        kapalı olan kanal alt kategoride açılamaz. Ürün ve varyant tercihleri
        korunur.
      </p>
      {salesChannels.map(({ key, label }) => (
        <div className="sales-switch-row" key={key}>
          <SlSwitch
            aria-label={label}
            checked={parent[key] && preferences[key]}
            disabled={disabled || !parent[key]}
            onSlChange={(event) =>
              onChange({ ...preferences, [key]: event.target.checked })
            }
          >
            {label}
          </SlSwitch>
          {!parent[key] && (
            <small>Ana kategori düzeyinde kapalı veya ana kategori pasif</small>
          )}
        </div>
      ))}
    </div>
  );
}
export function CategoryChannelSummary({ category, categories }) {
  return (
    <SalesChannelTags
      values={categorySalesAvailability(category, categories)}
    />
  );
}
