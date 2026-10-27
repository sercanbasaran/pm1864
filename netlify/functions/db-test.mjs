import postgres from 'postgres';

export function createHandler({env=process.env,connect=postgres}={}){
 let sql;
 const respond=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
 return async function(request){
  if(request.method!=='GET')return respond({success:false,error:'Bu endpoint yalnızca GET isteklerini destekler.'},405,{Allow:'GET'});
  if((env.NETLIFY==='true'||env.NODE_ENV==='production')&&env.ENABLE_DB_DIAGNOSTICS!=='true')return respond({success:false,error:'Bulunamadı.'},404);
  if(!env.DATABASE_URL?.trim())return respond({success:false,error:'DATABASE_URL ortam değişkeni tanımlanmadı.'},503);
  try{
   // Reuse one small pool per warm serverless instance. Do not log the URL.
   sql??=connect(env.DATABASE_URL,{ssl:'require',max:1,connect_timeout:8,idle_timeout:20});
   const result=await sql`SELECT NOW() AS now`;
   return respond({success:true,message:'Supabase bağlantısı başarılı!',time:result[0].now});
  }catch(error){
   console.error('pm1864 db-test failed:',error?.code||error?.name||'DATABASE_ERROR');
   return respond({success:false,error:'Veritabanı bağlantısı kurulamadı. Sunucu bağlantı ayarlarını kontrol edin.'},500);
  }
 };
}

export default createHandler();
