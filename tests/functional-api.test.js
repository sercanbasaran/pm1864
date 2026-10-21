import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
const password='Functional-test-only-1864',hash=await hashPassword(password);
async function fixture(){
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD_HASH:hash}});
 function client(){let cookie='';return async(path,method='GET',body)=>{const response=await app.handle(new Request('https://test.local/api'+path,{method,headers:{origin:'https://test.local',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()}}}
 const call=client();await call('/login','POST',{email:'admin@example.test',password});
 const input={name:'Price test',category:'Baklavalar',status:'Aktif',description:'Keep description',allergens:'Gluten',variants:[{size:'S',price:100.25,weight:500,slices:10},{size:'M',price:200.75,weight:900,slices:18}]};
 const {catalog}=await call('/products','POST',{expectedRevision:0,product:input});
 return {app,call,client,product:catalog.products[0],catalog};
}
test('variant price endpoint persists cents, preserves product fields, audits changes and rejects stale or invalid writes atomically',async()=>{
 const f=await fixture();try{
  const p=f.product,path='/prices/products/'+p.id;
  const r=await f.call(path,'PATCH',{expectedRevision:f.catalog.revision,prices:[123.45,234.56],name:'FORGED'});
  assert.equal(r.status,200);const updated=r.catalog.products[0];assert.deepEqual(updated.variants.map(v=>v.price),[123.45,234.56]);for(const key of ['name','description','allergens','sku','category'])assert.equal(updated[key],p[key]);assert.equal(updated.version,p.version+1);assert.equal(r.catalog.logs[0].title,'Varyant fiyatları güncellendi');
  assert.equal((await f.call(path,'PATCH',{expectedRevision:f.catalog.revision,prices:[1,2]})).status,409);
  for(const prices of [[0,1],[-1,2],[1.001,2],[1],[1,1e9],['1',2]])assert.equal((await f.call(path,'PATCH',{expectedRevision:r.catalog.revision,prices})).status,422);
  assert.deepEqual((await f.call('/catalog')).catalog,r.catalog);
  assert.equal((await f.call('/prices/products/999','PATCH',{expectedRevision:r.catalog.revision,prices:[1]})).status,404);
  const same=await f.call(path,'PATCH',{expectedRevision:r.catalog.revision,prices:[123.45,234.56]});assert.equal(same.catalog.revision,r.catalog.revision);
 }finally{await f.app.close()}
});
test('bulk prices preserve cents and reject overflow without touching any products',async()=>{
 const f=await fixture();try{
  let r=await f.call('/prices/bulk','POST',{expectedRevision:f.catalog.revision,ids:[f.product.id],percent:10,direction:'increase'});assert.equal(r.status,200);assert.deepEqual(r.catalog.products[0].variants.map(v=>v.price),[110.28,220.83]);
  r=await f.call('/prices/products/'+f.product.id,'PATCH',{expectedRevision:r.catalog.revision,prices:[1e8,220.83]});const before=r.catalog;
  assert.equal((await f.call('/prices/bulk','POST',{expectedRevision:before.revision,ids:[f.product.id],percent:10,direction:'increase'})).status,422);assert.deepEqual((await f.call('/catalog')).catalog,before);
 }finally{await f.app.close()}
});
test('viewer can persist own display name but cannot change role, email or prices; profile versions are enforced',async()=>{
 const f=await fixture();try{
  await f.call('/users','POST',{user:{name:'Viewer',email:'viewer@example.test',role:'viewer',password,active:true}});const viewer=f.client();const login=await viewer('/login','POST',{email:'viewer@example.test',password});
  assert.equal((await viewer('/profile','PATCH',{expectedVersion:login.user.version,name:'Before reset'})).error.code,'PASSWORD_CHANGE_REQUIRED');
  const changed=await viewer('/password','POST',{currentPassword:password,newPassword:'Changed-test-only-1864'});const version=changed.user.version;
  assert.equal((await viewer('/prices/products/'+f.product.id,'PATCH',{expectedRevision:0,prices:[1,2]})).status,403);
  const r=await viewer('/profile','PATCH',{expectedVersion:version,name:'  New   Name  ',role:'admin',email:'admin@example.test',active:false});assert.equal(r.status,200);assert.equal(r.user.name,'New Name');assert.equal(r.user.email,'viewer@example.test');assert.equal(r.user.role,'viewer');assert.equal(r.user.active,true);
  assert.equal((await viewer('/profile','PATCH',{expectedVersion:version,name:'Stale'})).status,409);assert.equal((await viewer('/profile','PATCH',{expectedVersion:r.user.version,name:' '})).status,422);
  const after=(await viewer('/session')).user;assert.equal(after.name,'New Name');assert.equal((await viewer('/catalog')).status,200);assert.equal((await viewer('/users')).status,403);
  const returning=f.client();await returning('/login','POST',{email:'viewer@example.test',password:'Changed-test-only-1864'});assert.equal((await returning('/session')).user.name,'New Name');
 }finally{await f.app.close()}
});
