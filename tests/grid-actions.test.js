import test from "node:test";
import assert from "node:assert/strict";
import {
  GRID_NAME_FONT,
  wrapGridName,
  alignGridSelection,
} from "../src/modules/packaging/grid-actions.js";
import { boxLayout } from "../src/modules/packaging/box-layout.js";
const box = { length: 100, width: 100, height: 30, maxProductWeight: 1000 },
  product = {
    id: 1,
    unitPricing: { unit: "Dilim", weight: 50 },
    dimensions: { length: 20, width: 20, height: 20 },
  };
const items = [{ productId: 1, quantity: 3, horizontal: 3, vertical: 0 }];
const placements = [
  { productId: 1, pieceIndex: 0, x: 10, y: 0, orientation: "horizontal" },
  { productId: 1, pieceIndex: 1, x: 50, y: 40, orientation: "horizontal" },
  { productId: 1, pieceIndex: 2, x: 80, y: 80, orientation: "horizontal" },
];
test("wrapping keeps a fixed font, handles narrow cells and preserves full product text", () => {
  const narrow = wrapGridName("Fıstıklı Baklava", 10),
    wide = wrapGridName("Fıstıklı Baklava", 100);
  assert.ok(narrow.length > wide.length);
  assert.equal(narrow.join(""), "FıstıklıBaklava");
  assert.equal(GRID_NAME_FONT, 3);
  assert.ok(narrow.every((line) => Array.from(line).length <= 2));
});
test("alignment moves the selected group against box edges without moving unselected pieces", () => {
  const c = boxLayout({ ...box, placements }, items, [product]);
  for (const [axis, mode, key, expected] of [
    ["horizontal", "start", "x", [0, 40]],
    ["horizontal", "end", "x", [40, 80]],
    ["horizontal", "center", "x", [20, 60]],
    ["horizontal", "justify", "x", [20, 60]],
    ["vertical", "justify", "y", [20, 60]],
  ]) {
    const result = alignGridSelection(c, box, [product], [0, 1], axis, mode);
    assert.ok(result.placements, result.reason);
    assert.deepEqual(
      result.placements.slice(0, 2).map((p) => p[key]),
      expected,
    );
    assert.deepEqual(result.placements[2], placements[2]);
  }
});
test("alignments that collide return an error without mutating the grid", () => {
  const layout = [placements[0], placements[1], { ...placements[2], y: 0 }];
  const c = boxLayout({ ...box, placements: layout }, items, [product]);
  const before = JSON.stringify(c.placements);
  assert.ok(
    alignGridSelection(c, box, [product], [0], "horizontal", "end").reason,
  );
  assert.equal(JSON.stringify(c.placements), before);
});
