import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import ProductManagement from "../src/modules/products/ProductManagement.jsx";
import { settle } from "./shadow-queries.js";
const snapshot = { revision:1, categories:[{id:"a",name:"Baklava",code:"0100",active:true}], variantTypes:[], products:[{id:1,name:"Baklava",productCode:"0100000001",categoryId:"a",status:"Aktif",variants:[]}] };
afterEach(() => { cleanup(); sessionStorage.clear(); });
function show(focus) { return render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><ProductManagement user={{role:"editor"}} focus={focus} onEdit={vi.fn()} onBulk={vi.fn()} onNew={vi.fn()} onDuplicate={vi.fn()} onCard={vi.fn()} /></CatalogProvider>); }
test("product search survives unmount and is removed when filters are cleared", async () => {
 const screen = show(); await settle();
 const search = document.querySelector('sl-input[aria-label="Ürün ara"]');
 search.value = "Baklava"; fireEvent(search,new CustomEvent("sl-input",{bubbles:true})); await settle();
 expect(JSON.parse(sessionStorage.getItem("hm1864:filter:products:query"))).toBe("Baklava");
 screen.unmount(); show(); await settle();
 expect(document.querySelector('sl-input[aria-label="Ürün ara"]').value).toBe("Baklava");
 const search2 = document.querySelector('sl-input[aria-label="Ürün ara"]'); search2.value = ""; fireEvent(search2,new CustomEvent("sl-input",{bubbles:true})); await settle();
 expect(JSON.parse(sessionStorage.getItem("hm1864:filter:products:query"))).toBe("");
});
test("invalid stored values fall back to empty filters", async () => {
 sessionStorage.setItem("hm1864:filter:products:query", "{bad"); show(); await settle();
 expect(document.querySelector('sl-input[aria-label="Ürün ara"]').value).toBe("");
});
