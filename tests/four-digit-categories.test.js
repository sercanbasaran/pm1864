import test from "node:test";
import assert from "node:assert/strict";
import {
  nextCategoryCode,
  nextSubcategoryCode,
  validateCategory,
} from "../src/catalog.js";
import { upgradeSku, displaySku } from "../src/sku.js";
import { openDatabase, migrate } from "../server/db.js";
import {
  seedCatalog,
  createCatalogService,
} from "../server/catalog-service.js";
import { createApp } from "../server/app.js";

const variant = {
  size: "S",
  typeId: "type-item",
  price: 100,
  weight: 500,
  slices: 0,
  active: true,
};
test("main codes continue through 1000, 1100, 1200; roots and children retain distinct widths", () => {
  const categories = Array.from({ length: 9 }, (_, i) => ({
    id: String(i),
    name: "Root " + i,
    code: String((i + 1) * 100).padStart(4, "0"),
    slug: "root-" + i,
  }));
  assert.equal(nextCategoryCode(categories), "1000");
  categories.push({ id: "r", name: "Root", code: "1000", slug: "root" });
  assert.equal(nextCategoryCode(categories), "1100");
  categories.push({ id: "r2", name: "Root2", code: "1100", slug: "root2" });
  assert.equal(nextCategoryCode(categories), "1200");
  assert.equal(nextSubcategoryCode(categories, "r"), "001");
  categories.push({
    id: "c",
    name: "Child",
    slug: "child",
    code: "001",
    parentId: "r",
  });
  assert.equal(nextSubcategoryCode(categories, "r"), "002");
  assert.equal(nextSubcategoryCode(categories, "r2"), "101");
  const draft = { id: "new", name: "New", code: "1200", slug: "new" };
  assert.equal(validateCategory(draft, categories), "");
  assert.match(validateCategory({ ...draft, code: "900" }, categories), /dört/);
  assert.match(
    validateCategory({ ...draft, parentId: "r", code: "1200" }, categories),
    /üç/,
  );
  assert.equal(
    nextCategoryCode(
      Array.from({ length: 99 }, (_, i) => ({
        code: String((i + 1) * 100).padStart(4, "0"),
      })),
    ),
    "",
  );
});

