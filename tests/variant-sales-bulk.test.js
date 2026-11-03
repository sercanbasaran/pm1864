import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { effectiveSales } from "../src/sales-availability.js";
const all = { store: true, online: true, foodDelivery: true };
const none = { store: false, online: false, foodDelivery: false };
const password = "Variant-bulk-test-1864";
const hash = await hashPassword(password);
async function fixture() {
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "bulk@test.example",
      ADMIN_PASSWORD_HASH: hash,
    },
  });
  let cookie = "";
  const call = async (path, method = "GET", body) => {
    const r = await app.handle(
      new Request("https://test.local/api" + path, {
        method,
        headers: {
          origin: "https://test.local",
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
  await call("/login", "POST", { email: "bulk@test.example", password });
  let c = (await call("/catalog")).catalog;
  for (const name of ["Birinci", "İkinci"]) {
    const saved = await call("/products", "POST", {
      expectedRevision: c.revision,
      product: {
        name,
        category: "Baklavalar",
        status: "Aktif",
        variants: [
          {
            size: "Küçük",
            typeId: "type-item",
            price: 100,
            weight: 100,
            active: true,
            salesAvailability: all,
          },
          {
            size: "Büyük",
            typeId: "type-item",
            price: 200,
            weight: 200,
            active: false,
            salesAvailability: { ...all, online: false },
          },
        ],
      },
    });
    assert.equal(saved.status, 200);
    c = saved.catalog;
  }
  return {
    app,
    call,
    c,
    bulk: (catalog, ids, changes) =>
      call("/variants/bulk", "POST", {
        expectedRevision: catalog.revision,
        ids,
        changes,
      }),
  };
}
test("variant sales depend only on variant channels and activity, ignoring draft products and inactive categories", () => {
  const p = { status: "Taslak", salesAvailability: none, categoryId: "a" };
  const categories = [{ id: "a", active: false, salesAvailability: none }];
  assert.deepEqual(
    effectiveSales(p, { active: true, salesAvailability: all }, categories),
    all,
  );
  assert.deepEqual(
    effectiveSales(p, { active: false, salesAvailability: all }, categories),
    none,
  );
  assert.deepEqual(
    effectiveSales(p, { salesAvailability: { online: false } }, categories),
    { ...all, online: false },
  );
});
test("bulk updates selected variants across products atomically and preserves unselected variants, counters and identities", async () => {
  const f = await fixture();
  try {
    const ids = f.c.products.map((p) => p.variants[0].id);
    const saved = await f.bulk(f.c, ids, {
      channels: { online: false },
      active: false,
      price: { mode: "increase", value: 10 },
    });
    assert.equal(saved.status, 200);
    for (const old of f.c.products) {
      const p = saved.catalog.products.find((p) => p.id === old.id);
      assert.equal(p.version, old.version + 1);
      assert.equal(p.productCode, old.productCode);
      assert.deepEqual(p.variants[1], old.variants[1]);
      assert.equal(p.variants[0].price, 110);
      assert.equal(p.variants[0].active, false);
      assert.deepEqual(p.variants[0].salesAvailability, {
        ...all,
        online: false,
      });
      assert.deepEqual(p.variants[0].effectiveSales, none);
      assert.equal(p.variants[0].sku, old.variants[0].sku);
      assert.equal("salesAvailability" in p, false);
    }
    const activated = await f.bulk(saved.catalog, ids, { active: true });
    assert.equal(activated.status, 200);
    assert.deepEqual(activated.catalog.products[0].variants[0].effectiveSales, {
      ...all,
      online: false,
    });
    const fixed = await f.bulk(activated.catalog, ids, {
      price: { mode: "fixed", value: 123.45 },
    });
    assert.equal(fixed.status, 200);
    assert.equal(fixed.catalog.products[0].variants[0].price, 123.45);
    const reduced = await f.bulk(fixed.catalog, ids, {
      price: { mode: "decrease", value: 10 },
    });
    assert.equal(reduced.catalog.products[0].variants[0].price, 111.11);
    assert.equal((await f.bulk(f.c, ids, { active: true })).status, 409);
  } finally {
    await f.app.close();
  }
});
test("invalid bulk selections, flags, overflow and minimum prices leave the entire catalog unchanged; viewer is denied", async () => {
  const f = await fixture();
  try {
    const id = f.c.products[0].variants[0].id;
    for (const [ids, changes] of [
      [[], { active: true }],
      [[id, id], { active: true }],
      [[id, "missing"], { active: true }],
      [[id], {}],
      [[id], { unknown: 1 }],
      [[id], { active: "yes" }],
      [[id], { channels: { bad: true } }],
      [[id], { channels: [] }],
      [[id], { channels: { online: 1 } }],
      [[id], { price: { mode: "fixed", value: 0 } }],
      [[id], { price: { mode: "fixed", value: 1.001 } }],
      [[id], { price: { mode: "decrease", value: 100 } }],
      [[id], { price: { mode: "fixed", value: 1e9 }, active: false }],
      [[id], { price: { mode: "unknown", value: 10 } }],
      [[id], { price: { mode: "fixed", value: 10, unknown: 1 } }],
    ]) {
      assert.equal(
        (await f.bulk(f.c, ids, changes)).status,
        422,
        JSON.stringify({ ids, changes }),
      );
      assert.deepEqual((await f.call("/catalog")).catalog, f.c);
    }
    let r = await f.bulk(f.c, [id], { price: { mode: "fixed", value: 0.01 } });
    assert.equal(r.status, 200);
    const minimum = await f.bulk(r.catalog, [id], {
      price: { mode: "decrease", value: 99.99 },
    });
    assert.equal(minimum.status, 200);
    assert.equal(minimum.catalog.products[0].variants[0].price, 0.01);
    r = minimum;
    r = await f.bulk(r.catalog, [id], { price: { mode: "fixed", value: 1e8 } });
    assert.equal(r.status, 200);
    assert.equal(
      (await f.bulk(r.catalog, [id], { price: { mode: "increase", value: 1 } }))
        .status,
      422,
    );
    await f.app.db.query("UPDATE app_users SET role=? WHERE email=?", [
      "viewer",
      "bulk@test.example",
    ]);
    for (const changes of [
      { channels: { online: true } },
      { active: true },
      { price: { mode: "fixed", value: 10 } },
    ])
      assert.equal((await f.bulk(r.catalog, [id], changes)).status, 403);
    assert.equal(
      (
        await f.call("/variants/bulk", "POST", {
          ids: [id],
          changes: { active: true },
        })
      ).status,
      403,
    );
  } finally {
    await f.app.close();
  }
});
test("bulk price overrides survive later source product price recalculation", async () => {
  const f = await fixture();
  try {
    let c = f.c,
      p = c.products[0];
    let r = await f.call("/products/" + p.id, "PUT", {
      expectedRevision: c.revision,
      product: {
        ...p,
        unitPricing: { unit: "Dilim", price: 10, weight: 40 },
        variants: [
          ...p.variants,
          {
            size: "Üçlü",
            typeId: "type-item",
            sourceProductId: p.id,
            items: [{ productId: p.id, quantity: 3 }],
            quantity: 3,
            packaging: "Tabakta servis",
            priceOverride: null,
            consumables: [],
            images: [],
            price: 30,
            weight: 120,
            slices: 3,
            unit: "Dilim",
            active: true,
          },
        ],
      },
    });
    assert.equal(r.status, 200);
    c = r.catalog;
    p = c.products.find((x) => x.id === p.id);
    const v = p.variants.find((v) => v.sourceProductId === p.id);
    r = await f.bulk(c, [v.id], { price: { mode: "fixed", value: 75 } });
    assert.equal(r.status, 200);
    r = await f.call("/products/bulk", "POST", {
      expectedRevision: r.catalog.revision,
      ids: [p.id],
      changes: { price: 20 },
    });
    assert.equal(r.status, 200);
    const updated = r.catalog.products
      .find((x) => x.id === p.id)
      .variants.find((x) => x.id === v.id);
    assert.equal(updated.calculatedPrice, 60);
    assert.equal(updated.price, 75);
    assert.equal(updated.priceOverride, 75);
  } finally {
    await f.app.close();
  }
});
