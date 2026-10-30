import {
  packagingMethodName,
  packagingMethodOptions,
} from "../packaging/packaging-methods.js";
import { imageUrl } from "../../image-sizes.js";
import { portionCountLabel, portionDefinition } from "../../portions.js";
import PackagingSelect from "../packaging/PackagingSelect.jsx";
import { variantNameFromContents } from "../../variant-name.js";
import {
  packagingAllowsProduct,
  packagingApprovalIssue,
} from "../packaging/packaging-approval.js";
import "./variant-composition.css";
import React, { useEffect, useState } from "react";
import VariantProductImage from "./VariantProductImage.jsx";
import { variantWizardSteps as steps } from "./variant-wizard.js";
import {
  Button,
  Input,
  Select,
  Textarea,
} from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import MediaGallery from "../categories/CategoryGallery.jsx";
import ProductSatiety from "../products/ProductSatiety.jsx";
import VariantProductPicker from "./VariantProductPicker.jsx";
import {
  defaultPackagingItems,
  isBoxVariant,
  isPortionVariant,
} from "../packaging/packaging-data.js";
import { productInformationFields } from "../../product-information.js";
import {
  calculateVariant,
  defaultConsumables,
  deriveVariantInformation,
} from "../../variant-composition.js";
import { hasUnitPricing } from "../../unit-pricing.js";
import { money } from "../../catalog-tools.js";

