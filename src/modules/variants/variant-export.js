import { variantCardData } from "../../product-card.js";
import {
  resolvedSatiety,
  defaultSatietyProducts,
  satietyLevels,
} from "../../satiety.js";
import { productInformationFields } from "../../product-information.js";
import {
  deriveVariantInformation,
  defaultConsumables,
} from "../../variant-composition.js";
import {
  salesChannels,
  salesAvailability,
  effectiveSales,
} from "../../sales-availability.js";
import {
  hasPortion,
  portionDefinition,
  variantPortionCount,
  portionCountLabel,
} from "../../portions.js";
import { categoryOf, categoryPath } from "../../hierarchy.js";
import { normalizeUnitPricing } from "../../unit-pricing.js";

export function variantExportRecord(
  p,
  v,
  types,
  products,
  boxes,
  options = {},
) {
  const origin = options.origin || globalThis.location?.origin || "";
  const link = (value) => {
    if (!value) return "";
    try {
      const url = new URL(value, origin);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  const images = (record) => [
    ...new Set(
      [
        ...(record.images || []).map(
          (image) =>
            image.url ||
            (image.id
              ? `/api/media/${encodeURIComponent(image.id)}/content`
              : ""),
        ),
        record.customImage,
        record.imageUrl,
        record.mediaId
          ? `/api/media/${encodeURIComponent(record.mediaId)}/content`
          : "",
      ]
        .filter(Boolean)
        .map(link)
        .filter(Boolean),
    ),
  ];
  const items = v.items?.length
    ? v.items
    : [{ productId: v.sourceProductId ?? p.id, quantity: v.quantity ?? 1 }];
  const members = items.map((item) => ({
    item,
    product:
      products.find(
        (product) => String(product.id) === String(item.productId),
      ) || (String(item.productId) === String(p.id) ? p : null),
  }));
  const box = boxes.find((box) => box.id === v.packagingId);
  const preferences = salesAvailability(v.salesAvailability, undefined, true);
  const enabled = effectiveSales(p, v);
  const portion = variantPortionCount(v, products, p);
  const info = {
    ...deriveVariantInformation({ ...v, items }, products),
    ...v.information,
    ...v.informationOverrides,
  };
  const card = variantCardData(
    p,
    v,
    options.categories || [],
    products,
    options.satietyProducts || defaultSatietyProducts(),
  );
  const json = (value) => (value == null ? "" : JSON.stringify(value));
  const memberValues = (get) =>
    members
      .map(({ item, product }) => {
        const value = product ? get(product, item) : null;
        return `${product?.name || item.productId} (${product?.productCode || item.productId}): ${value === undefined || value === null || value === "" ? "Belirtilmedi" : value}`;
      })
      .join("\n");
  const grams = (product, quantity) => {
    const weight = normalizeUnitPricing(product.unitPricing)?.weight;
    return Number.isFinite(weight) && Number.isFinite(quantity)
      ? Number((weight * quantity).toFixed(3))
      : null;
  };
  const record = {
    "Ürün kodu": p.productCode || "",
    "Ürün adı": p.name || "",
    Kategori:
      categoryPath(
        categoryOf(p, options.categories || []),
        options.categories || [],
      ) ||
      p.category ||
      "",
    "Varyant adı": v.size || "",
    "Varyant tipi": types.find((t) => t.id === v.typeId)?.name || "",
    "Varyant kimliği": v.id || "",
    "Varyant kodu": v.sku || "",
    "Teknik kimlikler (JSON)": json({
      productId: p.id,
      typeId: v.typeId,
      sourceProductId: v.sourceProductId ?? p.id,
    }),
    "Kart açıklaması": card.description,
    "Satış kanalları":
      salesChannels
        .filter(({ key }) => card.salesAvailability[key])
        .map(({ label }) => label)
        .join("; ") || "Aktif satış kanalı bulunmuyor.",
    "Ürünler ve miktarlar": members
      .map(
        ({ item, product }) =>
          `${product?.productCode || item.productId}:${item.quantity}`,
      )
      .join(";"),
    "İçerikteki ürünler": members
      .map(
        ({ item, product }) =>
          `${product?.name || item.productId}: ${item.quantity} ${product?.unitPricing?.unit || "Adet"}`,
      )
      .join("\n"),
    Miktar: v.quantity ?? "",
    Birim: v.unit || "",
    "Dilim adedi": v.slices ?? "",
    "Net gramaj (g)": v.weight ?? "",
    "Porsiyon bilgisi": portionCountLabel(portion),
    "Ambalaj / servis": v.packagingName || v.packaging || "",
    "Kutu tipi": box?.name || "",
    "Kutu kimliği": v.packagingId || "",
    "Kutu ölçüleri (mm)": box
      ? (box.shape === "cylinder" || box.diameter
          ? [box.diameter, box.height]
          : [box.length, box.width, box.height]
        )
          .map((value) => value ?? "")
          .join(" × ")
      : "",
    "Satış fiyatı": v.price ?? "",
    "Hesaplanan fiyat": v.calculatedPrice ?? "",
    "Manuel fiyat düzeltmesi": v.priceOverride ?? "",
    "Para birimi": "TRY",
    Durum: v.active !== false ? "Aktif" : "Pasif",
    ...Object.fromEntries(
      salesChannels.flatMap(({ key, label }) => [
        [label, preferences[key] ? "Açık" : "Kapalı"],
        [`${label} satış uygunluğu`, enabled[key] ? "Etkin" : "Kapalı"],
      ]),
    ),
    ...Object.fromEntries(
      productInformationFields.map((field) => [
        field.label,
        info[field.key] || "",
      ]),
    ),
    "Doygunluk bilgisi": resolvedSatiety(
      info.satiety,
      options.satietyProducts || defaultSatietyProducts(),
    )
      .map(
        (entry) =>
          `${entry.name}: ${entry.level}/5 (${satietyLevels[entry.level - 1]})`,
      )
      .join("\n"),
    "Sarf malzemeler": (v.consumables || [])
      .map(
        (item) =>
          `${(options.consumables || defaultConsumables()).find((c) => c.id === item.id)?.name || item.id}: ${item.quantity}`,
      )
      .join("\n"),
    "Varyant fotoğraf linkleri": images(v).join("\n"),
    "Ürün fotoğraf linkleri": members
      .map(({ product }) =>
        product
          ? images(product)
              .map((url) => `${product.name}: ${url}`)
              .join("\n")
          : "",
      )
      .filter(Boolean)
      .join("\n"),
    "Kartta gösterilen fotoğraf linkleri": images(v).length
      ? images(v).join("\n")
      : images(p).join("\n"),
    "Ürün birimleri": memberValues((product) => product.unitPricing?.unit),
    "Ürün birim fiyatları (TRY)": memberValues(
      (product) => product.unitPricing?.price,
    ),
    "Ürün birim gramajları (g)": memberValues((product) => grams(product, 1)),
    "Ürün porsiyon miktarları": memberValues((product) =>
      hasPortion(product) ? portionDefinition(product) : null,
    ),
    "Ürün porsiyon gramajları (g)": memberValues((product) =>
      hasPortion(product) ? grams(product, product.portion.quantity) : null,
    ),
    "Varyanta eklenen ürün gramajları (g)": memberValues((product, item) =>
      grams(product, item.quantity),
    ),
    "Ürün uzunlukları (mm)": memberValues(
      (product) => product.dimensions?.length,
    ),
    "Ürün genişlikleri (mm)": memberValues(
      (product) => product.dimensions?.width,
    ),
    "Ürün yükseklikleri (mm)": memberValues(
      (product) => product.dimensions?.height,
    ),
    "Ürün kategorileri": memberValues(
      (product) =>
        categoryPath(
          categoryOf(product, options.categories || []),
          options.categories || [],
        ) || product.category,
    ),
    "Ürün durumları": memberValues((product) => product.status),
    "Ürün açıklamaları": memberValues((product) => product.description),
    "Ürün içerik ve kullanım bilgileri": memberValues((product) =>
      productInformationFields
        .map(
          (field) => `${field.label}: ${product[field.key] || "Belirtilmedi"}`,
        )
        .join("\n"),
    ),
    "Ürün doygunluk bilgileri": memberValues((product) =>
      json(product.satiety),
    ),
    "Kutu fotoğraf linkleri": box ? images(box).join("\n") : "",
    "Varyant kartı linki": v.id ? link(`/v/${encodeURIComponent(v.id)}`) : "",
    "Varyant kartı yayında": v.publicCardEnabled === true ? "Evet" : "Hayır",
    "Son güncelleme": v.updated || p.updated || "",
    "Varyant tüm verileri (JSON)": json(v),
    "İçerikteki ürünlerin tüm verileri (JSON)": json(
      members.map(({ item, product }) => {
        const { variants, ...data } = product || {};
        return {
          quantity: item.quantity,
          ...data,
          photoUrls: product ? images(product) : [],
        };
      }),
    ),
    "Kutu tüm verileri (JSON)": json(box),
  };
  return record;
}
