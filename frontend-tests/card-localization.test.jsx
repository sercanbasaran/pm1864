import React from 'react';
import {afterEach,expect,test} from 'vitest';
import {render,cleanup,fireEvent,waitFor} from '@testing-library/react';
import ProductDetails from '../src/modules/products/ProductDetails.jsx';
import {settle} from './shadow-queries.js';
afterEach(cleanup);
for (const variant of [false,true]) test(`card selectors change saved content and rounded price (variant=${variant})`,async()=>{
 const pricing=variant?{variantPricing:{price:101,weight:40}}:{unitPricing:{price:101,weight:40,unit:'Dilim'}};
 render(<ProductDetails product={{name:'Baklava',...pricing,isVariantCard:variant,variants:[],localization:{languages:[{code:'en',name:'English'},{code:'fr',name:'French'}],currencies:[{code:'USD',name:'Dolar'}],translations:{en:{name:'English baklava',description:'Translated description'}},rates:[{currency:'USD',rate:0.5,date:'2026-10-28'}]}}}/>);
 await settle();
 const selects=[...document.querySelectorAll('sl-select')];
 const language=selects.find(s=>s.label==='Dil');language.value='en';fireEvent(language,new CustomEvent('sl-change',{bubbles:true}));
 await waitFor(()=>expect(document.body.textContent).toContain('English baklava'));
 const currency=selects.find(s=>s.label==='Para birimi');currency.value='USD';fireEvent(currency,new CustomEvent('sl-change',{bubbles:true}));
 await waitFor(()=>expect(document.body.textContent).toContain('$51'));
 expect(document.body.textContent).toContain('2026-10-28');
 expect([...language.querySelectorAll('sl-option')].find(o=>o.value==='fr').disabled).toBe(true);
});
