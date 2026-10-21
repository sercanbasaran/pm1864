import {openDatabase,migrate} from './db.js';
import {createCatalogService,seedCatalog,ApiError} from './catalog-service.js';
import {checkPassword,cookie,digest,newSessionToken,readCookie} from './security.js';
import {createUserService,publicUser} from './users.js';
import {can} from '../src/permissions.js';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const dummyHash='scrypt:'+('0'.repeat(32))+':'+('0'.repeat(128));
export async function createApp({env=process.env,database}={}){
 const db=database||await openDatabase(env);await migrate(db,seedCatalog());const service=createCatalogService(db),users=createUserService(db,env);await users.initialize();
 async function session(request){const token=readCookie(request);if(!token)return null;const row=(await db.query('SELECT email, expires_at FROM app_sessions WHERE token_hash=?',[digest(token)])).rows[0];if(!row||Number(row.expires_at)<=Date.now())return null;const user=await users.findEmail(row.email);return user?.active?publicUser(user):null}
 async function issueSession(user,clientKey){const token=newSessionToken();await db.transaction(async tx=>{await tx.query('SELECT revision FROM app_catalog WHERE id=1'+(tx.dialect==='postgres'?' FOR UPDATE':''));const current=(await tx.query('SELECT active,version FROM app_users WHERE id=?',[user.id])).rows[0];if(!current?.active||Number(current.version)!==user.version)throw new ApiError(401,'Hesap bilgileri değişti. Yeniden giriş yapın.','UNAUTHORIZED');await tx.query('DELETE FROM app_login_limits WHERE key_hash=?',[clientKey]);await tx.query('DELETE FROM app_sessions WHERE expires_at<?',[Date.now()]);await tx.query('DELETE FROM app_login_limits WHERE reset_at<?',[Date.now()]);await tx.query('INSERT INTO app_sessions (token_hash,email,expires_at) VALUES (?,?,?)',[digest(token),user.email,Date.now()+28800000])});return token}
 async function handle(request,{clientIP='unknown'}={}){
  try{const url=new URL(request.url),route=url.pathname.replace(/^\/\.netlify\/functions\/api/,'/api').replace(/\/$/,''),method=request.method.toUpperCase();
   if(route==='/api/health'&&method==='GET')return json({ok:true,service:'pm1864',database:db.dialect});
   if(!await users.configured())throw new ApiError(503,'İlk yönetici hesabı yapılandırılmadı. ADMIN_EMAIL ve ADMIN_PASSWORD_HASH değerlerini tamamlayın.','NOT_CONFIGURED');
   if(['POST','PUT','PATCH','DELETE'].includes(method)&&request.headers.get('origin')!==(env.APP_ORIGIN||url.origin))throw new ApiError(403,'İstek kaynağı doğrulanamadı.','ORIGIN_REJECTED');
   let body={};if(['POST','PUT','PATCH'].includes(method)){if(!request.headers.get('content-type')?.includes('application/json'))throw new ApiError(415,'JSON içerik gerekli.');const raw=await request.text();if(Buffer.byteLength(raw)>262144)throw new ApiError(413,'İstek boyutu sınırı aşıldı.');try{body=JSON.parse(raw)}catch{throw new ApiError(400,'Geçersiz JSON.')}if(!body||Array.isArray(body)||typeof body!=='object')throw new ApiError(400,'JSON nesnesi gerekli.')}
   const secure=url.protocol==='https:';
   if(route==='/api/login'&&method==='POST'){
    const key=digest(clientIP),time=Date.now();await db.transaction(async tx=>{const suffix=tx.dialect==='postgres'?' FOR UPDATE':'';await tx.query('INSERT INTO app_login_limits (key_hash, attempts, reset_at) VALUES (?,0,?) ON CONFLICT (key_hash) DO NOTHING',[key,time+900000]);const row=(await tx.query('SELECT attempts, reset_at FROM app_login_limits WHERE key_hash=?'+suffix,[key])).rows[0];if(Number(row.reset_at)>time&&Number(row.attempts)>=5)throw new ApiError(429,'Çok fazla giriş denemesi. 15 dakika sonra yeniden deneyin.');await tx.query('UPDATE app_login_limits SET attempts=?,reset_at=? WHERE key_hash=?',[Number(row.reset_at)<=time?1:Number(row.attempts)+1,Number(row.reset_at)<=time?time+900000:Number(row.reset_at),key])});
    const row=await users.findEmail(body.email),passwordOkay=await checkPassword(body.password,row?.password_hash||dummyHash);if(!row?.active||!passwordOkay)throw new ApiError(401,'E-posta veya parola hatalı.','INVALID_CREDENTIALS');const user=publicUser(row),token=await issueSession(user,key);return json({user},200,{'set-cookie':cookie(token,secure)})
   }
   const user=await session(request);if(!user)throw new ApiError(401,'Oturum açmanız gerekiyor.','UNAUTHORIZED');
   if(route==='/api/session'&&method==='GET')return json({user});
   if(route==='/api/logout'&&method==='POST'){await db.query('DELETE FROM app_sessions WHERE token_hash=?',[digest(readCookie(request))]);return json({ok:true},200,{'set-cookie':cookie('',secure,true)})}
   if(route==='/api/password'&&method==='POST'){const updated=await users.password(body,user);const token=await issueSession(updated,digest(clientIP));return json({user:updated},200,{'set-cookie':cookie(token,secure)})}
   if(user.mustChangePassword)throw new ApiError(403,'Devam etmeden önce geçici parolanızı değiştirin.','PASSWORD_CHANGE_REQUIRED');
   const requirePermission=permission=>{if(!can(user,permission))throw new ApiError(403,'Bu işlem için yetkiniz yok.','FORBIDDEN')};
   if(route==='/api/catalog'&&method==='GET'){requirePermission('catalog.read');return json({catalog:await service.read()})}
   if(route==='/api/users'&&method==='GET'){requirePermission('users.manage');return json(await users.list())}
   if(route==='/api/users'&&method==='POST'){requirePermission('users.manage');return json({user:await users.save(body,null,user)},201)}
   let match;if((match=route.match(/^\/api\/users\/([^/]+)$/))&&method==='PUT'){requirePermission('users.manage');return json({user:await users.save(body,decodeURIComponent(match[1]),user)})}
   if((match=route.match(/^\/api\/users\/([^/]+)\/password$/))&&method==='POST'){requirePermission('users.manage');return json(await users.reset(body,decodeURIComponent(match[1]),user))}
   let catalog;
   if(route==='/api/categories'&&method==='POST'){requirePermission('categories.write');catalog=await service.saveCategory(body,null,user.email)}
   else if((match=route.match(/^\/api\/categories\/([^/]+)$/))&&method==='PUT'){requirePermission('categories.write');catalog=await service.saveCategory(body,decodeURIComponent(match[1]),user.email)}
   else if(route==='/api/products'&&method==='POST'){requirePermission('products.write');catalog=await service.saveProduct(body,null,user.email)}
   else if((match=route.match(/^\/api\/products\/(\d+)$/))&&method==='PUT'){requirePermission('products.write');catalog=await service.saveProduct(body,match[1],user.email)}
   else if(route==='/api/prices/bulk'&&method==='POST'){requirePermission('prices.write');catalog=await service.bulk(body,user.email)}
   else if(route==='/api/settings'&&method==='PATCH'){requirePermission('settings.write');catalog=await service.settings(body,user.email)}
   else throw new ApiError(404,'API yolu veya metodu bulunamadı.','NOT_FOUND');
   return json({catalog});
  }catch(e){if(e instanceof ApiError)return json({error:{code:e.code,message:e.message}},e.status);console.error('pm1864 API error:',e.code||e.name);return json({error:{code:'INTERNAL_ERROR',message:'Sunucu işlemi tamamlayamadı. Yeniden deneyin.'}},500)}
 }
 return {handle,service,users,db,close:()=>db.close()};
}
let instance;
export async function getApp(){if(!instance)instance=createApp().catch(e=>{instance=null;throw e});return instance}
export async function handler(request,context={}){try{return await(await getApp()).handle(request,{clientIP:context.ip||'unknown'})}catch(e){console.error('pm1864 initialization:',e.code||e.name);return json({error:{code:'NOT_CONFIGURED',message:'Veritabanı bağlantısı kurulamadı. DATABASE_URL ve ilk yönetici ayarlarını kontrol edin.'}},503)}}
