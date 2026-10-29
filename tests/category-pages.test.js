import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
const password = "Category-page-test-1864",
  hash = await hashPassword(password);
const image =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4v4/rPwgzwBgAZVILGYGCVCcAAAAASUVORK5CYII=";
test("category pages default to private, allow authenticated catalog users, publish only safe fields and revoke image access", async () => {
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "categories@example.test",
      ADMIN_PASSWORD_HASH: hash,
    },
  });
  let cookie = "";
  async function raw(path, method = "GET", body, anonymous = false) {
    const r = await app.handle(
      new Request("https://category.test/api" + path, {
        method,
        headers: {
          origin: "https://category.test",
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
      email: "categories@example.test",
      password,
    });
    let catalog = (await call("/catalog")).catalog;
    let category = catalog.categories[0];
    const save = async (changes) => {
      const r = await call("/categories/" + category.id, "PUT", {
        expectedRevision: catalog.revision,
        category: { ...category, ...changes },
      });
      if (r.catalog) {
        catalog = r.catalog;
        category = catalog.categories.find((c) => c.id === category.id);
      }
      return r;
    };
    assert.equal(
      (await save({ description: "Kategori açıklaması" })).status,
      200,
    );
    assert.equal(category.visibility, "private");
    const path = "/category-pages/" + category.slug;
    assert.equal((await call(path, "GET", undefined, true)).status, 401);
    assert.equal((await call(path)).status, 200);
    const uploaded = await call("/media", "POST", {
      name: "category.png",
      mimeType: "image/png",
      data: image,
    });
    catalog = (await call("/catalog")).catalog;
    const created = await call("/products", "POST", {
      expectedRevision: catalog.revision,
      product: {
        name: "Kategori ürünü",
        categoryId: category.id,
        status: "Aktif",
        variants: [
          {
            size: "S",
            typeId: "type-item",
            price: 100,
            weight: 500,
            unit: "Kutu",
          },
        ],
      },
    });
    assert.equal(created.status, 200);
    catalog = created.catalog;
    assert.equal(
      (
        await save({
          images: [{ id: uploaded.asset.id }],
          visibility: "public",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call("/media/" + uploaded.asset.id, "DELETE", {
          expectedVersion: 1,
        })
      ).status,
      409,
    );
    const page = await call(path, "GET", undefined, true);
    assert.equal(page.status, 200);
    assert.equal(page.category.products.length, 1);
    assert.equal(page.category.products[0].name, "Kategori ürünü");
    assert.equal("channels" in page.category.products[0], false);
    assert.equal("logs" in page.category, false);
    assert.deepEqual(
      Object.keys(page.category).sort(),
      ["name", "description", "images", "products"].sort(),
    );
    const imagePath = page.category.images[0].url.replace(/^\/api/, "");
    assert.equal((await raw(imagePath, "GET", undefined, true)).status, 200);
    assert.equal(
      (await raw(path + "/images/unrelated-id", "GET", undefined, true)).status,
      404,
    );
    assert.equal((await save({ visibility: "private" })).status, 200);
    assert.equal((await raw(imagePath, "GET", undefined, true)).status, 401);
    assert.equal((await raw(imagePath)).status, 200);
    assert.equal((await save({ visibility: "invalid" })).status, 422);
    assert.equal((await save({ images: [{ id: "missing" }] })).status, 422);
    assert.equal(
      (await save({ active: false, visibility: "public" })).status,
      200,
    );
    assert.equal((await call(path, "GET", undefined, true)).status, 404);
  } finally {
    await app.close();
  }
});
