import test from "node:test";
import assert from "node:assert/strict";
import { variantsContainingProduct } from "../src/product-variants.js";
import { missingProductInformation } from "../src/modules/products/product-quality.js";
import { productCardData } from "../src/product-card.js";

const fixture = () => {
  const a = { id: 1, name: "Baklava", status: "Aktif", variants: [] };
  const b = { id: 2, name: "Lokum", status: "Aktif", variants: [] };
  const c = { id: 3, name: "Muhallebi", status: "Aktif", variants: [] };
  a.variants = [
    {
      id: "mixed",
      size: "Karışık kutu",
      items: [{ productId: 1 }, { productId: 2 }],
      price: 100,
      weight: 200,
    },
    { id: "legacy", size: "Eski porsiyon", sourceProductId: 2 },
    { id: "owner-only", size: "Tek ürün" },
    { id: "moved", size: "Değiştirilmiş içerik", items: [{ productId: 2 }] },
    {
      id: "inactive",
      size: "Pasif kutu",
      active: false,
      items: [{ productId: 3 }],
    },
  ];
  return [a, b, c];
};
test("variant filter follows composition across owners and counts inactive variants as created", () => {
  const products = fixture();
  for (const product of products)
    assert.equal(
      missingProductInformation(product, "noVariants", products),
      false,
    );
  const empty = { id: 4, variants: [] };
  assert.equal(
    missingProductInformation(empty, "noVariants", [...products, empty]),
    true,
  );
  assert.deepEqual(
    variantsContainingProduct(products[0], products).map(
      (row) => row.variant.id,
    ),
    ["mixed", "owner-only"],
  );
  assert.deepEqual(
    variantsContainingProduct(products[1], products).map(
      (row) => row.variant.id,
    ),
    ["mixed", "legacy", "moved"],
  );
  products[0].variants[0].items.push({ productId: 2 });
  assert.equal(variantsContainingProduct(products[1], products).length, 3);
});
test("product cards include active mixed and legacy variants with safe public fields", () => {
  const products = fixture();
  const card = productCardData(
    products[1],
    [],
    "",
    undefined,
    undefined,
    products,
  );
  assert.deepEqual(
    card.variants.map((v) => v.size),
    ["Karışık kutu", "Eski porsiyon", "Değiştirilmiş içerik"],
  );
  assert.equal(card.variants[0].price, 100);
  assert.equal("items" in card.variants[0], false);
  assert.equal("sourceProductId" in card.variants[0], false);
  assert.deepEqual(
    productCardData(products[2], [], "", undefined, undefined, products)
      .variants,
    [],
  );
  products[0].status = "Pasif";
  assert.equal(
    productCardData(
      products[1],
      [],
      "",
      undefined,
      undefined,
      products,
    ).variants.some((v) => v.size === "Karışık kutu"),
    false,
  );
});
