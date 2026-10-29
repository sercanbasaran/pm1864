import React from 'react';
import {test,expect,afterEach,vi} from 'vitest';
import {render,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {CatalogProvider} from '../src/app/CatalogContext.jsx';
import MediaManagement from '../src/modules/media/MediaManagement.jsx';
import {settle} from './shadow-queries.js';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
test('library uses tile images and backfills sequentially with progress and failed names',async()=>{
 let batches=0;const cursors=[];
 vi.spyOn(globalThis,'fetch').mockImplementation(async(url,options={})=>{
  if(url==='/api/media/thumbnails'){
   cursors.push(JSON.parse(options.body).cursor);batches++;
   return new Response(JSON.stringify(batches===1?{processed:5,failures:[],cursor:'old-5',done:false}:{processed:1,failures:[{name:'damaged.png'}],cursor:'old-z',done:true}));
  }
  return new Response(JSON.stringify({assets:[{id:'a',name:'A.png',mimeType:'image/png',size:1024,url:'/api/media/a/content'}]}));
 });
 render(<CatalogProvider snapshot={{revision:0,products:[]}} notify={vi.fn()}><MediaManagement user={{role:'admin'}}/></CatalogProvider>);
 await waitFor(()=>expect(document.querySelector('.media-card img')).toBeTruthy());await settle();
 expect(document.querySelector('.media-card img').getAttribute('src')).toBe('/api/media/a/content?size=tile');
 fireEvent.click([...document.querySelectorAll('sl-button')].find(b=>b.textContent==='Eski görselleri optimize et'));
 await waitFor(()=>expect(document.body.textContent).toContain('damaged.png'));expect(cursors).toEqual(['','old-5']);expect(document.body.textContent).toContain('6 görsel hazırlandı');
});
