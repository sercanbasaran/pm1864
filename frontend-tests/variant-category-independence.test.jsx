import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import { variantCardData, variantCardEligible } from "../src/product-card.js";
import { settle } from "./shadow-queries.js";
afterEach(() => {cleanup(); sessionStorage.clear();});
const categories=[{id:"a",name:"Baklava",code:"0100",active:true},{id:"b",name:"Lokum",code:"0200",active:true}];
const variant={id:"v1",size:"Karışık kutu",sku:"X01",active:true,typeId:"box",price:100,weight:100,items:[{productId:1,quantity:1},{productId:2,quantity:2}]};
const products=[{id:1,name:"Fıstıklı",productCode:"01001",categoryId:"a",status:"Aktif",variants:[variant]},{id:2,name:"Güllü lokum",productCode:"02001",categoryId:"b",status:"Aktif",variants:[]}];
const setup=async()=>{render(<CatalogProvider snapshot={{products,categories,variantTypes:[{id:"box",name:"Kutu"}]}} notify={vi.fn()}><VariantManagement products={products} categories={categories} canWrite onCreate={vi.fn()} onEdit={vi.fn()} onCard={vi.fn()} onDuplicate={vi.fn()} /></CatalogProvider>);await settle();};
const choose=async(selector,value)=>{const el=document.querySelector(selector);el.value=value;fireEvent(el,new CustomEvent('sl-change',{bubbles:true}));await settle();};
test("karma varyantın her iki ürününü ve kategori filtresini bulur",async()=>{
 await setup();expect(document.querySelector('thead').textContent).not.toContain('İÇERİKTEKİ ÜRÜNLER');expect(document.querySelector('.variant-desktop-table tbody').textContent).not.toContain('Güllü lokum');
 expect(document.querySelector('thead').textContent).not.toContain('KATEGORİ');
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()==='Filtreleri Aç'));await settle();
 await choose('sl-select[aria-label="İçerikteki ana kategori"]','b');expect(document.querySelector('.variant-results').textContent).toContain('1 varyant');
 await choose('sl-select[aria-label="Varyant ürünü"]','2');expect(document.querySelector('.variant-results').textContent).toContain('1 varyant');
 const search=document.querySelector('sl-input[aria-label="Varyant ara"]');search.value='02001';fireEvent(search,new CustomEvent('sl-input',{bubbles:true}));await settle();expect(document.querySelector('.variant-results').textContent).toContain('1 varyant');
});
test("varyant kartı tek bir ürün kategorisi atamaz",()=>{
 const card=variantCardData(products[0],variant,categories,products);expect(card.category).toBe('');expect(card.description).toContain('Fıstıklı');expect(card.description).toContain('Güllü lokum');expect(card.variantContents).toHaveLength(2);
});

test("varyant kartı kategori durumundan bağımsız, tüm ürünler aktifken yayınlanabilir",()=>{
 const inactiveCategories=categories.map(category=>({...category,active:false}));
 expect(variantCardEligible(products[0],variant,inactiveCategories,products)).toBe(true);
 expect(variantCardEligible(products[0],variant,categories,[products[0],{...products[1],status:"Taslak"}])).toBe(false);
 expect(variantCardEligible(products[0],{...variant,active:false},categories,products)).toBe(false);
});
