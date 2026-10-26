import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateVariant,
  defaultConsumables,
} from "../src/variant-composition.js";
test("variant totals use product units and separate override; consumables never change net weight", () => {
  const products = [
    { id: 1, unitPricing: { unit: "Dilim", price: 32.35, weight: 42 } },
  ];
  const supplies = defaultConsumables();
  const v = {
    sourceProductId: 1,
    quantity: 3,
    packaging: "Tabakta servis",
    consumables: [{ id: supplies[0].id, quantity: 2 }],
    priceOverride: null,
  };
  const result = calculateVariant(v, products, supplies);
  assert.equal(result.price, 97.05);
  assert.equal(result.weight, 126);
  assert.equal(result.slices, 3);
  assert.equal(
    calculateVariant({ ...v, priceOverride: 100 }, products, supplies).price,
    100,
  );
  assert.throws(() =>
    calculateVariant({ ...v, quantity: 1.5 }, products, supplies),
  );
  assert.throws(() =>
    calculateVariant(
      { ...v, consumables: [{ id: "fake", quantity: 1 }] },
      products,
      supplies,
    ),
  );
});
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
test("API recalculates submitted variant price and weight and keeps composition", async () => {
  const password = "Variant-unit-test-1864";
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "variant@test.example",
      ADMIN_PASSWORD_HASH: await hashPassword(password),
    },
  });
  let cookie = "";
  const call = async (path, method = "GET", body) => {
    const r = await app.handle(
      new Request("https://test.example/api" + path, {
        method,
        headers: {
          origin: "https://test.example",
          cookie,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    if (r.headers.has("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, ...(await r.json()) };
  };
  try {
    await call("/login", "POST", { email: "variant@test.example", password });
    let catalog = (await call("/catalog")).catalog;
    catalog = (
      await call("/products", "POST", {
        expectedRevision: catalog.revision,
        product: {
          name: "Baklava",
          category: "Baklavalar",
          status: "Aktif",
          variants: [],
          unitPricing: { unit: "Dilim", price: 32.35, weight: 42 },
        },
      })
    ).catalog;
    const product = catalog.products[0];
    const saved = await call("/products/" + product.id, "PUT", {
      expectedRevision: catalog.revision,
      product: {
        ...product,
        variants: [
          {
            size: "Porsiyon",
            typeId: catalog.variantTypes[0].id,
            sourceProductId: product.id,
            quantity: 3,
            packaging: "Tabakta servis",
            images: [],
            consumables: [{ id: catalog.consumables[0].id, quantity: 2 }],
            priceOverride: 100,
            price: 1,
            weight: 1,
          },
        ],
      },
    });
    assert.equal(saved.status, 200);
    const v = saved.catalog.products[0].variants[0];
    assert.equal(v.price, 100);
    assert.equal(v.calculatedPrice, 97.05);
    assert.equal(v.weight, 126);
    assert.equal(v.consumables[0].quantity, 2);
  } finally {
    await app.close();
  }
});
