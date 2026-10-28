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
const snapshot={revision:1,products:[p],categories:[{id:"a",name:"Baklava",code:"0100",active:true}],variantTypes:[{id:"type-box",name:"Kutu"},{id:"portion",name:"Porsiyon"}],packagingItems:defaultPackagingItems().map(box=>({...box,allowedProductIds:[1]})),consumables:[],satietyProducts:[]};
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

test('packaging image drop uploads, refreshes revision and saves the image reference',async()=>{
 const calls=[];const asset={id:'box-image',url:'/api/media/box-image/content'};
 const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,options={})=>{
  const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
  if(url==='/api/media')return new Response(JSON.stringify({asset}),{status:201});
  if(url==='/api/catalog')return new Response(JSON.stringify({catalog:{...snapshot,revision:2}}),{status:200});
  return new Response(JSON.stringify({catalog:{...snapshot,revision:3}}),{status:200});
 });
 try {
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><PackagingCenter canWrite /></CatalogProvider>);await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.includes('Yeni ambalaj')));await settle();
 const name=[...document.querySelectorAll('sl-input')].find(i=>i.label==='Ambalaj adı');name.value='Görselli kutu';fireEvent(name,new CustomEvent('sl-input',{bubbles:true}));
 fireEvent.drop(document.querySelector('.packaging-image-upload'),{dataTransfer:{types:['Files'],files:[new File(['image'],'box.png',{type:'image/png'})]}});
 await new Promise(resolve=>setTimeout(resolve,150));await settle();
 expect(document.querySelector('.packaging-image-upload img')?.getAttribute('src')).toBe(asset.url);
 fireEvent.submit(document.querySelector('.packaging-form'));await settle();
 const saved=calls.find(c=>c.url==='/api/packaging');expect(saved.body.mediaId).toBe(asset.id);expect(saved.body.expectedRevision).toBe(2);
 }finally{fetchMock.mockRestore();}
});

test('unapproved box products cannot be selected in variant creation',async()=>{
 const locked={...snapshot,packagingItems:defaultPackagingItems().map(box=>({...box,allowedProductIds:[]}))};
 render(<CatalogProvider snapshot={locked} notify={vi.fn()}><VariantCreatePage onClose={vi.fn()}/></CatalogProvider>);await settle();
 const type=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant türü');type.value='type-box';fireEvent(type,new CustomEvent('sl-change',{bubbles:true}));await settle();
 const box=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Kutu tipi');box.value='packaging-default-1';fireEvent(box,new CustomEvent('sl-change',{bubbles:true}));
 const name=[...document.querySelectorAll('sl-input')].find(s=>s.label==='Varyant adı');name.value='Onaysız kutu';fireEvent(name,new CustomEvent('sl-input',{bubbles:true}));await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()==='Devam et'));await settle();
 expect(document.querySelector('sl-button[aria-label="Baklava seç"]').disabled).toBe(true);
 expect(document.body.textContent).toContain('Bu ürün seçilen kutu için onaylı değil.');
});

test('box selection shows uploaded photos and category approval enables its products',async()=>{
 const boxes=defaultPackagingItems().map(box=>({...box,mediaId:'box-image',allowedCategoryIds:['a']}));
 render(<CatalogProvider snapshot={{...snapshot,packagingItems:boxes}} notify={vi.fn()}><VariantCreatePage onClose={vi.fn()}/></CatalogProvider>);await settle();
 const type=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant türü');type.value='type-box';fireEvent(type,new CustomEvent('sl-change',{bubbles:true}));await settle();
 const box=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Kutu tipi');expect(box.querySelector('img')?.getAttribute('src')).toBe('/api/media/box-image/content');
 box.value='packaging-default-1';fireEvent(box,new CustomEvent('sl-change',{bubbles:true}));await settle();
 expect(document.querySelector('.packaging-selected-preview img')?.getAttribute('src')).toBe('/api/media/box-image/content');
 const name=[...document.querySelectorAll('sl-input')].find(s=>s.label==='Varyant adı');name.value='Kategori onaylı';fireEvent(name,new CustomEvent('sl-input',{bubbles:true}));await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()==='Devam et'));await settle();
 expect(document.querySelector('sl-button[aria-label="Baklava seç"]').disabled).toBe(false);
});

test('internal volume updates immediately and disappears when a dimension is cleared',async()=>{
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><PackagingCenter canWrite /></CatalogProvider>);await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.includes('Yeni ambalaj')));await settle();
 for(const [label,value] of [['Uzunluk (mm)','200'],['Genişlik (mm)','100'],['Yükseklik (mm)','50']]){
  const input=[...document.querySelectorAll('sl-input')].find(i=>i.label===label);input.value=value;fireEvent(input,new CustomEvent('sl-input',{bubbles:true}));
 }
 await settle();expect(document.querySelector('.packaging-volume-summary output').textContent).toBe('≈ 1.000 cm³ · 1 L');
 const height=[...document.querySelectorAll('sl-input')].find(i=>i.label==='Yükseklik (mm)');height.value='';fireEvent(height,new CustomEvent('sl-input',{bubbles:true}));await settle();
 expect(document.querySelector('.packaging-volume-summary output').textContent).toContain('iç ölçüleri girin');
});
