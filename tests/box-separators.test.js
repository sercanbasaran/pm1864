import test from "node:test";
import assert from "node:assert/strict";
import {
  boxLayout,
  variantBoxLayoutIssue,
} from "../src/modules/packaging/box-layout.js";
import {
  separatorLayout,
  circleRectangleArea,
} from "../src/modules/packaging/box-separators.js";
const shape = { width: 100, length: 100 };
const product = {
  id: 1,
  unitPricing: { unit: "Dilim", weight: 50 },
  dimensions: { length: 45, width: 100, height: 20 },
};
const box = {
  length: 100,
  width: 100,
  height: 30,
  maxProductWeight: 200,
  separators: [{ orientation: "vertical", position: 45, width: 10 }],
};
test("separator footprints split the box, reduce the fill denominator and prevent pieces crossing compartments", () => {
  const c = boxLayout(
    box,
    [{ productId: 1, quantity: 2, horizontal: 2, vertical: 0 }],
    [product],
  );
  assert.equal(c.valid, true);
  assert.equal(c.basePercent, 100);
  assert.equal(c.totalArea, 9000);
  for (const p of c.placements) assert.ok(p.x + p.w <= 45 || p.x >= 55);
  const larger = {
    ...product,
    dimensions: { length: 50, width: 90, height: 20 },
  };
  const noFit = boxLayout(box, [{ productId: 1, quantity: 2 }], [larger]);
  assert.equal(noFit.valid, false);
  assert.equal(noFit.unplaced.length, 2);
  assert.ok(
    variantBoxLayoutIssue(
      { items: [{ productId: 1, quantity: 2 }], separators: box.separators },
      { ...box, separators: undefined },
      [larger],
      1,
    ),
  );
});
test("changing width and position recalculates layout, and perpendicular intersections are subtracted once", () => {
  const changed = boxLayout(
    {
      ...box,
      separators: [{ orientation: "vertical", position: 45, width: 11 }],
    },
    [{ productId: 1, quantity: 2 }],
    [product],
  );
  assert.equal(changed.valid, false);
  const cross = boxLayout(
    {
      ...box,
      separators: [
        ...box.separators,
        { orientation: "horizontal", position: 40, width: 10 },
      ],
    },
    [],
    [product],
  );
  assert.equal(cross.totalArea, 8100);
});
test("axis limits, overlaps and invalid separator data are rejected", () => {
  const v = { orientation: "vertical", position: 20, width: 2 };
  assert.ok(separatorLayout(shape, [v, { ...v, position: 21 }]).reason);
  assert.ok(
    separatorLayout(
      shape,
      Array.from({ length: 4 }, (_, i) => ({ ...v, position: 10 + i * 10 })),
    ).reason,
  );
  assert.ok(
    separatorLayout(
      shape,
      Array.from({ length: 3 }, (_, i) => ({
        ...v,
        orientation: "horizontal",
        position: 10 + i * 10,
      })),
    ).reason,
  );
  for (const width of [0, -1, Infinity, 101])
    assert.ok(separatorLayout(shape, [{ ...v, width }]).reason);
  assert.ok(separatorLayout(shape, [{ ...v, position: -1 }]).reason);
  assert.ok(separatorLayout(shape, [{ ...v, untrusted: "value" }]).reason);
});
test("circle strip areas use the circular interior rather than the bounding square", () => {
  assert.ok(
    Math.abs(
      circleRectangleArea({ x: 0, y: 0, w: 100, h: 100 }, 100) - Math.PI * 2500,
    ) < 1e-7,
  );
  const c = boxLayout({ ...box, shape: "cylinder", diameter: 100 }, [], []);
  assert.ok(c.totalArea < Math.PI * 2500);
  assert.ok(c.totalArea > Math.PI * 2500 - 1000);
});
