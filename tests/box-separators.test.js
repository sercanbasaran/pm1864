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

import {
  alignSeparators,
  fillWithSeparators,
} from "../src/modules/packaging/box-separators.js";
test("alignment preserves widths and relative gaps; justify equalizes inside and outside gaps", () => {
  const values = [
    { orientation: "vertical", position: 20, width: 10 },
    { orientation: "vertical", position: 50, width: 20 },
  ];
  assert.deepEqual(
    alignSeparators(shape, values, "vertical", "start").values.map(
      (v) => v.position,
    ),
    [0, 30],
  );
  assert.deepEqual(
    alignSeparators(shape, values, "vertical", "end").values.map(
      (v) => v.position,
    ),
    [50, 80],
  );
  assert.deepEqual(
    alignSeparators(shape, values, "vertical", "center").values.map(
      (v) => v.position,
    ),
    [25, 55],
  );
  const j = alignSeparators(shape, values, "vertical", "justify").values;
  assert.ok(Math.abs(j[0].position - 70 / 3) < 1e-8);
  assert.ok(Math.abs(j[1].position - (140 / 3 + 10)) < 1e-8);
  assert.deepEqual(
    j.map((v) => v.width),
    [10, 20],
  );
});
test("filling adds only empty full-length bands and respects the separator limit", () => {
  const placements = [{ x: 20, y: 10, w: 60, h: 80 }];
  const result = fillWithSeparators(shape, [], placements);
  assert.equal(result.added, 4);
  assert.equal(separatorLayout(shape, result.values).reason, undefined);
  for (const s of result.values)
    for (const p of placements)
      assert.ok(
        s.orientation === "vertical"
          ? s.position + s.width <= p.x || s.position >= p.x + p.w
          : s.position + s.width <= p.y || s.position >= p.y + p.h,
      );
  assert.equal(fillWithSeparators(shape, result.values, placements).added, 0);
  assert.equal(
    fillWithSeparators(shape, [], [{ x: 0, y: 0, w: 100, h: 100 }]).added,
    0,
  );
});
