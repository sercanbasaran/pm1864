import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import ProductEditor from "../src/modules/products/ProductEditor.jsx";
import { settle } from "./shadow-queries.js";

const category = { id: "root", name: "Baklava", active: true, parentId: "" };
const draft = { isNew: true, name: "", categoryId: "root", category: "Baklava", status: "Taslak", description: "", allergens: "", customImage: "", variants: [] };
const snapshot = { revision: 0, products: [], categories: [category], variantTypes: [], satietyProducts: [], settings: {}, logs: [] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("creation steps preserve the draft, route validation to the relevant step, and save on completion", async () => {
  const close = vi.fn();
  const fetch = vi.fn(async () => new Response(JSON.stringify({ catalog: { ...snapshot, revision: 1 } }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><ProductEditor product={draft} onClose={close} /></CatalogProvider>);
  await settle();
  const step = (label) => [...document.querySelectorAll('nav[aria-label="Ürün oluşturma adımları"] button')].find((button) => button.textContent.includes(label));
  fireEvent.click(step("Ürünü tamamla"));
  fireEvent.submit(document.querySelector("form"));
  await settle();
  expect(document.body.textContent).toContain("Ürün adı gerekli.");
  expect(step("Genel bilgiler").getAttribute("aria-current")).toBe("step");
  const input = document.querySelector('sl-input[aria-label="Ürün adı"]');
  input.value = "Deneme baklava";
  fireEvent(input, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  fireEvent.click(step("Ürün bilgileri"));
  expect(document.querySelector('sl-textarea[aria-label="İçindekiler"]')).not.toBeNull();
  fireEvent.click(step("Ürün görselleri"));
  expect(document.body.textContent).toContain("Ürün görselleri");
  fireEvent.click(step("Ürünü tamamla"));
  expect(document.body.textContent).toContain("Deneme baklava");
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() => expect(close).toHaveBeenCalled());
  const call = fetch.mock.calls.find(([url]) => String(url).endsWith("/products"));
  expect(JSON.parse(call[1].body).product.name).toBe("Deneme baklava");
});
