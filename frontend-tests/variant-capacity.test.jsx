import React, { useState } from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import VariantCompositionFields from "../src/modules/variants/VariantCompositionFields.jsx";
import { settle } from "./shadow-queries.js";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
const first = {
  id: 1,
  name: "Fıstıklı",
  status: "Aktif",
  variants: [],
  unitPricing: { unit: "Dilim", price: 100, weight: 50 },
  dimensions: { length: 20, width: 20, height: 30 },
};
const second = {
  ...first,
  id: 2,
  name: "Cevizli",
  dimensions: { length: 40, width: 20, height: 20 },
};
const box = {
  id: "box",
  name: "Kutu",
  shape: "rectangular",
  length: 100,
  width: 100,
  height: 40,
  active: true,
  maxProductWeight: 5000,
  allowedProductIds: [1, 2],
};
function Harness({ snapshot, onReady, initialId }) {
  const [product, setProduct] = useState({
    ...first,
    variants: [
      {
        id: initialId,
        size: "Karışık",
        typeId: "type-box",
        packagingId: "box",
        packaging: "Metal kutu",
        items: [{ productId: 1, quantity: 5 }],
        consumables: [],
      },
    ],
  });
  return (
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <VariantCompositionFields
        product={product}
        onChange={setProduct}
        initialStep={1}
        onReady={onReady}
      />
    </CatalogProvider>
  );
}
const snapshot = {
  products: [first, second],
  categories: [],
  variantTypes: [{ id: "type-box", name: "Kutu" }],
  packagingItems: [
    box,
    { ...box, id: "large", name: "Büyük kutu", length: 200 },
  ],
  satietyProducts: [],
  consumables: [],
};
const capacity = () =>
  document.querySelector('[aria-label="Cevizli kapasitesi"]').textContent;
async function quantity(value) {
  const input = document.querySelector(
    'sl-input[aria-label="Fıstıklı yatay adedi"]',
  );
  input.value = String(value);
  fireEvent(input, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
}
test("picker and selected products update remaining slices after quantities, additions, removals and box changes", async () => {
  render(<Harness snapshot={snapshot} />);
  await settle();
  expect(
    document.querySelector('[aria-label="Kutu kapasitesi"]').textContent,
  ).toContain("Taban doluluğu");
  expect(capacity()).toContain("10 dilim daha");
  await quantity(10);
  expect(capacity()).toContain("7 dilim daha");
  fireEvent.click(
    document.querySelector('sl-button[aria-label="Cevizli seç"]'),
  );
  await settle();
  expect(document.querySelectorAll(".variant-selected-product")).toHaveLength(
    2,
  );
  expect(capacity()).toContain("6 dilim daha");
  fireEvent.click(
    document.querySelector('sl-button[aria-label="Cevizli kaldır"]'),
  );
  await settle();
  expect(capacity()).toContain("7 dilim daha");
  fireEvent.click(
    [...document.querySelectorAll("sl-button")].find(
      (x) => x.textContent.trim() === "Geri",
    ),
  );
  await settle();
  const select = [...document.querySelectorAll("sl-select")].find(
    (x) => x.label === "Kutu tipi",
  );
  select.value = "large";
  fireEvent(select, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  fireEvent.click(
    [...document.querySelectorAll("sl-button")].find(
      (x) => x.textContent.trim() === "Devam et",
    ),
  );
  await settle();
  expect(capacity()).toContain("20 dilim daha");
});
test("missing measurements show an explanation instead of a fabricated remaining quantity", async () => {
  render(
    <Harness
      snapshot={{
        ...snapshot,
        products: [{ ...first, dimensions: null }, second],
      }}
    />,
  );
  await settle();
  expect(
    document.querySelector('[aria-label="Kutu kapasitesi"]').textContent,
  ).toContain("ölçü");
  expect(capacity()).not.toContain("dilim daha");
});

const clickText = async (label, root = document) => {
  fireEvent.click(
    [...root.querySelectorAll("sl-button")].find(
      (button) => button.textContent.trim() === label,
    ),
  );
  await settle();
};
test("full width grid supports 4 horizontal plus 8 vertical pieces and blocks navigation below 95 percent or above kg limits", async () => {
  const ready = vi.fn();
  const measured = {
    ...snapshot,
    products: [
      { ...first, dimensions: { length: 50, width: 25, height: 30 } },
      second,
    ],
    packagingItems: [{ ...box, length: 150, maxProductWeight: 600 }],
  };
  render(<Harness snapshot={measured} onReady={ready} initialId="saved" />);
  await settle();
  expect(ready).toHaveBeenLastCalledWith(false);
  expect(
    [...document.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === "Devam et",
    ).disabled,
  ).toBe(true);
  await clickText("Kutu yerleşimini aç");
  const dialog = document.querySelector("sl-dialog.variant-layout-dialog");
  expect(dialog.open).toBe(true);
  expect(dialog.querySelector('svg[role="img"]')).not.toBeNull();
  for (const [label, value] of [
    ["Fıstıklı yatay adedi", 4],
    ["Fıstıklı dikey adedi", 8],
  ]) {
    const control = dialog.querySelector(`sl-input[aria-label="${label}"]`);
    control.value = String(value);
    fireEvent(control, new CustomEvent("sl-input", { bubbles: true }));
    await settle();
  }
  expect(dialog.querySelectorAll("svg g")).toHaveLength(12);
  expect(ready).toHaveBeenLastCalledWith(true);
  expect(dialog.textContent).toContain("0,6 kg");
  fireEvent.click(dialog.querySelector('sl-button[aria-label="Cevizli seç"]'));
  await settle();
  expect(ready).toHaveBeenLastCalledWith(false);
  fireEvent.click(
    dialog.querySelector('sl-button[aria-label="Cevizli yerleşimden kaldır"]'),
  );
  await settle();
  expect(ready).toHaveBeenLastCalledWith(true);

  await clickText("Yerleşime dön", dialog);
  expect(document.querySelector("sl-dialog")).toBeNull();
  expect(
    [...document.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === "Devam et",
    ).disabled,
  ).toBe(false);
  const vertical = document.querySelector(
    'sl-input[aria-label="Fıstıklı dikey adedi"]',
  );
  vertical.value = "9";
  fireEvent(vertical, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  expect(ready).toHaveBeenLastCalledWith(false);
  expect(
    [...document.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === "Devam et",
    ).disabled,
  ).toBe(true);
});
test("a feasible filler recommendation updates orientation counts and enables progression", async () => {
  render(<Harness snapshot={snapshot} />);
  await settle();
  const suggestion = document.querySelector(
    'sl-button[aria-label="Fıstıklı önerisini uygula"]',
  );
  expect(suggestion).not.toBeNull();
  fireEvent.click(suggestion);
  await settle();
  expect(
    document.querySelector('[aria-label="Kutu kapasitesi"]').textContent,
  ).toContain("Yerleşim uygun");
  expect(
    [...document.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === "Devam et",
    ).disabled,
  ).toBe(false);
});
