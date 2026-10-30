import React from "react";
import { afterEach, test, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import ProductManagement from "../src/modules/products/ProductManagement.jsx";
import ProductDetails from "../src/modules/products/ProductDetails.jsx";
import { productCardData } from "../src/product-card.js";
import { settle } from "./shadow-queries.js";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
const products = [
  {
    id: 1,
    name: "Baklava",
    status: "Aktif",
    categoryId: "a",
    productCode: "1000100",
    variants: [
      {
        id: "mix",
        size: "Karışık kutu",
        items: [{ productId: 1 }, { productId: 2 }],
        price: 100,
        weight: 200,
      },
    ],
  },
  {
    id: 2,
    name: "Lokum",
    status: "Aktif",
    categoryId: "a",
    productCode: "1000101",
    variants: [],
  },
  {
    id: 3,
    name: "Muhallebi",
    status: "Aktif",
    categoryId: "a",
    productCode: "1000102",
    variants: [],
  },
];
test("variantless product filter excludes products contained in another owner's mixed variant", async () => {
  const snapshot = {
    revision: 1,
    products,
    categories: [{ id: "a", name: "Tatlılar", active: true }],
    variantTypes: [],
  };
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ProductManagement
        user={{ role: "viewer" }}
        focus={{ quality: "noVariants" }}
        onEdit={vi.fn()}
        onBulk={vi.fn()}
        onNew={vi.fn()}
        onDuplicate={vi.fn()}
        onCard={vi.fn()}
      />
    </CatalogProvider>,
  );
  await settle();
  const rows = document.querySelectorAll("tbody tr");
  expect(rows).toHaveLength(1);
  expect(rows[0].textContent).toContain("Muhallebi");
  expect(
    document.querySelector('sl-select[aria-label="İçerik eksikliği"]').value,
  ).toBe("noVariants");
});
test("product card bottom table shows mixed variants containing this product", () => {
  render(
    <ProductDetails
      product={productCardData(
        products[1],
        [],
        "",
        undefined,
        undefined,
        products,
      )}
    />,
  );
  expect(
    document.querySelector(".product-card-variants").textContent,
  ).toContain("Ürünün dahil olduğu varyantlar");
  expect(
    document.querySelector(".product-card-variants tbody").textContent,
  ).toContain("Karışık kutu");
});

test("portion filter and incomplete-record count exclude valid portion definitions", async () => {
  const data = products.map((p) => ({
    ...p,
    unitPricing: { unit: "Dilim", price: 100, weight: 40 },
    ...(p.id === 1 ? { portion: { unit: "Dilim", quantity: 3 } } : {}),
  }));
  const snapshot = {
    revision: 1,
    products: data,
    categories: [{ id: "a", name: "Tatlılar", active: true }],
    variantTypes: [],
  };
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ProductManagement
        user={{ role: "viewer" }}
        focus={{ quality: "portion" }}
        onEdit={vi.fn()}
        onBulk={vi.fn()}
        onNew={vi.fn()}
        onDuplicate={vi.fn()}
        onCard={vi.fn()}
      />
    </CatalogProvider>,
  );
  await settle();
  const rows = document.querySelectorAll("tbody tr");
  expect(rows).toHaveLength(2);
  expect([...rows].map((row) => row.textContent).join(" ")).not.toContain(
    "Baklava",
  );
  const filter = document.querySelector(
    'sl-select[aria-label="İçerik eksikliği"]',
  );
  expect(filter.value).toBe("portion");
  const summary = [
    ...document.querySelectorAll(".product-quality-actions sl-button"),
  ].find((button) => button.textContent.includes("Porsiyon bilgisi"));
  expect(summary.querySelector("sl-badge").textContent).toBe("2");
});
