import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryRows,
  categorySummary,
  emptyCategoryFilters,
} from "../src/modules/categories/category-list.js";
const categories = [
  {
    id: "a",
    name: "Baklava",
    code: "0100",
    slug: "baklava",
    active: true,
    salesAvailability: { store: true, online: false, foodDelivery: true },
  },
  {
    id: "b",
    parentId: "a",
    name: "Fıstıklı",
    code: "101",
    slug: "fistikli",
    active: true,
    description: "Açıklama",
  },
  { id: "c", name: "Lokum", code: "0200", slug: "lokum", active: false },
  {
    id: "d",
    parentId: "c",
    name: "Güllü",
    code: "201",
    slug: "gullu",
    active: true,
  },
  {
    id: "e",
    name: "Çay",
    code: "0300",
    slug: "cay",
    active: true,
    salesAvailability: { online: true, foodDelivery: false, store: false },
  },
];
const products = [
  { id: 1, categoryId: "b" },
  { id: 2, categoryId: "a" },
];
test("channel counts include active ancestors and respect independent channel preferences", () => {
  const summary = categorySummary(categories, products);
  assert.deepEqual(
    summary.channels.map((c) => [c.key, c.main, c.children]),
    [
      ["store", 1, 1],
      ["online", 1, 0],
      ["foodDelivery", 1, 1],
    ],
  );
  assert.deepEqual(summary.quality, { description: 4, identity: 0, empty: 3 });
});
test("combined filters select exact types, parent, effective status, channel and missing information", () => {
  const rows = (f) =>
    categoryRows(categories, products, { ...emptyCategoryFilters, ...f }).map(
      (c) => c.id,
    );
  assert.deepEqual(
    rows({ parent: "a", type: "child", channel: "store", status: "active" }),
    ["b"],
  );
  assert.deepEqual(rows({ type: "child", status: "inactive" }), ["d"]);
  assert.deepEqual(
    rows({ parent: "a", channel: "online", channelState: "disabled" }),
    ["a", "b"],
  );
  assert.deepEqual(rows({ quality: "description", query: "  BAKLAVA " }), [
    "a",
  ]);
  assert.deepEqual(rows({ quality: "empty", status: "active" }), ["e"]);
  assert.deepEqual(rows({ parent: "a", status: "inactive" }), []);
});
test("sorts use Turkish text, numeric codes and aggregate product counts without mutating input", () => {
  const before = JSON.stringify(categories);
  const rows = (key, direction) =>
    categoryRows(categories, products, emptyCategoryFilters, {
      key,
      direction,
    }).map((c) => c.id);
  assert.deepEqual(rows("code", "desc"), ["e", "d", "c", "b", "a"]);
  assert.deepEqual(rows("name", "asc"), ["a", "e", "b", "d", "c"]);
  assert.equal(rows("count", "desc")[0], "a");
  assert.equal(JSON.stringify(categories), before);
});
test("missing identity information is reported, and legacy channel preferences stay enabled", () => {
  const list = [{ id: "x", name: "", code: "", active: true }];
  assert.equal(categorySummary(list, []).quality.identity, 1);
  assert.equal(categorySummary(list, []).channels[0].main, 1);
});
