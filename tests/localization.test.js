import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
const password='Localization-test-1864',email='localize@test.example';
async function fixture(key){const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:await hashPassword(password),...(key?{GOOGLE_TRANSLATE_API_KEY:key}:{})}});let cookie='';const call=async(path,method='GET',body)=>{const response=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()};};await call('/login','POST',{email,password});return {app,call};}
test('translations are cached, source changes mark them stale, and paid keys never enter the catalog',async(t)=>{
 let calls=0;t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert.equal(options.headers['X-goog-api-key'],'secret-key');const body=JSON.parse(options.body);assert.equal(body.source,'tr');return new Response(JSON.stringify({data:{translations:body.q.map((_,i)=>({translatedText:'Translated '+i}))}}),{status:200});});
 const {app,call}=await fixture('secret-key');try{let c=(await call('/catalog')).catalog;c=(await call('/products','POST',{expectedRevision:c.revision,product:{name:'Baklava',description:'Lezzetli',category:'Baklavalar',status:'Aktif',variants:[],unitPricing:{unit:'Dilim',price:100,weight:40}}})).catalog;const p=c.products[0];const payload={kind:'product',recordId:p.id,language:'en',expectedRevision:c.revision};
 let result=await call('/localization/translate','POST',payload);assert.equal(result.status,200);assert.equal(calls,1);c=result.catalog;
 result=await call('/localization/translate','POST',{...payload,expectedRevision:c.revision});assert.equal(result.status,200);assert.equal(calls,1);
 let view=await call('/localization');assert.equal(view.translations[0].stale,false);assert.equal(view.translations[0].fields.name,'Translated 0');assert.equal(c.products[0].name,'Baklava');assert.equal(JSON.stringify(c).includes('secret-key'),false);
 c=(await call(`/products/${p.id}`,'PUT',{expectedRevision:c.revision,product:{...p,name:'Yeni'}})).catalog;assert.equal((await call('/localization')).translations[0].stale,true);
 assert.equal((await call('/localization/translate','POST',payload)).status,409);assert.equal(calls,1);
 }finally{await app.close();}
});
test('rate snapshots include every configured currency, cache responses, and preserve product prices',async(t)=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(JSON.stringify(['USD','GBP','AED','EUR','DKK','SEK','CNY','JPY'].map(quote=>({base:'TRY',quote,rate:0.5,date:'2026-10-28'}))),{status:200});});
 const {app,call}=await fixture();try{let c=(await call('/catalog')).catalog;let result=await call('/localization/rates','POST',{expectedRevision:c.revision});assert.equal(result.status,200);c=result.catalog;const snapshot=await call('/localization');assert.equal(snapshot.rates.entries.length,9);assert.equal(snapshot.rates.base,'TRY');assert.equal(calls,1);
 assert.equal((await call('/localization/rates','POST',{expectedRevision:c.revision})).status,200);assert.equal(calls,1);
 await app.db.query('UPDATE app_users SET role=? WHERE email=?',['viewer',email]);assert.equal((await call('/localization/rates','POST',{expectedRevision:c.revision})).status,403);assert.equal((await call('/localization/translate','POST',{})).status,403);
 }finally{await app.close();}
});
test('unconfigured translation and invalid rate responses do not change stored data',async(t)=>{
 const {app,call}=await fixture();try{let c=(await call('/catalog')).catalog;c=(await call('/products','POST',{expectedRevision:c.revision,product:{name:'Baklava',category:'Baklavalar',variants:[]}})).catalog;
 assert.equal((await call('/localization/translate','POST',{expectedRevision:c.revision,kind:'product',recordId:c.products[0].id,language:'en'})).status,503);
 t.mock.method(globalThis,'fetch',async()=>new Response('{}',{status:200}));assert.equal((await call('/localization/rates','POST',{expectedRevision:c.revision})).status,502);assert.deepEqual((await call('/catalog')).catalog,c);assert.equal((await call('/localization')).rates,null);
 }finally{await app.close();}
});
