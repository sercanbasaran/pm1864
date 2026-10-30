import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import {
  hasSatiety,
  validateSatiety,
  upgradeSatiety,
  defaultSatietyProducts,
  resolvedSatiety,
} from "../src/satiety.js";
import { duplicateProduct } from "../src/duplicate-product.js";

test("multiple independent levels require distinct known ingredients and whole levels", () => {
  const defs = defaultSatietyProducts();
  const entries = [
    { ingredientId: "pistachio", level: 4 },
    { ingredientId: "walnut", level: 2 },
  ];
  assert.equal(validateSatiety(entries, defs), "");
  assert.equal(hasSatiety(entries), true);
  for (const value of [undefined, null, []])
    assert.equal(hasSatiety(value), false);
  for (const value of [
    "3",
    {},
    [null],
    [{ ingredientId: "unknown", level: 3 }],
    [entries[0], entries[0]],
    ...[null, 0, 6, 2.5, "3"].map((level) => [
      { ingredientId: "walnut", level },
    ]),
  ])
    assert.ok(validateSatiety(value, defs));
  const source = { name: "Baklava", variants: [], satiety: entries };
  const copy = duplicateProduct(source);
  copy.satiety[0].level = 1;
  assert.equal(source.satiety[0].level, 4);
});
test("migration preserves existing single ratings, seeds only missing definitions and is idempotent", () => {
  const doc = {
    products: [
      { id: 1, satiety: { type: "pistachio", level: 3 } },
      { id: 2 },
      { id: 3, satiety: { type: "walnut", level: null } },
    ],
  };
  assert.equal(upgradeSatiety(doc), true);
  assert.deepEqual(doc.products[0].satiety, [
    { ingredientId: "pistachio", level: 3 },
  ]);
  assert.equal(doc.products[1].satiety, undefined);
  assert.deepEqual(doc.products[2].satiety, []);
  assert.deepEqual(
    doc.satietyProducts.map((d) => d.name),
    ["Fıstık", "Ceviz", "Muz", "Frambuaz", "Karışık Meyve"],
  );
  assert.equal(upgradeSatiety(doc), false);
  doc.satietyProducts[0].name = "Antep fıstığı";
  upgradeSatiety(doc);
  assert.equal(
    resolvedSatiety(doc.products[0].satiety, doc.satietyProducts)[0].name,
    "Antep fıstığı",
  );
});
test("API manages reusable definitions, multiple ratings, visibility, revisions and permissions", async () => {
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
    assert.deepEqual(
      catalog.satietyProducts.map((d) => d.name),
      ["Fıstık", "Ceviz", "Muz", "Frambuaz", "Karışık Meyve"],
    );
    const created = await call("/satiety-products", "POST", {
      expectedRevision: catalog.revision,
      name: "Çikolata",
      icon: "chocolate",
    });
    assert.equal(created.status, 200);
    catalog = created.catalog;
    const chocolate = catalog.satietyProducts.at(-1);
    assert.equal(
      (
        await call("/satiety-products", "POST", {
          expectedRevision: catalog.revision,
          name: " Çikolata ",
          icon: "chocolate",
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await call("/satiety-products", "POST", {
          expectedRevision: catalog.revision - 1,
          name: "Çilek",
          icon: "strawberry",
        })
      ).status,
      409,
    );
    const entries = [
      { ingredientId: "pistachio", level: 4 },
      { ingredientId: chocolate.id, level: 2 },
    ];
    catalog = (
      await call("/products", "POST", {
        expectedRevision: catalog.revision,
        product: {
          name: "Fıstıklı Çikolatalı Baklava",
          category: "Baklavalar",
          status: "Aktif",
          variants: [],
          satiety: entries,
        },
      })
    ).catalog;
    const product = catalog.products[0],
      path = "/products/" + product.id,
      page = "/product-pages/" + product.publicSlug;
    assert.deepEqual(product.satiety, entries);
    assert.deepEqual(
      (await call(page)).product.satiety.map((e) => [e.name, e.level]),
      [
        ["Fıstık", 4],
        ["Çikolata", 2],
      ],
    );
    catalog = (
      await call("/satiety-products/" + chocolate.id, "PUT", {
        expectedRevision: catalog.revision,
        name: "Bitter çikolata",
        icon: "chocolate",
        active: false,
      })
    ).catalog;
    assert.equal((await call(page)).product.satiety[1].name, "Bitter çikolata");
    const { satiety, ...legacyClient } = catalog.products[0];
    catalog = (
      await call(path, "PUT", {
        expectedRevision: catalog.revision,
        product: legacyClient,
      })
    ).catalog;
    assert.deepEqual(catalog.products[0].satiety, entries);
    for (const invalid of [
      [entries[0], entries[0]],
      [{ ingredientId: "unknown", level: 1 }],
      [{ ingredientId: "walnut", level: 6 }],
    ])
      assert.equal(
        (
          await call(path, "PUT", {
            expectedRevision: catalog.revision,
            product: { ...catalog.products[0], satiety: invalid },
          })
        ).status,
        422,
      );
    assert.equal(
      (
        await call("/products", "POST", {
          expectedRevision: catalog.revision,
          product: { ...product, name: "Başka ürün", satiety: [entries[1]] },
        })
      ).status,
      422,
    );
    catalog = (
      await call(path, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...catalog.products[0], satiety: [] },
      })
    ).catalog;
    assert.deepEqual((await call(page)).product.satiety, []);
    await app.db.query("UPDATE app_users SET role='editor'");
    assert.equal(
      (
        await call("/satiety-products", "POST", {
          expectedRevision: catalog.revision,
          name: "Vişne",
          icon: "cherry",
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});

test("fruit definitions upgrade existing catalogs without duplicates or changing ratings", () => {
  const custom = {
    id: "custom-banana",
    name: "Muz",
    icon: "general",
    active: false,
  };
  const doc = {
    products: [{ satiety: [{ ingredientId: "custom-banana", level: 4 }] }],
    satietyProducts: [custom],
  };
  assert.equal(upgradeSatiety(doc), true);
  assert.equal(doc.satietyProducts.length, 3);
  assert.deepEqual(doc.satietyProducts[0], custom);
  assert.equal(upgradeSatiety(doc), false);
  assert.equal(
    validateSatiety(doc.products[0].satiety, doc.satietyProducts),
    "",
  );
  for (const id of ["banana", "raspberry", "mixed-fruit"]) {
    assert.equal(
      validateSatiety(
        [{ ingredientId: id, level: 5 }],
        defaultSatietyProducts(),
      ),
      "",
    );
  }
});
