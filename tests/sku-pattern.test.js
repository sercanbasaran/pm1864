import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { openDatabase, migrate } from "../server/db.js";
import { seedCatalog } from "../server/catalog-service.js";
import { hashPassword } from "../server/security.js";
import { allocateProductCode, displaySku, upgradeSku } from "../src/sku.js";
import { productCardCode, productCardPath } from "../src/product-card.js";
const password = "SKU-pattern-test-1864",
  hash = await hashPassword(password);
const variant = (size) => ({
  size,
  typeId: "type-item",
  price: 100,
  weight: 500,
  slices: 0,
});
async function fixture() {
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "sku@example.test",
      ADMIN_PASSWORD_HASH: hash,
    },
  });
  let cookie = "";
  const call = async (path, method = "GET", body) => {
    const r = await app.handle(
      new Request("http://test.local/api" + path, {
        method,
        headers: {
          origin: "http://test.local",
          cookie,
          "content-type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    if (r.headers.has("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, ...(await r.json()) };
  };
  await call("/login", "POST", { email: "sku@example.test", password });
  const create = async (category = "Baklavalar") => {
    const c = (await call("/catalog")).catalog;
    return call("/products", "POST", {
      expectedRevision: c.revision,
      product: {
        name: "Test " + category,
        category,
        status: "Aktif",
        variants: [variant("S"), variant("M")],
      },
    });
  };
  return { app, call, create };
}
test("SKU schema has fixed widths and database-only prefix with separate product namespaces", async () => {
  const f = await fixture();
  try {
    let r = await f.create();
    assert.equal(r.status, 200);
    const first = r.catalog.products[0];
    assert.equal(first.productCode, "001");
    assert.equal(first.sku, "100.101001");
    assert.equal(first.variants[0].sku, "100.101001.01");
    assert.equal(first.variants[1].sku, "100.101001.02");
    r = await f.create();
    assert.equal(r.catalog.products[0].sku, "100.101002");
    r = await f.create("Lokumlar");
    assert.equal(r.catalog.products[0].sku, "200.201001");
    assert.equal(r.catalog.products[0].productCode, "001");
    const doc = JSON.parse(
      (await f.app.db.query("SELECT document FROM app_catalog WHERE id=1"))
        .rows[0].document,
    );
    assert.equal(
      doc.products.find((p) => p.id === first.id).sku,
      "HM100.101001",
    );
    assert.equal(
      doc.products.find((p) => p.id === first.id).variants[0].sku,
      "HM100.101001.01",
    );
    assert.equal(JSON.stringify(r.catalog.products).includes("HM100."), false);
    assert.equal(productCardPath(first), "/p/P000001");
    const enabled = await f.call("/products/" + first.id + "/card", "PATCH", {
      expectedRevision: r.catalog.revision,
      enabled: true,
    });
    assert.equal(enabled.status, 200);
    const card = await f.call("/public/products/P000001");
    assert.equal(card.status, 200);
    assert.equal(card.product.sku, "100.101001");
    assert.equal(card.product.variants[0].sku, "100.101001.01");
  } finally {
    await f.app.close();
  }
});
test("reorder, rename, category edit and variant deletion preserve identities and never recycle variant numbers", async () => {
  const f = await fixture();
  try {
    let r = await f.create();
    let p = r.catalog.products[0];
    const first = p.variants[0],
      second = p.variants[1];
    r = await f.call("/products/" + p.id, "PUT", {
      expectedRevision: r.catalog.revision,
      product: { ...p, name: "New name", variants: [second] },
    });
    p = r.catalog.products[0];
    r = await f.call("/products/" + p.id, "PUT", {
      expectedRevision: r.catalog.revision,
      product: { ...p, variants: [second, variant("L")] },
    });
    p = r.catalog.products[0];
    assert.equal(p.variants[0].sku, second.sku);
    assert.equal(p.variants[1].sku, "100.101001.03");
    assert.notEqual(p.variants[1].id, first.id);
    assert.equal(p.sku, "100.101001");
    assert.equal(productCardCode(p), "P000001");
    const c = r.catalog.categories.find((c) => c.id === p.categoryId);
    r = await f.call("/categories/" + c.id, "PUT", {
      expectedRevision: r.catalog.revision,
      category: { ...c, name: "New category name" },
    });
    assert.equal(r.catalog.products[0].sku, p.sku);
  } finally {
    await f.app.close();
  }
});
test("product and variant capacity limits reject atomically and stale writes do not reserve numbers", async () => {
  const f = await fixture();
  try {
    let r = await f.create();
    let doc = JSON.parse(
      (await f.app.db.query("SELECT document FROM app_catalog WHERE id=1"))
        .rows[0].document,
    );
    doc.nextProductNumbers["100.101"] = 1000;
    doc.products[0].nextVariantNumber = 100;
    await f.app.db.query("UPDATE app_catalog SET document=? WHERE id=1", [
      JSON.stringify(doc),
    ]);
    const before = await f.app.service.read();
    const failed = await f.create();
    assert.equal(failed.status, 422);
    assert.equal(failed.error.code, "SKU_RANGE_EXHAUSTED");
    assert.deepEqual(await f.app.service.read(), before);
    const p = before.products[0];
    r = await f.call("/products/" + p.id, "PUT", {
      expectedRevision: before.revision,
      product: { ...p, variants: [...p.variants, variant("L")] },
    });
    assert.equal(r.status, 422);
    assert.deepEqual(await f.app.service.read(), before);
    r = await f.call("/products", "POST", {
      expectedRevision: before.revision + 1,
      product: { name: "stale" },
    });
    assert.equal(r.status, 409);
  } finally {
    await f.app.close();
  }
});
test("legacy migration is atomic and idempotent, keeps QR routes and retains an internal code backup", async () => {
  const db = await openDatabase({ SQLITE_PATH: ":memory:" });
  try {
    const seed = seedCatalog();
    delete seed.skuSchemaVersion;
    delete seed.nextProductNumbers;
    seed.products = [
      {
        id: 7,
        category: "Baklavalar",
        name: "Legacy",
        status: "Aktif",
        productCode: "P000007",
        sku: "HM-100-0007",
        version: 9,
        variants: [
          {
            ...variant("S"),
            id: "stable",
            sku: "HM-100-0007-V0024",
            active: true,
          },
        ],
      },
    ];
    seed.nextProductId = 8;
    await db.query(
      "CREATE TABLE app_catalog (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL)",
    );
    await db.query("INSERT INTO app_catalog VALUES (1,0,?)", [
      JSON.stringify(seed),
    ]);
    await migrate(db, seed);
    const doc = JSON.parse(
      (await db.query("SELECT document FROM app_catalog WHERE id=1")).rows[0]
        .document,
    );
    const p = doc.products[0];
    assert.equal(p.id, 7);
    assert.equal(p.version, 9);
    assert.equal(p.sku, "HM100.101001");
    assert.equal(p.variants[0].id, "stable");
    assert.equal(p.variants[0].price, 100);
    assert.equal(p.variants[0].sku, "HM100.101001.01");
    assert.equal(productCardCode(p), "P000007");
    assert.equal(doc.skuMigrationBackup.products[0].sku, "HM-100-0007");
    const before = JSON.stringify(doc);
    assert.equal(upgradeSku(doc), false);
    assert.equal(JSON.stringify(doc), before);
    await migrate(db, seed);
    assert.equal(
      (await db.query("SELECT document FROM app_catalog WHERE id=1")).rows[0]
        .document,
      before,
    );
  } finally {
    await db.close();
  }
});
test("display formatter removes only the storage prefix; three digit category codes retain leading zeroes", () => {
  assert.equal(displaySku("HM001.002003.04"), "001.002003.04");
  assert.equal(displaySku("001.002003.04"), "001.002003.04");
  const doc = {
    categories: [
      { id: "r", code: "001" },
      { id: "c", code: "002", parentId: "r" },
    ],
    products: [],
  };
  assert.deepEqual(allocateProductCode(doc, doc.categories[1]), {
    productCode: "001",
    sku: "HM001.002001",
  });
});
