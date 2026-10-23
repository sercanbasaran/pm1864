import test from "node:test";
import assert from "node:assert/strict";
import { upgradeProductIdentity } from "../src/product-identity.js";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
test("product identity migration changes only product codes and named links, keeps SKU and legacy QR identity, and runs once", () => {
  const doc = {
    products: [
      {
        id: 1,
        name: "Fıstıklı Baklava",
        productCode: "001",
        sku: "HM0100.101001",
        publicCardCode: "P000001",
        variants: [{ sku: "HM0100.101001.01" }],
      },
    ],
  };
  assert.equal(upgradeProductIdentity(doc), true);
  assert.equal(doc.products[0].productCode, "0100101001");
  assert.equal(doc.products[0].sku, "HM0100.101001");
  assert.equal(doc.products[0].variants[0].sku, "HM0100.101001.01");
  assert.equal(doc.products[0].publicSlug, "fistikli-baklava-0100101001");
  assert.equal(doc.productIdentityBackup[0].productCode, "001");
  assert.equal(doc.products[0].publicCardCode, "P000001");
  assert.equal(upgradeProductIdentity(doc), false);
  const invalid = { products: [{ id: 1, productCode: "001", sku: "bad" }] },
    before = structuredClone(invalid);
  assert.throws(() => upgradeProductIdentity(invalid));
  assert.deepEqual(invalid, before);
});
test("products can be created and published without variants; named and legacy links survive rename", async () => {
  const password = "Optional-product-test-1864",
    app = await createApp({
      env: {
        SQLITE_PATH: ":memory:",
        ADMIN_EMAIL: "optional@example.test",
        ADMIN_PASSWORD_HASH: await hashPassword(password),
      },
    });
  let cookie = "";
  async function call(path, method = "GET", body, anonymous = false) {
    const r = await app.handle(
      new Request("https://optional.test/api" + path, {
        method,
        headers: {
          origin: "https://optional.test",
          ...(!anonymous ? { cookie } : {}),
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
    await call("/login", "POST", { email: "optional@example.test", password });
    let created = await call("/products", "POST", {
      expectedRevision: 0,
      product: {
        name: "Fıstıklı Baklava",
        category: "Baklavalar",
        status: "Aktif",
        variants: [],
      },
    });
    assert.equal(created.status, 200);
    let catalog = created.catalog,
      p = catalog.products[0];
    assert.equal(p.productCode, "0100000001");
    const slug = p.publicSlug,
      code = p.publicCardCode;
    catalog = (
      await call("/products/" + p.id + "/card", "PATCH", {
        expectedRevision: catalog.revision,
        enabled: true,
      })
    ).catalog;
    assert.equal(
      (await call("/product-pages/" + slug, "GET", undefined, true)).status,
      200,
    );
    assert.equal(
      (await call("/public/products/" + code, "GET", undefined, true)).status,
      200,
    );
    catalog = (
      await call("/products/" + p.id, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...catalog.products[0], name: "Yeni isim" },
      })
    ).catalog;
    p = catalog.products[0];
    assert.notEqual(p.publicSlug, slug);
    assert.equal(
      (await call("/product-pages/" + slug, "GET", undefined, true)).product
        .name,
      "Yeni isim",
    );
    assert.equal(
      (await call("/product-pages/" + p.publicSlug, "GET", undefined, true))
        .status,
      200,
    );
    assert.equal(p.productCode, "0100000001");
  } finally {
    await app.close();
  }
});
