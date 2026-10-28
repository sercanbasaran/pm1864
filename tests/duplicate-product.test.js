import test from "node:test";
import assert from "node:assert/strict";
import { duplicateProduct } from "../src/duplicate-product.js";

test("duplication copies editable content without identities, publication or shared mutable references", () => {
  const source = {
    id: 1,
    name: "Fıstıklı Baklava",
    productCode: "0100101001",
    sku: "HM0100.101001",
    categoryId: "c1",
    category: "Baklava",
    status: "Aktif",
    publicCardEnabled: true,
    publicCardCode: "P000001",
    publicSlug: "original-link",
    slugHistory: ["old-link"],
    version: 7,
    updated: "yesterday",
    nextVariantNumber: 5,
    ingredients: "Fıstık",
    nutrition: "",
    storageConditions: "Serin yerde",
    salesAvailability: { store: true },
    images: [{ id: "media1", url: "/api/media/media1/content" }],
    variants: [
      {
        id: "v1",
        sku: "variant-sku",
        size: "S",
        typeId: "item",
        price: 150,
        weight: 500,
        active: true,
      },
    ],
  };
  const before = structuredClone(source),
    copy = duplicateProduct(source);
  assert.equal(copy.name, "Fıstıklı Baklava (Kopya)");
  assert.equal(copy.isNew, true);
  assert.equal(copy.status, "Taslak");
  assert.equal(copy.publicCardEnabled, false);
  for (const key of [
    "id",
    "productCode",
    "sku",
    "publicCardCode",
    "publicSlug",
    "slugHistory",
    "version",
    "updated",
    "nextVariantNumber",
  ])
    assert.equal(Object.hasOwn(copy, key), false, key);
  assert.deepEqual(copy.variants, []);
  assert.equal(copy.ingredients, source.ingredients);
  copy.images[0].id = "different";
  copy.variants.push({size: "Yeni varyant", price: 200});
  copy.salesAvailability.store = false;
  assert.deepEqual(source, before);
  assert.ok(
    duplicateProduct({ ...source, name: "x".repeat(160) }).name.length <= 160,
  );
});
