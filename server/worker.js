import {randomUUID} from 'node:crypto';
import {platformDefinitions,audit} from './catalog-service.js';

export async function processJobs(service,env=process.env,fetcher=fetch,limit=2){
 let processed=0;for(let n=0;n<limit;n++){
  let claim;
  await service.mutate(null,'worker',doc=>{const timestamp=Date.now();for(const j of doc.jobs)if(j.status==='processing'&&j.leaseUntil<timestamp){j.status='retry';j.nextAttemptAt=timestamp}
   const j=[...doc.jobs].reverse().find(j=>['pending','retry'].includes(j.status)&&j.nextAttemptAt<=timestamp);if(!j)return;
   const p=doc.products.find(p=>p.id===j.productId);if(!p||p.version!==j.version||!p.channels.includes(j.channel)){j.status='superseded';return}
   j.status='processing';j.lease=randomUUID();j.leaseUntil=timestamp+60000;j.attempts++;claim=structuredClone(j)
  },{internal:true});
  if(!claim)break;
  const platform=platformDefinitions[claim.channel];let status='succeeded',error='',mode='webhook';
  if(env.SYNC_MODE==='demo')mode='demo';
  else if(!env[`SYNC_${platform.key}_URL`]||!env[`SYNC_${platform.key}_TOKEN`]){status='blocked';error='Platform webhook URL’si ve erişim anahtarı yapılandırılmadı.'}
  else{
   try{const url=new URL(env[`SYNC_${platform.key}_URL`]);if(url.protocol!=='https:')throw new Error('HTTPS_REQUIRED');const payload={event:'product.updated',jobId:claim.id,platform:platform.key,product:claim.payload,version:claim.version};const response=await fetcher(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),headers:{'content-type':'application/json','authorization':`Bearer ${env[`SYNC_${platform.key}_TOKEN`]}`,'idempotency-key':claim.id},body:JSON.stringify(payload)});if(!response.ok){status=(response.status===429||response.status>=500)&&claim.attempts<3?'retry':'failed';error=`Platform HTTP ${response.status} yanıtı verdi.`}await response.body?.cancel()}
   catch(e){status=claim.attempts<3?'retry':'failed';error=e.message==='HTTPS_REQUIRED'?'Webhook HTTPS kullanmalı.':'Platforma ulaşılamadı veya zaman aşımı oluştu.'}
  }
  await service.mutate(null,'worker',doc=>{const job=doc.jobs.find(j=>j.id===claim.id);if(!job||job.lease!==claim.lease||job.status!=='processing')return;Object.assign(job,{status,error,mode,finishedAt:new Date().toISOString(),nextAttemptAt:Date.now()+Math.min(300000,15000*2**job.attempts)});delete job.lease;delete job.leaseUntil;
   const p=doc.products.find(p=>p.id===job.productId);if(status==='succeeded'&&p&&p.version===job.version&&p.channels.includes(job.channel)){p.channelVersions={...p.channelVersions,[job.channel]:job.version}}
   audit(doc,status==='succeeded'?(mode==='demo'?'Demo gönderimi tamamlandı':'Platform gönderimi tamamlandı'):'Platform gönderimi '+status,`${platform.name} · ${claim.payload.name}${error?' · '+error:''}`,'worker');
  },{internal:true});processed++;
 }
 return {processed};
}
