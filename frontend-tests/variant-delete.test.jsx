import React from "react";
import {test, expect, vi, afterEach} from "vitest";
import {render, fireEvent, cleanup, waitFor} from "@testing-library/react";
import {CatalogProvider} from "../src/app/CatalogContext.jsx";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import {settle} from "./shadow-queries.js";
afterEach(()=>{cleanup();vi.unstubAllGlobals();sessionStorage.clear();});
test("varyant silme onay ister ve yetki varsa listede ve döşemede sunulur",async()=>{
 const variant={id:"v1",size:"Porsiyon",typeId:"item",price:100,weight:100,active:true,publicCardEnabled:true};
 const product={id:1,name:"Baklava",variants:[variant]}; const snapshot={revision:2,products:[product],categories:[],variantTypes:[{id:"item",name:"Adet"}]};
 const fetch=vi.fn(async()=>new Response(JSON.stringify({catalog:{...snapshot,revision:3,products:[{...product,variants:[]}]}}),{status:200,headers:{"content-type":"application/json"}}));vi.stubGlobal("fetch",fetch);
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantManagement products={[product]} categories={[]} canWrite onEdit={vi.fn()} /></CatalogProvider>);await settle();
 fireEvent.click(document.querySelector('.variant-desktop-table sl-button[aria-label="Porsiyon varyantını sil"]'));await settle();
 expect(document.querySelector('sl-dialog').textContent).toContain('QR bağlantısı');expect(fetch.mock.calls.filter(c=>String(c[0]).includes("/variants/v1"))).toHaveLength(0);
 fireEvent.click([...document.querySelectorAll('sl-dialog sl-button')].find(b=>b.textContent.trim()==='Varyantı sil'));
 await waitFor(()=>expect(fetch.mock.calls.filter(c=>String(c[0]).includes('/variants/v1'))).toHaveLength(1));expect(fetch.mock.calls.find(c=>String(c[0]).includes('/variants/v1'))[1].method).toBe('DELETE');
});
test("yetkisiz kullanıcıya silme gösterilmez",async()=>{
 const product={id:1,name:"Ürün",variants:[{id:"v1",size:"Porsiyon",typeId:"item",price:1,weight:1}]};
 render(<CatalogProvider snapshot={{products:[product],categories:[],variantTypes:[{id:"item",name:"Adet"}]}} notify={vi.fn()}><VariantManagement products={[product]} categories={[]} canWrite={false} onEdit={vi.fn()}/></CatalogProvider>);await settle();
 expect(document.querySelector('sl-button[aria-label="Porsiyon varyantını sil"]')).toBeNull();
});
