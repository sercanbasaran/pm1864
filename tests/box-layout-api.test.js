import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";

test("server rejects invalid grids and kg limits, preserves orientation counts and prevents later source/box edits from breaking validated layouts", async () => {
  const password = "Grid-api-test-1864",
    email = "grid@test.example";
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD_HASH: await hashPassword(password),
    },
  });
  let cookie = "";
  async function call(path, method = "GET", body) {
    const r = await app.handle(
      new Request("https://grid.test/api" + path, {
        method,
        headers: {
          origin: "https://grid.test",
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
    await call("/login", "POST", { email, password });
    let c = (await call("/catalog")).catalog;
    let r = await call("/products", "POST", {
      expectedRevision: c.revision,
      product: {
        name: "Baklava",
        category: "Baklavalar",
        status: "Aktif",
        variants: [],
        unitPricing: { unit: "Dilim", price: 100, weight: 50 },
        dimensions: { length: 50, width: 25, height: 30 },
      },
    });
    assert.equal(r.status, 200);
    c = r.catalog;
    const source = c.products[0];
    r = await call("/products", "POST", {
      expectedRevision: c.revision,
      product: {
        name: "Karışık kutu sahibi",
        category: "Baklavalar",
        status: "Aktif",
        variants: [],
      },
    });
    assert.equal(r.status, 200);
    c = r.catalog;
    let owner = c.products.find((p) => p.id !== source.id);
    r = await call("/packaging", "POST", {
      expectedRevision: c.revision,
      name: "Grid kutusu",
      material: "Metal",
      length: 150,
      width: 100,
      height: 40,
      maxProductWeight: 600,
      active: true,
      allowedProductIds: [source.id],
    });
    assert.equal(r.status, 200);
    c = r.catalog;
    const box = c.packagingItems.find((b) => b.name === "Grid kutusu");
    const variant = {
      size: "Karışık",
      typeId: c.variantTypes.find((t) => t.name === "Kutu").id,
      sourceProductId: source.id,
      quantity: 12,
      items: [
        { productId: source.id, quantity: 12, horizontal: 4, vertical: 8 },
      ],
      packagingId: box.id,
      packaging: "Metal kutu",
      consumables: [],
      images: [],
      price: 1,
      weight: 1,
    };
    for (const items of [
      [{ productId: source.id, quantity: 8, horizontal: 4, vertical: 4 }],
      [{ productId: source.id, quantity: 13, horizontal: 5, vertical: 8 }],
      [{ productId: source.id, quantity: 12, horizontal: 4, vertical: 7 }],
      [{ productId: source.id, quantity: 12, horizontal: -1, vertical: 13 }],
      [null],
      [
        {
          productId: source.id,
          quantity: 1000000,
          horizontal: 1000000,
          vertical: 0,
        },
      ],
    ]) {
      const denied = await call(`/products/${owner.id}`, "PUT", {
        expectedRevision: c.revision,
        product: { ...owner, variants: [{ ...variant, items }] },
      });
      assert.equal(denied.status, 422, JSON.stringify(denied));
      assert.equal((await call("/catalog")).catalog.revision, c.revision);
    }
    r = await call(`/products/${owner.id}`, "PUT", {
      expectedRevision: c.revision,
      product: { ...owner, variants: [variant] },
    });
    assert.equal(r.status, 200, JSON.stringify(r));
    c = r.catalog;
    owner = c.products.find((p) => p.id === owner.id);
    const saved = owner.variants[0];
    assert.equal(saved.layoutVersion, 1);
    assert.equal(saved.items[0].horizontal, 4);
    assert.equal(saved.items[0].vertical, 8);
    assert.equal(saved.weight, 600);
    const invalidWrites = [
      [
        `/products/${owner.id}`,
        {
          product: {
            ...owner,
            variants: [
              {
                ...saved,
                layoutVersion: 0,
                items: [{ productId: source.id, quantity: 1 }],
              },
            ],
          },
        },
      ],
      [
        `/products/${source.id}`,
        {
          product: {
            ...source,
            dimensions: { length: 50, width: 25, height: 50 },
          },
        },
      ],
      [
        `/products/${source.id}`,
        {
          product: {
            ...source,
            unitPricing: { unit: "Dilim", price: 100, weight: 51 },
          },
        },
      ],
      [`/packaging/${box.id}`, { ...box, height: 20 }],
      [`/packaging/${box.id}`, { ...box, maxProductWeight: 599 }],
      [`/packaging/${box.id}`, { ...box, length: 200 }],
    ];
    for (const [path, body] of invalidWrites) {
      r = await call(path, "PUT", { ...body, expectedRevision: c.revision });
      assert.equal(r.status, 422, `${path}: ${JSON.stringify(r)}`);
      assert.equal((await call("/catalog")).catalog.revision, c.revision);
    }
    r = await call("/products/bulk", "POST", {
      expectedRevision: c.revision,
      ids: [source.id],
      changes: { unit: "Dilim", weight: 51 },
    });
    assert.equal(r.status, 422);
    assert.equal((await call("/catalog")).catalog.revision, c.revision);
    r = await call(`/products/${owner.id}`, "PUT", {
      expectedRevision: c.revision,
      product: { ...owner, description: "Kimlikler ve yönler korunur" },
    });
    assert.equal(r.status, 200);
    assert.equal(
      r.catalog.products.find((p) => p.id === owner.id).variants[0].id,
      saved.id,
    );

    c = r.catalog;
    r = await call("/products", "POST", {
      expectedRevision: c.revision,
      product: {
        name: "Separatör ürünü",
        category: "Baklavalar",
        status: "Aktif",
        variants: [],
        unitPricing: { unit: "Dilim", price: 100, weight: 50 },
        dimensions: { length: 45, width: 100, height: 20 },
      },
    });
    assert.equal(r.status, 200);
    c = r.catalog;
    const member = c.products.find((p) => p.name === "Separatör ürünü");
    r = await call("/packaging", "POST", {
      expectedRevision: c.revision,
      name: "Bölmeli kutu",
      material: "Metal",
      length: 100,
      width: 100,
      height: 30,
      maxProductWeight: 100,
      active: true,
      allowedProductIds: [member.id],
    });
    assert.equal(r.status, 200);
    c = r.catalog;
    const dividedBox = c.packagingItems.find((b) => b.name === "Bölmeli kutu");
    owner = c.products.find((p) => p.id === owner.id);
    const separators = [{ orientation: "vertical", position: 45, width: 10 }];
    const divided = {
      ...variant,
      size: "Bölmeli",
      sourceProductId: member.id,
      quantity: 2,
      items: [
        { productId: member.id, quantity: 2, horizontal: 2, vertical: 0 },
      ],
      packagingId: dividedBox.id,
      separators,
    };
    r = await call(`/products/${owner.id}`, "PUT", {
      expectedRevision: c.revision,
      product: { ...owner, variants: [...owner.variants, divided] },
    });
    assert.equal(r.status, 200, JSON.stringify(r));
    c = r.catalog;
    owner = c.products.find((p) => p.id === owner.id);
    assert.deepEqual(
      owner.variants.find((v) => v.size === "Bölmeli").separators,
      separators,
    );
    const bad = await call(`/products/${owner.id}`, "PUT", {
      expectedRevision: c.revision,
      product: {
        ...owner,
        variants: owner.variants.map((v) =>
          v.size === "Bölmeli"
            ? {
                ...v,
                separators: [
                  { orientation: "vertical", position: 45, width: 11 },
                ],
              }
            : v,
        ),
      },
    });
    assert.equal(bad.status, 422);
    assert.equal((await call("/catalog")).catalog.revision, c.revision);
  } finally {
    await app.close();
  }
});
