import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {openDatabase} from '../server/db.js';
import {hashPassword} from '../server/security.js';
import {categoryOf,categoryPath,categoryMatches} from '../src/hierarchy.js';
const password='Hierarchy-test-only-1864',hash=await hashPassword(password);
async function fixture(role='admin'){
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'test@example.test',ADMIN_PASSWORD_HASH:hash}});let cookie='';
 async function call(path,method='GET',body){const r=await app.handle(new Request('http://test.local/api'+path,{method,headers:{origin:'http://test.local',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()}}
 await call('/login','POST',{email:'test@example.test',password});if(role!=='admin')await app.db.query('UPDATE app_users SET role=? WHERE email=?',[role,'test@example.test']);
 return {app,call};
}
const variant=(size='S')=>({size,weight:500,price:100.25,slices:12});
async function sub(f,root,name='Fıstıklı',code='101'){const c=(await f.call('/catalog')).catalog;const r=await f.call('/categories','POST',{expectedRevision:c.revision,category:{name,code,slug:root.id+'-'+code,parentId:root.id,active:true}});assert.equal(r.status,200);return r.catalog.categories.at(-1)}
async function save(f,categoryId,variants=[variant()],product){const c=(await f.call('/catalog')).catalog;return f.call('/products'+(product?'/'+product.id:''),product?'PUT':'POST',{expectedRevision:c.revision,product:{name:'Kare Baklava',status:'Aktif',categoryId,variants,...product}})}
test('products belong to child ids; sibling names may repeat across roots; reparent and rename preserve identities',async()=>{
 const f=await fixture();try{let c=(await f.call('/catalog')).catalog;const root=c.categories[0],other=c.categories[1],a=await sub(f,root),b=await sub(f,other,'Fıstıklı','201');
 let r=await save(f,a.id);assert.equal(r.status,200);const p=r.catalog.products[0];assert.equal(p.categoryId,a.id);assert.equal(categoryPath(categoryOf(p,r.catalog.categories),r.catalog.categories),'Baklavalar / Fıstıklı');assert.equal(categoryMatches(p,root.id,r.catalog.categories),true);assert.equal(categoryMatches(p,b.id,r.catalog.categories),false);
 r=await f.call('/categories/'+a.id,'PUT',{expectedRevision:r.catalog.revision,category:{...a,name:'Özel Fıstıklı',parentId:other.id}});assert.equal(r.status,200);assert.equal(r.catalog.products[0].categoryId,p.categoryId);assert.equal(r.catalog.products[0].sku,p.sku);assert.equal(categoryMatches(r.catalog.products[0],other.id,r.catalog.categories),true);
 assert.equal((await save(f,root.id)).status,422);assert.equal((await save(f,'missing')).status,422);
 c=r.catalog;assert.equal((await f.call('/categories','POST',{expectedRevision:c.revision,category:{name:'Üçüncü',code:'301',slug:'third',parentId:a.id,active:true}})).status,422);
 assert.equal((await f.call('/categories/'+a.id,'PUT',{expectedRevision:c.revision,category:{...a,parentId:''}})).status,422);
 }finally{await f.app.close()}
});
test('inactive ancestors prevent new assignments while existing products remain editable',async()=>{
 const f=await fixture();try{let c=(await f.call('/catalog')).catalog;const root=c.categories[0],child=await sub(f,root);let r=await save(f,child.id);const product=r.catalog.products[0];r=await f.call('/categories/'+root.id,'PUT',{expectedRevision:r.catalog.revision,category:{...root,active:false}});assert.equal(r.status,200);assert.equal((await save(f,child.id)).status,422);assert.equal((await save(f,child.id,product.variants,{...product,name:'Updated'})).status,200)}finally{await f.app.close()}
});
test('variant ids and SKUs survive rename/reorder; deleted suffixes are never reused and forged ids are rejected',async()=>{
 const f=await fixture();try{const root=(await f.call('/catalog')).catalog.categories[0],child=await sub(f,root);let r=await save(f,child.id,[variant('S'),variant('M')]);let p=r.catalog.products[0];const first=p.variants[0],second=p.variants[1];
 r=await save(f,child.id,[],{...p,variants:[{...second,size:'Large'},{...first,active:false},variant('XL')]});assert.equal(r.status,200);p=r.catalog.products[0];assert.equal(p.variants[0].id,second.id);assert.equal(p.variants[0].sku,second.sku);assert.equal(p.variants[1].active,false);const removed=p.variants[2].sku;
 r=await save(f,child.id,[],{...p,variants:[p.variants[0]]});p=r.catalog.products[0];r=await save(f,child.id,[],{...p,variants:[...p.variants,variant('XXL')]});p=r.catalog.products[0];assert.notEqual(p.variants[1].sku,removed);assert.notEqual(p.variants[1].sku,first.sku);
 const before=r.catalog;assert.equal((await save(f,child.id,[],{...p,variants:[{...variant(),id:'forged'}]})).status,422);assert.equal((await save(f,child.id,[],{...p,variants:[p.variants[0],{...p.variants[0],size:'Duplicate'}]})).status,422);assert.equal((await save(f,child.id,[],{...p,variants:[]})).status,422);assert.deepEqual((await f.call('/catalog')).catalog,before);
 }finally{await f.app.close()}
});
test('existing catalog migrates transactionally once, retaining SKU, account data and product ids',async()=>{
 const db=await openDatabase({SQLITE_PATH:':memory:'});try{await db.query('CREATE TABLE app_catalog (id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,document TEXT NOT NULL)');const old={categories:[{id:'root',name:'Baklavalar',code:'100',slug:'baklavalar',parentId:'',active:true}],products:[{id:7,name:'Legacy',sku:'HM-100-0007',category:'Baklavalar',version:3,status:'Aktif',variants:[variant()]}],logs:[],settings:{skuPrefix:'HM'},nextProductId:8};await db.query('INSERT INTO app_catalog VALUES (1,4,?)',[JSON.stringify(old)]);
 const app=await createApp({env:{ADMIN_EMAIL:'test@example.test',ADMIN_PASSWORD_HASH:hash},database:db});const c=await app.service.read();assert.equal(c.revision,5);assert.equal(c.products[0].id,7);assert.equal(c.products[0].sku,old.products[0].sku);assert.equal(categoryPath(categoryOf(c.products[0],c.categories),c.categories),'Baklavalar / Genel');assert.ok(c.products[0].variants[0].id);assert.match(c.products[0].variants[0].sku,/-V0001$/);const second=await createApp({env:{},database:db});assert.deepEqual(await second.service.read(),c);assert.equal((await second.users.list()).users.length,1);
 }finally{await db.close()}
});
test('viewers cannot create categories or mutate variant collections',async()=>{const f=await fixture('viewer');try{assert.equal((await f.call('/categories','POST',{})).status,403);assert.equal((await f.call('/products/1','PUT',{product:{variants:[variant()]}})).status,403)}finally{await f.app.close()}});
test('deep legacy category paths flatten without dropping the product or changing its category id',async()=>{
 const {upgradeHierarchy}=await import('../src/hierarchy.js');const doc={categories:[{id:'r',name:'Baklava',code:'100',slug:'baklava',active:true,parentId:''},{id:'a',name:'Fıstıklı',code:'101',slug:'fistikli',active:true,parentId:'r'},{id:'b',name:'Özel',code:'102',slug:'ozel',active:true,parentId:'a'}],products:[{id:1,sku:'HM-100-0001',category:'Özel',variants:[variant()]}]};upgradeHierarchy(doc);assert.equal(doc.categories[2].parentId,'r');assert.equal(doc.categories[2].name,'Fıstıklı / Özel');assert.equal(doc.products[0].categoryId,'b');const before=JSON.stringify(doc);upgradeHierarchy(doc);assert.equal(JSON.stringify(doc),before);
});
test('variant weight, sales unit and packaging persist and invalid metadata is rejected',async()=>{
 const f=await fixture();try{
 const child=await sub(f,(await f.call('/catalog')).catalog.categories[0]);
 let r=await save(f,child.id,[{...variant(),weight:900,unit:'Kutu',packaging:'Kırmızı metal kutu'}]);assert.equal(r.status,200);
 let p=r.catalog.products[0];assert.equal(p.variants[0].unit,'Kutu');assert.equal(p.variants[0].packaging,'Kırmızı metal kutu');assert.equal(p.variants[0].weight,900);
 const legacy={...p.variants[0]};delete legacy.unit;delete legacy.packaging;
 r=await save(f,child.id,[],{...p,variants:[legacy]});assert.equal(r.catalog.products[0].variants[0].packaging,'Kırmızı metal kutu');
 for(const patch of [{unit:'invalid'},{packaging:'x'.repeat(121)}])assert.equal((await save(f,child.id,[],{...p,variants:[{...p.variants[0],...patch}]})).status,422);
 p=(await f.call('/catalog')).catalog.products[0];assert.equal(p.variants[0].unit,'Kutu');
 r=await save(f,child.id,[],{...p,variants:[{...p.variants[0],unit:'Porsiyon',packaging:''}]});assert.equal(r.status,200);assert.equal(r.catalog.products[0].variants[0].packaging,'');assert.equal(r.catalog.products[0].variants[0].sku,p.variants[0].sku);
 }finally{await f.app.close()}
});
test('product nutrition and storage text persists, preserves omitted fields and supports explicit clearing',async()=>{
 const f=await fixture();try{
 const child=await sub(f,(await f.call('/catalog')).catalog.categories[0]);
 const info={nutrition:'100 g için: Enerji 400 kcal / 1674 kJ; Yağ 20 g.',storageConditions:'Serin ve kuru yerde saklayın.',allergens:'Buğday ve fıstık içerir.',longTermStorage:'Üreticinin muhafaza talimatını izleyin.'};
 let r=await save(f,child.id,[variant()]);assert.equal(r.status,200);r=await save(f,child.id,[],{...r.catalog.products[0],...info});assert.equal(r.status,200);let p=r.catalog.products[0];for(const key of Object.keys(info))assert.equal(p[key],info[key]);
 const legacy={...p};for(const key of Object.keys(info))delete legacy[key];r=await save(f,child.id,[],legacy);assert.equal(r.status,200);p=r.catalog.products[0];for(const key of Object.keys(info))assert.equal(p[key],info[key]);
 for(const patch of [{nutrition:'x'.repeat(4001)},{storageConditions:{}},{allergens:'x'.repeat(1001)},{longTermStorage:null}])assert.equal((await save(f,child.id,[],{...p,...patch})).status,422);
 r=await save(f,child.id,[],{...p,nutrition:'',storageConditions:'',allergens:'',longTermStorage:''});assert.equal(r.status,200);for(const key of Object.keys(info))assert.equal(r.catalog.products[0][key],'');assert.equal(r.catalog.products[0].sku,p.sku);
 }finally{await f.app.close()}
});
test('sales switches persist with parent gating, draft/inactive overrides, and backward-compatible updates',async()=>{
 const f=await fixture();try{
 const child=await sub(f,(await f.call('/catalog')).catalog.categories[0]);let r=await save(f,child.id,[variant('S'),variant('M')]);let p=r.catalog.products[0];assert.deepEqual(p.salesAvailability,{store:false,online:false,foodDelivery:false});
 r=await save(f,child.id,[],{...p,salesAvailability:{store:true,online:true,foodDelivery:true},variants:[{...p.variants[0],salesAvailability:{online:false}},{...p.variants[1],active:false}]});assert.equal(r.status,200);p=r.catalog.products[0];assert.deepEqual(p.variants[0].effectiveSales,{store:true,online:false,foodDelivery:true});assert.deepEqual(p.variants[1].effectiveSales,{store:false,online:false,foodDelivery:false});
 r=await save(f,child.id,[],{...p,salesAvailability:{store:false,online:false,foodDelivery:false}});p=r.catalog.products[0];assert.equal(p.variants[0].salesAvailability.store,true);assert.equal(p.variants[0].effectiveSales.store,false);
 const legacy={...p};delete legacy.salesAvailability;legacy.variants=legacy.variants.map(v=>{const copy={...v};delete copy.salesAvailability;return copy});r=await save(f,child.id,[],legacy);assert.equal(r.catalog.products[0].salesAvailability.store,false);assert.equal(r.catalog.products[0].variants[0].salesAvailability.online,false);
 r=await save(f,child.id,[],{...r.catalog.products[0],status:'Taslak',salesAvailability:{store:true}});p=r.catalog.products[0];assert.equal(p.effectiveSales.store,false);assert.equal(p.variants[0].effectiveSales.store,false);
 const before=(await f.call('/catalog')).catalog;for(const value of [null,[],{online:'true'},{unknown:true}])assert.equal((await save(f,child.id,[],{...p,salesAvailability:value})).status,422);
 assert.equal((await save(f,child.id,[],{...p,variants:[{...p.variants[0],salesAvailability:{store:1}}]})).status,422);assert.deepEqual((await f.call('/catalog')).catalog,before);
 }finally{await f.app.close()}
});
