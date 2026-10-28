import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
import {migrate} from '../server/db.js';
import {seedCatalog} from '../server/catalog-service.js';
test('published product and variant links survive migration and later edits',async()=>{
 const password='Sku-V3-Integration-1864';const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'sku-v3@test.example',ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie='';
 const call=async(path,method='GET',body)=>{const response=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()};};
 try{
 await call('/login','POST',{email:'sku-v3@test.example',password});let c=(await call('/catalog')).catalog;
 c=(await call('/products','POST',{expectedRevision:c.revision,product:{name:'Baklava',category:'Baklavalar',status:'Aktif',variants:[{size:'Porsiyon',typeId:c.variantTypes[0].id,price:100,weight:100,slices:0}]}})).catalog;
 const p=c.products[0],variantId=p.variants[0].id;
 c=(await call(`/products/${p.id}/card`,'PATCH',{expectedRevision:c.revision,enabled:true})).catalog;
 c=(await call(`/variants/${variantId}/card`,'PATCH',{expectedRevision:c.revision,enabled:true})).catalog;
 const raw=JSON.parse((await app.db.query('SELECT document FROM app_catalog WHERE id=1')).rows[0].document);
 raw.skuSchemaVersion=2;raw.categories.forEach((item,i)=>{item.code=String((i+1)*100).padStart(4,'0');});
 raw.products[0].sku='HM0100.000001';raw.products[0].productCode='0100000001';raw.products[0].publicSlug='baklava-0100000001';raw.products[0].variants[0].sku='HM0100.000001.01';
 await app.db.query('UPDATE app_catalog SET document=? WHERE id=1',[JSON.stringify(raw)]);await migrate(app.db,seedCatalog());
 c=(await call('/catalog')).catalog;const migrated=c.products[0];assert.equal(migrated.variants[0].id,variantId);assert.equal(migrated.sku,'1000.100');assert.equal(migrated.variants[0].sku,'1000.10001');
 for(const code of [p.publicCardCode,'0100000001']) assert.equal((await call(`/public/products/${code}`)).status,200);
 assert.equal((await call('/product-pages/baklava-0100000001')).status,200);
 c=(await call(`/products/${p.id}`,'PUT',{expectedRevision:c.revision,product:{...migrated,name:'Yeni baklava',variants:[...migrated.variants,{size:'Yeni',typeId:c.variantTypes[0].id,price:120,weight:100,slices:0}]}})).catalog;
 assert.equal(c.products[0].variants[1].sku,'1000.10002');
 assert.equal((await call('/product-pages/baklava-0100000001')).status,200);
 assert.equal((await call('/public/products/0100000001')).status,200);
 }finally{await app.close();}
});
