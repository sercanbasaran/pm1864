import React from 'react';
import {test,expect,vi,afterEach} from 'vitest';
import {render,fireEvent,cleanup} from '@testing-library/react';
import {CatalogProvider} from '../src/app/CatalogContext.jsx';
import VariantManagement from '../src/modules/variants/VariantManagement.jsx';
import VariantCreatePage from '../src/modules/variants/VariantCreatePage.jsx';
import {settle} from './shadow-queries.js';
afterEach(cleanup);
const categories=[{id:'a',name:'Baklava',code:'0100',active:true},{id:'b',name:'Lokum',code:'0200',active:true}];
const products=[{id:1,name:'Fıstıklı',productCode:'0100001',categoryId:'a',status:'Aktif',variants:[],unitPricing:{unit:'Dilim',price:100,weight:40}},{id:2,name:'Lokum',productCode:'0200001',categoryId:'b',status:'Aktif',variants:[],unitPricing:{unit:'Adet',price:50,weight:25}}];
const snapshot={products,categories,variantTypes:[{id:'portion',name:'Porsiyon'}],consumables:[],satietyProducts:[]};
test('varyant oluştur doğrudan oluşturma sayfasına yönlendirir',async()=>{
 const onCreate=vi.fn();render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantManagement products={products} categories={categories} canWrite onCreate={onCreate} onEdit={vi.fn()}/></CatalogProvider>);await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()==='Varyant oluştur'));expect(onCreate).toHaveBeenCalledOnce();expect(document.querySelector('sl-dialog')).toBeNull();
});
test('sihirbaz türü seçtirir, ürünleri arama ve kategoriyle filtreler',async()=>{
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantCreatePage onClose={vi.fn()}/></CatalogProvider>);await settle();
 expect(document.querySelector('[aria-label="Varyant oluştur"]')).toBeTruthy();
 const type=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant türü');type.value='portion';fireEvent(type,new CustomEvent('sl-change',{bubbles:true}));
 const name=[...document.querySelectorAll('sl-input')].find(i=>i.label==='Varyant adı');name.value='Porsiyon';fireEvent(name,new CustomEvent('sl-input',{bubbles:true}));await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.trim()==='Devam et'));await settle();
 const cat=document.querySelector('sl-select[aria-label="Varyant ürün kategorisi"]');cat.value='a';fireEvent(cat,new CustomEvent('sl-change',{bubbles:true}));await settle();
 expect(document.querySelectorAll('.variant-product-picker-row')).toHaveLength(1);expect(document.querySelector('.variant-product-picker-row').textContent).toContain('Fıstıklı');
 const search=document.querySelector('sl-input[aria-label="Varyant için ürün ara"]');search.value='bulunmaz';fireEvent(search,new CustomEvent('sl-input',{bubbles:true}));await settle();expect(document.querySelector('.variant-product-picker-results').textContent).toContain('Uygun ürün bulunamadı');
 search.value='0100001';fireEvent(search,new CustomEvent('sl-input',{bubbles:true}));await settle();fireEvent.click(document.querySelector('sl-button[aria-label="Fıstıklı seç"]'));await settle();
 expect(document.querySelector('[aria-label="Varyant oluştur"]')).toBeTruthy();expect(document.querySelector('[aria-current="step"]').textContent).toContain('Ürünler');
});
