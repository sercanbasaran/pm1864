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
  allowedProductIds: [1, 2],
};
function Harness({ snapshot }) {
  const [product, setProduct] = useState({
    ...first,
    variants: [
      {
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
    'sl-input[aria-label="Fıstıklı miktarı"]',
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
  ).toContain("Hacim doluluğu");
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
    [...document.querySelectorAll("sl-button")].find((x) => x.textContent.trim() === "Geri"),
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
