import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
const password='Media-test-only-1864',hash=await hashPassword(password),data='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6B9sAAAAASUVORK5CYII=';
async function fixture(){const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'media@example.test',ADMIN_PASSWORD_HASH:hash}});let cookie='';async function raw(path,method='GET',body){const r=await app.handle(new Request('http://test.local/api'+path,{method,headers:{origin:'http://test.local',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r}async function call(...args){const r=await raw(...args);return {status:r.status,...await r.json()}}await call('/login','POST',{email:'media@example.test',password});return {app,call,raw,clear:()=>cookie=''}}
const upload=f=>f.call('/media','POST',{name:'baklava.png',mimeType:'image/png',data});
test('authenticated media upload, metadata, raw content and rename persist without exposing file data in catalog/list',async()=>{
 const f=await fixture();try{const result=await upload(f);assert.equal(result.status,201);const asset=result.asset;assert.equal(asset.mimeType,'image/png');assert.equal(asset.size,Buffer.from(data,'base64').length);assert.equal('data' in asset,false);
 const list=await f.call('/media');assert.equal(list.assets.length,1);assert.equal(JSON.stringify(list).includes(data),false);const raw=await f.raw('/media/'+asset.id+'/content');assert.equal(raw.status,200);assert.equal(raw.headers.get('content-type'),'image/png');assert.match(raw.headers.get('cache-control'),/private/);assert.deepEqual(Buffer.from(await raw.arrayBuffer()),Buffer.from(data,'base64'));
 const renamed=await f.call('/media/'+asset.id,'PATCH',{name:'Yeni ad.png',expectedVersion:1});assert.equal(renamed.asset.version,2);assert.equal(renamed.asset.name,'Yeni ad.png');assert.equal(renamed.asset.url,asset.url);assert.equal((await f.call('/media/'+asset.id,'PATCH',{name:'Stale',expectedVersion:1})).status,409);
 assert.equal((await f.call('/media/'+asset.id,'DELETE',{expectedVersion:2})).status,200);assert.equal((await f.call('/media')).assets.length,0);assert.equal((await f.raw('/media/'+asset.id+'/content')).status,404);
 }finally{await f.app.close()}
});
test('linked media cannot be deleted; product links and immutable product codes are server-managed',async()=>{
 const f=await fixture();try{const {asset}=await upload(f);let catalog=(await f.call('/catalog')).catalog;let saved=await f.call('/products','POST',{expectedRevision:catalog.revision,product:{name:'Medya ürün',category:'Baklavalar',mediaId:asset.id,customImage:'https://forged.test/',productCode:'FORGED',status:'Aktif',variants:[{size:'S',weight:500,price:125.25,slices:12}]}});assert.equal(saved.status,200);let product=saved.catalog.products[0];assert.equal(product.productCode,'P000001');assert.equal(product.customImage,asset.url);assert.equal(product.mediaId,asset.id);assert.equal((await f.call('/media/'+asset.id,'DELETE',{expectedVersion:1})).error.code,'MEDIA_IN_USE');
 saved=await f.call('/products/'+product.id,'PUT',{expectedRevision:saved.catalog.revision,product:{...product,productCode:'FORGED',name:'Yenilenen ürün'}});assert.equal(saved.status,200);assert.equal(saved.catalog.products[0].productCode,product.productCode);assert.equal(saved.catalog.products[0].sku,product.sku);
 const invalid=await f.call('/products/'+product.id,'PUT',{expectedRevision:saved.catalog.revision,product:{...product,mediaId:'missing'}});assert.equal(invalid.status,422);
 saved=await f.call('/products/'+product.id,'PUT',{expectedRevision:saved.catalog.revision,product:{...product,mediaId:'',customImage:''}});assert.equal(saved.status,200);assert.equal((await f.call('/media/'+asset.id,'DELETE',{expectedVersion:1})).status,200);
 }finally{await f.app.close()}
});
test('invalid types, forged MIME, invalid base64, oversize files, foreign origins and viewer writes are rejected',async()=>{
 const f=await fixture();try{for(const payload of [{mimeType:'image/svg+xml',data:Buffer.from('<svg/>').toString('base64')},{mimeType:'image/jpeg',data},{mimeType:'image/png',data:'invalid==='},{mimeType:'image/png',data:'a'.repeat(2800004)}])assert.equal((await f.call('/media','POST',{name:'test',...payload})).status,422);
 const {asset}=await upload(f);await f.app.db.query("UPDATE app_users SET role='viewer'");assert.equal((await f.call('/media')).status,200);assert.equal((await f.raw('/media/'+asset.id+'/content')).status,200);assert.equal((await upload(f)).status,403);assert.equal((await f.call('/media/'+asset.id,'PATCH',{name:'Forbidden',expectedVersion:1})).status,403);assert.equal((await f.call('/media/'+asset.id,'DELETE',{expectedVersion:1})).status,403);f.clear();assert.equal((await f.raw('/media/'+asset.id+'/content')).status,401);
 }finally{await f.app.close()}
});
