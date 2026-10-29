import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { defaultPackagingItems } from "../src/modules/packaging/packaging-data.js";
test("ambalaj tanımları listelenir, yönetilir ve kullanılan kutu korunur",async()=>{
 const password="Packaging-1864-test";const app=await createApp({env:{SQLITE_PATH:":memory:",ADMIN_EMAIL:"packaging@test.example",ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie="";
 const call=async(path,method="GET",body)=>{const r=await app.handle(new Request("https://test.example/api"+path,{method,headers:{origin:"https://test.example",cookie,...(body?{"content-type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has("set-cookie"))cookie=r.headers.get("set-cookie").split(";")[0];return {status:r.status,...await r.json()};};
 try {await call('/login','POST',{email:'packaging@test.example',password});let catalog=(await call('/catalog')).catalog;assert.equal(catalog.packagingItems.length,13);assert.deepEqual(catalog.packagingItems.map(x=>x.name),defaultPackagingItems().map(x=>x.name));
 let r=await call('/packaging','POST',{expectedRevision:catalog.revision,name:'Özel kutu',code:'BOX-01',material:'Metal',length:345,width:225,height:45,emptyWeight:250,description:'Örnek',active:true});assert.equal(r.status,200);catalog=r.catalog;const box=catalog.packagingItems.find(x=>x.name==='Özel kutu');assert.equal(box.code,'014');assert.equal(box.length,345);
 r=await call('/packaging','POST',{expectedRevision:catalog.revision,name:'Özel kutu',material:'Metal'});assert.equal(r.status,422);
 r=await call('/products','POST',{expectedRevision:catalog.revision,product:{name:'Baklava',category:'Baklavalar',status:'Aktif',variants:[],unitPricing:{unit:'Dilim',price:100,weight:40}}});assert.equal(r.status,200);catalog=r.catalog;const p=catalog.products.find(x=>x.name==='Baklava');const type=catalog.variantTypes.find(x=>x.name==='Kutu');
 const variant={size:'Kutu',typeId:type.id,sourceProductId:p.id,quantity:1,packagingId:box.id,packaging:'Metal kutu',consumables:[],images:[],price:100,weight:40};
 r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...p,variants:[variant]}});assert.equal(r.status,422);assert.match(r.error.message || r.error,/onayı yok/);
 r=await call(`/packaging/${box.id}`,'PUT',{expectedRevision:catalog.revision,...box,allowedProductIds:['missing']});assert.equal(r.status,422);
 r=await call(`/packaging/${box.id}`,'PUT',{expectedRevision:catalog.revision,...box,allowedCategoryIds:['missing']});assert.equal(r.status,422);
 r=await call(`/packaging/${box.id}`,'PUT',{expectedRevision:catalog.revision,...box,allowedCategoryIds:[p.categoryId]});assert.equal(r.status,200);catalog=r.catalog;box.allowedCategoryIds=[p.categoryId];
 r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...p,variants:[{size:'Kutu',typeId:type.id,sourceProductId:p.id,quantity:1,packagingId:box.id,packaging:'Metal kutu',consumables:[],images:[],price:100,weight:40}]}});assert.equal(r.status,200);catalog=r.catalog;assert.equal(catalog.products.find(x=>x.id===p.id).variants[0].packagingName,'Özel kutu');
 const savedVariantProduct=catalog.products.find(x=>x.id===p.id);
 r=await call(`/packaging/${box.id}`,'PUT',{expectedRevision:catalog.revision,...box,excludedProductIds:[p.id]});assert.equal(r.status,200);catalog=r.catalog;assert.deepEqual(catalog.packagingItems.find(x=>x.id===box.id).excludedProductIds,[p.id]);
 r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:savedVariantProduct});assert.equal(r.status,422);
 r=await call(`/packaging/${box.id}`,'PUT',{expectedRevision:catalog.revision,...box,excludedProductIds:[]});assert.equal(r.status,200);catalog=r.catalog;
 r=await call(`/packaging/${box.id}`,'DELETE',{expectedRevision:catalog.revision});assert.equal(r.status,422);
 r=await call(`/packaging/${box.id}`,'PUT',{expectedRevision:catalog.revision,...box,active:false});assert.equal(r.status,200);catalog=r.catalog;
 const saved=catalog.products.find(x=>x.id===p.id);r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...saved,description:'Güncellendi'}});assert.equal(r.status,200);
 } finally {await app.close();}
});

