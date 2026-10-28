import React,{useState} from 'react';
import {test,expect,afterEach} from 'vitest';
import {render,cleanup,fireEvent} from '@testing-library/react';
import ProductDimensions from '../src/modules/products/ProductDimensions.jsx';
import {settle} from './shadow-queries.js';
afterEach(cleanup);
test('optional measurements update, show millimetres and can be cleared',async()=>{
 function Example(){const [value,setValue]=useState(null);return <><ProductDimensions value={value} editing onChange={setValue}/><ProductDimensions value={value}/></>;}
 render(<Example/>);await settle();
 const input=[...document.querySelectorAll('sl-input')].find(i=>i.label==='Uzunluk (mm)');input.value='45.5';fireEvent(input,new CustomEvent('sl-input',{bubbles:true}));await settle();
 expect(document.body.textContent).toContain('Uzunluk: ≈ 45,5 mm');
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent.includes('Ölçüleri temizle')));await settle();expect(document.body.textContent).toContain('Ölçü bilgisi eklenmedi.');
});
