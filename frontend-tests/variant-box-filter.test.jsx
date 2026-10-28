import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CatalogProvider } from '../src/app/CatalogContext.jsx';
import VariantManagement from '../src/modules/variants/VariantManagement.jsx';
import { settle } from './shadow-queries.js';
const variants=[{id:'v1',size:'Kırmızı',typeId:'type-box',packagingId:'box-a',price:10,weight:100,active:true},{id:'v2',size:'Mavi',typeId:'type-box',packagingId:'box-b',price:20,weight:100,active:true},{id:'v3',size:'Porsiyon',typeId:'type-portion',price:10,weight:100,active:true}];
const product={id:1,name:'Baklava',productCode:'0100',categoryId:'a',status:'Aktif',variants};
const categories=[{id:'a',name:'Baklava',active:true}];
const snapshot={revision:0,products:[product],categories,variantTypes:[{id:'type-box',name:'Kutu'},{id:'type-portion',name:'Porsiyon'}],packagingItems:[{id:'box-a',name:'Kırmızı kutu',active:true},{id:'box-b',name:'Mavi kutu',active:false}]};
afterEach(()=>{cleanup();sessionStorage.clear();});
const show=()=>render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantManagement products={snapshot.products} categories={categories} canWrite onEdit={vi.fn()} onCreate={vi.fn()} /></CatalogProvider>);
async function select(el,value){el.value=value;fireEvent(el,new CustomEvent('sl-change',{bubbles:true}));await settle();}
test('box filter appears for box variants, persists, and is cleared when type changes',async()=>{
 const screen=show();await settle();
 const type=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant tipi filtresi');
 await select(type,'type-box');
 const box=document.querySelector('sl-select[aria-label="Kutu tipi filtresi"]');expect(box).not.toBeNull();
 await select(box,'box-a');expect(document.querySelector('.variant-results').textContent).toContain('1 varyant listeleniyor');
 screen.unmount();show();await settle();
 expect(document.querySelector('sl-select[aria-label="Kutu tipi filtresi"]').value).toBe('box-a');
 const newType=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant tipi filtresi');await select(newType,'type-portion');
 expect(document.querySelector('sl-select[aria-label="Kutu tipi filtresi"]')).toBeNull();
 expect(document.querySelector('.variant-results').textContent).toContain('1 varyant listeleniyor');
 expect(JSON.parse(sessionStorage.getItem('hm1864:filter:variants:list:box'))).toBe('');
});
