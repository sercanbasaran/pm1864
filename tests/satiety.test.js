import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import {
  hasSatiety,
  suggestedSatietyType,
  validateSatiety,
} from "../src/satiety.js";
import { duplicateProduct } from "../src/duplicate-product.js";

test("satiety stays optional and accepts only defined types and whole levels from 1 to 5", () => {
  for (const value of [undefined, null, { type: "walnut", level: null }]) {
    assert.equal(validateSatiety(value), "");
    assert.equal(hasSatiety(value), false);
  }
  for (const type of ["pistachio", "walnut", "general"])
    for (let level = 1; level <= 5; level++)
      assert.equal(hasSatiety({ type, level }), true);
  for (const value of [
    "3",
    [],
    {},
    { type: "other", level: 3 },
    ...[0, 6, 2.5, "3", false].map((level) => ({ type: "walnut", level })),
    { type: "walnut", level: 3, percent: 60 },
  ])
    assert.ok(validateSatiety(value));
  assert.equal(suggestedSatietyType({ name: "Fıstıklı Baklava" }), "pistachio");
  assert.equal(
    suggestedSatietyType({ name: "Baklava" }, "Cevizli Baklavalar"),
    "walnut",
  );
  assert.equal(suggestedSatietyType({ name: "Lokum" }), "general");
  const source = {
    name: "Baklava",
    variants: [],
    satiety: { type: "walnut", level: 4 },
  };
  const copy = duplicateProduct(source);
  copy.satiety.level = 1;
  assert.equal(source.satiety.level, 4);
});

test("API persists, preserves and clears satiety and exposes it on product pages", async () => {
  const password = "Satiety-test-only-1864";
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "satiety@example.test",
      ADMIN_PASSWORD_HASH: await hashPassword(password),
    },
  });
  let cookie = "";
  async function call(path, method = "GET", body) {
    const r = await app.handle(
      new Request("https://satiety.test/api" + path, {
        method,
        headers: {
          origin: "https://satiety.test",
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
    await call("/login", "POST", { email: "satiety@example.test", password });
    let catalog = (await call("/catalog")).catalog;
    const satiety = { type: "pistachio", level: 3 };
    catalog = (
      await call("/products", "POST", {
        expectedRevision: catalog.revision,
        product: {
          name: "Fıstıklı Baklava",
          category: "Baklavalar",
          status: "Aktif",
          variants: [],
          satiety,
        },
      })
    ).catalog;
    let product = catalog.products[0];
    assert.deepEqual(product.satiety, satiety);
    const path = "/products/" + product.id;
    const page = "/product-pages/" + product.publicSlug;
    assert.deepEqual((await call(page)).product.satiety, satiety);
    const { satiety: omitted, ...legacyClient } = product;
    catalog = (
      await call(path, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...legacyClient, description: "Güncellendi" },
      })
    ).catalog;
    assert.deepEqual(catalog.products[0].satiety, satiety);
    for (const level of [0, 6, 2.5, "4"]) {
      const invalid = await call(path, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...catalog.products[0], satiety: { type: "walnut", level } },
      });
      assert.equal(invalid.status, 422);
    }
    catalog = (
      await call(path, "PUT", {
        expectedRevision: catalog.revision,
        product: {
          ...catalog.products[0],
          satiety: { type: "walnut", level: 5 },
        },
      })
    ).catalog;
    assert.deepEqual((await call(page)).product.satiety, {
      type: "walnut",
      level: 5,
    });
    catalog = (
      await call(path, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...catalog.products[0], satiety: null },
      })
    ).catalog;
    assert.equal(catalog.products[0].satiety, null);
    assert.equal((await call(page)).product.satiety, null);
  } finally {
    await app.close();
  }
});
