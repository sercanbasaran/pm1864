import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {render,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {CatalogProvider} from '../src/app/CatalogContext.jsx';
import ProductImport from '../src/modules/products/ProductImport.jsx';
import VariantExcel from '../src/modules/variants/VariantExcel.jsx';
import {settle} from './shadow-queries.js';
const mocks=vi.hoisted(()=>({rows:[]}));
vi.mock('../src/modules/transfer/transfer.js',()=>({readTransferFile:vi.fn(async()=>mocks.rows),downloadTransfer:vi.fn(),formatLabel:()=> 'JSON'}));
const product={id:1,name:'Mevcut ürün',productCode:'1010100',sku:'1010.100',categoryId:'child',category:'Fıstıklı',status:'Taslak',description:'',ingredients:'Mevcut içerik',unitPricing:{unit:'Dilim',price:50,weight:40},salesAvailability:{store:false},variants:[{id:'v1',sku:'1010.10001',size:'Mevcut varyant',typeId:'type-item',price:50,weight:40,slices:1,unit:'Dilim',packaging:'',active:false}]};
const snapshot={revision:0,products:[product],categories:[{id:'root',name:'Baklava',code:'10',active:true},{id:'child',name:'Fıstıklı',parentId:'root',code:'10',active:true}],variantTypes:[{id:'type-item',name:'Adet'}],packagingItems:[],consumables:[]};
afterEach(()=>{cleanup();vi.restoreAllMocks();mocks.rows=[];});
async function upload(){fireEvent.change(document.querySelector('input[type="file"]'),{target:{files:[{name:'data.json',size:100}]}});await settle();}
function action(text){return [...document.querySelectorAll('sl-button')].find(button=>button.textContent.trim()===text);}
test('product code match uses PUT, fills only blanks and preserves variants and channels',async()=>{
 mocks.rows=[{'Ürün kodu':'1010100','Ürün adı':'Yeni ad','Kısa açıklama':'Tamamlanan açıklama','İçindekiler':'Yeni içerik','Birim fiyat':'99','Mağaza':'Açık'}];
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(JSON.stringify({catalog:{...snapshot,revision:1}}),{status:200}));
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><ProductImport format="json" onClose={vi.fn()}/></CatalogProvider>);await upload();
 expect(document.body.textContent).toContain('Eksikleri tamamla');expect(document.body.textContent).toContain('Hazır');
 fireEvent.click(action('Ürünleri içe aktar'));await waitFor(()=>expect(fetch).toHaveBeenCalled());
 const [url,options]=fetch.mock.calls.find(([url])=>String(url).includes('/products/1'));expect(url).toBe('/api/products/1');expect(options.method).toBe('PUT');
 const saved=JSON.parse(options.body).product;expect(saved.name).toBe('Mevcut ürün');expect(saved.description).toBe('Tamamlanan açıklama');expect(saved.ingredients).toBe('Mevcut içerik');expect(saved.unitPricing.price).toBe(50);expect(saved.salesAvailability.store).toBe(false);expect(saved.variants).toEqual(product.variants);
});
test('variant SKU match updates the existing variant without appending duplicates',async()=>{
 mocks.rows=[{'Varyant kodu':'1010.10001','Varyant adı':'Farklı ad','Satış fiyatı':'99','Ambalaj / servis':'Metal kutu'}];
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(JSON.stringify({catalog:{...snapshot,revision:1}}),{status:200}));
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantExcel format="json" onClose={vi.fn()}/></CatalogProvider>);await upload();
 expect(document.body.textContent).toContain('Eksikleri tamamla');expect(document.body.textContent).toContain('Hazır');
 fireEvent.click(action('Varyantları içe aktar'));await waitFor(()=>expect(fetch).toHaveBeenCalled());
 const saved=JSON.parse(fetch.mock.calls.find(([url])=>String(url).includes('/products/1'))[1].body).product;
 expect(saved.variants).toHaveLength(1);expect(saved.variants[0]).toMatchObject({id:'v1',sku:'1010.10001',size:'Mevcut varyant',price:50,packaging:'Metal kutu',active:false});
});
