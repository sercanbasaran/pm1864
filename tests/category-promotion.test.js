import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { categoryPromotion } from "../src/modules/categories/category-promotion.js";
import { nextCategoryCode } from "../src/catalog.js";

const password = "Promote-test-only-1864",
  hash = await hashPassword(password);
async function fixture() {
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "promote@example.test",
      ADMIN_PASSWORD_HASH: hash,
    },
  });
  let cookie = "";
  async function call(path, method = "GET", body) {
    const response = await app.handle(
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
    if (response.headers.has("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, ...(await response.json()) };
  }
  await call("/login", "POST", { email: "promote@example.test", password });
  let catalog = (await call("/catalog")).catalog;
  const root = catalog.categories[0];
  catalog = (
    await call("/categories", "POST", {
      expectedRevision: catalog.revision,
      category: {
        name: "Özel Fıstıklı",
        code: "101",
        slug: "ozel-fistikli",
        parentId: root.id,
        active: true,
        visibility: "public",
      },
    })
  ).catalog;
  const child = catalog.categories.at(-1);
  return { app, call, root, child, catalog };
}
test("promotion is atomic, preserves identity/products/counters/URLs and allocates future products under new code", async () => {
  const f = await fixture();
  try {
    let c = (
      await f.call("/products", "POST", {
        expectedRevision: f.catalog.revision,
        product: {
          name: "Kare",
          categoryId: f.child.id,
          status: "Aktif",
          salesAvailability: { store: true, online: true, foodDelivery: true },
          variants: [
            {
              size: "S",
              typeId: "type-item",
              price: 100,
              weight: 500,
              slices: 12,
            },
          ],
        },
      })
    ).catalog;
    c = (
      await f.call("/categories/" + f.root.id, "PUT", {
        expectedRevision: c.revision,
        category: {
          ...f.root,
          salesAvailability: { store: true, online: false, foodDelivery: true },
        },
      })
    ).catalog;
    const old = structuredClone(c),
      code = nextCategoryCode(c.categories);
    const counters = JSON.parse(
      (await f.app.db.query("SELECT document FROM app_catalog WHERE id=1"))
        .rows[0].document,
    ).nextProductNumbers;
    const result = await f.call(
      "/categories/" + f.child.id + "/promote",
      "POST",
      { expectedRevision: c.revision, previewRevision: c.revision, code },
    );
    assert.equal(result.status, 200);
    c = result.catalog;
    const promoted = c.categories.find((x) => x.id === f.child.id);
    assert.equal(promoted.parentId, "");
    assert.equal(promoted.code, code);
    assert.equal(promoted.slug, f.child.slug);
    assert.equal(promoted.visibility, "public");
    assert.deepEqual(promoted.effectiveSales, {
      store: true,
      online: false,
      foodDelivery: true,
    });
    assert.deepEqual(c.products, old.products);
    assert.equal(c.revision, old.revision + 1);
    const raw = JSON.parse(
      (await f.app.db.query("SELECT document FROM app_catalog WHERE id=1"))
        .rows[0].document,
    );
    assert.deepEqual(raw.nextProductNumbers, counters);
    assert.ok(JSON.stringify(c.logs).includes("Ana kategoriye dönüştürüldü"));
    const next = await f.call("/products", "POST", {
      expectedRevision: c.revision,
      product: {
        name: "Yeni Kare",
        categoryId: f.child.id,
        status: "Aktif",
        variants: [],
      },
    });
    assert.equal(next.status, 200);
    assert.equal(next.catalog.products[0].productCode, code + "000001");
    assert.equal(
      next.catalog.products.find((p) => p.id === old.products[0].id).publicSlug,
      old.products[0].publicSlug,
    );
  } finally {
    await f.app.close();
  }
});
test("stale preview, forged code, normal type edit, repeated promotion and duplicate root name cannot corrupt records", async () => {
  const f = await fixture();
  try {
    let c = f.catalog;
    const code = nextCategoryCode(c.categories),
      path = "/categories/" + f.child.id + "/promote";
    for (const body of [
      {
        expectedRevision: c.revision - 1,
        previewRevision: c.revision - 1,
        code,
      },
      { expectedRevision: c.revision, previewRevision: c.revision - 1, code },
      {
        expectedRevision: c.revision,
        previewRevision: c.revision,
        code: "9900",
      },
    ])
      assert.equal((await f.call(path, "POST", body)).status, 409);
    assert.equal(
      (
        await f.call("/categories/" + f.child.id, "PUT", {
          expectedRevision: c.revision,
          category: { ...f.child, parentId: "", code },
        })
      ).status,
      422,
    );
    assert.deepEqual((await f.call("/catalog")).catalog, c);
    c = (
      await f.call("/categories", "POST", {
        expectedRevision: c.revision,
        category: {
          name: f.child.name,
          code,
          slug: "another-root",
          active: true,
        },
      })
    ).catalog;
    assert.equal(
      (
        await f.call(path, "POST", {
          expectedRevision: c.revision,
          previewRevision: c.revision,
          code: nextCategoryCode(c.categories),
        })
      ).status,
      422,
    );
    assert.deepEqual((await f.call("/catalog")).catalog, c);
    assert.equal(
      (
        await f.call("/categories/" + f.root.id + "/promote", "POST", {
          expectedRevision: c.revision,
          previewRevision: c.revision,
          code: nextCategoryCode(c.categories),
        })
      ).status,
      422,
    );
  } finally {
    await f.app.close();
  }
});
test("promotion requires category write permission", async () => {
  const f = await fixture();
  try {
    await f.app.db.query("UPDATE app_users SET role='viewer' WHERE email=?", [
      "promote@example.test",
    ]);
    const c = f.catalog;
    assert.equal(
      (
        await f.call("/categories/" + f.child.id + "/promote", "POST", {
          expectedRevision: c.revision,
          previewRevision: c.revision,
          code: nextCategoryCode(c.categories),
        })
      ).status,
      403,
    );
    assert.deepEqual((await f.call("/catalog")).catalog, c);
  } finally {
    await f.app.close();
  }
});
test("preview preserves inherited inactivity and rejects exhausted code range", () => {
  const root = {
    id: "root",
    name: "Root",
    code: "0100",
    slug: "root",
    active: false,
  };
  const child = {
    id: "child",
    name: "Child",
    code: "101",
    slug: "child",
    active: true,
    parentId: "root",
  };
  const plan = categoryPromotion(child, [root, child]);
  assert.equal(plan.category.active, false);
  assert.deepEqual(plan.channels, {
    store: false,
    online: false,
    foodDelivery: false,
  });
  const roots = Array.from({ length: 99 }, (_, i) => ({
    ...root,
    id: "r" + i,
    code: String((i + 1) * 100).padStart(4, "0"),
  }));
  assert.throws(
    () => categoryPromotion({ ...child, parentId: "r0" }, [...roots, child]),
    /kod/,
  );
});
