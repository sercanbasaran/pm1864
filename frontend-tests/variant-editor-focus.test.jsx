import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import VariantEditor from "../src/modules/variants/VariantEditor.jsx";
import { settle } from "./shadow-queries.js";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const base = { id: 1, name: "Baklava", productCode: "0100000001", categoryId: "a", status: "Aktif", unitPricing: { unit: "Dilim", price: 100, weight: 40 }, variants: [
  { id: "v1", size: "Porsiyon", sku: "001", sourceProductId: 1, quantity: 2, price: 200, priceOverride: null, typeId: "item", slices: 0, weight: 80, unit: "Dilim", packaging: "Tabakta servis", consumables: [], images: [], active: true },
  { id: "v2", size: "Kutu", sku: "002", sourceProductId: 1, quantity: 4, price: 999, priceOverride: 999, typeId: "item", slices: 0, weight: 160, unit: "Dilim", packaging: "Metal kutu", consumables: [], images: [], active: true },
]};
const catalog = { revision: 1, products: [base], categories: [{id:"a",name:"Baklava",code:"0100",active:true}], variantTypes: [{id:"item", name:"Adet"}], consumables: [] };
test("seçili varyant düzenlenir, diğer varyant değişmeden korunur", async () => {
 const fetch = vi.fn(async (url, options) => new Response(JSON.stringify({catalog:{...catalog,revision:2}}),{status:200})); vi.stubGlobal('fetch',fetch);
 render(<CatalogProvider snapshot={catalog} notify={vi.fn()}><VariantEditor product={base} focusVariantId="v1" onClose={vi.fn()} /></CatalogProvider>); await settle();
 const names = [...document.querySelectorAll("sl-input")].filter(input => input.label === "Varyant adı");
 expect(names).toHaveLength(1);
 expect(names[0].value).toBe("Porsiyon");
 for (let step = 0; step < 3; step++) {
   const next = [...document.querySelectorAll('sl-button')].find(x => x.textContent.trim() === 'Devam et');
   fireEvent.click(next); await settle();
 }
 const optional = [...document.querySelectorAll('sl-details.variant-optional-section')];
 expect(optional).toHaveLength(2); expect(optional.every(x => !x.open)).toBe(true);
 const save = [...document.querySelectorAll('sl-button')].find(x => x.textContent.trim() === 'Varyantı kaydet'); fireEvent.click(save); await settle();
 expect(fetch).toHaveBeenCalled();
 const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/products/1"));
 if (!call) throw new Error(document.querySelector("sl-alert")?.textContent || "İstek yapılmadı");
 const body = JSON.parse(call[1].body);
 expect(body.product.variants[1]).toEqual(base.variants[1]);
});

test("çok varyantlı ürün kompakt seçim listesiyle açılır", async () => {
 render(<CatalogProvider snapshot={catalog} notify={vi.fn()}><VariantEditor product={base} onClose={vi.fn()} /></CatalogProvider>); await settle();
 expect(document.querySelectorAll('.variant-choice-row')).toHaveLength(2);
 expect(document.querySelector('.category-gallery')).toBeNull();
 fireEvent.click(document.querySelector('sl-button[aria-label="Kutu düzenle"]')); await settle();
 const names = [...document.querySelectorAll('sl-input')].filter(input => input.label === 'Varyant adı');
 expect(names).toHaveLength(1); expect(names[0].value).toBe('Kutu');
});
