import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { CatalogProvider } from '../src/app/CatalogContext.jsx';
import BulkCreateProducts from '../src/modules/products/BulkCreateProducts.jsx';
import { settle } from './shadow-queries.js';
const categories = [{id:'root',name:'Baklava',code:'0100',active:true},{id:'child',name:'Fıstıklı',code:'001',parentId:'root',active:true},{id:'other',name:'Lokum',code:'0200',active:true}];
const snapshot = {revision:0,categories,products:[],variantTypes:[]};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
test('creates product in selected subcategory with unit pricing and channel preferences', async () => {
 const close = vi.fn();
 const fetch = vi.spyOn(globalThis,'fetch').mockImplementation(async () => new Response(JSON.stringify({catalog:{...snapshot,revision:1}}),{status:200}));
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><BulkCreateProducts onClose={close} /></CatalogProvider>); await settle();
 const changeSelect = async (selector,value) => { const select=document.querySelector(selector); select.value=value; fireEvent(select,new CustomEvent('sl-change',{bubbles:true})); await settle(); };
 const name=document.querySelector('sl-input[aria-label="1. ürün adı"]'); name.value='Yeni baklava'; fireEvent(name,new CustomEvent('sl-input',{bubbles:true}));
 await changeSelect('sl-select[aria-label="1. ürün ana kategorisi"]','root');
 await changeSelect('sl-select[aria-label="1. ürün alt kategorisi"]','child');
 const unit=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Ürün birimi'); unit.value='Dilim'; fireEvent(unit,new CustomEvent('sl-change',{bubbles:true})); await settle();
 for (const [label,value] of [['Birim fiyat','50'],['Birim gramajı','40']]) { const input=document.querySelector(`sl-input[aria-label="${label}"]`); input.value=value; fireEvent(input,new CustomEvent('sl-input',{bubbles:true})); await settle(); }
 const channel=document.querySelector('sl-switch[aria-label="Mağaza"]'); channel.checked=true; fireEvent(channel,new CustomEvent('sl-change',{bubbles:true})); await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.includes('Ürünleri oluştur')));
 await waitFor(()=>expect(close).toHaveBeenCalledOnce());
 const sent=JSON.parse(fetch.mock.calls.find(([url])=>String(url).endsWith('/products'))[1].body).product;
 expect(sent.categoryId).toBe('child'); expect(sent.unitPricing).toEqual({unit:'Dilim',price:50,weight:40}); expect(sent.salesAvailability.store).toBe(true);
});
test('changing the main category clears the previous subcategory', async () => {
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><BulkCreateProducts onClose={vi.fn()} /></CatalogProvider>); await settle();
 const root=document.querySelector('sl-select[aria-label="1. ürün ana kategorisi"]');
 root.value='root'; fireEvent(root,new CustomEvent('sl-change',{bubbles:true})); await settle();
 const child=document.querySelector('sl-select[aria-label="1. ürün alt kategorisi"]'); child.value='child'; fireEvent(child,new CustomEvent('sl-change',{bubbles:true})); await settle();
 root.value='other'; fireEvent(root,new CustomEvent('sl-change',{bubbles:true})); await settle();
 expect(document.querySelector('sl-select[aria-label="1. ürün alt kategorisi"]').value).toBe('__empty__');
});
