import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
import {imageUrl} from '../src/image-sizes.js';
async function fixture(){
 const email='thumb@test.example',password='Thumbnails-test-1864';
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie='';
 const raw=async(path,method='GET',body,extra={})=>{
  const r=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...extra,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;
 };await raw('/login','POST',{email,password});return {app,raw};
}
test('new uploads persist bounded WebP derivatives, preserve originals and revalidate caches after authorization',async()=>{
 const {app,raw}=await fixture();try{
 const original=await sharp({create:{width:1600,height:800,channels:4,background:{r:190,g:100,b:20,alpha:.5}}}).png().toBuffer();
 let response=await raw('/media','POST',{name:'baklava.png',mimeType:'image/png',data:original.toString('base64')});assert.equal(response.status,201);const {asset}=await response.json();
 assert.equal((await app.db.query('SELECT profile FROM app_media_derivatives WHERE media_id=?',[asset.id])).rows.length,3);
 for(const [profile,width] of [['thumb',128],['tile',480],['detail',1200]]){
  response=await raw(`/media/${asset.id}/content?size=${profile}`);assert.equal(response.headers.get('content-type'),'image/webp');const etag=response.headers.get('etag');
  const metadata=await sharp(Buffer.from(await response.arrayBuffer())).metadata();assert.equal(metadata.width,width);assert.equal(metadata.height,width/2);assert.equal(metadata.hasAlpha,true);
  assert.equal((await raw(`/media/${asset.id}/content?size=${profile}`,'GET',null,{'if-none-match':etag})).status,304);
 }
 response=await raw(`/media/${asset.id}/content`);assert.deepEqual(Buffer.from(await response.arrayBuffer()),original);
 assert.equal((await raw(`/media/${asset.id}/content?size=50000`)).status,422);
 assert.equal((await raw('/media','POST',{name:'broken.png',mimeType:'image/png',data:'iVBORw0KGgo='})).status,422);
 assert.equal((await raw(`/media/${asset.id}/content?size=toString`)).status,422);
 await raw('/logout','POST',{});assert.equal((await raw(`/media/${asset.id}/content?size=thumb`)).status,401);
 }finally{await app.close();}
});
test('legacy backfill is bounded, repeatable, reports damaged images and preserves originals',async()=>{
 const {app,raw}=await fixture();try{
 const original=await sharp({create:{width:80,height:40,channels:3,background:'white'}}).png().toBuffer();
 for(let i=0;i<7;i++)await app.db.query('INSERT INTO app_media (id,name,mime_type,size,data,version,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)',[`old-${i}`,`Old ${i}`,'image/png',original.length,original.toString('base64'),'now','now']);
 await app.db.query('INSERT INTO app_media (id,name,mime_type,size,data,version,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)',['old-z','Damaged','image/png',8,'iVBORw0KGgo=','now','now']);
 let r=await (await raw('/media/thumbnails','POST',{})).json();assert.equal(r.processed,5);assert.equal(r.done,false);
 r=await (await raw('/media/thumbnails','POST',{cursor:r.cursor})).json();assert.equal(r.processed,2);assert.equal(r.failures.length,1);assert.equal(r.done,true);
 assert.equal((await app.db.query('SELECT media_id FROM app_media_derivatives')).rows.length,21);
 assert.equal((await app.db.query('SELECT id FROM app_media')).rows.length,8);
 assert.equal((await raw('/media/old-0','DELETE',{expectedVersion:1})).status,200);
 assert.equal((await app.db.query('SELECT profile FROM app_media_derivatives WHERE media_id=?',['old-0'])).rows.length,0);
 await app.db.query("UPDATE app_users SET role='viewer'");assert.equal((await raw('/media/thumbnails','POST',{})).status,403);
 }finally{await app.close();}
});
test('on-demand legacy generation persists once and image URLs keep public access routes',async()=>{
 const {app,raw}=await fixture();try{
 const bytes=await sharp({create:{width:100,height:200,channels:3,background:'red'}}).png().toBuffer();
 await app.db.query('INSERT INTO app_media (id,name,mime_type,size,data,version,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)',['legacy','Legacy','image/png',bytes.length,bytes.toString('base64'),'now','now']);
 const results=await Promise.all([raw('/media/legacy/content?size=thumb'),raw('/media/legacy/content?size=thumb')]);assert.ok(results.every(r=>r.status===200));assert.equal((await app.db.query('SELECT profile FROM app_media_derivatives')).rows.length,3);
 assert.equal(imageUrl('/api/product-pages/slug/images/legacy','tile'),'/api/product-pages/slug/images/legacy?size=tile');
 assert.equal(imageUrl('https://untrusted.example/image.jpg','thumb'),'https://untrusted.example/image.jpg');
 }finally{await app.close();}
});

test('profile photos serve 128px thumbnails, regenerate old thumbnails and remove derivatives with the photo',async()=>{
 const {app,raw}=await fixture();try {
 const {user}=await (await raw('/session')).json();
 const bytes=await sharp({create:{width:800,height:600,channels:3,background:'blue'}}).png().toBuffer();
 const uploaded=await (await raw('/profile/avatar','PUT',{expectedVersion:user.version,mimeType:'image/png',data:bytes.toString('base64')})).json();
 let response=await raw('/profile/avatar?size=thumb');assert.equal(response.headers.get('content-type'),'image/webp');let meta=await sharp(Buffer.from(await response.arrayBuffer())).metadata();assert.equal(meta.width,128);assert.equal(meta.height,96);
 await app.db.query('DELETE FROM app_user_avatar_thumbnails');
 response=await raw('/profile/avatar?size=thumb');assert.equal(response.status,200);assert.equal((await app.db.query('SELECT user_id FROM app_user_avatar_thumbnails')).rows.length,1);
 await raw('/profile/avatar','DELETE',{expectedVersion:uploaded.user.version});assert.equal((await app.db.query('SELECT user_id FROM app_user_avatar_thumbnails')).rows.length,0);assert.equal((await raw('/profile/avatar?size=thumb')).status,404);
 }finally {await app.close();}
});
