import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CatalogProvider } from '../src/app/CatalogContext.jsx';
import VariantExcel from '../src/modules/variants/VariantExcel.jsx';
import { settle } from './shadow-queries.js';
const category = { id:'a', name:'Baklava', code:'0100', active:true };
const product = { id:1, name:'Baklava', productCode:'0100000001', categoryId:'a', category:'Baklava', status:'Aktif', unitPricing:{unit:'Dilim',price:10,weight:40}, variants:[] };
const snapshot = {revision:0, categories:[category], products:[product], variantTypes:[{id:'type-portion',name:'Porsiyon'}], consumables:[]};
afterEach(cleanup);
test('manual variant rows are checked and changing an input clears the preview', async () => {
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantExcel manualOnly onClose={vi.fn()} /></CatalogProvider>); await settle();
 for (const [label,value] of [['Ürün kodu','0100000001'],['Varyant adı','Üçlü'],['Varyant tipi','Porsiyon'],['Ürünler ve miktarlar','0100000001:3']]) fireEvent.change(document.querySelector(`input[aria-label="1. satır ${label}"]`),{target:{value}});
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.includes('Satırları kontrol et'))); await settle();
 expect(document.body.textContent).toContain('1 satır · 0 hatalı');
 expect(document.body.textContent).toContain('Varyantları içe aktar');
 fireEvent.change(document.querySelector('input[aria-label="1. satır Varyant adı"]'),{target:{value:'Dörtlü'}});
 expect(document.body.textContent).not.toContain('Varyantları içe aktar');
});
