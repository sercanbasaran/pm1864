import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { defaultPackagingItems } from "../src/modules/packaging/packaging-data.js";
test("ambalaj tanımları listelenir, yönetilir ve kullanılan kutu korunur",async()=>{
 const password="Packaging-1864-test";const app=await createApp({env:{SQLITE_PATH:":memory:",ADMIN_EMAIL:"packaging@test.example",ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie="";
 const call=async(path,method="GET",body)=>{const r=await app.handle(new Request("https://test.example/api"+path,{method,headers:{origin:"https://test.example",cookie,...(body?{"content-type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has("set-cookie"))cookie=r.headers.get("set-cookie").split(";")[0];return {status:r.status,...await r.json()};};
 try {await call('/login','POST',{email:'packaging@test.example',password});let catalog=(await call('/catalog')).catalog;assert.equal(catalog.packagingItems.length,13);assert.deepEqual(catalog.packagingItems.map(x=>x.name),defaultPackagingItems().map(x=>x.name));
 let r=await call('/packaging','POST',{expectedRevision:catalog.revision,name:'Özel kutu',code:'BOX-01',material:'Metal',length:345,width:225,height:45,emptyWeight:250,description:'Örnek',active:true});assert.equal(r.status,200);catalog=r.catalog;const box=catalog.packagingItems.find(x=>x.code==='BOX-01');assert.equal(box.length,345);
 r=await call('/packaging','POST',{expectedRevision:catalog.revision,name:'Özel kutu',material:'Metal'});assert.equal(r.status,422);
 r=await call('/products','POST',{expectedRevision:catalog.revision,product:{name:'Baklava',category:'Baklavalar',status:'Aktif',variants:[],unitPricing:{unit:'Dilim',price:100,weight:40}}});assert.equal(r.status,200);catalog=r.catalog;const p=catalog.products.find(x=>x.name==='Baklava');const type=catalog.variantTypes.find(x=>x.name==='Kutu');
 r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...p,variants:[{size:'Kutu',typeId:type.id,sourceProductId:p.id,quantity:1,packagingId:box.id,packaging:'Metal kutu',consumables:[],images:[],price:100,weight:40}]}});assert.equal(r.status,200);catalog=r.catalog;assert.equal(catalog.products.find(x=>x.id===p.id).variants[0].packagingName,'Özel kutu');
 r=await call(`/packaging/${box.id}`,'DELETE',{expectedRevision:catalog.revision});assert.equal(r.status,422);
 r=await call(`/packaging/${box.id}`,'PUT',{expectedRevision:catalog.revision,...box,active:false});assert.equal(r.status,200);catalog=r.catalog;
 const saved=catalog.products.find(x=>x.id===p.id);r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...saved,description:'Güncellendi'}});assert.equal(r.status,200);
 } finally {await app.close();}
});