export default function VariantCompositionFields({
  product,
  onChange,
  disabled,
  focusVariantId = "",
  initialStep = 0,
  onReady,
}) {
  const {
    products,
    categories,
    variantTypes,
    satietyProducts,
    packagingItems = defaultPackagingItems(),
    packagingMethods,
    consumables = defaultConsumables(),
    refresh,
  } = useCatalog();
  const [step, setStep] = useState(initialStep),
    [error, setError] = useState("");
  const index = focusVariantId
    ? product.variants.findIndex((v) => String(v.id) === focusVariantId)
    : product.variants.findIndex((v) => !v.id);
  const i = index < 0 ? 0 : index,
    v = product.variants[i];
  const [automaticName, setAutomaticName] = useState(
    () =>
      !v?.id &&
      (!v?.size ||
        v.size === variantNameFromContents(v, product, products, variantTypes)),
  );
  useEffect(() => {
    onReady?.(!!v?.id || step === steps.length - 1);
  }, [step, onReady, v?.id]);
  if (!v) return <p>Varyant bulunamadı.</p>;
  const isBox = isBoxVariant(v, variantTypes);
  const isPortion = isPortionVariant(v, variantTypes);
  const selectedBox = packagingItems.find((item) => item.id === v.packagingId);
  const items = Array.isArray(v.items)
    ? v.items
    : [
        {
          productId: v.sourceProductId ?? product.id,
          quantity: v.quantity ?? (v.slices || 1),
        },
      ];
  const approvalIssue =
    isBox && v.packagingId
      ? packagingApprovalIssue(
          { ...v, items },
          selectedBox,
          product.id,
          products,
          categories,
        )
      : "";
  const update = (patch) => {
    if (automaticName && !v.id && !Object.hasOwn(patch, "size")) {
      patch = {
        ...patch,
        size: variantNameFromContents(
          { ...v, ...patch },
          product,
          products,
          variantTypes,
        ),
      };
    }
    onChange({
      ...product,
      variants: product.variants.map((item, n) =>
        n === i ? { ...item, ...patch } : item,
      ),
    });
  };
  const updateItems = (next) =>
    update({
      items: next,
      sourceProductId: next[0]?.productId,
      quantity: next[0]?.quantity,
    });
  const derived = deriveVariantInformation({ ...v, items }, products);
  const overrides = v.informationOverrides ?? v.information ?? {};
  const information = { ...derived, ...overrides };
  const updateInfo = (key, value) =>
    update({
      items,
      sourceProductId: items[0].productId,
      quantity: items[0].quantity,
      informationOverrides: { ...overrides, [key]: value },
    });
  let calculated, calculationError;
  try {
    calculated = calculateVariant(
      {
        ...v,
        ...(isPortion
          ? {
              packagingId: "",
              packaging: packagingMethodName(packagingMethods, "plated"),
            }
          : {}),
        items,
        consumables: v.consumables || [],
      },
      products,
      consumables,
      packagingMethods,
    );
  } catch (e) {
    calculationError = e.message;
  }
  function next() {
    setError("");
    if (step === 1 && approvalIssue) return setError(approvalIssue);
    if (step === 0 && (!v.typeId || !v.size.trim()))
      return setError("Varyant türünü ve adını girin.");
    if (
      step === 0 &&
      !isBox &&
      !isPortion &&
      !packagingMethodOptions(packagingMethods, v.packaging).includes(
        v.packaging,
      )
    )
      return setError("Ambalaj / servis şekli seçin.");
    if (step === 0 && isBox && !v.id && !selectedBox)
      return setError("Kutu tipi seçin.");
    if (
      step === 1 &&
      (!items.length ||
        items.some((item) => {
          const source = products.find((p) => p.id === item.productId);
          return (
            !source ||
            !hasUnitPricing(source.unitPricing) ||
            !Number.isFinite(item.quantity) ||
            item.quantity <= 0 ||
            (["Dilim", "Kap", "Adet"].includes(source.unitPricing.unit) &&
              !Number.isInteger(item.quantity))
          );
        }))
    )
      return setError(
        "Her ürün için geçerli birim fiyatı, gramaj ve miktar girin.",
      );
    if (step === 2 && !calculated) return setError(calculationError);
    if (step === 2)
      update({
        items,
        sourceProductId: items[0].productId,
        quantity: items[0].quantity,
        consumables: v.consumables || [],
        images: v.images || [],
        informationOverrides: overrides,
      });
    setStep((n) => Math.min(n + 1, steps.length - 1));
  }
  return (
    <fieldset disabled={disabled} className="variant-composition-fields">
      <nav
        className="variant-wizard-steps"
        aria-label={
          v.id ? "Varyant düzenleme bölümleri" : "Varyant oluşturma adımları"
        }
      >
        {steps.map((name, n) =>
          v.id ? (
            <button
              key={name}
              type="button"
              aria-current={n === step ? "step" : undefined}
              onClick={() => {
                setError("");
                setStep(n);
              }}
            >
              <b>{n + 1}</b> {name}
            </button>
          ) : (
            <span key={name} aria-current={n === step ? "step" : undefined}>
              <b>{n + 1}</b> {name}
            </span>
          ),
        )}
      </nav>
      {approvalIssue && (
        <p role="alert" className="variant-wizard-error">
          {approvalIssue}
        </p>
      )}
      {error && (
        <p className="variant-wizard-error" role="alert">
          {error}
        </p>
      )}
      {step === 0 && (
        <section className="variant-wizard-section">
          <h3>Varyant türü ve adı</h3>
          <p>
            Varyant adı ürün ve tür seçimine göre otomatik oluşturulur.
            İsterseniz değiştirebilirsiniz.
          </p>
          <div className="variant-basic-grid">
            <Select
              label="Varyant türü"
              value={v.typeId || ""}
              onChange={(e) =>
                update({
                  typeId: e.target.value,
                  packagingId: "",
                  packaging: isPortionVariant(
                    { typeId: e.target.value },
                    variantTypes,
                  )
                    ? packagingMethodName(packagingMethods, "plated")
                    : "",
                })
              }
            >
              <option value="">Tür seçin</option>
              {variantTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Input
              label="Varyant adı"
              maxLength={45}
              required
              value={v.size}
              onChange={(e) => {
                setAutomaticName(false);
                update({ size: e.target.value });
              }}
            />
            {isPortion && (
              <Input
                label="Servis şekli"
                value={packagingMethodName(packagingMethods, "plated")}
                disabled
              />
            )}
            {!isPortion && !isBox && v.typeId && (
              <Select
                label="Ambalaj / servis şekli"
                value={v.packaging || ""}
                onChange={(e) =>
                  update({
                    items,
                    sourceProductId: items[0]?.productId,
                    quantity: items[0]?.quantity,
                    consumables: v.consumables || [],
                    images: v.images || [],
                    packaging: e.target.value,
                  })
                }
              >
                <option value="">Seçin</option>
                {packagingMethodOptions(packagingMethods, v.packaging).map(
                  (p) => (
                    <option key={p}>{p}</option>
                  ),
                )}
              </Select>
            )}
            {isBox && (
              <PackagingSelect
                items={packagingItems}
                value={v.packagingId || ""}
                includeInactive
                onChange={(e) => {
                  const box = packagingItems.find(
                    (item) => item.id === e.target.value,
                  );
                  update({
                    packagingId: e.target.value,
                    ...(box
                      ? {
                          packaging:
                            box.material === "Karton"
                              ? packagingMethodName(
                                  packagingMethods,
                                  "cardboard",
                                )
                              : packagingMethodName(packagingMethods, "metal"),
                        }
                      : {}),
                  });
                }}
              />
            )}
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="variant-wizard-section">
          <h3>Varyantın içindeki ürünler</h3>
          <p>
            Ürün ekleyebilir veya çıkarabilirsiniz. Varyantta en az bir ürün
            bulunmalıdır.
          </p>
          <div className="variant-product-transfer">
            <div>
              <h4>Eklenebilir ürünler</h4>
              <VariantProductPicker
                products={products}
                categories={categories}
                isProductAllowed={(p) =>
                  !isBox ||
                  !v.packagingId ||
                  packagingAllowsProduct(
                    selectedBox,
                    p.id,
                    products,
                    categories,
                  )
                }
                exclude={items.map((item) => item.productId)}
                disabled={items.length >= 50}
                onSelect={(selected) =>
                  updateItems([
                    ...items,
                    { productId: selected.id, quantity: 1 },
                  ])
                }
              />
            </div>
            <div className="variant-product-selected">
              <h4>Eklenen ürünler · {items.length}</h4>
              {items.map((item, n) => {
                const source = products.find((p) => p.id === item.productId);
                return (
                  <div
                    className="variant-wizard-item variant-selected-product"
                    key={item.productId}
                  >
                    <div className="variant-selected-identity">
                      <VariantProductImage product={source} />
                      <div>
                        <strong>{source?.name || "Ürün bulunamadı"}</strong>
                        <small>
                          {source?.unitPricing
                            ? `${money(source.unitPricing.price)} / ${source.unitPricing.unit} · ≈ ${source.unitPricing.weight} g`
                            : "Birim fiyatı veya gramajı eksik"}
                        </small>
                        <small>{portionDefinition(source)}</small>
                      </div>
                    </div>
                    <Input
                      label={`Miktar (${source?.unitPricing?.unit || "birim"})`}
                      aria-label={`${source?.name || "Ürün"} miktarı`}
                      type="number"
                      min={0.001}
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItems(
                          items.map((x, j) =>
                            j === n
                              ? { ...x, quantity: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      disabled={items.length <= 1}
                      title={
                        items.length <= 1
                          ? "Varyantta en az bir ürün bulunmalıdır. Önce başka bir ürün ekleyin."
                          : undefined
                      }
                      aria-label={`${source?.name || "Ürün"} kaldır`}
                      onClick={() => {
                        if (items.length > 1)
                          updateItems(items.filter((_, j) => j !== n));
                      }}
                    >
                      Kaldır
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="variant-wizard-section">
          <h3>Fiyat</h3>
          <p>Fiyat ve gramaj seçilen ürünlere göre hesaplanır.</p>
          <div className="variant-basic-grid">
            <Input
              label="Satış fiyatı düzeltmesi (isteğe bağlı)"
              type="number"
              min={0.01}
              step={0.01}
              value={v.priceOverride ?? ""}
              onChange={(e) =>
                update({
                  items,
                  sourceProductId: items[0]?.productId,
                  quantity: items[0]?.quantity,
                  consumables: v.consumables || [],
                  images: v.images || [],
                  priceOverride:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          {calculated ? (
            <div className="variant-calculation">
              <div>
                <small>Hesaplanan fiyat</small>
                <strong>{money(calculated.calculatedPrice)}</strong>
              </div>
              <div>
                <small>Net gramaj</small>
                <strong>≈ {calculated.weight} g</strong>
              </div>
              <div>
                <small>Porsiyon bilgisi</small>
                <strong>{portionCountLabel(calculated.portionCount)}</strong>
              </div>
              {calculated.portionCount == null && (
                <p>
                  Hesaplama için seçilen tüm ürünlerde bir kişilik porsiyon
                  miktarını tanımlayın.
                </p>
              )}
              <div>
                <small>Satış fiyatı</small>
                <strong>{money(calculated.price)}</strong>
              </div>
            </div>
          ) : (
            <p role="status">{calculationError}</p>
          )}
          <small>
            Fiyat düzeltmesi boşsa hesaplanan fiyat kullanılır. Net gramaja
            ambalaj ve sarf malzemeler dahil değildir.
          </small>
        </section>
      )}
      {step === 3 && (
        <section className="variant-wizard-section">
          <h3>Ürün bilgileri</h3>
          <p>
            Bilgiler seçilen ürünlerden alınır. Bir alanı düzenlediğinizde kendi
            girdiğiniz değer kullanılır.
          </p>
          {!derived.nutritionComplete && (
            <p role="status">
              Bazı ürünlerin besin değerleri eksik. 100 g için otomatik
              hesaplama yapılmadı; bilgileri tamamlayın veya elle girin.
            </p>
          )}
          {items.length > 1 && (
            <p>
              Doygunlukta aynı içerik için en yüksek ürün seviyesi önerilir.
              Besin değerleri net gramaja göre ağırlıklı hesaplanır.
            </p>
          )}
          {productInformationFields.map((field) => (
            <Textarea
              key={field.key}
              label={field.label}
              rows={3}
              maxLength={field.maxLength}
              value={information[field.key] || ""}
              onChange={(e) => updateInfo(field.key, e.target.value)}
            />
          ))}
          <h4>Doygunluk bilgisi</h4>
          <ProductSatiety
            editing
            value={information.satiety || []}
            definitions={satietyProducts}
            onChange={(value) => updateInfo("satiety", value)}
          />
          <Button
            type="button"
            onClick={() =>
              update({
                items,
                sourceProductId: items[0].productId,
                quantity: items[0].quantity,
                informationOverrides: {},
              })
            }
          >
            Bilgileri ürünlerden yeniden al
          </Button>
        </section>
      )}
      {step === 4 && (
        <section className="variant-wizard-section">
          <h3>Varyant görselleri</h3>
          <p>
            Seçilen ürünlerin görsellerinden seçin veya yeni görsel ekleyin.
          </p>
          <div className="variant-photo-options">
            {items
              .flatMap(
                (item) =>
                  products.find((p) => p.id === item.productId)?.images || [],
              )
              .filter(
                (image, n, list) =>
                  list.findIndex((x) => x.id === image.id) === n,
              )
              .map((image) => (
                <label key={image.id}>
                  <img
                    src={imageUrl(image.url, "thumb")}
                    alt="Ürün görseli"
                    width={100}
                    height={100}
                    loading="lazy"
                    decoding="async"
                  />
                  <input
                    type="checkbox"
                    checked={(v.images || []).some((x) => x.id === image.id)}
                    onChange={(e) =>
                      update({
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
              update({ images });
              return true;
            }}
          />
        </section>
      )}
      {step === 5 && (
        <section className="variant-wizard-section">
          <h3>Varyantı tamamla</h3>
          <p>
            Varyanta peçete, mendil veya diğer sarf malzemeleri
            ekleyebilirsiniz. Bu alan isteğe bağlıdır.
          </p>
          {(v.consumables || []).map((item, n) => (
            <div className="variant-wizard-item" key={item.id}>
              <strong>
                {consumables.find((c) => c.id === item.id)?.name ||
                  "Sarf malzeme"}
              </strong>
              <Input
                label="Adet"
                type="number"
                min={1}
                step={1}
                value={item.quantity}
                onChange={(e) =>
                  update({
                    consumables: v.consumables.map((c, k) =>
                      k === n ? { ...c, quantity: Number(e.target.value) } : c,
                    ),
                  })
                }
              />
              <Button
                type="button"
                onClick={() =>
                  update({
                    consumables: v.consumables.filter((_, k) => k !== n),
                  })
                }
              >
                Kaldır
              </Button>
            </div>
          ))}
          <Select
            label="Sarf malzeme ekle"
            value=""
            onChange={(e) => {
              if (e.target.value)
                update({
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
        </section>
      )}
      <div className="variant-wizard-navigation">
        {step > 0 && (
          <Button
            type="button"
            onClick={() => {
              setError("");
              setStep((n) => n - 1);
            }}
          >
            Geri
          </Button>
        )}
        {step < steps.length - 1 && (
          <Button type="button" variant="primary" onClick={next}>
            Devam et
          </Button>
        )}
      </div>
    </fieldset>
  );
}
