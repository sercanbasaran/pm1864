import test from "node:test";
import assert from "node:assert/strict";
import {
  bootstrapStores,
  STORE_IMPORT_VERSION,
} from "../server/imports/bootstrap-stores.js";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { migrate } from "../server/db.js";
import { seedCatalog } from "../server/catalog-service.js";

test("source import includes 25 stores and preserves missing phone and hours rather than inventing values", () => {
  const doc = { managedChannels: [] };
  assert.equal(bootstrapStores(doc), true);
  assert.equal(doc.managedChannels.length, 25);
  assert.equal(
    doc.managedChannels.filter((c) => c.country === "Türkiye").length,
    19,
  );
  assert.equal(doc.managedChannels.filter((c) => !c.phone).length, 5);
  assert.equal(doc.managedChannels.filter((c) => !c.openingHours).length, 1);
  assert.equal(new Set(doc.managedChannels.map((c) => c.code)).size, 25);
  assert.ok(
    doc.managedChannels.every(
      (c) => Array.isArray(c.services) && c.services.length,
    ),
  );
  const before = JSON.stringify(doc);
  assert.equal(bootstrapStores(doc), false);
  assert.equal(JSON.stringify(doc), before);
  doc.managedChannels.pop();
  assert.equal(bootstrapStores(doc), false);
  assert.equal(doc.managedChannels.length, 24);
});
test("existing stores match short names, retain manual values and photos, and ambiguous matches are reported", () => {
  const doc = {
    managedChannels: [
      {
        id: "old",
        kind: "stores",
        name: "Sirkeci",
        phone: "+90 212 111 22 33",
        active: false,
        images: [{ id: "keep" }],
      },
      { id: "dup1", kind: "stores", name: "Pera" },
      { id: "dup2", kind: "stores", name: "Hafız Mustafa 1864 Pera" },
    ],
  };
  bootstrapStores(doc);
  const old = doc.managedChannels.find((c) => c.id === "old");
  assert.equal(old.phone, "+90 212 111 22 33");
  assert.equal(old.status, "Pasif");
  assert.equal(old.active, false);
  assert.equal(old.images[0].id, "keep");
  assert.equal(old.city, "İstanbul");
  assert.equal(doc.storeImportReport.conflicts.length, 1);
  assert.equal(
    doc.managedChannels.filter((c) => c.name.includes("Sirkeci")).length,
    1,
  );
});
test("store APIs persist all fields and photos, protect linked media, and gate writes", async () => {
  const password = "Stores-test-only-1864";
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "stores@example.test",
      ADMIN_PASSWORD_HASH: await hashPassword(password),
    },
  });
  let cookie = "";
  async function call(path, method = "GET", body) {
    const response = await app.handle(
      new Request("https://stores.test/api" + path, {
        method,
        headers: {
          origin: "https://stores.test",
          cookie,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    if (response.headers.has("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, ...(await response.json()) };
  }
  try {
    await call("/login", "POST", { email: "stores@example.test", password });
    let catalog = (await call("/catalog")).catalog;
    assert.equal(catalog.managedChannels.length, 25);
    const { asset } = await call("/media", "POST", {
      name: "store.png",
      mimeType: "image/png",
      data: "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4v4/rPwgzwBgAZVILGYGCVCcAAAAASUVORK5CYII=",
    });
    catalog = (await call("/catalog")).catalog;
    const store = {
      name: "Yeni Mağaza",
      country: "Türkiye",
      city: "İstanbul",
      district: "Fatih",
      address: "Test adresi",
      phone: "+90 212 555 00 00",
      openingHours: "7/24",
      storeType: "Cadde Mağaza",
      status: "Aktif",
      services: ["Wi-Fi", "Paket Servis"],
      notes: "Not",
      images: [{ id: asset.id, url: "https://forged.test/" }],
    };
    const created = await call("/managed-channels/stores", "POST", {
      ...store,
      expectedRevision: catalog.revision,
    });
    assert.equal(created.status, 200);
    catalog = created.catalog;
    const saved = catalog.managedChannels.find((c) => c.name === store.name);
    assert.equal(saved.images[0].url, "/api/media/" + asset.id + "/content");
    assert.ok(saved.code.startsWith("HM-"));
    assert.equal(saved.district, "Fatih");
    assert.equal(
      (await call("/media/" + asset.id, "DELETE", { expectedVersion: 1 }))
        .status,
      409,
    );
    for (const patch of [
      { phone: "Uluslararası" },
      { country: "" },
      { images: [{ id: "missing" }] },
      { services: ["WC", "WC"] },
      { status: "fake" },
      { code: "?" },
    ])
      assert.equal(
        (
          await call("/managed-channels/stores/" + saved.id, "PUT", {
            ...store,
            ...patch,
            expectedRevision: catalog.revision,
          })
        ).status,
        422,
      );
    const updated = await call("/managed-channels/stores/" + saved.id, "PUT", {
      ...store,
      images: [],
      status: "Hazırlık Aşamasında",
      expectedRevision: catalog.revision,
    });
    assert.equal(updated.status, 200);
    catalog = updated.catalog;
    assert.equal(
      catalog.managedChannels.find((c) => c.id === saved.id).active,
      false,
    );
    assert.equal(
      (await call("/media/" + asset.id, "DELETE", { expectedVersion: 1 }))
        .status,
      200,
    );
    catalog = (await call("/catalog")).catalog;
    const other = await call("/managed-channels/digital-stores", "POST", {
      name: "Web sitesi",
      expectedRevision: catalog.revision,
    });
    assert.equal(other.status, 200);
    await app.db.query("UPDATE app_users SET role='viewer'");
    assert.equal(
      (
        await call("/managed-channels/stores", "POST", {
          ...store,
          expectedRevision: other.catalog.revision,
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});
test("existing database receives one transactional migration and subsequent starts keep deletions", async () => {
  const app = await createApp({ env: { SQLITE_PATH: ":memory:" } });
  try {
    const doc = seedCatalog();
    delete doc.storeImportVersion;
    delete doc.storeImportReport;
    doc.managedChannels = [];
    await app.db.query(
      "UPDATE app_catalog SET revision=7,document=? WHERE id=1",
      [JSON.stringify(doc)],
    );
    await migrate(app.db, seedCatalog());
    let row = (
      await app.db.query("SELECT revision,document FROM app_catalog WHERE id=1")
    ).rows[0];
    let actual = JSON.parse(row.document);
    assert.equal(row.revision, 8);
    assert.equal(actual.storeImportVersion, STORE_IMPORT_VERSION);
    assert.equal(actual.managedChannels.length, 25);
    actual.managedChannels.pop();
    await app.db.query("UPDATE app_catalog SET document=? WHERE id=1", [
      JSON.stringify(actual),
    ]);
    await migrate(app.db, seedCatalog());
    row = (
      await app.db.query("SELECT revision,document FROM app_catalog WHERE id=1")
    ).rows[0];
    assert.equal(row.revision, 8);
    assert.equal(JSON.parse(row.document).managedChannels.length, 24);
  } finally {
    await app.close();
  }
});
