import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import {
  upgradePackagingMethods,
  defaultPackagingMethods,
  resolvePackagingMethod,
} from "../src/modules/packaging/packaging-methods.js";
import { calculateVariant } from "../src/variant-composition.js";
test("method migration preserves old labels and calculations use centrally defined options", () => {
  const doc = { products: [{ variants: [{ packaging: "Eski servis" }] }] };
  assert.equal(upgradePackagingMethods(doc), true);
  assert.equal(upgradePackagingMethods(doc), false);
  assert.equal(doc.packagingMethods.length, 4);
  const methods = defaultPackagingMethods();
  methods[2].name = "Tabakta Sunum";
  assert.equal(
    resolvePackagingMethod("Tabakta servis", methods).name,
    "Tabakta Sunum",
  );
  const v = {
    sourceProductId: 1,
    quantity: 1,
    packaging: "Tabakta servis",
    consumables: [],
  };
  assert.equal(
    calculateVariant(
      v,
      [{ id: 1, unitPricing: { unit: "Adet", price: 100, weight: 40 } }],
      [],
      methods,
    ).packaging,
    "Tabakta Sunum",
  );
});
test("method CRUD validates definitions, renames linked variants and protects used or built-in records", async () => {
  const password = "Packaging-method-test-1864",
    app = await createApp({
      env: {
        SQLITE_PATH: ":memory:",
        ADMIN_EMAIL: "methods@example.test",
        ADMIN_PASSWORD_HASH: await hashPassword(password),
      },
    });
  let cookie = "";
  async function call(path, method = "GET", body) {
    const r = await app.handle(
      new Request("https://methods.test/api" + path, {
        method,
        headers: {
          origin: "https://methods.test",
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
    await call("/login", "POST", { email: "methods@example.test", password });
    let catalog = (await call("/catalog")).catalog;
    let r = await call("/packaging-methods", "POST", {
      expectedRevision: catalog.revision,
      name: "Kağıt paket",
      active: true,
    });
    assert.equal(r.status, 200);
    catalog = r.catalog;
    const id = catalog.packagingMethods.at(-1).id;
    assert.equal(
      (
        await call("/packaging-methods", "POST", {
          expectedRevision: catalog.revision,
          name: "kağıt paket",
        })
      ).status,
      422,
    );
    catalog = (
      await call("/products", "POST", {
        expectedRevision: catalog.revision,
        product: {
          name: "Baklava",
          category: "Baklavalar",
          status: "Aktif",
          unitPricing: { unit: "Dilim", price: 100, weight: 40 },
          variants: [],
        },
      })
    ).catalog;
    let product = catalog.products[0];
    catalog = (
      await call("/products/" + product.id, "PUT", {
        expectedRevision: catalog.revision,
        product: {
          ...product,
          variants: [
            {
              size: "Paket",
              typeId: "type-item",
              sourceProductId: product.id,
              quantity: 3,
              packaging: "Kağıt paket",
              consumables: [],
              images: [],
            },
          ],
        },
      })
    ).catalog;
    assert.equal(catalog.products[0].variants[0].packaging, "Kağıt paket");
    catalog = (
      await call("/packaging-methods/" + id, "PUT", {
        expectedRevision: catalog.revision,
        name: "Servis paketi",
        active: true,
      })
    ).catalog;
    assert.equal(catalog.products[0].variants[0].packaging, "Servis paketi");
    assert.equal(
      (
        await call("/packaging-methods/" + id, "DELETE", {
          expectedRevision: catalog.revision,
        })
      ).status,
      409,
    );
    catalog = (
      await call("/packaging-methods/" + id, "PUT", {
        expectedRevision: catalog.revision,
        name: "Servis paketi",
        active: false,
      })
    ).catalog;
    product = catalog.products[0];
    const variant = product.variants[0];
    assert.equal(
      (
        await call("/products/" + product.id, "PUT", {
          expectedRevision: catalog.revision,
          product,
        })
      ).status,
      200,
    );
    catalog = (await call("/catalog")).catalog;
    assert.equal(
      (
        await call("/products/" + product.id, "PUT", {
          expectedRevision: catalog.revision,
          product: {
            ...product,
            variants: [
              variant,
              { ...variant, id: undefined, size: "Yeni paket" },
            ],
          },
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await call("/packaging-methods/method-plated", "DELETE", {
          expectedRevision: catalog.revision,
        })
      ).status,
      409,
    );
    catalog = (
      await call("/products/" + product.id, "PUT", {
        expectedRevision: catalog.revision,
        product: { ...product, variants: [] },
      })
    ).catalog;
    catalog = (
      await call("/packaging-methods/" + id, "DELETE", {
        expectedRevision: catalog.revision,
      })
    ).catalog;
    assert.equal(
      catalog.packagingMethods.some((m) => m.id === id),
      false,
    );
    await app.db.query("UPDATE app_users SET role='viewer'");
    assert.equal(
      (
        await call("/packaging-methods", "POST", {
          expectedRevision: catalog.revision,
          name: "Yetkisiz",
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});
