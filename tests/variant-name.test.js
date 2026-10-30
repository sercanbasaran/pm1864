import test from "node:test";
import assert from "node:assert/strict";
import {
  suggestedVariantName,
  variantNameFromContents,
} from "../src/variant-name.js";
const types = [
  { id: "portion", name: "Porsiyon" },
  { id: "box", name: "Kutu" },
];
test("generated variant names follow product and type and keep the suffix within the name limit", () => {
  assert.equal(
    suggestedVariantName({ name: "Fıstıklı Baklava" }, "portion", types),
    "Fıstıklı Baklava [Porsiyon]",
  );
  assert.equal(
    suggestedVariantName({ name: "Lokum" }, "box", types),
    "Lokum [Kutu]",
  );
  assert.equal(suggestedVariantName(null, "box", types), "");
  assert.equal(suggestedVariantName({ name: "Lokum" }, "", types), "");
  const long = suggestedVariantName(
    { name: "Çok uzun ürün adı ".repeat(6) },
    "portion",
    types,
  );
  assert.ok(Array.from(long).length <= 45);
  assert.ok(long.endsWith(" [Porsiyon]"));
});
test("mixed variants use the first selected product rather than the storage owner", () => {
  const owner = { id: 1, name: "Baklava" },
    products = [owner, { id: 2, name: "Lokum" }];
  assert.equal(
    variantNameFromContents(
      { typeId: "box", items: [{ productId: 2 }, { productId: 1 }] },
      owner,
      products,
      types,
    ),
    "Lokum [Kutu]",
  );
});
