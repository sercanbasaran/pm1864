import React from "react";
import {test,expect,vi,afterEach} from "vitest";
import {render,cleanup,fireEvent} from "@testing-library/react";
import {CatalogProvider} from "../src/app/CatalogContext.jsx";
import VariantCreatePage from "../src/modules/variants/VariantCreatePage.jsx";
import PackagingCenter from "../src/modules/packaging/PackagingCenter.jsx";
import {defaultPackagingItems} from "../src/modules/packaging/packaging-data.js";
import {settle} from "./shadow-queries.js";
afterEach(cleanup);
const p={id:1,name:"Baklava",productCode:"01001",categoryId:"a",status:"Aktif",variants:[],unitPricing:{unit:"Dilim",price:100,weight:40}};
const snapshot={revision:1,products:[p],categories:[{id:"a",name:"Baklava",code:"0100",active:true}],variantTypes:[{id:"type-box",name:"Kutu"},{id:"portion",name:"Porsiyon"}],packagingItems:defaultPackagingItems(),consumables:[],satietyProducts:[]};
test("kutu seçilince kutu tipi görünür ve seçim oluşturma akışına taşınır",async()=>{
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantCreatePage onClose={vi.fn()}/></CatalogProvider>);await settle();
 expect([...document.querySelectorAll('sl-select')].find(s=>s.label==='Kutu tipi')).toBeUndefined();
 const type=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant türü');type.value='type-box';fireEvent(type,new CustomEvent('sl-change',{bubbles:true}));await settle();
 const box=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Kutu tipi');expect(box).toBeTruthy();expect(box.textContent).toContain('Kırmızı XL Metal Baklava Kutusu');
 box.value='packaging-default-1';fireEvent(box,new CustomEvent('sl-change',{bubbles:true}));const name=[...document.querySelectorAll('sl-input')].find(s=>s.label==='Varyant adı');name.value='XL';fireEvent(name,new CustomEvent('sl-input',{bubbles:true}));await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()==='Devam et'));await settle();fireEvent.click(document.querySelector('sl-button[aria-label="Baklava seç"]'));await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()==='Geri'));await settle();expect([...document.querySelectorAll('sl-select')].find(s=>s.label==='Kutu tipi').value).toBe('packaging-default-1');
});
test("ambalaj merkezi 13 hazır kutuyu ve düzenleme formunu sunar",async()=>{
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><PackagingCenter canWrite /></CatalogProvider>);await settle();expect(document.querySelectorAll('.packaging-list article')).toHaveLength(13);fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.includes('Yeni ambalaj')));await settle();expect([...document.querySelectorAll('sl-input')].some(i=>i.label==='Uzunluk (mm)')).toBe(true);
});
