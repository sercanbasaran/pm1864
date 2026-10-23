import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/security.js';
import { categorySalesAvailability, effectiveSales } from '../src/sales-availability.js';
const all = { store:true, online:true, foodDelivery:true };
const hash = await hashPassword('Category-sales-test-1864');
async function fixture(role='admin') {
  const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'test@example.test',ADMIN_PASSWORD_HASH:hash}});
  let cookie='';
  async function call(path,method='GET',body) {
    const response=await app.handle(new Request('http://test.local/api'+path,{method,headers:{origin:'http://test.local',cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
    if(response.headers.has('set-cookie')) cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,...await response.json()};
  }
  await call('/login','POST',{email:'test@example.test',password:'Category-sales-test-1864'});
  if(role!=='admin') await app.db.query('UPDATE app_users SET role=? WHERE email=?',[role,'test@example.test']);
  async function save(category,isNew=false,revision) {
    const current=(await call('/catalog')).catalog;
    return call('/categories'+(isNew?'':'/'+category.id),isNew?'POST':'PUT',{expectedRevision:revision??current.revision,category});
  }
  return {app,call,save};
}
test('category channels inherit safely, preserve legacy behavior and reject missing/cyclic parents',()=>{
  const root={id:'r',active:true},child={id:'c',parentId:'r',active:true};
  assert.deepEqual(categorySalesAvailability(child,[root,child]),all);
  root.salesAvailability={online:false};
  const p={categoryId:'c',status:'Aktif',salesAvailability:all};
  assert.deepEqual(effectiveSales(p,{active:true,salesAvailability:all},[root,child]),{...all,online:false});
  child.salesAvailability={store:false};
  assert.deepEqual(categorySalesAvailability(child,[root,child]),{store:false,online:false,foodDelivery:true});
  root.active=false;
  assert.deepEqual(categorySalesAvailability(child,[root,child]),{store:false,online:false,foodDelivery:false});
  assert.equal(categorySalesAvailability(child,[child]).online,false);
  root.parentId='c';root.active=true;
  assert.equal(categorySalesAvailability(child,[root,child]).foodDelivery,false);
});
test('category flags persist; parent changes govern product/variant sales without changing preferences or codes',async()=>{
  const f=await fixture();try{
    let catalog=(await f.call('/catalog')).catalog;
    let root=catalog.categories[0];
    let r=await f.save({...root,salesAvailability:{...all,online:false}});assert.equal(r.status,200);
    r=await f.save({name:'Test alt',slug:'test-alt',code:'101',parentId:root.id,active:true,salesAvailability:all},true);assert.equal(r.status,200);
    const child=r.catalog.categories.find(c=>c.slug==='test-alt');
    assert.equal(child.effectiveSales.online,false);
    r=await f.call('/products','POST',{expectedRevision:r.catalog.revision,product:{name:'Test product',categoryId:child.id,status:'Aktif',salesAvailability:all,variants:[{size:'S',typeId:'type-item',weight:500,price:100,salesAvailability:all}]}});
    assert.equal(r.status,200);const p=r.catalog.products[0];assert.equal(p.effectiveSales.online,false);assert.equal(p.variants[0].effectiveSales.online,false);
    assert.equal(p.salesAvailability.online,true);assert.equal(p.variants[0].salesAvailability.online,true);
    root=r.catalog.categories.find(c=>c.id===root.id);
    r=await f.save({...root,salesAvailability:all});assert.equal(r.catalog.products[0].effectiveSales.online,true);
    assert.equal(r.catalog.products[0].sku,p.sku);assert.equal(r.catalog.products[0].version,p.version);
    const updated=r.catalog.categories.find(c=>c.id===child.id);delete updated.salesAvailability;
    r=await f.save(updated);assert.deepEqual(r.catalog.categories.find(c=>c.id===child.id).salesAvailability,all);
    const stored=JSON.parse((await f.app.db.query('SELECT document FROM app_catalog WHERE id=1')).rows[0].document);
    assert.deepEqual(stored.categories.find(c=>c.id===root.id).salesAvailability,all);
  }finally{await f.app.close()}
});
test('invalid channel flags and stale revisions fail atomically; viewer cannot change category channels',async()=>{
  const f=await fixture();try{
    const before=(await f.call('/catalog')).catalog,root=before.categories[0];
    for(const salesAvailability of [null,[],{online:'yes'},{unknown:true}]) assert.equal((await f.save({...root,salesAvailability})).status,422);
    assert.deepEqual((await f.call('/catalog')).catalog,before);
    assert.equal((await f.save({...root,salesAvailability:all},false,before.revision+1)).status,409);
  }finally{await f.app.close()}
  const viewer=await fixture('viewer');try{const c=(await viewer.call('/catalog')).catalog;assert.equal((await viewer.save({...c.categories[0],salesAvailability:all})).status,403)}finally{await viewer.app.close()}
});
