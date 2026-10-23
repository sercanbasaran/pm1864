import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
import {openDatabase,migrate} from '../server/db.js';
import {seedCatalog} from '../server/catalog-service.js';
const password='Variant-type-test-1864',hash=await hashPassword(password);
async function fixture(){const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'types@example.test',ADMIN_PASSWORD_HASH:hash}});let cookie='';const call=async(path,method='GET',body)=>{const response=await app.handle(new Request('https://test.local/api'+path,{method,headers:{origin:'https://test.local',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()}};await call('/login','POST',{email:'types@example.test',password});return {app,call}}
const product=variant=>({name:'Tip kontrol ürünü',category:'Baklavalar',status:'Aktif',variants:[{size:'S',weight:500,price:100,typeId:'type-item',slices:0,...variant}]});
test('new variants require an existing type; slice type requires a positive bounded integer count',async()=>{
 const f=await fixture();try{
  const initial=(await f.call('/catalog')).catalog;
  for(const typeId of ['',null,undefined,'forged',{}]){const r=await f.call('/products','POST',{expectedRevision:initial.revision,product:product({typeId})});assert.equal(r.status,422);assert.match(r.error.message,/varyant tipi/)}
  for(const slices of [0,-1,1.5,null,undefined,100001,'12']){const r=await f.call('/products','POST',{expectedRevision:0,product:product({typeId:'type-slice',slices})});assert.equal(r.status,422);assert.match(r.error.message,/dilim adedi/)}
  assert.deepEqual((await f.call('/catalog')).catalog,initial);
  const saved=await f.call('/products','POST',{expectedRevision:0,product:product({typeId:'type-slice',slices:12})});assert.equal(saved.status,200);assert.equal(saved.catalog.products[0].variants[0].slices,12);assert.equal(saved.catalog.products[0].variants[0].typeId,'type-slice');
  const p=saved.catalog.products[0],changed=await f.call('/products/'+p.id,'PUT',{expectedRevision:saved.catalog.revision,product:{...p,variants:[{...p.variants[0],typeId:'type-item',slices:0}]}});assert.equal(changed.status,200);assert.equal(changed.catalog.products[0].variants[0].id,p.variants[0].id);assert.equal(changed.catalog.products[0].variants[0].sku,p.variants[0].sku);
 }finally{await f.app.close()}
});
test('type management rejects duplicate names and stale writes, protects used types and removes unused types permanently',async()=>{
 const f=await fixture();try{
  let r=await f.call('/variant-types','POST',{expectedRevision:0,name:'  Hediye   seti  ',requiresQuantity:true,id:'forged'});assert.equal(r.status,200);let type=r.catalog.variantTypes.find(t=>t.name==='Hediye seti');assert.ok(type);assert.notEqual(type.id,'forged');assert.equal(type.requiresQuantity,false);
  assert.equal((await f.call('/variant-types','POST',{expectedRevision:0,name:'Stale'})).status,409);
  for(const name of ['hediye seti',' HEDİYE SETİ ','','x'.repeat(51),{}])assert.equal((await f.call('/variant-types','POST',{expectedRevision:r.catalog.revision,name})).status,422);
  const saved=await f.call('/products','POST',{expectedRevision:r.catalog.revision,product:product({typeId:type.id,active:false})});assert.equal(saved.status,200);r=saved;
  assert.equal((await f.call('/variant-types/'+type.id,'DELETE',{expectedRevision:r.catalog.revision})).error.code,'VARIANT_TYPE_IN_USE');
  const p=r.catalog.products[0];r=await f.call('/products/'+p.id,'PUT',{expectedRevision:r.catalog.revision,product:{...p,variants:[{...p.variants[0],typeId:'type-item'}]}});r=await f.call('/variant-types/'+type.id,'DELETE',{expectedRevision:r.catalog.revision});assert.equal(r.status,200);assert.ok(!r.catalog.variantTypes.some(t=>t.id===type.id));assert.equal((await f.call('/products','POST',{expectedRevision:r.catalog.revision,product:product({typeId:type.id})})).status,422);
  const renamed=await f.call('/settings','PATCH',{expectedRevision:r.catalog.revision,settings:{skuPrefix:'HMNEW'}});assert.deepEqual(renamed.catalog.variantTypes,r.catalog.variantTypes);
  assert.equal((await f.call('/variant-types/missing','DELETE',{expectedRevision:renamed.catalog.revision})).status,404);
 }finally{await f.app.close()}
});
test('recreating the Dilim type always enforces quantity and type actions respect user permissions',async()=>{
 const f=await fixture();try{
  let r=await f.call('/variant-types/type-slice','DELETE',{expectedRevision:0});r=await f.call('/variant-types','POST',{expectedRevision:r.catalog.revision,name:' DİLİM ',requiresQuantity:false});assert.equal(r.status,200);const type=r.catalog.variantTypes.find(t=>t.name==='DİLİM');assert.equal(type.requiresQuantity,true);assert.equal((await f.call('/products','POST',{expectedRevision:r.catalog.revision,product:product({typeId:type.id,slices:0})})).status,422);
  await f.app.db.query("UPDATE app_users SET role='viewer'");for(const [path,method,body] of [['/variant-types','POST',{expectedRevision:r.catalog.revision,name:'Forbidden'}],['/variant-types/type-item','DELETE',{expectedRevision:r.catalog.revision}]])assert.equal((await f.call(path,method,body)).status,403);
  await f.app.db.query("UPDATE app_users SET role='editor'");assert.equal((await f.call('/variant-types','POST',{expectedRevision:r.catalog.revision,name:'Editör tipi'})).status,200);
  await f.call('/logout','POST',{});assert.equal((await f.call('/variant-types','POST',{name:'Anonim'})).status,401);
 }finally{await f.app.close()}
});
test('legacy type migration is idempotent and preserves product identities, prices and slice counts',async()=>{
 const db=await openDatabase({SQLITE_PATH:':memory:'});try{
  await migrate(db,seedCatalog());const doc=seedCatalog();delete doc.variantTypes;doc.schemaVersion=2;doc.products=[{id:5,sku:'HM-100-0005',version:9,variants:[{id:'v1',sku:'stable1',price:125,slices:12},{id:'v2',sku:'stable2',price:99,slices:0,active:false}]}];await db.query('UPDATE app_catalog SET document=?,revision=7 WHERE id=1',[JSON.stringify(doc)]);
  await migrate(db,seedCatalog());let row=(await db.query('SELECT * FROM app_catalog')).rows[0],updated=JSON.parse(row.document);assert.equal(row.revision,8);assert.equal(updated.products[0].version,9);assert.deepEqual(updated.products[0].variants.map(v=>v.typeId),['type-slice','type-item']);assert.deepEqual(updated.products[0].variants.map(({typeId,...v})=>v),doc.products[0].variants);
  await migrate(db,seedCatalog());assert.deepEqual((await db.query('SELECT * FROM app_catalog')).rows[0],row);
 }finally{await db.close()}
});
test('custom variant type is visible in public product cards without exposing internal type records',async()=>{
 const f=await fixture();try{let r=await f.call('/variant-types','POST',{expectedRevision:0,name:'Özel kutu'});const type=r.catalog.variantTypes.find(t=>t.name==='Özel kutu');r=await f.call('/products','POST',{expectedRevision:r.catalog.revision,product:product({typeId:type.id})});const p=r.catalog.products[0];r=await f.call('/products/'+p.id+'/card','PATCH',{expectedRevision:r.catalog.revision,enabled:true});const card=await f.call('/public/products/'+p.productCode);assert.equal(card.product.variants[0].typeName,'Özel kutu');assert.equal('typeId' in card.product.variants[0],false);assert.equal('variantTypes' in card.product,false)}finally{await f.app.close()}
});
