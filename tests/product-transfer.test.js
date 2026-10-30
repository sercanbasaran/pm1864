import test from "node:test";
import assert from "node:assert/strict";
import {
  productTransferColumns,
  productTransferRow,
  parseProductTransferRows,
  resolveImportCategory,
  productReferenceSheets,
} from "../src/modules/products/product-transfer.js";
const categories = [
  { id: "a", code: "10", name: "Baklavalar", active: true },
  { id: "b", code: "11", name: "Lokumlar", active: true },
  { id: "a-child", code: "10", name: "Fıstıklı", parentId: "a", active: true },
  { id: "b-child", code: "10", name: "Duble", parentId: "b", active: true },
];
const definitions = [
  { id: "pistachio", name: "Fıstık", active: true },
  { id: "banana", name: "Muz", active: true },
];
const context = {
  categories,
  satietyProducts: definitions,
  products: [],
  variantTypes: [{ id: "type-item", name: "Adet" }],
  mediaIds: ["image-one", "image-two"],
};
const row = () =>
  Object.fromEntries(productTransferColumns.map((column) => [column, ""]));
const complete = () => ({
  ...row(),
  "Ürün adı": "Fıstıklı Baklava",
  "Kategori kodu": "10",
  "Alt kategori kodu": "10",
  Durum: "Aktif",
  Birim: "Dilim",
  "Birim fiyat": "163,33",
  "Birim gramaj (g)": "41",
  "1 kişilik porsiyon miktarı": "3",
  "Uzunluk (mm)": "45",
  "Genişlik (mm)": "35",
  "Yükseklik (mm)": "30",
  İçindekiler: "Fıstık, un",
  "Alerjen uyarısı": "Fıstık ve gluten içerir.",
  "Enerji (kcal/100 g)": "433",
  "Enerji (kJ/100 g)": "1811,67",
  "Yağ (g/100 g)": "22,95",
  "Doymuş yağ (g/100 g)": "3,23",
  "Karbonhidrat (g/100 g)": "51,23",
  "Şeker (g/100 g)": "31,16",
  "Lif (g/100 g)": "1,9",
  "Protein (g/100 g)": "4,66",
  "Tuz (g/100 g)": "0",
  "Besin değeri notu": "El yapımıdır.",
  "Doygunluk bilgisi": "Fıstık:4; Muz:2",
  "Görsel kimlikleri": "image-one; image-two",
  "Kısa açıklama": "Kat kat lezzet",
  "Servis önerisi": "Oda sıcaklığında",
  "Saklama koşulları": "Serin yerde",
  "Uzun süreli muhafaza": "Dondurulabilir",
  Mağaza: "Açık",
  "E-Mağaza": "Kapalı",
  "Sipariş Platformları": "Açık",
});
test("separate root and child codes resolve within the chosen root, including repeated child codes", () => {
  assert.equal(resolveImportCategory(complete(), categories).id, "a-child");
  assert.equal(
    resolveImportCategory({ ...complete(), "Kategori kodu": "11" }, categories)
      .id,
    "b-child",
  );
  assert.equal(
    resolveImportCategory(
      { ...complete(), "Alt kategori kodu": "" },
      categories,
    ).id,
    "a",
  );
  assert.throws(() =>
    resolveImportCategory(
      { ...complete(), "Alt kategori kodu": "12" },
      categories,
    ),
  );
  assert.throws(() =>
    resolveImportCategory(
      { ...complete(), "Kategori kodu": "1010" },
      categories,
    ),
  );
  assert.equal(
    resolveImportCategory({ "Kategori kodu": "1010" }, categories).id,
    "a-child",
  );
});
test("all current product fields parse and export without losing portions, dimensions, nutrients or media", () => {
  const [parsed] = parseProductTransferRows([complete()], context);
  assert.equal(parsed.issue, "");
  const p = parsed.product;
  assert.equal(p.categoryId, "a-child");
  assert.equal(p.unitPricing.price, 163.33);
  assert.deepEqual(p.portion, { unit: "Dilim", quantity: 3 });
  assert.deepEqual(p.dimensions, { length: 45, width: 35, height: 30 });
  assert.deepEqual(p.satiety, [
    { ingredientId: "pistachio", level: 4 },
    { ingredientId: "banana", level: 2 },
  ]);
  assert.equal(p.images.length, 2);
  assert.equal(p.salesAvailability.online, false);
  assert.ok(p.nutrition.includes("Tuz 0 g"));
  const exported = Object.fromEntries(
    productTransferColumns.map((column, i) => [
      column,
      productTransferRow(p, categories, definitions)[i],
    ]),
  );
  const [again] = parseProductTransferRows([exported], context);
  assert.equal(again.issue, "");
  for (const key of [
    "portion",
    "dimensions",
    "satiety",
    "unitPricing",
    "images",
    "nutrition",
    "salesAvailability",
  ])
    assert.deepEqual(again.product[key], p[key]);
  assert.equal(
    productReferenceSheets(categories, definitions, [
      { id: "image-one", name: "test.png" },
    ]).length,
    4,
  );
});
test("code matches fill missing content while preserving filled fields, images and variants", () => {
  const existing = {
    ...parseProductTransferRows([complete()], context)[0].product,
    id: 1,
    productCode: "1010100",
    description: "",
    portion: null,
    dimensions: { length: null, width: 35, height: null },
    satiety: [],
    images: [{ id: "kept" }],
    customImage: "https://example.test/keep.png",
    variants: [
      {
        id: "kept-variant",
        size: "Varolan",
        typeId: "type-item",
        price: 100,
        weight: 40,
        slices: 1,
        unit: "Dilim",
        active: true,
      },
    ],
  };
  const [parsed] = parseProductTransferRows(
    [
      {
        ...complete(),
        "Ürün kodu": "1010100",
        "Ürün adı": "Değişmesin",
        "Birim fiyat": "200",
      },
    ],
    { ...context, products: [existing] },
  );
  assert.equal(parsed.issue, "");
  assert.equal(parsed.product.name, existing.name);
  assert.equal(parsed.product.unitPricing.price, 163.33);
  assert.equal(parsed.product.description, "Kat kat lezzet");
  assert.equal(parsed.product.portion.quantity, 3);
  assert.equal(parsed.product.images[0].id, "kept");
  assert.equal(parsed.product.variants[0].id, "kept-variant");
  const [mismatch] = parseProductTransferRows(
    [{ ...complete(), "Ürün kodu": "1010100", "Kategori kodu": "11" }],
    { ...context, products: [existing] },
  );
  assert.ok(mismatch.issue.includes("kategori"));
});
test("invalid per-row data is reviewable and empty templates never create placeholder products", () => {
  for (const patch of [
    { "Doygunluk bilgisi": "Fıstık:6" },
    { "Doygunluk bilgisi": "Bilinmeyen:3" },
    { "Görsel kimlikleri": "missing" },
    { "Görsel URL": "javascript:alert(1)" },
    { "1 kişilik porsiyon miktarı": "-1" },
    { "1 kişilik porsiyon miktarı": "1,5" },
    { "Yağ (g/100 g)": "abc" },
    { "Uzunluk (mm)": "0" },
    { Mağaza: "evet" },
  ])
    assert.ok(
      parseProductTransferRows([{ ...complete(), ...patch }], context)[0].issue,
      JSON.stringify(patch),
    );
  assert.throws(
    () => parseProductTransferRows([row()], context),
    /doldurulmuş/,
  );
  const rows = parseProductTransferRows([row(), complete()], context);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].line, 3);
});
