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
  images: [{ id: "photo", url: "/fistikli.png" }],
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
  expect(dialog.querySelector(".grid-product-name").textContent).toContain(
    "Fıstıklı",
  );
  expect(
    dialog
      .querySelector(".variant-layout-product-heading img")
      .getAttribute("alt"),
  ).toBe("Fıstıklı");
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
  expect(
    dialog.querySelector('sl-button[aria-label="Cevizli yerleşimden kaldır"]'),
  ).toBeNull();
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
  expect(ready).toHaveBeenLastCalledWith(true);
  expect(
    document.querySelector('sl-input[aria-label="Fıstıklı dikey adedi"]').value,
  ).toBe("8");
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

test("separators can be positioned and resized with at most two horizontal and three vertical", async () => {
  render(<Harness snapshot={snapshot} />);
  await settle();
  await clickText("Kutu yerleşimini aç");
  const dialog = document.querySelector("sl-dialog");
  for (let i = 0; i < 2; i++) await clickText("Yatay separatör ekle", dialog);
  expect(
    [...dialog.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === "Yatay separatör ekle",
    ).disabled,
  ).toBe(true);
  for (let i = 0; i < 3; i++) await clickText("Dikey separatör ekle", dialog);
  expect(
    [...dialog.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === "Dikey separatör ekle",
    ).disabled,
  ).toBe(true);
  expect(dialog.querySelectorAll(".box-separator")).toHaveLength(5);
  const width = dialog.querySelector(
    'sl-input[aria-label="1. separatör genişliği"]',
  );
  width.value = "10";
  fireEvent(width, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  expect(dialog.querySelector(".box-separator").getAttribute("height")).toBe(
    "10",
  );
  fireEvent.click(
    dialog.querySelector('sl-button[aria-label="1. separatörü kaldır"]'),
  );
  await settle();
  expect(
    [...dialog.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === "Yatay separatör ekle",
    ).disabled,
  ).toBe(false);
});

test("individual pieces rotate and invalid keyboard moves retain the previous placement", async () => {
  render(<Harness snapshot={snapshot} />);
  await settle();
  await clickText("Kutu yerleşimini aç");
  const dialog = document.querySelector("sl-dialog");
  let piece = dialog.querySelector('svg g[role="button"]');
  fireEvent.focus(piece);
  await settle();
  await clickText("Seçili dilimi yatay / dikey çevir", dialog);
  piece = dialog.querySelector('svg g[role="button"]');
  expect(piece.textContent).toContain("1D");
  const before = piece.querySelector("rect").getAttribute("x");
  fireEvent.keyDown(piece, { key: "ArrowLeft" });
  await settle();
  expect(dialog.textContent).toContain("çarpamaz");
  expect(
    dialog.querySelector('svg g[role="button"] rect').getAttribute("x"),
  ).toBe(before);
});

test("fill with separators preserves product positions and updates usable base occupancy", async () => {
  render(<Harness snapshot={snapshot} />);
  await settle();
  await clickText("Kutu yerleşimini aç");
  const dialog = document.querySelector("sl-dialog");
  const coordinates = () =>
    [...dialog.querySelectorAll('svg g[role="button"] rect')].map((r) => [
      r.getAttribute("x"),
      r.getAttribute("y"),
    ]);
  const before = coordinates();
  await clickText("Separatör ile doldur", dialog);
  expect(dialog.querySelectorAll(".box-separator").length).toBeGreaterThan(0);
  expect(coordinates()).toEqual(before);
  expect(
    dialog.querySelector('[aria-label="Kutu kapasitesi"]').textContent,
  ).toContain("Yerleşim uygun");
  expect(dialog.textContent).toContain("Dikey eşit dağıt");
  expect(dialog.textContent).toContain("Yatay eşit dağıt");
});