test('packaging images persist, reject missing media and protect attached assets',async()=>{
 const email='box-image@test.example',password='Packaging-image-test';
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie='';
 const call=async(path,method='GET',body)=>{const r=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};
 try {
 await call('/login','POST',{email,password});
 const upload=await call('/media','POST',{name:'box.png',mimeType:'image/png',data:"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4v4/rPwgzwBgAZVILGYGCVCcAAAAASUVORK5CYII="});assert.equal(upload.status,201);
 let catalog=(await call('/catalog')).catalog;
 const body={name:'Görselli kutu',material:'Metal',mediaId:upload.asset.id,imageUrl:'https://untrusted.example/image'};
 let result=await call('/packaging','POST',{...body,expectedRevision:catalog.revision});assert.equal(result.status,200);catalog=result.catalog;
 let box=catalog.packagingItems.find(x=>x.name===body.name);assert.equal(box.mediaId,upload.asset.id);assert.equal(box.imageUrl,upload.asset.url);
 assert.equal((await call('/media/'+upload.asset.id,'DELETE',{expectedVersion:1})).status,409);
 result=await call('/packaging/'+box.id,'PUT',{...box,mediaId:'missing',expectedRevision:catalog.revision});assert.equal(result.status,422);
 result=await call('/packaging/'+box.id,'PUT',{name:box.name,material:box.material,expectedRevision:catalog.revision});assert.equal(result.status,200);catalog=result.catalog;box=catalog.packagingItems.find(x=>x.id===box.id);assert.equal(box.mediaId,upload.asset.id);
 result=await call('/packaging/'+box.id,'PUT',{...box,mediaId:'',expectedRevision:catalog.revision});assert.equal(result.status,200);box=result.catalog.packagingItems.find(x=>x.id===box.id);assert.equal(box.imageUrl,'');
 assert.equal((await call('/media/'+upload.asset.id,'DELETE',{expectedVersion:1})).status,200);
 }finally{await app.close();}
});

test('maximum product weight is optional, validated, preserved and clearable',async()=>{
 const email='capacity@test.example',password='Capacity-box-1864';
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie='';
 const call=async(path,method='GET',body)=>{const r=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};
 try {
 await call('/login','POST',{email,password});let c=(await call('/catalog')).catalog;
 let r=await call('/packaging','POST',{name:'Kapasiteli kutu',material:'Metal',maxProductWeight:1500.5,expectedRevision:c.revision});assert.equal(r.status,200);c=r.catalog;let box=c.packagingItems.find(x=>x.name==='Kapasiteli kutu');assert.equal(box.maxProductWeight,1500.5);
 for(const value of [0,-1,'1500',100001])assert.equal((await call('/packaging/'+box.id,'PUT',{...box,maxProductWeight:value,expectedRevision:c.revision})).status,422);
 r=await call('/packaging/'+box.id,'PUT',{name:box.name,material:box.material,expectedRevision:c.revision});assert.equal(r.status,200);c=r.catalog;assert.equal(c.packagingItems.find(x=>x.id===box.id).maxProductWeight,1500.5);
 r=await call('/packaging/'+box.id,'PUT',{...box,maxProductWeight:null,expectedRevision:c.revision});assert.equal(r.status,200);assert.equal(r.catalog.packagingItems.find(x=>x.id===box.id).maxProductWeight,null);
 }finally{await app.close();}
});
