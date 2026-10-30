import { fillMissing, matchingProduct } from "../transfer/fill-missing.js";
import { validateProduct } from "../../catalog.js";
import {
  nutritionRows,
  parseNutrition,
  serializeNutrition,
} from "../../nutrition.js";
import { productUnits } from "../../unit-pricing.js";
import { validateSatiety } from "../../satiety.js";
import { categoryOf, rootOf } from "../../hierarchy.js";

const nutrientColumns = [
  "Enerji (kcal/100 g)",
  "Enerji (kJ/100 g)",
  "Yağ (g/100 g)",
  "Doymuş yağ (g/100 g)",
  "Karbonhidrat (g/100 g)",
  "Şeker (g/100 g)",
  "Lif (g/100 g)",
  "Protein (g/100 g)",
  "Tuz (g/100 g)",
];
export const productTransferFields = [
  ["Ürün adı", "Yeni ürün için zorunlu; en fazla 160 karakter."],
  [
    "Kategori kodu",
    "Ana kategori kodu: 2 hane (ör. 10). Yeni ürün için zorunlu.",
  ],
  [
    "Alt kategori kodu",
    "2 hane (ör. 11). Ana kategoriye eklenecekse boş bırakın; yalnızca belirtilen ana kategorinin altında aranır.",
  ],
  [
    "Ürün kodu",
    "Mevcut ürünün eksiklerini tamamlamak için kodu girin. Yeni ürün kodu sistem tarafından atanır.",
  ],
  ["Kısa açıklama", "En fazla 4.000 karakter."],
  ["Durum", "Aktif / Taslak. Boş yeni kayıtlar Taslak olur."],
  ["Birim", "Dilim / Kap / Kilogram / Gram / Adet."],
  ["Birim fiyat", "Seçilen 1 birimin fiyatı (₺); pozitif, en fazla 2 ondalık."],
  [
    "Birim gramaj (g)",
    "Dilim, kap ve adet için zorunlu; bir birimin gramajı. Kilogram=1000 g, Gram=1 g otomatik.",
  ],
  [
    "1 kişilik porsiyon miktarı",
    "Ürünün biriminde miktar. Örn. 3 dilim, 150 gram veya 0,15 kilogram. Dilim, kap ve adet tam sayı.",
  ],
  ["Uzunluk (mm)", "İsteğe bağlı; 0,01–100.000 mm."],
  ["Genişlik (mm)", "İsteğe bağlı; 0,01–100.000 mm."],
  ["Yükseklik (mm)", "İsteğe bağlı; 0,01–100.000 mm."],
  ["İçindekiler", "En fazla 4.000 karakter."],
  ["Alerjen uyarısı", "En fazla 1.000 karakter."],
  ...nutrientColumns.map((label) => [
    label,
    "100 g için sayısal değer; sıfır geçerlidir. Ondalık için virgül veya nokta kullanabilirsiniz.",
  ]),
  ["Besin değeri notu", "Besin değerlerine ait ek açıklama."],
  ["Servis önerisi", "En fazla 4.000 karakter."],
  ["Saklama koşulları", "En fazla 4.000 karakter."],
  ["Uzun süreli muhafaza", "En fazla 4.000 karakter."],
  [
    "Doygunluk bilgisi",
    "Ad:seviye çiftleri; ör. Fıstık:4; Muz:2. İsim veya tanım kimliği kullanın. Seviyeler 1–5; tanımlar referans sayfasında.",
  ],
  [
    "Görsel URL",
    "HTTP/HTTPS kapak görseli bağlantısı. Kütüphane görseli seçilmezse kullanılır.",
  ],
  [
    "Görsel kimlikleri",
    "Kütüphanedeki görsel kimliklerini ; ile ayırın (en fazla 30). İlk görsel kapaktır. Dosyaları önce Kütüphane’ye yükleyin.",
  ],
  ["Mağaza", "Açık / Kapalı; boş mevcut kayıtları değiştirmez."],
  ["E-Mağaza", "Açık / Kapalı; boş mevcut kayıtları değiştirmez."],
  ["Sipariş Platformları", "Açık / Kapalı; boş mevcut kayıtları değiştirmez."],
];
export const productTransferColumns = productTransferFields.map(
  ([column]) => column,
);
const text = (value) => String(value ?? "").trim();
const normalized = (value) => text(value).toLocaleLowerCase("tr-TR");
export function transferNumber(value) {
  let s = text(value);
  if (!s) return null;
  if (s.includes(",") && s.includes("."))
    s =
      s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replaceAll(".", "").replace(",", ".")
        : s.replaceAll(",", "");
  else s = s.replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))
    throw Error("Geçerli bir sayısal değer girin: " + text(value));
  const n = Number(s);
  if (!Number.isFinite(n)) throw Error("Geçersiz sayısal değer.");
  return n;
}
export function resolveImportCategory(row, categories) {
  const rootCode = text(row["Kategori kodu"]),
    childCode = text(row["Alt kategori kodu"]);
  if (!rootCode && !childCode) return null;
  // Legacy templates used a combined root/subcategory code in one column.
  if (!Object.hasOwn(row, "Alt kategori kodu") && rootCode.length > 2) {
    const matches = categories.filter(
      (c) =>
        c.parentId &&
        text(categories.find((p) => p.id === c.parentId)?.code) +
          text(c.code) ===
          rootCode,
    );
    if (matches.length === 1) return matches[0];
  }
  if (!/^\d{2}$/.test(rootCode) || (childCode && !/^\d{2}$/.test(childCode)))
    throw Error(
      "Kategori ve alt kategori kodları ayrı ayrı 2 haneli olmalıdır.",
    );
  const roots = categories.filter(
    (c) => !c.parentId && text(c.code) === rootCode,
  );
  if (roots.length !== 1)
    throw Error(
      "Ana kategori kodu bulunamadı veya birden fazla kayıtla eşleşiyor.",
    );
  if (!childCode) return roots[0];
  const children = categories.filter(
    (c) => c.parentId === roots[0].id && text(c.code) === childCode,
  );
  if (children.length !== 1)
    throw Error(
      "Alt kategori kodu seçilen ana kategori altında bulunamadı veya birden fazla kayıtla eşleşiyor.",
    );
  return children[0];
}
function parseSatiety(value, definitions, existing) {
  if (!text(value)) return [];
  const entries = text(value)
    .split(";")
    .map((part) => {
      const pair = part.trim().match(/^(.+):\s*(\d+)$/);
      if (!pair)
        throw Error(
          "Doygunluk bilgisi Ad:seviye biçiminde olmalı; çiftleri ; ile ayırın.",
        );
      const matches = definitions.filter(
        (d) =>
          d.id === pair[1].trim() || normalized(d.name) === normalized(pair[1]),
      );
      if (matches.length !== 1)
        throw Error("Doygunluk tanımı bulunamadı: " + pair[1]);
      const definition = matches[0];
      if (
        !definition.active &&
        !existing?.satiety?.some((e) => e.ingredientId === definition.id)
      )
        throw Error("Pasif doygunluk tanımı eklenemez: " + definition.name);
      return { ingredientId: definition.id, level: Number(pair[2]) };
    });
  const issue = validateSatiety(entries, definitions);
  if (issue) throw Error(issue);
  return entries;
}
export function parseProductTransferRows(
  data,
  {
    products = [],
    categories = [],
    variantTypes = [],
    satietyProducts = [],
    mediaIds,
  } = {},
) {
  const names = new Set(products.map((p) => normalized(p.name))),
    ids = new Set(),
    codes = new Set();
  const result = [];
  data.forEach((original, index) => {
    const row = Object.fromEntries(
      Object.entries(original).map(([key, value]) => [
        key.replace(/^\uFEFF/, "").trim(),
        value,
      ]),
    );
    if (!Object.values(row).some((value) => text(value))) return;
    let product = { name: text(row["Ürün adı"]), variants: [] },
      existing,
      issue = "";
    try {
      const code = text(row["Ürün kodu"]);
      existing = matchingProduct(products, code);
      if ((code && codes.has(code)) || (existing && ids.has(existing.id)))
        throw Error("Bu ürün kodu dosyada tekrarlanıyor.");
      if (code) codes.add(code);
      if (existing) ids.add(existing.id);
      const category = resolveImportCategory(row, categories);
      if (!existing && !category) throw Error("Ana kategori kodunu girin.");
      if (existing && category && existing.categoryId !== category.id)
        throw Error(
          "Ürün kodu ile kategori kodları farklı kayıtlara işaret ediyor. Mevcut ürünün kategori kodlarını kullanın.",
        );
      const inputUnit = text(row["Birim"]);
      const parsedUnit =
        productUnits.find(
          (unit) => normalized(unit) === normalized(inputUnit),
        ) || { kg: "Kilogram", g: "Gram" }[normalized(inputUnit)];
      if (inputUnit && !parsedUnit)
        throw Error("Birim Dilim, Kap, Kilogram, Gram veya Adet olmalıdır.");
      if (
        parsedUnit &&
        existing?.unitPricing?.unit &&
        parsedUnit !== existing.unitPricing.unit
      )
        throw Error(
          "Birim mevcut ürünün birimiyle uyuşmuyor. Eksik alanları mevcut ürünün biriminde girin.",
        );
      const unit = existing?.unitPricing?.unit || parsedUnit || "";
      const price = transferNumber(row["Birim fiyat"]),
        weight = transferNumber(row["Birim gramaj (g)"]);
      if ((price != null && price <= 0) || (weight != null && weight <= 0))
        throw Error("Birim fiyat ve gramaj pozitif olmalıdır.");
      product = {
        isNew: !existing,
        name: text(row["Ürün adı"]),
        categoryId: category?.id || "",
        category: category?.name || "",
        status: text(row["Durum"]) || (existing ? "" : "Taslak"),
        description: text(row["Kısa açıklama"]),
        variants: [],
        unitPricing:
          unit || price != null || weight != null
            ? {
                unit,
                price,
                weight:
                  unit === "Kilogram" ? 1000 : unit === "Gram" ? 1 : weight,
              }
            : null,
        portion: text(row["1 kişilik porsiyon miktarı"])
          ? {
              unit,
              quantity: transferNumber(row["1 kişilik porsiyon miktarı"]),
            }
          : null,
        dimensions: Object.fromEntries(
          [
            ["length", "Uzunluk (mm)"],
            ["width", "Genişlik (mm)"],
            ["height", "Yükseklik (mm)"],
          ].map(([key, column]) => [key, transferNumber(row[column])]),
        ),
        satiety: parseSatiety(
          row["Doygunluk bilgisi"],
          satietyProducts,
          existing,
        ),
      };
      for (const [column, key] of [
        ["İçindekiler", "ingredients"],
        ["Alerjen uyarısı", "allergens"],
        ["Servis önerisi", "servingSuggestion"],
        ["Saklama koşulları", "storageConditions"],
        ["Uzun süreli muhafaza", "longTermStorage"],
      ])
        product[key] = text(row[column]);
      const hasNutrients = nutrientColumns.some((column) => text(row[column]));
      product.nutrition = hasNutrients
        ? serializeNutrition(
            Object.fromEntries(
              nutritionRows.map((nutrient, i) => [
                nutrient.key,
                transferNumber(row[nutrientColumns[i]]) ?? "",
              ]),
            ),
            text(row["Besin değeri notu"]).replace(/\.+$/, ""),
          )
        : text(row["Besin değerleri"]);
      if (!hasNutrients && text(row["Besin değeri notu"]))
        product.nutrition = product.nutrition
          ? product.nutrition + "; " + text(row["Besin değeri notu"])
          : text(row["Besin değeri notu"]);
      const imageIds = text(row["Görsel kimlikleri"])
        ? text(row["Görsel kimlikleri"]).split(";").map(text)
        : [];
      if (
        imageIds.length > 30 ||
        new Set(imageIds).size !== imageIds.length ||
        imageIds.some(
          (id) =>
            !/^[-a-zA-Z0-9]+$/.test(id) || (mediaIds && !mediaIds.includes(id)),
        )
      )
        throw Error(
          "Görsel kimliklerini kontrol edin: Kütüphane’de bulunan en fazla 30 farklı görsel seçin.",
        );
      const url = text(row["Görsel URL"]);
      if (url) {
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          throw Error("Geçerli bir HTTP/HTTPS görsel bağlantısı girin.");
        }
        if (!["http:", "https:"].includes(parsed.protocol))
          throw Error("Görsel bağlantısı HTTP/HTTPS olmalıdır.");
      }
      if (
        !existing ||
        !(existing.images?.length || existing.mediaId || existing.customImage)
      ) {
        if (imageIds.length) product.images = imageIds.map((id) => ({ id }));
        if (url) product.customImage = url;
      }
      const channels = [
        ["Mağaza", "store"],
        ["E-Mağaza", "online"],
        ["Sipariş Platformları", "foodDelivery"],
      ].filter(([label]) => text(row[label]));
      if (
        channels.some(
          ([label]) => !["Açık", "Kapalı"].includes(text(row[label])),
        )
      )
        throw Error("Satış kanalı Açık veya Kapalı olmalıdır.");
      if (channels.length)
        product.salesAvailability = Object.fromEntries(
          channels.map(([label, key]) => [key, text(row[label]) === "Açık"]),
        );
      if (existing) {
        const { isNew, variants, ...incoming } = product;
        product = fillMissing(existing, incoming);
      }
      if (!["Aktif", "Taslak"].includes(product.status))
        throw Error("Durum Aktif veya Taslak olmalıdır.");
      if (!existing && names.has(normalized(product.name)))
        throw Error("Bu isimde bir ürün zaten var veya dosyada tekrar ediyor.");
      const invalid = validateProduct(
        product,
        categories,
        variantTypes,
      )?.message;
      if (invalid) throw Error(invalid);
      names.add(normalized(product.name));
    } catch (e) {
      issue = e.message;
    }
    result.push({
      line: index + 2,
      product,
      issue,
      action: existing ? "Eksikleri tamamla" : "Yeni kayıt",
    });
  });
  if (!result.length)
    throw Error("Dosyada doldurulmuş ürün satırı bulunamadı.");
  return result;
}
export function productTransferRow(p, categories, satietyProducts = []) {
  const category = categoryOf(p, categories),
    root = rootOf(category, categories),
    nutrition = parseNutrition(p.nutrition || "");
  const values = {
    "Ürün adı": p.name,
    "Kategori kodu": root?.code || "",
    "Alt kategori kodu": category?.parentId ? category.code : "",
    "Ürün kodu": p.productCode || "",
    "Kısa açıklama": p.description || "",
    Durum: p.status,
    Birim: p.unitPricing?.unit || "",
    "Birim fiyat": p.unitPricing?.price ?? "",
    "Birim gramaj (g)": p.unitPricing?.weight ?? "",
    "1 kişilik porsiyon miktarı": p.portion?.quantity ?? "",
    "Uzunluk (mm)": p.dimensions?.length ?? "",
    "Genişlik (mm)": p.dimensions?.width ?? "",
    "Yükseklik (mm)": p.dimensions?.height ?? "",
    İçindekiler: p.ingredients || "",
    "Alerjen uyarısı": p.allergens || "",
    "Besin değeri notu": nutrition.notes,
    "Servis önerisi": p.servingSuggestion || "",
    "Saklama koşulları": p.storageConditions || "",
    "Uzun süreli muhafaza": p.longTermStorage || "",
    "Doygunluk bilgisi": (p.satiety || [])
      .map(
        (e) =>
          `${satietyProducts.find((d) => d.id === e.ingredientId)?.name || e.ingredientId}:${e.level}`,
      )
      .join("; "),
    "Görsel URL": /^https?:\/\//i.test(p.customImage || "")
      ? p.customImage
      : "",
    "Görsel kimlikleri": (p.images?.length
      ? p.images
      : p.mediaId
        ? [{ id: p.mediaId }]
        : []
    )
      .map((i) => i.id)
      .join("; "),
  };
  nutrientColumns.forEach(
    (column, i) => (values[column] = nutrition.values[nutritionRows[i].key]),
  );
  for (const [label, key] of [
    ["Mağaza", "store"],
    ["E-Mağaza", "online"],
    ["Sipariş Platformları", "foodDelivery"],
  ])
    values[label] = p.salesAvailability?.[key] ? "Açık" : "Kapalı";
  return productTransferColumns.map((column) => values[column] ?? "");
}
export function productReferenceSheets(categories, definitions, assets = []) {
  return [
    {
      name: "Alan kılavuzu",
      columns: ["Alan", "Açıklama"],
      rows: productTransferFields,
    },
    {
      name: "Kategori kodları",
      columns: [
        "Kategori kodu",
        "Ana kategori",
        "Alt kategori kodu",
        "Alt kategori",
        "Durum",
      ],
      rows: categories.map((c) => {
        const root = c.parentId
          ? categories.find((p) => p.id === c.parentId)
          : c;
        return [
          root?.code || "",
          root?.name || "",
          c.parentId ? c.code : "",
          c.parentId ? c.name : "",
          c.active && root?.active ? "Aktif" : "Pasif",
        ];
      }),
    },
    {
      name: "Doygunluk tanımları",
      columns: ["Ad", "Kimlik", "Seviye aralığı", "Durum"],
      rows: definitions.map((d) => [
        d.name,
        d.id,
        "1–5",
        d.active ? "Aktif" : "Pasif",
      ]),
    },
    {
      name: "Görsel kimlikleri",
      columns: ["Görsel kimliği", "Dosya adı"],
      rows: assets.map((a) => [a.id, a.name]),
    },
  ];
}
