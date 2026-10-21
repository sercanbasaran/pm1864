import {openDatabase,migrate} from './db.js';
import {createCatalogService,seedCatalog,ApiError} from './catalog-service.js';
import {checkPassword,cookie,digest,newSessionToken,readCookie} from './security.js';
import {processJobs} from './worker.js';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
export async function createApp({env=process.env,database,fetcher=fetch}={}){
 const db=database||await openDatabase(env);await migrate(db,seedCatalog());const service=createCatalogService(db,env);
 async function session(request){const token=readCookie(request);if(!token)return null;const row=(await db.query('SELECT email, expires_at FROM app_sessions WHERE token_hash=?',[digest(token)])).rows[0];return row&&Number(row.expires_at)>Date.now()?{email:row.email}:null}
 async function handle(request,{clientIP='unknown'}={}){
  try{
   const url=new URL(request.url),route=url.pathname.replace(/^\/\.netlify\/functions\/api/,'/api').replace(/\/$/,'');const method=request.method.toUpperCase();
   if(route==='/api/health'&&method==='GET')return json({ok:true,service:'pm1864',database:db.dialect});
   if(!env.ADMIN_EMAIL||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ADMIN_PASSWORD_HASH||''))throw new ApiError(503,'Yönetici hesabı yapılandırılmadı. Sunucu ortam değişkenlerini tamamlayın.','NOT_CONFIGURED');
   if(['POST','PUT','PATCH','DELETE'].includes(method)&&request.headers.get('origin')!==(env.APP_ORIGIN||url.origin))throw new ApiError(403,'İstek kaynağı doğrulanamadı.','ORIGIN_REJECTED');
   let body={};if(['POST','PUT','PATCH'].includes(method)){if(!request.headers.get('content-type')?.includes('application/json'))throw new ApiError(415,'JSON içerik gerekli.');const raw=await request.text();if(Buffer.byteLength(raw)>262144)throw new ApiError(413,'İstek boyutu sınırı aşıldı.');try{body=JSON.parse(raw)}catch{throw new ApiError(400,'Geçersiz JSON.')}if(!body||Array.isArray(body)||typeof body!=='object')throw new ApiError(400,'JSON nesnesi gerekli.')}
   const secure=url.protocol==='https:';
   if(route==='/api/login'&&method==='POST'){
    const key=digest(clientIP);const time=Date.now();await db.transaction(async tx=>{const suffix=tx.dialect==='postgres'?' FOR UPDATE':'';await tx.query('INSERT INTO app_login_limits (key_hash, attempts, reset_at) VALUES (?,0,?) ON CONFLICT (key_hash) DO NOTHING',[key,time+900000]);const row=(await tx.query('SELECT attempts, reset_at FROM app_login_limits WHERE key_hash=?'+suffix,[key])).rows[0];if(Number(row.reset_at)>time&&Number(row.attempts)>=5)throw new ApiError(429,'Çok fazla giriş denemesi. 15 dakika sonra yeniden deneyin.');await tx.query('UPDATE app_login_limits SET attempts=?, reset_at=? WHERE key_hash=?',[Number(row.reset_at)<=time?1:Number(row.attempts)+1,Number(row.reset_at)<=time?time+900000:Number(row.reset_at),key])});
    const passwordOkay=await checkPassword(body.password,env.ADMIN_PASSWORD_HASH);if(typeof body.email!=='string'||body.email.toLowerCase()!==env.ADMIN_EMAIL.toLowerCase()||!passwordOkay)throw new ApiError(401,'E-posta veya parola hatalı.','INVALID_CREDENTIALS');const token=newSessionToken();await db.transaction(async tx=>{await tx.query('DELETE FROM app_login_limits WHERE key_hash=?',[key]);await tx.query('DELETE FROM app_sessions WHERE expires_at<?',[Date.now()]);await tx.query('DELETE FROM app_login_limits WHERE reset_at<?',[Date.now()]);await tx.query('INSERT INTO app_sessions (token_hash,email,expires_at) VALUES (?,?,?)',[digest(token),env.ADMIN_EMAIL,Date.now()+28800000])});return json({user:{email:env.ADMIN_EMAIL}},200,{'set-cookie':cookie(token,secure)});
   }
   const user=await session(request);if(!user)throw new ApiError(401,'Oturum açmanız gerekiyor.','UNAUTHORIZED');
   if(route==='/api/session'&&method==='GET')return json({user});
   if(route==='/api/logout'&&method==='POST'){await db.query('DELETE FROM app_sessions WHERE token_hash=?',[digest(readCookie(request))]);return json({ok:true},200,{'set-cookie':cookie('',secure,true)})}
   if(route==='/api/catalog'&&method==='GET')return json({catalog:await service.read()});
   let catalog,match;
   if(route==='/api/categories'&&method==='POST')catalog=await service.saveCategory(body,null,user.email);
   else if((match=route.match(/^\/api\/categories\/([^/]+)$/))&&method==='PUT')catalog=await service.saveCategory(body,decodeURIComponent(match[1]),user.email);
   else if(route==='/api/products'&&method==='POST')catalog=await service.saveProduct(body,null,user.email);
   else if((match=route.match(/^\/api\/products\/(\d+)$/))&&method==='PUT')catalog=await service.saveProduct(body,match[1],user.email);
   else if(route==='/api/prices/bulk'&&method==='POST')catalog=await service.bulk(body,user.email);
   else if(route==='/api/settings'&&method==='PATCH')catalog=await service.settings(body,user.email);
   else if(route==='/api/sync'&&method==='POST')catalog=await service.sync(body,user.email);
   else if(route==='/api/jobs/retry'&&method==='POST')catalog=await service.retry(body,user.email);
   else if(route==='/api/jobs/process'&&method==='POST'){await processJobs(service,env,fetcher);catalog=await service.read()}
   else throw new ApiError(404,'API yolu veya metodu bulunamadı.','NOT_FOUND');
   return json({catalog});
  }catch(e){if(e instanceof ApiError)return json({error:{code:e.code,message:e.message}},e.status);console.error('pm1864 API error:',e.code||e.name);return json({error:{code:'INTERNAL_ERROR',message:'Sunucu işlemi tamamlayamadı. Yeniden deneyin.'}},500)}
 }
 return {handle,service,db,close:()=>db.close()};
}
let instance;
export async function getApp(){if(!instance)instance=createApp().catch(e=>{instance=null;throw e});return instance}
export async function handler(request,context={}){try{return await(await getApp()).handle(request,{clientIP:context.ip||'unknown'})}catch(e){console.error('pm1864 initialization:',e.code||e.name);return json({error:{code:'NOT_CONFIGURED',message:'Veritabanı bağlantısı kurulamadı. DATABASE_URL ve yönetici ortam değişkenlerini kontrol edin.'}},503)}}
