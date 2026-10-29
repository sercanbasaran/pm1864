import React from 'react';
import {test,expect,vi,afterEach} from 'vitest';
import {render,cleanup,fireEvent} from '@testing-library/react';
import ProductManagement from '../src/modules/products/ProductManagement.jsx';
import VariantManagement from '../src/modules/variants/VariantManagement.jsx';
import {CatalogProvider} from '../src/app/CatalogContext.jsx';
import {settle} from './shadow-queries.js';
afterEach(()=>{cleanup();sessionStorage.clear();});
const variant={id:'v',size:'Fıstıklı Lokum [M]',sku:'1111.10102',typeId:'box',unit:'Gram',quantity:1000,weight:1000,price:2000,calculatedPrice:1980,active:true,packagingName:'Kırmızı M Metal Lokum Kutusu',images:[{id:'selected-image',url:'/api/media/selected-image/content'}]};
const product={id:1,name:'Fıstıklı Lokum',productCode:'1111101',categoryId:'a',status:'Aktif',variants:[variant]};
const snapshot={revision:1,products:[product],categories:[{id:'a',name:'Lokum',active:true}],variantTypes:[{id:'box',name:'Kutu'}]};
test('product view buttons restore and visibly reflect the selected view',async()=>{
 sessionStorage.setItem('product-list-view','grid');
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><ProductManagement user={{role:'viewer'}} onEdit={vi.fn()} onBulk={vi.fn()} onNew={vi.fn()} onDuplicate={vi.fn()} onCard={vi.fn()}/></CatalogProvider>);await settle();
 const grid=document.querySelector('sl-button[aria-label="Kart görünümü"]'),list=document.querySelector('sl-button[aria-label="Liste görünümü"]');
 expect(grid.variant).toBe('primary');expect(grid.getAttribute('aria-pressed')).toBe('true');expect(list.variant).toBe('default');
 fireEvent.click(list);await settle();expect(list.variant).toBe('primary');expect(grid.variant).toBe('default');expect(sessionStorage.getItem('product-list-view')).toBe('list');
});
test('variant tiles show the selected photo, prices and working detail action; page size has no visible label',async()=>{
 sessionStorage.setItem('variant-list-view','grid');const onEdit=vi.fn();
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><VariantManagement products={[product]} categories={snapshot.categories} canWrite onEdit={onEdit} onDuplicate={vi.fn()} onCard={vi.fn()}/></CatalogProvider>);await settle();
 const card=document.querySelector('.variant-summary-card');
 expect(card.querySelector('img').getAttribute('src')).toBe('/api/media/selected-image/content?size=tile');expect(card.textContent).toContain('1111.10102');expect(card.textContent).toContain('Hesaplanan fiyat:');
 fireEvent.click(card.querySelector('.variant-card-image-link'));expect(onEdit).toHaveBeenCalledWith(product,false,'v');
 const select=document.querySelector('.variant-list-footer sl-select');expect(select.label || '').toBe('');expect(select.getAttribute('aria-label')).toBe('Sayfa başına varyant');
 expect(document.querySelector('sl-button[aria-label="Döşeme görünümü"]').variant).toBe('primary');
});
