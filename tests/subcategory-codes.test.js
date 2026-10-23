import test from "node:test";
import assert from "node:assert/strict";
import { nextSubcategoryCode } from "../src/catalog.js";
test("subcategory suggestion starts after the parent and skips all occupied codes", () => {
  const categories = [
    { id: "r", code: "100" },
    { id: "other", code: "101" },
    { id: "c", code: "102", parentId: "r" },
    { id: "inactive", code: "103", active: false },
  ];
  assert.equal(nextSubcategoryCode(categories, "r"), "104");
  assert.equal(nextSubcategoryCode([{ id: "r", code: "100" }], "r"), "101");
});
test("leading zeroes are retained and missing parents or exhausted ranges have no suggestion", () => {
  assert.equal(nextSubcategoryCode([{ id: "r", code: "001" }], "r"), "002");
  assert.equal(nextSubcategoryCode([{ id: "r", code: "998" }], "r"), "999");
  assert.equal(nextSubcategoryCode([{ id: "r", code: "999" }], "r"), "");
  assert.equal(
    nextSubcategoryCode(
      [
        { id: "r", code: "998" },
        { id: "c", code: "999", parentId: "r" },
      ],
      "r",
    ),
    "",
  );
  assert.equal(nextSubcategoryCode([], "missing"), "");
  assert.equal(
    nextSubcategoryCode([{ id: "c", parentId: "r", code: "101" }], "c"),
    "",
  );
});
