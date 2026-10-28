import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import { duplicateVariant } from "../src/catalog.js";
import { settle } from "./shadow-queries.js";

afterEach(() => { cleanup(); sessionStorage.clear(); });
const variant = { id: "v1", sku: "0100000001.01", size: "Porsiyon", typeId: "item", price: 100, weight: 100, active: true, quantity: 1, sourceProductId: 1, images: [{ id: "i1", url: "image" }], consumables: [{ id: "napkin", quantity: 1 }] };
const product = { id: 1, name: "Baklava", productCode: "0100000001", status: "Aktif", variants: [variant], unitPricing: { unit: "Dilim", price: 100, weight: 100 } };
async function show(canWrite = true, products = [product]) {
 const onDuplicate = vi.fn();
 render(<CatalogProvider snapshot={{ products, categories: [], variantTypes: [{id:"item",name:"Adet"}] }} notify={vi.fn()}><VariantManagement products={products} categories={[]} canWrite={canWrite} onEdit={vi.fn()} onDuplicate={onDuplicate} /></CatalogProvider>);
 await settle();
 return onDuplicate;
}
test("varyant çoğaltma listede ve döşemede seçilen varyantı açar", async () => {
 const duplicate = await show();
 fireEvent.click(document.querySelector('.variant-desktop-table sl-button[aria-label="Baklava Porsiyon varyantını çoğalt"]'));
 await settle();
 fireEvent.click([...document.querySelectorAll('sl-dialog sl-button')].find(b => b.textContent.includes('Tek varyant çoğalt')));
 expect(duplicate).toHaveBeenCalledWith(product, variant);
 fireEvent.click(document.querySelector('sl-button[aria-label="Döşeme görünümü"]'));
 await settle();
 fireEvent.click(document.querySelector('.variant-view-grid sl-button[aria-label="Baklava Porsiyon varyantını çoğalt"]'));
 await settle();
 fireEvent.click([...document.querySelectorAll('sl-dialog sl-button')].find(b => b.textContent.includes('Tek varyant çoğalt')));
 expect(duplicate).toHaveBeenCalledTimes(2);
});
test("kopya bağımsız kimlik ve benzersiz isim ile oluşturulur", () => {
 const copy = duplicateVariant(structuredClone(variant), [variant, {size:"Porsiyon Kopya"}]);
 expect(copy.id).toBeUndefined(); expect(copy.sku).toBeUndefined(); expect(copy.size).toBe("Porsiyon Kopya 2");
 expect(copy.images).toEqual(variant.images); copy.images[0].id = "changed"; expect(variant.images[0].id).toBe("i1");
});
test("görüntüleyiciler çoğaltamaz ve 50 varyant sınırında işlem kapalıdır", async () => {
 await show(false); expect(document.querySelector('.variant-desktop-table sl-button[aria-label$="varyantını çoğalt"]')).toBeNull(); cleanup();
 const full = {...product, variants: Array.from({length:50}, (_, i) => ({...variant,id:`v${i}`,size:`Varyant ${i}`}))};
 await show(true, [full]);
 expect(document.querySelector('.variant-desktop-table sl-button[aria-label$="varyantını çoğalt"]').disabled).toBe(true);
});