function oldCatalog() {
  const doc = seedCatalog();
  doc.schemaVersion = 2;
  doc.skuSchemaVersion = 1;
  doc.categories.forEach((c) => (c.code = c.code.slice(1)));
  doc.products = [
    {
      id: 1,
      name: "Existing",
      categoryId: "cat-100",
      category: "Baklavalar",
      status: "Aktif",
      version: 4,
      productCode: "007",
      publicCardCode: "P000001",
      publicCardEnabled: true,
      sku: "HM100.000007",
      nextVariantNumber: 27,
      variants: [{ ...variant, id: "v24", sku: "HM100.000007.24" }],
    },
    {
      id: 2,
      name: "Moved",
      categoryId: "cat-200",
      category: "Lokumlar",
      status: "Aktif",
      version: 8,
      productCode: "005",
      publicCardCode: "P000002",
      sku: "HM100.101005",
      nextVariantNumber: 2,
      variants: [{ ...variant, id: "v1", sku: "HM100.101005.01" }],
    },
  ];
  doc.nextProductId = 3;
  doc.nextProductNumbers = {
    "100.000": 19,
    "0100.000": 17,
    100.101: 6,
    200.201: 1000,
  };
  doc.skuMigrationBackup = { original: "retained" };
  return doc;
}
test("version 1 migration only pads root segments, preserves deleted-number reservations and QR routes, and runs once", async () => {
  const db = await openDatabase({ SQLITE_PATH: ":memory:" });
  try {
    await migrate(db, seedCatalog());
    const old = oldCatalog();
    await db.query("UPDATE app_catalog SET document=?,revision=6 WHERE id=1", [
      JSON.stringify(old),
    ]);
    await migrate(db, seedCatalog());
    const row = (
      await db.query("SELECT document,revision FROM app_catalog WHERE id=1")
    ).rows[0];
    const doc = JSON.parse(row.document);
    assert.equal(row.revision, 7);
    assert.equal(doc.skuSchemaVersion, 2);
    assert.equal(doc.categories[0].code, "0100");
    assert.equal(doc.products[0].sku, "HM0100.000007");
    assert.equal(doc.products[0].variants[0].sku, "HM0100.000007.24");
    assert.equal(doc.products[0].nextVariantNumber, 27);
    assert.equal(doc.products[0].version, 4);
    assert.equal(doc.products[1].sku, "HM0100.101005");
    assert.equal(doc.products[1].categoryId, "cat-200");
    assert.deepEqual(doc.skuMigrationBackup, old.skuMigrationBackup);
    assert.equal(doc.skuWidthMigrationBackup.products[0].sku, "HM100.000007");
    assert.deepEqual(doc.nextProductNumbers, {
      "0100.000": 19,
      "0100.101": 6,
      "0200.201": 1000,
    });
    await migrate(db, seedCatalog());
    assert.deepEqual(
      (await db.query("SELECT document,revision FROM app_catalog WHERE id=1"))
        .rows[0],
      row,
    );
    const app = await createApp({ env: {}, database: db });
    const response = await app.handle(
      new Request("http://test.local/api/public/products/P000001"),
    );
    assert.equal(response.status, 200);
    const card = await response.json();
    assert.equal(card.product.sku, "0100.000007");
    const service = createCatalogService(db);
    let catalog = await service.saveProduct(
      {
        expectedRevision: 7,
        product: {
          name: "New",
          categoryId: "cat-100",
          status: "Aktif",
          variants: [variant],
        },
      },
      null,
      "test",
    );
    assert.equal(catalog.products[0].sku, "0100.000019");
    const p = catalog.products.find((p) => p.id === 1);
    catalog = await service.saveProduct(
      {
        expectedRevision: catalog.revision,
        product: { ...p, variants: [...p.variants, { ...variant, size: "M" }] },
      },
      p.id,
      "test",
    );
    assert.equal(
      catalog.products.find((p) => p.id === 1).variants[1].sku,
      "0100.000007.27",
    );
    assert.equal(
      JSON.stringify(catalog).includes("skuWidthMigrationBackup"),
      false,
    );
  } finally {
    await db.close();
  }
});
test("invalid width migration rolls back both database and caller document", async () => {
  const db = await openDatabase({ SQLITE_PATH: ":memory:" });
  try {
    await migrate(db, seedCatalog());
    const doc = oldCatalog();
    doc.products[0].variants[0].sku = "invalid";
    const before = JSON.stringify(doc);
    assert.throws(() => upgradeSku(doc), /varyant/);
    assert.equal(JSON.stringify(doc), before);
    await db.query("UPDATE app_catalog SET document=?,revision=9 WHERE id=1", [
      before,
    ]);
    await assert.rejects(migrate(db, seedCatalog()), /varyant/);
    const row = (
      await db.query("SELECT document,revision FROM app_catalog WHERE id=1")
    ).rows[0];
    assert.equal(row.revision, 9);
    assert.equal(row.document, before);
  } finally {
    await db.close();
  }
});
test("four-digit categories issue independent SKUs and reject invalid category widths", async () => {
  const app = await createApp({ env: { SQLITE_PATH: ":memory:" } });
  try {
    const service = app.service;
    let c = await service.saveCategory(
      {
        expectedRevision: 0,
        category: {
          name: "Root1000",
          code: "1000",
          slug: "root1000",
          active: true,
        },
      },
      null,
      "test",
    );
    const root = c.categories.at(-1);
    c = await service.saveCategory(
      {
        expectedRevision: c.revision,
        category: {
          name: "Child",
          code: "001",
          slug: "child",
          parentId: root.id,
          active: true,
        },
      },
      null,
      "test",
    );
    const child = c.categories.at(-1);
    for (const [categoryId, expected] of [
      [root.id, "1000.000001.01"],
      [child.id, "1000.001001.01"],
      [root.id, "1000.000002.01"],
    ]) {
      c = await service.saveProduct(
        {
          expectedRevision: c.revision,
          product: {
            name: "New",
            categoryId,
            status: "Aktif",
            variants: [variant],
          },
        },
        null,
        "test",
      );
      assert.equal(c.products[0].variants[0].sku, expected);
    }
    await assert.rejects(
      service.saveCategory(
        {
          expectedRevision: c.revision,
          category: { name: "Invalid", code: "900", slug: "invalid" },
        },
        null,
        "test",
      ),
      (e) => e.status === 422,
    );
    await assert.rejects(
      service.saveCategory(
        { expectedRevision: c.revision, category: { ...child, parentId: "" } },
        child.id,
        "test",
      ),
      (e) => e.status === 422,
    );
    assert.equal(displaySku("HM0100.101001.01"), "0100.101001.01");
  } finally {
    await app.close();
  }
});
