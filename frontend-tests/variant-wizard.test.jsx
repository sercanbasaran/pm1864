import React, { useState } from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import VariantCompositionFields from "../src/modules/variants/VariantCompositionFields.jsx";
import { settle } from "./shadow-queries.js";
afterEach(cleanup);
const first = {
  id: 1,
  name: "Fıstıklı",
  productCode: "01001",
  status: "Aktif",
  unitPricing: { unit: "Dilim", price: 100, weight: 50 },
  ingredients: "Fıstık",
  images: [{ id: "photo1", url: "/first.png" }],
  variants: [],
};
const second = {
  id: 2,
  name: "Cevizli",
  productCode: "01002",
  status: "Aktif",
  unitPricing: { unit: "Dilim", price: 80, weight: 100 },
  ingredients: "Ceviz",
  images: [{ id: "photo2", url: "/second.png" }],
  variants: [],
};
const catalog = {
  products: [first, second],
  categories: [],
  variantTypes: [{ id: "portion", name: "Porsiyon" }],
  satietyProducts: [],
  consumables: [{ id: "napkin", name: "Peçete", active: true }],
};
const ready = vi.fn();
function Harness() {
  const [product, setProduct] = useState({
    ...first,
    variants: [
      {
        size: "Karışık",
        typeId: "portion",
        sourceProductId: 1,
        quantity: 1,
        items: [{ productId: 1, quantity: 1 }],
        packaging: "",
        consumables: [],
        images: [],
        priceOverride: null,
      },
    ],
  });
  return (
    <VariantCompositionFields
      product={product}
      onChange={setProduct}
      onReady={ready}
    />
  );
}
const click = async (label) => {
  fireEvent.click(
    [...document.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === label,
    ),
  );
  await settle();
};
test("wizard tür, ürünler, fiyat ve bilgileri sırayla düzenler", async () => {
  render(
    <CatalogProvider snapshot={catalog} notify={vi.fn()}>
      <Harness />
    </CatalogProvider>,
  );
  await settle();
  expect(document.querySelector('[aria-current="step"]').textContent).toContain(
    "Varyant türü",
  );
  await click("Devam et");
  expect(
    document.querySelector(".variant-product-transfer > div:first-child")
      .textContent,
  ).toContain("Eklenebilir ürünler");
  expect(
    document.querySelector(".variant-product-transfer > div:last-child")
      .textContent,
  ).toContain("Eklenen ürünler");
  expect(
    document.querySelector('sl-button[aria-label="Fıstıklı kaldır"]').disabled,
  ).toBe(true);
  fireEvent.click(
    document.querySelector('sl-button[aria-label="Cevizli seç"]'),
  );
  await settle();
  expect(document.querySelectorAll(".variant-wizard-item")).toHaveLength(2);
  expect(
    document.querySelectorAll(".variant-selected-identity img"),
  ).toHaveLength(2);
  fireEvent.click(
    document.querySelector('sl-button[aria-label="Fıstıklı kaldır"]'),
  );
  await settle();
  expect(
    document.querySelector('sl-button[aria-label="Cevizli kaldır"]').disabled,
  ).toBe(true);
  fireEvent.click(
    document.querySelector('sl-button[aria-label="Fıstıklı seç"]'),
  );
  await settle();
  await click("Devam et");
  expect(document.querySelector(".variant-wizard-section h3").textContent).toBe(
    "Fiyat",
  );
  expect(
    [...document.querySelectorAll("sl-input,sl-select")].some((s) =>
      ["Servis şekli", "Ambalaj / servis şekli"].includes(s.label),
    ),
  ).toBe(false);
  expect(document.querySelector(".variant-calculation").textContent).toContain(
    "180",
  );
  await click("Devam et");
  expect(document.querySelector('[aria-current="step"]').textContent).toContain(
    "Ürün bilgileri",
  );
  const ingredients = [...document.querySelectorAll("sl-textarea")].find(
    (t) => t.label === "İçindekiler",
  );
  expect(ingredients.value).toContain("Fıstıklı: Fıstık");
  expect(ingredients.value).toContain("Cevizli: Ceviz");
  expect(
    document.querySelector(".variant-wizard-section").textContent,
  ).toContain("besin değerleri eksik");
  expect(document.querySelector(".category-gallery")).toBeNull();
  expect(ready).toHaveBeenLastCalledWith(false);
  await click("Devam et");
  expect(document.querySelector(".variant-wizard-section h3").textContent).toBe(
    "Varyant görselleri",
  );
  fireEvent.click(document.querySelector(".variant-photo-options input"));
  await settle();
  expect(document.querySelector(".category-gallery img")).toBeTruthy();
  await click("Devam et");
  expect(document.querySelector(".variant-wizard-section h3").textContent).toBe(
    "Varyantı tamamla",
  );
  expect(ready).toHaveBeenLastCalledWith(true);
  const supply = [...document.querySelectorAll("sl-select")].find(
    (s) => s.label === "Sarf malzeme ekle",
  );
  supply.value = "napkin";
  fireEvent(supply, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  expect(
    document.querySelector(".variant-wizard-section").textContent,
  ).toContain("Peçete");
  await click("Geri");
  expect(document.querySelector(".variant-photo-options input").checked).toBe(
    true,
  );
  await click("Devam et");
  expect(
    document.querySelector(".variant-wizard-section").textContent,
  ).toContain("Peçete");
});
