import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import ProductManagement from "../src/modules/products/ProductManagement.jsx";
import { primaryModules } from "../src/app/modules.js";
import { settle } from "./shadow-queries.js";

afterEach(() => { cleanup(); sessionStorage.clear(); });
const snapshot = { revision: 1, categories: [{ id: "a", name: "Baklava", code: "0100", active: true }], variantTypes: [], products: [1, 2].map(id => ({ id, name: `Ürün ${id}`, productCode: `010000000${id}`, categoryId: "a", status: "Aktif", variants: [], updated: "2026-01-01" })) };
test("döşemede birden fazla ürün seçimi toplu işleme aktarılır", async () => {
  const bulk = vi.fn();
  render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><ProductManagement user={{role:"editor"}} onBulk={bulk} onEdit={vi.fn()} onNew={vi.fn()} onCard={vi.fn()} onDuplicate={vi.fn()} /></CatalogProvider>);
  await settle();
  fireEvent.click(document.querySelector('sl-button[aria-label="Kart görünümü"]'));
  await settle();
  for (const id of [1, 2]) fireEvent(document.querySelector(`sl-checkbox[aria-label="Ürün ${id} seç"]`), new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  expect(document.querySelector('.selection-bar').textContent).toContain('2 ürün seçildi');
  const action = [...document.querySelectorAll('sl-button')].find(b => b.textContent.includes('Toplu fiyat güncelle'));
  fireEvent.click(action);
  expect(bulk).toHaveBeenCalledWith([1, 2]);
});
test("ana menü istenen sıradadır", () => {
  expect(primaryModules.map(m => m.id)).toEqual(["overview", "product-management", "channel-management", "sales-management", "campaign-management", "user-management", "packaging-center", "library", "system-settings"]);
});
