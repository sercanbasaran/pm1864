import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePortion,
  variantPortionCount,
  portionCountLabel,
} from "../src/portions.js";
import { calculateVariant } from "../src/variant-composition.js";
import { productCardData, variantCardData } from "../src/product-card.js";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
const slice = {
  id: 1,
  status: "Aktif",
  unitPricing: { unit: "Dilim", price: 100, weight: 40 },
  portion: { unit: "Dilim", quantity: 3 },
};
const gram = {
  id: 2,
  status: "Aktif",
  unitPricing: { unit: "Gram", price: 2, weight: 1 },
  portion: { unit: "Gram", quantity: 150 },
};
test("portions use product units and validate positive whole counted units", () => {
  assert.equal(validatePortion(slice.portion, slice.unitPricing), "");
  for (const portion of [
    { quantity: 0, unit: "Dilim" },
    { quantity: 1.5, unit: "Dilim" },
    { quantity: 3, unit: "Gram" },
    { quantity: "3", unit: "Dilim" },
    { quantity: Infinity, unit: "Dilim" },
    { quantity: 3, unit: "Dilim", forged: 1 },
  ])
    assert.ok(validatePortion(portion, slice.unitPricing));
  assert.equal(validatePortion(null, null), "");
  assert.equal(
    validatePortion({ quantity: 0.15, unit: "Kilogram" }, { unit: "Kilogram" }),
    "",
  );
});
test("portion counts handle slices, grams, kilos, mixed composition and missing data without rounding up", () => {
  const products = [
    slice,
    gram,
    {
      id: 3,
      unitPricing: { unit: "Kilogram", weight: 1000 },
      portion: { unit: "Kilogram", quantity: 0.15 },
    },
  ];
  assert.equal(
    variantPortionCount({ items: [{ productId: 1, quantity: 12 }] }, products),
    4,
  );
  assert.equal(
    variantPortionCount({ items: [{ productId: 2, quantity: 375 }] }, products),
    2.5,
  );
  assert.equal(
    variantPortionCount({ items: [{ productId: 3, quantity: 0.3 }] }, products),
    2,
  );
  assert.equal(
    variantPortionCount(
      {
        items: [
          { productId: 1, quantity: 3 },
          { productId: 2, quantity: 150 },
        ],
      },
      products,
    ),
    2,
  );
  assert.equal(variantPortionCount({ weight: 480 }, products, slice), 4);
  assert.equal(
    variantPortionCount({ items: [{ productId: 1 }] }, products),
    null,
  );
  assert.equal(variantPortionCount({ items: [] }, products), null);
  assert.equal(
    variantPortionCount({ items: [{ productId: 9, quantity: 3 }] }, products),
    null,
  );
  assert.equal(
    variantPortionCount(
      {
        items: [
          { productId: 1, quantity: 3 },
          { productId: 2, quantity: 1 },
        ],
      },
      [slice, { ...gram, portion: null }],
    ),
    null,
  );
  assert.equal(portionCountLabel(2.5), "≈ 2,5 kişilik");
  const variant = {
    items: [{ productId: 1, quantity: 12 }],
    packaging: "Tabakta servis",
    consumables: [],
    portionCount: 999,
  };
  assert.equal(calculateVariant(variant, [slice], []).portionCount, 4);
  assert.equal(variantCardData(slice, variant, [], [slice]).portionCount, 4);
  assert.equal(
    productCardData(
      { ...slice, variants: [variant] },
      [],
      "",
      undefined,
      undefined,
      [{ ...slice, variants: [variant] }],
    ).variants[0].portionCount,
    4,
  );
});
test("API persists portions, rejects invalid inputs, derives live counts and clears outdated units", async () => {
  const password = "Portion-test-only-1864";
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "portions@example.test",
      ADMIN_PASSWORD_HASH: await hashPassword(password),
    },
  });
  let cookie = "";
  async function call(path, method = "GET", body) {
    const r = await app.handle(
      new Request("https://portions.test/api" + path, {
        method,
        headers: {
          origin: "https://portions.test",
          cookie,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    if (r.headers.has("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, ...(await r.json()) };
  }
  try {
    await call("/login", "POST", { email: "portions@example.test", password });
    let catalog = (await call("/catalog")).catalog;
    const product = {
      name: "Baklava",
      category: "Baklavalar",
      status: "Aktif",
      unitPricing: slice.unitPricing,
      portion: slice.portion,
      variants: [],
    };
    const invalid = await call("/products", "POST", {
      expectedRevision: catalog.revision,
      product: { ...product, portion: { unit: "Dilim", quantity: -1 } },
    });
    assert.equal(invalid.status, 422);
    catalog = (
      await call("/products", "POST", {
        expectedRevision: catalog.revision,
        product,
      })
    ).catalog;
    let p = catalog.products[0];
    assert.deepEqual(p.portion, slice.portion);
    catalog = (
      await call("/products/" + p.id, "PUT", {
        expectedRevision: catalog.revision,
        product: {
          ...p,
          variants: [
            {
              size: "Porsiyon",
              typeId: "type-portion",
              items: [{ productId: p.id, quantity: 12 }],
              sourceProductId: p.id,
              quantity: 12,
              packaging: "Tabakta servis",
              consumables: [],
              portionCount: 999,
            },
          ],
        },
      })
    ).catalog;
    p = catalog.products[0];
    assert.equal(p.variants[0].portionCount, 4);
    catalog = (
      await call("/products/" + p.id, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...p, portion: { unit: "Dilim", quantity: 4 } },
      })
    ).catalog;
    p = catalog.products[0];
    assert.equal(p.variants[0].portionCount, 3);
    const card = await call("/product-pages/" + p.publicSlug);
    assert.equal(card.product.variants[0].portionCount, 3);
    assert.equal(card.product.portion.quantity, 4);
    const { portion, ...olderClient } = p;
    catalog = (
      await call("/products/" + p.id, "PUT", {
        expectedRevision: catalog.revision,
        product: olderClient,
      })
    ).catalog;
    assert.equal(catalog.products[0].portion.quantity, 4);
    catalog = (
      await call("/products/" + p.id, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...catalog.products[0], unitPricing: gram.unitPricing },
      })
    ).catalog;
    assert.equal(catalog.products[0].portion, null);
    assert.equal(catalog.products[0].variants[0].portionCount, null);
  } finally {
    await app.close();
  }
});
