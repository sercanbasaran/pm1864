import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/security.js';
import { effectiveSales } from '../src/sales-availability.js';
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
test('category flags are ignored and omitted; category writes do not alter variant availability',async()=>{
 const f=await fixture();try {
  let c=(await f.call('/catalog')).catalog;
  const root=c.categories[0];
  let r=await f.save({...root,salesAvailability:{...all,online:false}});assert.equal(r.status,200);
  assert.equal('salesAvailability' in r.catalog.categories[0],false);
  r=await f.call('/products','POST',{expectedRevision:r.catalog.revision,product:{name:'Bağımsız ürün',categoryId:root.id,status:'Aktif',salesAvailability:{online:false},variants:[{size:'S',typeId:'type-item',weight:500,price:100,salesAvailability:all}]}});
  assert.equal(r.status,200);const p=r.catalog.products[0];assert.equal('salesAvailability' in p,false);assert.deepEqual(p.variants[0].effectiveSales,all);
  r=await f.save({...root,active:false,salesAvailability:{store:false}});assert.equal(r.status,200);assert.deepEqual(r.catalog.products[0].variants,p.variants);
  assert.equal((await f.save(root,false,c.revision)).status,409);
 }finally{await f.app.close();}
 const viewer=await fixture('viewer');try{const c=(await viewer.call('/catalog')).catalog;assert.equal((await viewer.save(c.categories[0])).status,403);}finally{await viewer.app.close();}
});
