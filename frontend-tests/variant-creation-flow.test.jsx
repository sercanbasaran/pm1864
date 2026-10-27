import React from 'react';
import {test,expect,vi,afterEach} from 'vitest';
import {render,fireEvent,cleanup} from '@testing-library/react';
import {CatalogProvider} from '../src/app/CatalogContext.jsx';
import VariantManagement from '../src/modules/variants/VariantManagement.jsx';
import {settle} from './shadow-queries.js';
afterEach(cleanup);
test('creation has one entry point and its product choice does not change list filters',async()=>{
 const product={id:1,name:'Baklava',status:'Aktif',variants:[],unitPricing:{unit:'Dilim',price:100,weight:40}};const onEdit=vi.fn();
 render(<CatalogProvider snapshot={{products:[product],categories:[],variantTypes:[{id:"portion",name:"Porsiyon"}]}} notify={vi.fn()}><VariantManagement products={[product]} categories={[]} canWrite onEdit={onEdit}/></CatalogProvider>);await settle();
 const buttons=()=>[...document.querySelectorAll('sl-button')];
 expect(buttons().filter(b=>b.textContent.trim()==='Varyant ekle')).toHaveLength(1);
 fireEvent.click(buttons().find(b=>b.textContent.trim()==='Varyant ekle'));await settle();
 const type=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant türü');type.value='portion';fireEvent(type,new CustomEvent('sl-change',{bubbles:true}));await settle();
 const select=[...document.querySelectorAll('sl-select')].find(s=>s.label==='Varyant oluşturulacak ürün');select.value='1';fireEvent(select,new CustomEvent('sl-change',{bubbles:true}));await settle();
 expect(document.querySelector('sl-select[aria-label="Varyant ürünü"]').value).toBe('__empty__');
 fireEvent.click(buttons().find(b=>b.textContent.trim()==='Varyant oluştur'));await settle();expect(onEdit).toHaveBeenCalledWith(product,true,"","portion");
});
