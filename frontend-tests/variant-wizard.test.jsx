import React, {useState} from "react";
import {test, expect, vi, afterEach} from "vitest";
import {render, fireEvent, cleanup} from "@testing-library/react";
import {CatalogProvider} from "../src/app/CatalogContext.jsx";
import VariantCompositionFields from "../src/modules/variants/VariantCompositionFields.jsx";
import {settle} from "./shadow-queries.js";
afterEach(cleanup);
const first={id:1,name:"Fıstıklı",productCode:"01001",status:"Aktif",unitPricing:{unit:"Dilim",price:100,weight:50},ingredients:"Fıstık",variants:[]};
const second={id:2,name:"Cevizli",productCode:"01002",status:"Aktif",unitPricing:{unit:"Dilim",price:80,weight:100},ingredients:"Ceviz",variants:[]};
const catalog={products:[first,second],categories:[],variantTypes:[{id:"portion",name:"Porsiyon"}],satietyProducts:[],consumables:[]};
function Harness(){const [product,setProduct]=useState({...first,variants:[{size:"Karışık",typeId:"portion",sourceProductId:1,quantity:1,items:[{productId:1,quantity:1}],packaging:"",consumables:[],images:[],priceOverride:null}]});return <VariantCompositionFields product={product} onChange={setProduct} onReady={vi.fn()} />;}
const click=async label=>{fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()===label));await settle();};
test("wizard tür, ürünler, fiyat ve bilgileri sırayla düzenler",async()=>{
 render(<CatalogProvider snapshot={catalog} notify={vi.fn()}><Harness /></CatalogProvider>);await settle();
 expect(document.querySelector('[aria-current="step"]').textContent).toContain('Varyant türü');
 await click('Devam et');
 const select=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Ürün ekle');select.value='2';fireEvent(select,new CustomEvent('sl-change',{bubbles:true}));await settle();await click('Ürünü ekle');
 expect(document.querySelectorAll('.variant-wizard-item')).toHaveLength(2);
 await click('Devam et');
 const packaging=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Ambalaj / servis şekli');packaging.value='Metal%20kutu';fireEvent(packaging,new CustomEvent('sl-change',{bubbles:true}));await settle();
 expect(document.querySelector('.variant-calculation').textContent).toContain('180');
 await click('Devam et');
 expect(document.querySelector('[aria-current="step"]').textContent).toContain('Ürün bilgileri');
 const ingredients=[...document.querySelectorAll('sl-textarea')].find(t=>t.label==='İçindekiler');expect(ingredients.value).toContain('Fıstıklı: Fıstık');expect(ingredients.value).toContain('Cevizli: Ceviz');
 expect(document.querySelector('.variant-wizard-section').textContent).toContain('besin değerleri eksik');
});
