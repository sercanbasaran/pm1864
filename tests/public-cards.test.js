import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
const password='Public-card-test-only-1864',hash=await hashPassword(password);
const image='iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4v4/rPwgzwBgAZVILGYGCVCcAAAAASUVORK5CYII=';
async function fixture(){
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'cards@example.test',ADMIN_PASSWORD_HASH:hash}});let cookie='';
 async function raw(path,method='GET',body,anonymous=false){
  const response=await app.handle(new Request('https://cards.test/api'+path,{method,headers:{origin:'https://cards.test',...(!anonymous?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
 }
 async function call(...args){const response=await raw(...args);return {status:response.status,...await response.json()}}
 await call('/login','POST',{email:'cards@example.test',password});
 const {catalog}=await call('/products','POST',{expectedRevision:0,product:{name:'Fıstıklı Baklava',category:'Baklavalar',status:'Aktif',description:'Taze ürün',nutrition:'100 g için: Enerji 400 kcal.',allergens:'Fıstık içerir.',storageConditions:'Serin yerde.',longTermStorage:'Muhafaza talimatı.',variants:[{size:'S',typeId:'type-item',price:100.25,weight:500,unit:'Kutu',packaging:'Metal kutu',slices:12},{size:'M',typeId:'type-item',price:200.75,weight:900,slices:24,active:false}]}});
 return {app,raw,call,catalog,product:catalog.products[0],path:'/public/products/'+catalog.products[0].publicCardCode};
}
test('only explicitly published eligible products are public, with an allowlist of product and active variant fields',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call(f.path,'GET',undefined,true)).status,404);
  const published=await f.call('/products/'+f.product.id+'/card','PATCH',{expectedRevision:f.catalog.revision,enabled:true});assert.equal(published.status,200);
  const response=await f.raw(f.path,'GET',undefined,true);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const {product}=await response.json();assert.deepEqual(Object.keys(product).sort(),['productCode','sku','name','category','description','customImage','ingredients','servingSuggestion','nutrition','storageConditions','allergens','longTermStorage','satiety','salesAvailability','unitPricing','variants'].sort());
  assert.equal(product.name,'Fıstıklı Baklava');assert.equal(product.variants.length,1);assert.equal(product.variants[0].price,100.25);assert.equal(product.variants[0].packaging,'Metal kutu');assert.equal(product.nutrition,f.product.nutrition);
  assert.deepEqual(Object.keys(product.variants[0]).sort(),['sku','size','typeName','weight','unit','packaging','slices','price'].sort());
  assert.equal(JSON.stringify(product).includes('cards@example.test'),false);assert.equal((await f.call('/catalog','GET',undefined,true)).status,401);assert.equal((await f.call('/media','GET',undefined,true)).status,401);
  assert.equal((await f.call('/public/products/P999999','GET',undefined,true)).status,404);
 }finally{await f.app.close()}
});
test('public media is limited to the published product and becomes unavailable when the card is disabled',async()=>{
 const f=await fixture();try{
  const {asset}=await f.call('/media','POST',{name:'baklava.png',mimeType:'image/png',data:image});let catalog=(await f.call('/catalog')).catalog;
  catalog=(await f.call('/products/'+f.product.id,'PUT',{expectedRevision:catalog.revision,product:{...f.product,mediaId:asset.id}})).catalog;
  assert.equal((await f.raw(f.path+'/image','GET',undefined,true)).status,404);
  catalog=(await f.call('/products/'+f.product.id+'/card','PATCH',{expectedRevision:catalog.revision,enabled:true})).catalog;
  assert.equal((await f.call(f.path,'GET',undefined,true)).product.customImage,'/api'+f.path+'/image');
  const response=await f.raw(f.path+'/image','GET',undefined,true);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(image,'base64'));
  assert.equal((await f.raw('/media/'+asset.id+'/content','GET',undefined,true)).status,401);
  await f.call('/products/'+f.product.id+'/card','PATCH',{expectedRevision:catalog.revision,enabled:false});
  assert.equal((await f.call(f.path,'GET',undefined,true)).status,404);assert.equal((await f.raw(f.path+'/image','GET',undefined,true)).status,404);
 }finally{await f.app.close()}
});
test('card identity and publication survive edits; prices are live and inactive products and categories are hidden',async()=>{
 const f=await fixture();try{
  let catalog=(await f.call('/products/'+f.product.id+'/card','PATCH',{expectedRevision:f.catalog.revision,enabled:true})).catalog;
  catalog=(await f.call('/prices/products/'+f.product.id,'PATCH',{expectedRevision:catalog.revision,prices:[135.5,250]})).catalog;
  assert.equal((await f.call(f.path,'GET',undefined,true)).product.variants[0].price,135.5);
  catalog=(await f.call('/products/'+f.product.id,'PUT',{expectedRevision:catalog.revision,product:{...catalog.products[0],name:'Yeni ad',productCode:'FORGED',publicCardEnabled:false}})).catalog;
  assert.equal(catalog.products[0].publicCardEnabled,true);assert.equal(catalog.products[0].productCode,f.product.productCode);assert.equal((await f.call(f.path,'GET',undefined,true)).product.name,'Yeni ad');
  catalog=(await f.call('/products/'+f.product.id,'PUT',{expectedRevision:catalog.revision,product:{...catalog.products[0],status:'Taslak'}})).catalog;
  assert.equal((await f.call(f.path,'GET',undefined,true)).status,404);
  catalog=(await f.call('/products/'+f.product.id,'PUT',{expectedRevision:catalog.revision,product:{...catalog.products[0],status:'Aktif'}})).catalog;
  assert.equal((await f.call(f.path,'GET',undefined,true)).status,200);
  const root=catalog.categories.find(c=>c.id==='cat-100');catalog=(await f.call('/categories/'+root.id,'PUT',{expectedRevision:catalog.revision,category:{...root,active:false}})).catalog;
  assert.equal((await f.call(f.path,'GET',undefined,true)).status,404);
 }finally{await f.app.close()}
});
test('publication enforces permissions, revision checks, boolean values, active variants and records an audit trail',async()=>{
 const f=await fixture();try{
  const path='/products/'+f.product.id+'/card';
  assert.equal((await f.call(path,'PATCH',{expectedRevision:f.catalog.revision,enabled:true},true)).status,401);
  assert.equal((await f.call(path,'PATCH',{expectedRevision:f.catalog.revision,enabled:'true'})).status,422);
  let catalog=(await f.call(path,'PATCH',{expectedRevision:f.catalog.revision,enabled:true})).catalog;
  assert.equal(catalog.logs[0].title,'Ürün kartı yayınlandı');assert.equal((await f.call(path,'PATCH',{expectedRevision:f.catalog.revision,enabled:false})).status,409);
  await f.app.db.query("UPDATE app_users SET role='viewer'");assert.equal((await f.call(path,'PATCH',{expectedRevision:catalog.revision,enabled:false})).status,403);
  await f.app.db.query("UPDATE app_users SET role='admin'");
  catalog=(await f.call('/products/'+f.product.id,'PUT',{expectedRevision:catalog.revision,product:{...catalog.products[0],variants:catalog.products[0].variants.map(v=>({...v,active:false}))}})).catalog;
  assert.equal((await f.call(path,'PATCH',{expectedRevision:catalog.revision,enabled:true})).status,422);
  assert.equal((await f.call(f.path,'GET',undefined,true)).status,404);
  catalog=(await f.call(path,'PATCH',{expectedRevision:catalog.revision,enabled:false})).catalog;assert.equal(catalog.logs[0].title,'Ürün kartı yayından kaldırıldı');
 }finally{await f.app.close()}
});
