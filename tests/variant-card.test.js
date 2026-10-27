import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";

test("varyant kartı ayrı yayınlanır, güvenli veri sunar ve varyant düzenlenirken yayın durumu korunur", async () => {
  const password="Variant-card-1864-test";
  const app=await createApp({env:{SQLITE_PATH:":memory:",ADMIN_EMAIL:"variant-card@test.example",ADMIN_PASSWORD_HASH:await hashPassword(password)}});
  let cookie="";
  const call=async(path,method="GET",body,authenticated=true)=>{const r=await app.handle(new Request("https://test.example/api"+path,{method,headers:{origin:"https://test.example",...(authenticated?{cookie}:{}),...(body?{"content-type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(authenticated&&r.headers.has("set-cookie"))cookie=r.headers.get("set-cookie").split(";")[0];return {status:r.status,...await r.json()};};
  try {
    await call('/login','POST',{email:'variant-card@test.example',password});let catalog=(await call('/catalog')).catalog;
    let r=await call('/products','POST',{expectedRevision:catalog.revision,product:{name:'Baklava',category:'Baklavalar',status:'Aktif',variants:[],unitPricing:{unit:'Dilim',price:100,weight:50},ingredients:'Fıstık'}}); assert.equal(r.status,200); catalog=r.catalog;
    let p=catalog.products.find(p=>p.name==='Baklava');
    r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...p,variants:[{size:'Porsiyon',typeId:catalog.variantTypes[0].id,sourceProductId:p.id,quantity:2,items:[{productId:p.id,quantity:2}],packaging:'Tabakta servis',consumables:[],images:[],priceOverride:null,informationOverrides:{allergens:'Fıstık içerir'},price:1,weight:1}]}});assert.equal(r.status,200);catalog=r.catalog;p=catalog.products.find(item=>item.name==='Baklava');let v=p.variants[0];
    assert.equal((await call(`/variant-pages/${v.id}`,'GET',null,false)).status,401);
    assert.equal((await call(`/variants/${v.id}/card`,'PATCH',{expectedRevision:catalog.revision,enabled:true},false)).status,401);
    r=await call(`/variants/${v.id}/card`,'PATCH',{expectedRevision:catalog.revision,enabled:true});assert.equal(r.status,200);catalog=r.catalog;
    r=await call(`/variant-pages/${v.id}`,'GET',null,false);assert.equal(r.status,200);assert.equal(r.product.name,'Porsiyon');assert.equal(r.product.variantPricing.price,200);assert.equal(r.product.variantPricing.weight,100);assert.equal(r.product.variantContents[0].name,'Baklava');assert.equal(r.product.allergens,'Fıstık içerir');assert.equal(r.product.isVariantCard,true);assert.equal(r.product.id,undefined);
    assert.equal((await call(`/variant-pages/${v.id}/images/unknown`,'GET',null,false)).status,404);
    p=catalog.products.find(p=>p.name==='Baklava');r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...p,description:'Güncellendi'}});assert.equal(r.status,200);catalog=r.catalog;v=catalog.products.find(item=>item.name==='Baklava').variants[0];assert.equal(v.publicCardEnabled,true);
    p=catalog.products.find(item=>item.name==='Baklava');
    r=await call(`/products/${p.id}`,'PUT',{expectedRevision:catalog.revision,product:{...p,variants:p.variants.map(item=>({...item,active:false}))}});assert.equal(r.status,200);catalog=r.catalog;
    assert.equal((await call(`/variant-pages/${v.id}`,'GET',null,false)).status,404);
    r=await call(`/variants/${v.id}/card`,'PATCH',{expectedRevision:catalog.revision,enabled:false});assert.equal(r.status,200);assert.equal((await call(`/variant-pages/${v.id}`,'GET',null,false)).status,404);
  } finally {await app.close();}
});

test("45 karakterli varyant silinirken yayınlanan kart kaldırılır ve eski sürüm reddedilir", async () => {
  const password="Variant-delete-1864-test";
  const app=await createApp({env:{SQLITE_PATH:":memory:",ADMIN_EMAIL:"variant-delete@test.example",ADMIN_PASSWORD_HASH:await hashPassword(password)}});
  let cookie="";
  const call=async(path,method="GET",body,auth=true)=>{const r=await app.handle(new Request("https://test.example/api"+path,{method,headers:{origin:"https://test.example",...(auth?{cookie}:{}),...(body?{"content-type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(auth&&r.headers.has("set-cookie"))cookie=r.headers.get("set-cookie").split(";")[0];return {status:r.status,...await r.json()};};
  try {
    await call("/login","POST",{email:"variant-delete@test.example",password});
    let catalog=(await call("/catalog")).catalog;
    let r=await call("/products","POST",{expectedRevision:catalog.revision,product:{name:"Silme ürünü",category:"Baklavalar",status:"Aktif",variants:[{size:"A".repeat(45),typeId:"type-item",price:10,weight:20,slices:0}]}});
    assert.equal(r.status,200); catalog=r.catalog; const p=catalog.products.find(p=>p.name==="Silme ürünü");const v=p.variants[0];assert.equal(v.size.length,45);
    r=await call(`/products/${p.id}`,"PUT",{expectedRevision:catalog.revision,product:{...p,variants:[{...v,size:"A".repeat(46)}]}});assert.equal(r.status,422);
    r=await call(`/variants/${v.id}/card`,"PATCH",{expectedRevision:catalog.revision,enabled:true});assert.equal(r.status,200);catalog=r.catalog;
    assert.equal((await call(`/variants/${v.id}`,"DELETE",{expectedRevision:catalog.revision},false)).status,401);
    assert.equal((await call(`/variants/${v.id}`,"DELETE",{expectedRevision:catalog.revision-1})).status,409);
    r=await call(`/variants/${v.id}`,"DELETE",{expectedRevision:catalog.revision});assert.equal(r.status,200);assert.equal(r.catalog.products.find(x=>x.id===p.id).variants.length,0);
    assert.equal((await call(`/variant-pages/${v.id}`,"GET",null,false)).status,404);
  } finally { await app.close(); }
});
