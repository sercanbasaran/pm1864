import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
const password = "Product-gallery-test-1864",
  hash = await hashPassword(password);
const image =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6B9sAAAAASUVORK5CYII=";
test("product gallery persists, maintains its cover, protects media and gates pages and every image by publication", async () => {
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "product-page@example.test",
      ADMIN_PASSWORD_HASH: hash,
    },
  });
  let cookie = "";
  async function raw(path, method = "GET", body, anonymous = false) {
    const r = await app.handle(
      new Request("https://product.test/api" + path, {
        method,
        headers: {
          origin: "https://product.test",
          ...(!anonymous ? { cookie } : {}),
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    if (r.headers.has("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return r;
  }
  async function call(...args) {
    const r = await raw(...args);
    return { status: r.status, ...(await r.json()) };
  }
  try {
    await call("/login", "POST", {
      email: "product-page@example.test",
      password,
    });
    const a = (
      await call("/media", "POST", {
        name: "a.png",
        mimeType: "image/png",
        data: image,
      })
    ).asset;
    const b = (
      await call("/media", "POST", {
        name: "b.png",
        mimeType: "image/png",
        data: image,
      })
    ).asset;
    let catalog = (await call("/catalog")).catalog;
    const created = await call("/products", "POST", {
      expectedRevision: catalog.revision,
      product: {
        name: "Galeri ürünü",
        category: "Baklavalar",
        status: "Aktif",
        images: [a, b],
        variants: [
          {
            size: "S",
            typeId: "type-item",
            weight: 500,
            price: 100,
            slices: 0,
          },
        ],
      },
    });
    assert.equal(created.status, 200);
    catalog = created.catalog;
    let product = catalog.products[0];
    const path = "/product-pages/" + product.publicCardCode;
    assert.equal(product.mediaId, a.id);
    assert.equal(product.images.length, 2);
    assert.equal(product.publicCardEnabled, false);
    assert.equal((await call(path, "GET", undefined, true)).status, 401);
    assert.equal((await call(path)).product.images.length, 2);
    assert.equal(
      (await call("/media/" + b.id, "DELETE", { expectedVersion: 1 })).status,
      409,
    );
    catalog = (
      await call("/products/" + product.id + "/card", "PATCH", {
        expectedRevision: catalog.revision,
        enabled: true,
      })
    ).catalog;
    const published = await call(path, "GET", undefined, true);
    assert.equal(published.status, 200);
    assert.equal(published.product.images.length, 2);
    assert.equal("logs" in published.product, false);
    assert.equal("channels" in published.product, false);
    const imagePath = published.product.images[1].url.replace(/^\/api/, "");
    assert.equal((await raw(imagePath, "GET", undefined, true)).status, 200);
    assert.equal(
      (await raw(path + "/images/missing", "GET", undefined, true)).status,
      404,
    );
    product = catalog.products[0];
    let saved = await call("/products/" + product.id, "PUT", {
      expectedRevision: catalog.revision,
      product: { ...product, name: "Yeni ad" },
    });
    assert.equal(saved.status, 200);
    catalog = saved.catalog;
    product = catalog.products[0];
    assert.equal(product.images.length, 2);
    assert.equal(product.productCode, created.catalog.products[0].productCode);
    saved = await call("/products/" + product.id, "PUT", {
      expectedRevision: catalog.revision,
      product: { ...product, images: [b], mediaId: b.id },
    });
    assert.equal(saved.status, 200);
    catalog = saved.catalog;
    product = catalog.products[0];
    assert.equal(product.mediaId, b.id);
    assert.equal(product.images.length, 1);
    assert.equal(
      (await call("/media/" + a.id, "DELETE", { expectedVersion: 1 })).status,
      200,
    );
    catalog = (await call("/catalog")).catalog;
    assert.equal(
      (
        await call("/products/" + product.id, "PUT", {
          expectedRevision: catalog.revision,
          product: { ...product, images: [{ id: "missing" }] },
        })
      ).status,
      422,
    );
    catalog = (
      await call("/products/" + product.id + "/card", "PATCH", {
        expectedRevision: catalog.revision,
        enabled: false,
      })
    ).catalog;
    assert.equal((await raw(imagePath, "GET", undefined, true)).status, 401);
    assert.equal((await raw(imagePath)).status, 200);
    product = catalog.products[0];
    const external = await call("/products/" + product.id, "PUT", {
      expectedRevision: catalog.revision,
      product: {
        ...product,
        images: [],
        mediaId: "",
        customImage: "https://images.example.test/legacy.jpg",
      },
    });
    assert.equal(external.status, 200);
    catalog = external.catalog;
    product = catalog.products[0];
    const renamed = await call("/products/" + product.id, "PUT", {
      expectedRevision: catalog.revision,
      product: { ...product, name: "Harici görselli ürün" },
    });
    assert.equal(renamed.status, 200);
    assert.equal(
      renamed.catalog.products[0].customImage,
      "https://images.example.test/legacy.jpg",
    );
  } finally {
    await app.close();
  }
});
