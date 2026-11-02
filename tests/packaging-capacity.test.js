import test from "node:test";
import assert from "node:assert/strict";
import {
  packagingCapacity,
  capacityProductLabel,
} from "../src/modules/packaging/packaging-capacity.js";

const box = { length: 100, width: 100, height: 40, maxProductWeight: 5000 };
const slice = {
  id: 1,
  name: "Baklava",
  unitPricing: { unit: "Dilim", weight: 50 },
  dimensions: { length: 20, width: 20, height: 30 },
};
const large = {
  ...slice,
  id: 2,
  dimensions: { length: 40, width: 20, height: 20 },
};

test("capacity estimates honor single-layer base area and change with mixed quantities", () => {
  const capacity = packagingCapacity(
    box,
    [
      { productId: 1, quantity: 5 },
      { productId: 2, quantity: 2 },
    ],
    [slice, large],
  );
  assert.equal(capacity.ready, true);
  assert.equal(capacity.basePercent, 36);
  assert.equal(capacity.usedVolume, 92);
  assert.equal(capacity.remainingVolume, 308);
  assert.equal(capacity.forProduct(slice).maximum, 25);
  assert.equal(capacity.forProduct(slice).additional, 16);
  assert.equal(
    packagingCapacity(
      box,
      [
        { productId: 1, quantity: 6 },
        { productId: 2, quantity: 2 },
      ],
      [slice, large],
    ).forProduct(slice).additional,
    15,
  );
  assert.equal(
    packagingCapacity(box, [{ productId: 1, quantity: 5 }], [slice]).forProduct(
      slice,
    ).additional,
    20,
  );
  assert.match(capacityProductLabel(capacity, slice), /16 dilim daha/);
});
test("rotation, height, round boxes and weight limits are accounted for", () => {
  const rotated = {
    ...slice,
    dimensions: { length: 100, width: 30, height: 30 },
  };
  assert.equal(
    packagingCapacity({ ...box, length: 60 }, [], []).forProduct(rotated)
      .maximum,
    2,
  );
  assert.equal(
    packagingCapacity(box, [], []).forProduct({
      ...slice,
      dimensions: { ...slice.dimensions, height: 41 },
    }).additional,
    0,
  );
  const weighted = packagingCapacity(
    { ...box, maxProductWeight: 500 },
    [{ productId: 1, quantity: 6 }],
    [slice],
  );
  assert.equal(weighted.forProduct(slice).maximum, 10);
  assert.equal(weighted.forProduct(slice).additional, 4);
  const round = packagingCapacity(
    { shape: "cylinder", diameter: 100, height: 40 },
    [],
    [],
  );
  assert.ok(Math.abs(round.totalVolume - Math.PI * 100) < 1e-9);
  assert.equal(
    round.forProduct({
      ...slice,
      dimensions: { length: 80, width: 80, height: 20 },
    }).maximum,
    0,
  );
});
test("missing dimensions, fractional slice counts and mass units never yield misleading remaining counts", () => {
  assert.equal(packagingCapacity(null).ready, false);
  assert.equal(packagingCapacity({ ...box, height: null }).ready, false);
  const missing = { ...slice, dimensions: { length: 20, width: 20 } };
  const unknown = packagingCapacity(
    box,
    [{ productId: 1, quantity: 1 }],
    [missing],
  );
  assert.equal(unknown.ready, false);
  assert.equal(unknown.volumePercent, undefined);
  assert.equal(unknown.forProduct, undefined);
  assert.match(unknown.reason, /Baklava/);
  assert.equal(
    packagingCapacity(box, [{ productId: 1, quantity: 1.5 }], [slice]).ready,
    false,
  );
  assert.equal(
    packagingCapacity(box, [], []).forProduct({
      ...slice,
      unitPricing: { unit: "Gram", weight: 1 },
    }).additional,
    undefined,
  );
  assert.equal(
    packagingCapacity({ ...box, maxProductWeight: 100 }, [], []).forProduct({
      ...slice,
      unitPricing: { unit: "Dilim" },
    }).additional,
    undefined,
  );
});
test("full and overfull boxes never return negative capacity and box changes recompute counts", () => {
  const items = [{ productId: 1, quantity: 26 }];
  const capacity = packagingCapacity(box, items, [slice]);
  assert.equal(capacity.overCapacity, true);
  assert.equal(capacity.forProduct(slice).additional, 0);
  assert.equal(
    packagingCapacity({ ...box, length: 200 }, items, [slice]).forProduct(slice)
      .additional,
    24,
  );
  assert.equal(
    packagingCapacity(
      { ...box, maxProductWeight: 10 },
      [{ productId: 1, quantity: 1 }],
      [slice],
    ).overCapacity,
    true,
  );
});
