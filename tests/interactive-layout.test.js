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

test("additions preserve a manually positioned divider-like product and use only the actual free compartments", () => {
  const b = {
    length: 100,
    width: 100,
    height: 30,
    maxProductWeight: 2000,
    placements: [
      { productId: 1, pieceIndex: 0, x: 40, y: 0, orientation: "horizontal" },
    ],
  };
  const p = { ...product, dimensions: { length: 20, width: 100, height: 20 } },
    q = {
      ...product,
      id: 2,
      dimensions: { length: 40, width: 100, height: 20 },
    };
  const before = [{ productId: 1, quantity: 1, horizontal: 1, vertical: 0 }];
  const r = capItemIncrease(
    b,
    before,
    [...before, { productId: 2, quantity: 3 }],
    [p, q],
  );
  assert.deepEqual(r.placements[0], b.placements[0]);
  assert.equal(r.items[1].quantity, 2);
  assert.equal(
    boxLayout({ ...b, placements: r.placements }, r.items, [p, q]).valid,
    true,
  );
  const blocked = capItemIncrease(
    b,
    before,
    [...before, { productId: 2, quantity: 1 }],
    [p, { ...q, dimensions: { length: 50, width: 100, height: 20 } }],
  );
  assert.equal(blocked.items.length, 1);
  assert.deepEqual(blocked.placements, b.placements);
});

import { moveLayoutPiece } from "../src/modules/packaging/box-layout.js";
test("moves try the current orientation first, then rotate only if the alternative fits", () => {
  const p = { ...product, dimensions: { length: 30, width: 10, height: 20 } },
    b = { length: 100, width: 60, height: 30, maxProductWeight: 200 };
  const items = [{ productId: 1, quantity: 1, horizontal: 1, vertical: 0 }],
    c = boxLayout(b, items, [p]);
  const turned = moveLayoutPiece(c, b, [p], 0, 85, 10);
  assert.equal(turned.rotated, true);
  assert.equal(turned.placements[0].orientation, "vertical");
  assert.equal(turned.items[0].vertical, 1);
  const vertical = boxLayout(
    { ...b, placements: turned.placements },
    turned.items,
    [p],
  );
  const horizontal = moveLayoutPiece(vertical, b, [p], 0, 10, 50);
  assert.equal(horizontal.rotated, true);
  assert.equal(horizontal.placements[0].orientation, "horizontal");
  assert.equal(moveLayoutPiece(c, b, [p], 0, 10, 10).rotated, false);
  const before = JSON.stringify(c.placements);
  assert.equal(moveLayoutPiece(c, b, [p], 0, 99, 59).placements, undefined);
  assert.equal(JSON.stringify(c.placements), before);
  const divided = {
      ...b,
      separators: [{ orientation: "vertical", position: 90, width: 5 }],
    },
    dc = boxLayout(divided, items, [p]);
  assert.equal(
    moveLayoutPiece(dc, divided, [p], 0, 85, 10).placements,
    undefined,
  );
});

test("boxes allow four distinct products or many pieces of one product, but reject a fifth product", () => {
  const b = { length: 100, width: 100, height: 30, maxProductWeight: 1000 };
  const products = Array.from({ length: 5 }, (_, i) => ({
    ...product,
    id: i + 1,
    dimensions: { length: 20, width: 100, height: 20 },
  }));
  const items = products.map((p) => ({ productId: p.id, quantity: 1 }));
  assert.match(boxLayout(b, items, products).reason, /4 farklı ürün/);
  const single = boxLayout(b, [{ productId: 1, quantity: 5 }], [products[0]]);
  assert.equal(single.valid, true);
  const previous = items.slice(0, 4),
    current = boxLayout(b, previous, products);
  const result = capItemIncrease(
    { ...b, placements: placementData(current) },
    previous,
    items,
    products,
  );
  assert.equal(result.items.length, 4);
  assert.match(result.notice, /4 farklı ürün/);
});
