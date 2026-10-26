import "./variant-composition.css";
import React from "react";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import MediaGallery from "../categories/CategoryGallery.jsx";
import { newVariant } from "./VariantFields.jsx";
import {
  calculateVariant,
  defaultConsumables,
  packagingOptions,
} from "../../variant-composition.js";
import { money } from "../../catalog-tools.js";
export default function VariantCompositionFields({
  product,
  onChange,
  disabled,
}) {
  const {
    products,
    variantTypes,
    consumables = defaultConsumables(),
    refresh,
  } = useCatalog();
  const update = (i, patch) =>
    onChange({
      ...product,
      variants: product.variants.map((v, n) =>
        n === i ? { ...v, ...patch } : v,
      ),
    });
  const add = () =>
    onChange({
      ...product,
      variants: [
        ...product.variants,
        {
          ...newVariant(),
          sourceProductId: product.id,
          quantity: 1,
          priceOverride: null,
          consumables: [],
          images: [],
          packaging: "",
          typeId: variantTypes[0]?.id || "",
        },
      ],
    });
  return (
    <fieldset disabled={disabled} className="variant-composition-fields">
      <Button
        type="button"
        onClick={add}
        disabled={disabled || product.variants.length >= 50}
      >
        Varyant ekle
      </Button>
      {product.variants.map((v, i) => {
        let calculated, error;
        try {
          calculated = calculateVariant(v, products, consumables);
        } catch (e) {
          error = e.message;
        }
        const source = products.find(
          (p) => p.id === (v.sourceProductId ?? product.id),
        );
        return (
          <section className="category-field-card" key={v.id || i}>
            <div className="variant-composition-row">
              <Input
                label="Varyant adı"
                maxLength={30}
                required
                value={v.size}
                onChange={(e) => update(i, { size: e.target.value })}
              />
              <Select
                label="Ürün"
                value={String(v.sourceProductId ?? product.id)}
                onChange={(e) =>
                  update(i, {
                    sourceProductId: Number(e.target.value),
                    quantity: 1,
                    images: [],
                    consumables: v.consumables ?? [],
                    priceOverride: null,
                  })
                }
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Varyant tipi"
                value={v.typeId || ""}
                onChange={(e) => update(i, { typeId: e.target.value })}
              >
                <option value="">Tip seçin</option>
                {variantTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Input
                label={
                  "Ürün miktarı (" +
                  (source?.unitPricing?.unit || "birim") +
                  ")"
                }
                type="number"
                min={0.001}
                step="any"
                required
                value={v.quantity ?? 1}
                onChange={(e) =>
                  update(i, {
                    sourceProductId: source.id,
                    quantity: Number(e.target.value),
                  })
                }
              />
              <Select
                label="Ambalaj / servis şekli"
                value={v.packaging || ""}
                onChange={(e) =>
                  update(i, {
                    sourceProductId: source.id,
                    packaging: e.target.value,
                    quantity: v.quantity ?? 1,
                    consumables: v.consumables ?? [],
                  })
                }
              >
                <option value="">Seçin</option>
                {packagingOptions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
              <p>
                {v.packaging === "Tabakta servis"
                  ? "Servis şekli: Tabakta servis"
                  : "Ambalaj: " + (v.packaging || "Seçilmedi")}
              </p>
              {calculated ? (
                <p>
                  Hesaplanan fiyat:{" "}
                  <strong>{money(calculated.calculatedPrice)}</strong> · Net
                  ürün gramajı: <strong>{calculated.weight} g</strong> · Satış
                  fiyatı: <strong>{money(calculated.price)}</strong>
                </p>
              ) : (
                <p role="status">{error}</p>
              )}
              <Input
                label="Satış fiyatı (isteğe bağlı düzeltme)"
                type="number"
                min={0.01}
                step={0.01}
                value={v.priceOverride ?? ""}
                onChange={(e) =>
                  update(i, {
                    priceOverride:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <p>
                Boş bırakıldığında hesaplanan fiyat kullanılır. Gramaj yalnızca
                ürünün net ağırlığıdır; ambalaj ve sarf malzemeler dahil
                değildir.
              </p>
              <h3>Varyant görselleri</h3>
              <div className="variant-photo-options">
                {(source?.images || []).map((image) => (
                  <label key={image.id}>
                    <img src={image.url} alt={source.name} />
                    <input
                      type="checkbox"
                      checked={(v.images || []).some((x) => x.id === image.id)}
                      onChange={(e) =>
                        update(i, {
                          images: e.target.checked
                            ? [...(v.images || []), image]
                            : (v.images || []).filter((x) => x.id !== image.id),
                        })
                      }
                    />{" "}
                    Seç
                  </label>
                ))}
              </div>
              <MediaGallery
                label="Varyant"
                images={v.images || []}
                disabled={disabled}
                onRefresh={refresh}
                onChange={(images) => {
                  update(i, { images });
                  return true;
                }}
              />
              <h3>Sarf malzemeler</h3>
              {(v.consumables || []).map((item, n) => (
                <div key={item.id}>
                  <strong>
                    {consumables.find((c) => c.id === item.id)?.name ||
                      "Sarf malzeme"}
                  </strong>
                  <Input
                    label="Sarf malzeme adedi"
                    type="number"
                    min={1}
                    step={1}
                    value={item.quantity}
                    onChange={(e) =>
                      update(i, {
                        consumables: v.consumables.map((c, k) =>
                          k === n
                            ? { ...c, quantity: Number(e.target.value) }
                            : c,
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      update(i, {
                        consumables: v.consumables.filter((_, k) => k !== n),
                      })
                    }
                  >
                    Sarf malzemeyi kaldır
                  </Button>
                </div>
              ))}
              <Select
                label="Sarf malzeme ekle"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    update(i, {
                      consumables: [
                        ...(v.consumables || []),
                        { id: e.target.value, quantity: 1 },
                      ],
                    });
                }}
              >
                <option value="">Sarf malzeme seçin</option>
                {consumables
                  .filter(
                    (c) =>
                      c.active &&
                      !(v.consumables || []).some((item) => item.id === c.id),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
              <Button
                type="button"
                onClick={() =>
                  onChange({
                    ...product,
                    variants: product.variants.filter((_, n) => n !== i),
                  })
                }
              >
                Varyantı kaldır
              </Button>
            </div>
          </section>
        );
      })}
    </fieldset>
  );
}
