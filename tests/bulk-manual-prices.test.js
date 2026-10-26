import test from 'node:test';import assert from 'node:assert/strict';import {createApp} from '../server/app.js';import {hashPassword} from '../server/security.js';
test('bulk saves reviewed prices and rejects foreign or incomplete rows atomically',async()=>{
const password='Bulk-manual-test-1864';const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'bulk@test.example',ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie='';
const call=async(path,method='GET',body)=>{const r=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};
try{await call('/login','POST',{email:'bulk@test.example',password});let c=(await call('/catalog')).catalog;
c=(await call('/products','POST',{expectedRevision:c.revision,product:{name:'Baklava',category:'Baklavalar',status:'Aktif',variants:[{size:'Porsiyon',typeId:c.variantTypes[0].id,price:100,weight:100,slices:0}]}})).catalog;
const p=c.products[0],v=p.variants[0],payload={ids:[p.id],percent:10,direction:'increase',expectedRevision:c.revision};
assert.equal((await call('/prices/bulk','POST',{...payload,prices:[]})).status,422);
assert.equal((await call('/prices/bulk','POST',{...payload,prices:[{productId:p.id,variantId:'fake',price:115}]})).status,422);
const saved=await call('/prices/bulk','POST',{...payload,prices:[{productId:p.id,variantId:v.id,price:115}]});assert.equal(saved.status,200);assert.equal(saved.catalog.products[0].variants[0].price,115);
assert.equal((await call('/prices/bulk','POST',{...payload,prices:[{productId:p.id,variantId:v.id,price:120}]})).status,409);
}finally{await app.close();}
});
