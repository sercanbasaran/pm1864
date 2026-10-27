import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import { settle } from "./shadow-queries.js";
afterEach(() => { cleanup(); sessionStorage.clear(); });
const variant = { id: "v1", sku: "V001", size: "Porsiyon", typeId: "item", price: 100, weight: 100, active: true, unit: "Dilim" };
const product = { id: 1, name: "Baklava", productCode: "0100123456", status: "Aktif", variants: [variant] };
test("ürün koduyla arama ve sonuç bulunamadığında filtre temizleme", async () => {
 render(<CatalogProvider snapshot={{ products:[product], categories:[], variantTypes:[{id:"item",name:"Adet"}] }} notify={vi.fn()}><VariantManagement products={[product]} categories={[]} canWrite onEdit={vi.fn()} onDuplicate={vi.fn()} /></CatalogProvider>);
 await settle();
 const search = document.querySelector('sl-input[aria-label="Varyant ara"]');
 search.value = '0100123456'; fireEvent(search,new CustomEvent('sl-input',{bubbles:true})); await settle();
 expect(document.querySelector('.variant-results').textContent).toContain('1 varyant');
 search.value = 'bulunmayan'; fireEvent(search,new CustomEvent('sl-input',{bubbles:true})); await settle();
 expect(document.querySelector('.empty').textContent).toContain('Varyant bulunamadı');
 fireEvent.click([...document.querySelectorAll('.empty sl-button')].find(b=>b.textContent.includes('Filtreleri temizle'))); await settle();
 expect(document.querySelector('.variant-results').textContent).toContain('1 varyant');
});
test("seçilen döşeme görünümü butonda belirtilir", async () => {
 render(<CatalogProvider snapshot={{ products:[product], categories:[], variantTypes:[] }} notify={vi.fn()}><VariantManagement products={[product]} categories={[]} canWrite onEdit={vi.fn()} onDuplicate={vi.fn()} /></CatalogProvider>); await settle();
 const grid = document.querySelector('sl-button[aria-label="Döşeme görünümü"]'); fireEvent.click(grid); await settle();
 expect(grid.getAttribute('aria-pressed')).toBe('true'); expect(document.querySelector('.variant-view-grid')).toBeTruthy();
});
