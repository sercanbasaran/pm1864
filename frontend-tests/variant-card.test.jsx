import React from "react";
import {test,expect,vi,afterEach} from "vitest";
import {render,cleanup,fireEvent} from "@testing-library/react";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import {CatalogProvider} from "../src/app/CatalogContext.jsx";
import {settle} from "./shadow-queries.js";
afterEach(cleanup);
test("varyant tablosu ikonlu kart işlemini açar ve satış kanallarını göstermez",async()=>{
 const variant={id:"v1",size:"Porsiyon",sku:"123",price:200,weight:100,active:true,typeId:"item",quantity:2,unit:"Dilim"};
 const product={id:1,name:"Baklava",status:"Aktif",variants:[variant]};const onCard=vi.fn();
 render(<CatalogProvider snapshot={{products:[product],categories:[],variantTypes:[{id:"item",name:"Adet"}]}} notify={vi.fn()}><VariantManagement products={[product]} categories={[]} canWrite onEdit={vi.fn()} onDuplicate={vi.fn()} onCard={onCard}/></CatalogProvider>);await settle();
 const table=document.querySelector('.variant-desktop-table');expect(table.textContent).not.toContain('SATIŞ KANALLARI');expect(table.querySelectorAll('.variant-row-actions sl-button')).toHaveLength(4);
 fireEvent.click(table.querySelector('sl-button[aria-label="Baklava Porsiyon varyant kartı ve QR"]'));expect(onCard).toHaveBeenCalledWith(product,variant);
});
test("varyant kimliği görselle birlikte, miktar etiketi ve hesaplanan fiyatla gösterilir",async()=>{
 const variant={id:"v1",size:"Porsiyon",sku:"123",price:200,calculatedPrice:180,weight:100,active:true,typeId:"item",quantity:2,unit:"Dilim",packaging:"Tabakta servis",images:[{id:"i1",url:"/img.png"}]};
 const product={id:1,name:"Baklava",status:"Aktif",variants:[variant]};
 render(<CatalogProvider snapshot={{products:[product],categories:[],variantTypes:[{id:"item",name:"Adet"}]}} notify={vi.fn()}><VariantManagement products={[product]} categories={[]} canWrite onEdit={vi.fn()} onDuplicate={vi.fn()} onCard={vi.fn()} /></CatalogProvider>);await settle();
 const table=document.querySelector('.variant-desktop-table');const identity=table.querySelector('.variant-identity');
 expect(identity.textContent).toContain('Porsiyon');expect(identity.textContent).toContain('123');expect(identity.textContent).toContain('Adet');expect(identity.querySelector('img').getAttribute('src')).toBe('/img.png');
 const serving=table.querySelector('.variant-serving-cell');expect(serving.firstElementChild.textContent).toBe('Tabakta servis');expect(serving.querySelector('sl-tag').getAttribute('size')).toBe('small');expect(serving.querySelector('sl-tag').textContent).toContain('2 Dilim');
 expect(table.querySelector('.variant-price-cell').textContent).toContain('180');expect(table.querySelector('.variant-price-cell').textContent).toContain('200');
});
