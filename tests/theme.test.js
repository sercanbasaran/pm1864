import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {openDatabase,migrate} from '../server/db.js';
import {seedCatalog} from '../server/catalog-service.js';
import {hashPassword} from '../server/security.js';
const password='Theme-test-only-1864',hash=await hashPassword(password);
function client(app){let cookie='';return async(path,method='GET',body)=>{const response=await app.handle(new Request('https://test.local/api'+path,{method,headers:{origin:'https://test.local',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()}}}
test('theme preferences are account scoped, validated, versioned and survive new sessions and profile changes',async()=>{
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD_HASH:hash}});
 try{
  const admin=client(app),viewer=client(app),anonymous=client(app);
  assert.equal((await anonymous('/preferences','PATCH',{theme:'dark',expectedVersion:1})).status,401);
  let {user:manager}=await admin('/login','POST',{email:'admin@example.test',password});assert.equal(manager.theme,'light');
  await admin('/users','POST',{user:{name:'Viewer',email:'viewer@example.test',role:'viewer',password,active:true}});
  await viewer('/login','POST',{email:'viewer@example.test',password});assert.equal((await viewer('/preferences','PATCH',{theme:'dark',expectedVersion:1})).error.code,'PASSWORD_CHANGE_REQUIRED');
  let {user}=await viewer('/password','POST',{currentPassword:password,newPassword:password+'-changed'});
  for(const theme of ['system','',null,{},false])assert.equal((await viewer('/preferences','PATCH',{theme,expectedVersion:user.version})).status,422);
  const changed=await viewer('/preferences','PATCH',{theme:'dark',expectedVersion:user.version,id:manager.id,role:'admin',email:'forged@example.test'});assert.equal(changed.status,200);assert.equal(changed.user.theme,'dark');assert.equal(changed.user.id,user.id);assert.equal(changed.user.role,'viewer');assert.equal(changed.user.email,'viewer@example.test');assert.equal(changed.user.version,user.version+1);
  assert.equal((await viewer('/preferences','PATCH',{theme:'light',expectedVersion:user.version})).status,409);
  assert.equal((await admin('/session')).user.theme,'light');
  const updated=await viewer('/profile','PATCH',{name:'Renamed viewer',expectedVersion:changed.user.version});assert.equal(updated.user.theme,'dark');
  const returning=client(app);const login=await returning('/login','POST',{email:'viewer@example.test',password:password+'-changed'});assert.equal(login.user.theme,'dark');
  const light=await returning('/preferences','PATCH',{theme:'light',expectedVersion:login.user.version});assert.equal(light.user.theme,'light');assert.equal((await returning('/session')).user.theme,'light');
 }finally{await app.close()}
});
test('theme migration preserves existing accounts and is idempotent',async()=>{
 const db=await openDatabase({SQLITE_PATH:':memory:'});
 try{
  await db.query('CREATE TABLE app_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL,must_change_password INTEGER NOT NULL,version INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)');
  await db.query('INSERT INTO app_users VALUES (?,?,?,?,?,?,?,?,?,?)',['legacy','legacy@example.test','Existing account','admin',hash,1,0,7,'2026-01-01','2026-01-01']);
  await migrate(db,seedCatalog());let row=(await db.query('SELECT * FROM app_users WHERE id=?',['legacy'])).rows[0];assert.equal(row.theme,'light');assert.equal(row.version,7);assert.equal(row.password_hash,hash);
  await db.query('UPDATE app_users SET theme=? WHERE id=?',['dark','legacy']);await migrate(db,seedCatalog());row=(await db.query('SELECT * FROM app_users WHERE id=?',['legacy'])).rows[0];assert.equal(row.theme,'dark');assert.equal(row.name,'Existing account');assert.equal(row.version,7);
 }finally{await db.close()}
});
