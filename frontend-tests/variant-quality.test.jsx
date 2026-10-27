import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import { missingVariantInformation } from "../src/modules/variants/variant-quality.js";
import { settle } from "./shadow-queries.js";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
test("eksik görsel filtresi tablo ve döşemeye uygulanır ve temizlenir", async () => {
  const variants = [
    {
      id: "a",
      size: "Görselsiz",
      price: 10,
      weight: 20,
      typeId: "t",
      active: true,
    },
    {
      id: "b",
      size: "Görselli",
      price: 20,
      weight: 30,
      typeId: "t",
      images: [{ id: "i", url: "/i.png" }],
      active: true,
    },
  ];
  const products = [{ id: 1, name: "Baklava", variants }];
  render(
    <CatalogProvider
      snapshot={{
        products,
        categories: [],
        variantTypes: [{ id: "t", name: "Porsiyon" }],
      }}
      notify={vi.fn()}
    >
      <VariantManagement
        products={products}
        categories={[]}
        onEdit={vi.fn()}
        onCard={vi.fn()}
      />
    </CatalogProvider>,
  );
  await settle();
  const accordion = [...document.querySelectorAll("sl-details")].find((d) =>
    String(d.summary).includes("Tamamlanacak varyant"),
  );
  expect(accordion.open).toBe(false);
  fireEvent.click(
    [...accordion.querySelectorAll("sl-button")].find((b) =>
      b.textContent.includes("Görseli olmayan varyantlar"),
    ),
  );
  await settle();
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(document.querySelector("tbody").textContent).toContain("Görselsiz");
  expect(
    document.querySelectorAll(".variant-mobile-cards article"),
  ).toHaveLength(1);
  fireEvent.click(
    [...accordion.querySelectorAll("sl-button")].find((b) =>
      b.textContent.includes("Eksik bilgi filtresini temizle"),
    ),
  );
  await settle();
  expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
});
test("karma varyant bilgileri içerikteki ürünlerden kontrol edilir; manuel boşaltma korunur", () => {
  const owner = { id: 1, name: "Lokum", category: "Lokumlar" };
  const products = [
    owner,
    { id: 2, name: "Baklava", ingredients: "Fıstık", allergens: "Süt" },
  ];
  const v = { items: [{ productId: 2, quantity: 1 }] };
  expect(missingVariantInformation(v, "ingredients", products, [], owner)).toBe(
    false,
  );
  expect(
    missingVariantInformation(
      { ...v, informationOverrides: { ingredients: "" } },
      "ingredients",
      products,
      [],
      owner,
    ),
  ).toBe(true);
  expect(
    missingVariantInformation(
      { ...v, items: [] },
      "composition",
      products,
      [],
      owner,
    ),
  ).toBe(true);
});
