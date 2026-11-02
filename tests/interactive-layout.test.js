import test from "node:test";
import assert from "node:assert/strict";
import {
  boxLayout,
  capItemIncrease,
  placementData,
} from "../src/modules/packaging/box-layout.js";
const box = { length: 210, width: 100, height: 30, maxProductWeight: 2000 };
const product = {
  id: 1,
  unitPricing: { unit: "Dilim", weight: 50 },
  dimensions: { length: 10, width: 100, height: 20 },
};
test("24 requested pieces are capped at the 21 pieces that fit", () => {
  const r = capItemIncrease(
    box,
    [{ productId: 1, quantity: 1 }],
    [{ productId: 1, quantity: 24, horizontal: 24, vertical: 0 }],
    [product],
  );
  assert.equal(r.items[0].quantity, 21);
  assert.match(r.notice, /21/);
  assert.equal(boxLayout(box, r.items, [product]).valid, true);
});
test("manual positions are retained, and outside/colliding positions are rejected", () => {
  const items = [{ productId: 1, quantity: 2, horizontal: 2, vertical: 0 }];
  const c = boxLayout(box, items, [product]);
  const positions = placementData(c);
  positions[1].x = 100;
  positions[1].y = 0;
  const manual = boxLayout({ ...box, placements: positions }, items, [product]);
  assert.equal(manual.ready, true);
  assert.equal(manual.placements[1].x, 100);
  positions[1].x = 0;
  assert.equal(
    boxLayout({ ...box, placements: positions }, items, [product]).ready,
    false,
  );
  positions[1].x = 1000;
  assert.equal(
    boxLayout({ ...box, placements: positions }, items, [product]).ready,
    false,
  );
});
