import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CatalogProvider } from '../src/app/CatalogContext.jsx';
import ProductManagement from '../src/modules/products/ProductManagement.jsx';
import { settle } from './shadow-queries.js';
const snapshot = { revision:1, categories:[{id:'a',name:'Baklava',code:'0100',active:true}], variantTypes:[], products:[1,2].map(id => ({id,name:`Ürün ${id}`,productCode:`010000000${id}`,categoryId:'a',status:'Aktif',variants:[],updated:'2026-01-01'})) };
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });
test('selected products open a bulk update dialog with channel and unit fields', async () => {
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><ProductManagement user={{role:'editor'}} onBulk={vi.fn()} onEdit={vi.fn()} onNew={vi.fn()} onCard={vi.fn()} onDuplicate={vi.fn()} /></CatalogProvider>);
 await settle();
 fireEvent.click(document.querySelector('sl-button[aria-label="Kart görünümü"]')); await settle();
 for (const id of [1,2]) fireEvent(document.querySelector(`sl-checkbox[aria-label="Ürün ${id} seç"]`),new CustomEvent('sl-change',{bubbles:true}));
 await settle();
 fireEvent.click([...document.querySelectorAll('sl-button')].find(button => button.textContent.includes('Toplu ürün işlemleri'))); await settle();
 const dialog = document.querySelector('sl-dialog.bulk-products-dialog');
 expect(dialog).not.toBeNull(); expect(dialog.textContent).toContain('2 ürün seçildi');
 expect([...dialog.querySelectorAll('sl-select')].map(select => select.label)).toEqual(expect.arrayContaining(['Birim türü','Mağaza','E-Mağaza']));
});
