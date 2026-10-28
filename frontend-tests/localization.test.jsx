import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {render,cleanup,waitFor} from '@testing-library/react';
import {CatalogProvider} from '../src/app/CatalogContext.jsx';
import {defaultRegionalDefinitions} from '../src/regional-definitions.js';
import LocalizationCenter from '../src/modules/localization/LocalizationCenter.jsx';
import {settle} from './shadow-queries.js';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
test('saved translations and dated conversion values are viewable and exportable',async()=>{
 vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(JSON.stringify({translationConfigured:false,rates:{base:'TRY',provider:'Frankfurter',fetchedAt:new Date().toISOString(),entries:[{currency:'USD',rate:0.5,date:'2026-10-28'}]},translations:[{kind:'product',recordId:1,language:'en',fields:{name:'Baklava English'},sourceFields:{name:'Baklava'},createdAt:new Date().toISOString(),stale:true}]}),{status:200}));
 const snapshot={revision:0,...defaultRegionalDefinitions(),categories:[],products:[{id:1,name:'Baklava',productCode:'1000100',unitPricing:{price:100,unit:'Dilim'},variants:[]}]};
 render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><LocalizationCenter user={{role:'viewer'}}/></CatalogProvider>);await waitFor(()=>expect(document.body.textContent).toContain('Baklava English'));await settle();
 expect(document.body.textContent).toContain('Kaynak değişmiş');expect(document.body.textContent).toContain('2026-10-28');expect(document.body.textContent).toContain('$50,00');
 expect([...document.querySelectorAll('sl-button')].filter(b=>b.textContent==='Dışa aktar')).toHaveLength(2);
 expect(document.body.textContent).not.toContain('Çeviriyi hazırla');expect(document.body.textContent).not.toContain('Kurları getir / yenile');
});
