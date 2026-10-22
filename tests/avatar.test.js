import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
import {migrate} from '../server/db.js';
import {seedCatalog} from '../server/catalog-service.js';
const password='Avatar-test-only-1864',hash=await hashPassword(password),data='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6B9sAAAAASUVORK5CYII=';
function client(app){let cookie='';async function raw(path,method='GET',body,origin='https://test.local'){const r=await app.handle(new Request('https://test.local/api'+path,{method,headers:{origin,cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r}async function call(...args){const r=await raw(...args);return {status:r.status,...await r.json()}}return {raw,call}}
async function fixture(){const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD_HASH:hash}}),admin=client(app);const {user}=await admin.call('/login','POST',{email:'admin@example.test',password});return {app,admin,user}}
test('profile photo upload, replacement and removal persist without exposing image data or changing product media',async()=>{
 const {app,admin,user}=await fixture();try{
  assert.equal(user.avatarUrl,'');assert.equal((await admin.call('/profile/avatar')).status,404);
  let saved=await admin.call('/profile/avatar','PUT',{expectedVersion:user.version,mimeType:'image/png',data});assert.equal(saved.status,200);assert.match(saved.user.avatarUrl,/\/api\/profile\/avatar\?user=/);assert.equal(saved.user.version,user.version+1);assert.equal(JSON.stringify(saved).includes(data),false);
  let response=await admin.raw(saved.user.avatarUrl.replace('/api',''));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.match(response.headers.get('cache-control'),/private, no-store/);assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(data,'base64'));
  await migrate(app.db,seedCatalog());assert.equal((await admin.call('/session')).user.avatarUrl,saved.user.avatarUrl);
  const first=saved.user.avatarUrl;saved=await admin.call('/profile/avatar','PUT',{expectedVersion:saved.user.version,mimeType:'image/png',data});assert.equal(saved.status,200);assert.notEqual(saved.user.avatarUrl,first);assert.equal((await app.db.query('SELECT COUNT(*) AS total FROM app_user_avatars')).rows[0].total,1);
  const returning=client(app);const login=await returning.call('/login','POST',{email:'admin@example.test',password});assert.equal(login.user.avatarUrl,saved.user.avatarUrl);
  assert.equal((await admin.call('/media')).assets.length,0);assert.equal(JSON.stringify(await admin.call('/catalog')).includes(data),false);assert.equal(JSON.stringify(await admin.call('/users')).includes(data),false);
  const removed=await admin.call('/profile/avatar','DELETE',{expectedVersion:saved.user.version});assert.equal(removed.status,200);assert.equal(removed.user.avatarUrl,'');assert.equal((await admin.call('/profile/avatar')).status,404);assert.equal((await app.db.query('SELECT COUNT(*) AS total FROM app_user_avatars')).rows[0].total,0);
  assert.equal((await admin.call('/profile/avatar','DELETE',{expectedVersion:removed.user.version})).user.version,removed.user.version);
 }finally{await app.close()}
});
test('avatar writes validate image signatures and size, reject stale versions and enforce origin and authentication',async()=>{
 const {app,admin,user}=await fixture();try{
  const anonymous=client(app);assert.equal((await anonymous.call('/profile/avatar')).status,401);assert.equal((await anonymous.call('/profile/avatar','PUT',{expectedVersion:1,mimeType:'image/png',data})).status,401);
  for(const payload of [{mimeType:'image/svg+xml',data:Buffer.from('<svg/>').toString('base64')},{mimeType:'image/jpeg',data},{mimeType:'image/png',data:'bad==='},{mimeType:'image/png',data:''},{mimeType:'image/png',data:'a'.repeat(2796208)}])assert.equal((await admin.call('/profile/avatar','PUT',{expectedVersion:user.version,...payload})).status,422);
  assert.equal((await admin.call('/profile/avatar','PUT',{expectedVersion:user.version,mimeType:'image/png',data},'https://evil.test')).status,403);
  assert.equal((await admin.call('/profile/avatar','PUT',{expectedVersion:0,mimeType:'image/png',data})).status,409);
  const saved=await admin.call('/profile/avatar','PUT',{expectedVersion:user.version,mimeType:'image/png',data});assert.equal((await admin.call('/profile/avatar','DELETE',{expectedVersion:user.version})).status,409);assert.equal((await admin.call('/session')).user.avatarUrl,saved.user.avatarUrl);
 }finally{await app.close()}
});
test('viewer can manage only their own photo after password change, with no media write permission',async()=>{
 const {app,admin,user}=await fixture();try{
  const manager=await admin.call('/profile/avatar','PUT',{expectedVersion:user.version,mimeType:'image/png',data});
  await admin.call('/users','POST',{user:{name:'Viewer',email:'viewer@example.test',role:'viewer',active:true,password}});const viewer=client(app);let login=await viewer.call('/login','POST',{email:'viewer@example.test',password});assert.equal((await viewer.call('/profile/avatar','PUT',{expectedVersion:login.user.version,mimeType:'image/png',data})).error.code,'PASSWORD_CHANGE_REQUIRED');
  login=await viewer.call('/password','POST',{currentPassword:password,newPassword:password+'-changed'});assert.equal((await viewer.call(manager.user.avatarUrl.replace('/api',''))).status,404);
  const saved=await viewer.call('/profile/avatar','PUT',{id:user.id,userId:user.id,expectedVersion:login.user.version,mimeType:'image/png',data});assert.equal(saved.status,200);assert.equal(saved.user.id,login.user.id);assert.equal(saved.user.role,'viewer');assert.equal((await admin.call('/session')).user.avatarUrl,manager.user.avatarUrl);
  assert.equal((await viewer.call('/media','POST',{name:'forbidden.png',mimeType:'image/png',data})).status,403);assert.equal((await viewer.raw(saved.user.avatarUrl.replace('/api',''))).status,200);await viewer.call('/logout','POST',{});assert.equal((await viewer.raw(saved.user.avatarUrl.replace('/api',''))).status,401);
 }finally{await app.close()}
});
