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
 const table=document.querySelector('.variant-desktop-table');expect(table.textContent).not.toContain('SATIŞ KANALLARI');expect(table.querySelectorAll('.variant-row-actions sl-button')).toHaveLength(3);
 fireEvent.click(table.querySelector('sl-button[aria-label="Baklava Porsiyon varyant kartı ve QR"]'));expect(onCard).toHaveBeenCalledWith(product,variant);
});
