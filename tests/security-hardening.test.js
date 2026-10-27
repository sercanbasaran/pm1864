import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../server/http/json-body.js";
import { openDatabase, migrate } from "../server/db.js";
import { seedCatalog } from "../server/catalog-service.js";
import { createHandler } from "../netlify/functions/db-test.mjs";
import { parseProductWorkbook } from "../src/modules/products/product-import-parser.js";
import * as XLSX from "xlsx";

test("JSON boundary rejects excess streamed bytes, malformed types and non-object JSON", async () => {
  const request = (body) =>
    new Request("https://test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  assert.deepEqual(await readJsonBody(request('{"x":1}'), 20), { x: 1 });
  await assert.rejects(
    readJsonBody(request('"123456789"'), 5),
    (e) => e.status === 413,
  );
  await assert.rejects(
    readJsonBody(request("[]"), 20),
    (e) => e.status === 400,
  );
  await assert.rejects(readJsonBody(request("{"), 20), (e) => e.status === 400);
  await assert.rejects(
    readJsonBody(
      new Request("https://test", {
        method: "POST",
        headers: { "content-type": "text/application/json" },
        body: "{}",
      }),
      20,
    ),
    (e) => e.status === 415,
  );
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(30));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    readJsonBody(
      new Request("https://test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: stream,
        duplex: "half",
      }),
      10,
    ),
    (e) => e.status === 413,
  );
  assert.equal(cancelled, true);
});
test("SQLite enables foreign key enforcement and indexed session cleanup", async () => {
  const db = await openDatabase({ SQLITE_PATH: ":memory:" });
  try {
    await migrate(db, seedCatalog());
    assert.equal(
      (await db.query("SELECT foreign_keys FROM pragma_foreign_keys")).rows[0]
        .foreign_keys,
      1,
    );
    const indexes = (
      await db.query("SELECT name FROM sqlite_master WHERE type='index'")
    ).rows.map((r) => r.name);
    assert.ok(indexes.includes("app_sessions_email_idx"));
    assert.ok(indexes.includes("app_sessions_expiry_idx"));
    await assert.rejects(
      db.query(
        "INSERT INTO app_user_avatars(user_id,mime_type,data) VALUES (?,?,?)",
        ["missing", "image/png", "x"],
      ),
    );
  } finally {
    await db.close();
  }
});
test("production diagnostic is disabled unless explicitly enabled", async () => {
  const handler = createHandler({
    env: { NETLIFY: "true", DATABASE_URL: "postgres://test" },
    connect: () => assert.fail("must not connect"),
  });
  assert.equal(
    (await handler(new Request("https://test/.netlify/functions/db-test")))
      .status,
    404,
  );
});
test("spreadsheet parsing accepts normal rows and bounds huge ranges before conversion", () => {
  const buffer = (sheet) => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Ürünler");
    return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
  };
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Ürün adı", "Kategori kodu"],
    ["Baklava", "0100"],
  ]);
  assert.equal(parseProductWorkbook(buffer(sheet))[0]["Ürün adı"], "Baklava");
  sheet["AG1"] = { t: "s", v: "invalid" };
  sheet["!ref"] = "A1:AG2";
  assert.throws(() => parseProductWorkbook(buffer(sheet)), /32 sütun/);
  const tooMany = XLSX.utils.aoa_to_sheet([
    ["Ürün adı"],
    ...Array.from({ length: 501 }, () => ["Baklava"]),
  ]);
  assert.throws(() => parseProductWorkbook(buffer(tooMany)), /500 ürün/);
});
