import test from "node:test";
import assert from "node:assert/strict";
import {
  boxLayout,
  layoutRecommendations,
  layoutItemsWithAutoOrientation,
  orientationIssue,
  MAX_LAYOUT_PIECES,
} from "../src/modules/packaging/box-layout.js";
const box = { length: 150, width: 100, height: 40, maxProductWeight: 600 };
const product = {
  id: 1,
  name: "Baklava",
  status: "Aktif",
  unitPricing: { unit: "Dilim", weight: 50 },
  dimensions: { length: 50, width: 25, height: 30 },
};
const overlap = (a, b) =>
  a.x < b.x + b.w - 1e-6 &&
  a.x + a.w > b.x + 1e-6 &&
  a.y < b.y + b.h - 1e-6 &&
  a.y + a.h > b.y + 1e-6;
test("4 horizontal and 8 vertical pieces fit with no overlaps and exactly at the kg limit", () => {
  const c = boxLayout(
    box,
    [{ productId: 1, quantity: 12, horizontal: 4, vertical: 8 }],
    [product],
  );
  assert.equal(c.valid, true);
  assert.equal(c.basePercent, 100);
  assert.equal(c.usedWeight, 600);
  assert.equal(
    c.placements.filter((p) => p.orientation === "horizontal").length,
    4,
  );
  assert.equal(
    c.placements.filter((p) => p.orientation === "vertical").length,
    8,
  );
  for (const [i, p] of c.placements.entries()) {
    assert.ok(
      p.x >= 0 &&
        p.y >= 0 &&
        p.x + p.w <= box.length + 1e-6 &&
        p.y + p.h <= box.width + 1e-6,
    );
    for (const other of c.placements.slice(i + 1))
      assert.equal(overlap(p, other), false);
  }
});
test("95 percent threshold, missing kg limits, excessive kg, height and over-capacity all prevent completion", () => {
  const p = { ...product, dimensions: { length: 95, width: 100, height: 30 } },
    b = { ...box, length: 100, maxProductWeight: 50 };
  assert.equal(boxLayout(b, [{ productId: 1, quantity: 1 }], [p]).valid, true);
  assert.match(
    boxLayout(
      b,
      [{ productId: 1, quantity: 1 }],
      [{ ...p, dimensions: { ...p.dimensions, length: 94.99 } }],
    ).reason,
    /%95/,
  );
  assert.match(
    boxLayout(
      { ...b, maxProductWeight: 49.99 },
      [{ productId: 1, quantity: 1 }],
      [p],
    ).reason,
    /kilogram/,
  );
  assert.match(
    boxLayout(
      { ...b, maxProductWeight: null },
      [{ productId: 1, quantity: 1 }],
      [p],
    ).reason,
    /ağırlığını/,
  );
  assert.match(
    boxLayout(
      box,
      [{ productId: 1, quantity: 13, horizontal: 5, vertical: 8 }],
      [product],
    ).reason,
    /sığmıyor/,
  );
  assert.equal(
    boxLayout(
      { ...box, height: 20 },
      [{ productId: 1, quantity: 12 }],
      [product],
    ).valid,
    false,
  );
});
test("geometry can reject two rectangles even when their total base area is below 100 percent", () => {
  const p = { ...product, dimensions: { length: 60, width: 60, height: 30 } };
  const c = boxLayout(
    { ...box, length: 100 },
    [{ productId: 1, quantity: 2 }],
    [p],
  );
  assert.equal(c.requestedBasePercent, 72);
  assert.equal(c.unplaced.length, 1);
  assert.equal(c.valid, false);
});
test("circle layouts keep all four corners of every product inside the box", () => {
  const b = {
    shape: "cylinder",
    diameter: 100,
    height: 40,
    maxProductWeight: 1000,
  };
  const c = boxLayout(
    b,
    [{ productId: 1, quantity: 5 }],
    [{ ...product, dimensions: { length: 20, width: 20, height: 30 } }],
  );
  assert.equal(c.unplaced.length, 0);
  for (const p of c.placements)
    for (const [x, y] of [
      [p.x, p.y],
      [p.x + p.w, p.y],
      [p.x, p.y + p.h],
      [p.x + p.w, p.y + p.h],
    ])
      assert.ok((x - 50) ** 2 + (y - 50) ** 2 <= 2500 + 1e-6);
});
test("suggestions include feasible orientation counts, respect product approval and meet 95 percent", () => {
  const items = [{ productId: 1, quantity: 8, horizontal: 4, vertical: 4 }];
  const c = boxLayout(box, items, [product]);
  const options = layoutRecommendations(c, box, items, [product]);
  assert.ok(options.length);
  const option = options[0];
  assert.equal(option.quantity, 4);
  assert.equal(option.completes, true);
  assert.equal(boxLayout(box, option.items, [product]).valid, true);
  assert.equal(
    layoutRecommendations(c, box, items, [product], () => false).length,
    0,
  );
  const heavy = {
    ...product,
    id: 2,
    unitPricing: { unit: "Dilim", weight: 1000 },
  };
  assert.equal(
    layoutRecommendations(c, box, items, [product, heavy]).some(
      (s) => s.product.id === 2,
    ),
    false,
  );
});
test("orientation inputs and expansion size are validated before creating grid pieces", () => {
  for (const item of [
    { quantity: 4, horizontal: -1, vertical: 5 },
    { quantity: 4, horizontal: 1, vertical: 2 },
    { quantity: 4, horizontal: 1.5, vertical: 2.5 },
    { quantity: 4, horizontal: null, vertical: 4 },
  ])
    assert.ok(orientationIssue(item));
  assert.equal(
    boxLayout(
      box,
      [{ productId: 1, quantity: MAX_LAYOUT_PIECES + 1 }],
      [product],
    ).ready,
    false,
  );
  const items = [{ productId: 1, quantity: 12 }];
  const c = boxLayout(box, items, [product], { autoOrient: true });
  assert.equal(
    boxLayout(box, layoutItemsWithAutoOrientation(items, c), [product]).valid,
    true,
  );
});
