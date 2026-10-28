import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
import {duplicateProduct} from '../src/duplicate-product.js';
test('product dimensions persist, preserve on omitted updates, validate and clear independently',async()=>{
 const email='dimensions@test.example',password='Product-dimensions-test';
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie='';
 const call=async(path,method='GET',body)=>{const r=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};
 try {
 await call('/login','POST',{email,password});let c=(await call('/catalog')).catalog;
 const dimensions={length:45.5,width:30,height:25};
 let r=await call('/products','POST',{expectedRevision:c.revision,product:{name:'Baklava',category:'Baklavalar',variants:[],dimensions}});assert.equal(r.status,200);c=r.catalog;let p=c.products[0];assert.deepEqual(p.dimensions,dimensions);
 const copy=duplicateProduct(p);assert.deepEqual(copy.dimensions,dimensions);copy.dimensions.length=1;assert.equal(p.dimensions.length,45.5);
 for(const bad of [{length:-1},{height:'20'},{length:100001},[],{volume:12}])assert.equal((await call('/products/'+p.id,'PUT',{expectedRevision:c.revision,product:{...p,dimensions:bad}})).status,422);
 const {dimensions:omit,...rest}=p;
 r=await call('/products/'+p.id,'PUT',{expectedRevision:c.revision,product:{...rest,description:'Yeni'}});assert.equal(r.status,200);c=r.catalog;p=c.products[0];assert.deepEqual(p.dimensions,dimensions);
 r=await call('/products/'+p.id,'PUT',{expectedRevision:c.revision,product:{...p,dimensions:null}});assert.equal(r.status,200);assert.equal(r.catalog.products[0].dimensions,null);
 }finally{await app.close();}
});
