import {createHash} from 'node:crypto';
import {ApiError} from './errors.js';
import {audit} from './audit.js';
import {deriveVariantInformation} from '../src/variant-composition.js';
const textKeys=['name','description','ingredients','allergens','servingSuggestion','storageConditions','longTermStorage'];
const hash=fields=>createHash('sha256').update(JSON.stringify(fields)).digest('hex');
export function sourceFor(doc,kind,id){
 let value;
 if(kind==='product')value=doc.products.find(p=>String(p.id)===String(id));
 if(kind==='category')value=doc.categories.find(c=>c.id===id);
 if(kind==='variant')for(const p of doc.products){const v=p.variants.find(v=>v.id===id);if(v){value={...(v.items?.length?deriveVariantInformation(v,doc.products):p),...v.information,name:v.size,description:''};break;}}
 if(!value)throw new ApiError(404,'Çevrilecek kayıt bulunamadı.');
 const fields=Object.fromEntries(textKeys.filter(key=>typeof value[key]==='string'&&value[key].trim()).map(key=>[key,value[key]]));
 if(!Object.keys(fields).length)throw new ApiError(422,'Çevrilecek metin yok.');
 return {fields,sourceHash:hash(fields)};
}
async function externalJson(url,options={}){
 try{const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok)throw Error();const text=await response.text();if(text.length>1000000)throw Error();return JSON.parse(text);}catch{throw new ApiError(502,'Dış servis yanıt vermedi veya geçersiz yanıt döndürdü. Kayıtlı veriler korundu.');}
}
export function createLocalizationService(db,catalog,env){
 const pending=new Set();
 async function raw(){return db.transaction(async tx=>{const row=(await tx.query('SELECT revision,document FROM app_catalog WHERE id=1')).rows[0];return {doc:JSON.parse(row.document),revision:Number(row.revision)};});}
 function check(revision,expected){if(revision!==expected)throw new ApiError(409,'Katalog değişti. Yenileyip yeniden deneyin.');}
 async function view(){const {doc,revision}=await raw();return {revision,translationConfigured:!!env.GOOGLE_TRANSLATE_API_KEY,sourceLanguage:'tr',baseCurrency:'TRY',rates:doc.localization?.rates||null,translations:Object.values(doc.localization?.translations||{}).map(item=>{let stale=true;try{stale=sourceFor(doc,item.kind,item.recordId).sourceHash!==item.sourceHash;}catch{}return {...item,stale};})};}
 async function rates(body,actor){const {doc,revision}=await raw();check(revision,body.expectedRevision);if(doc.localization?.rates&&Date.now()-Date.parse(doc.localization.rates.fetchedAt)<6*3600000)return catalog.read();
 if(pending.has('rates'))throw new ApiError(409,'Kur güncellemesi zaten sürüyor.');pending.add('rates');
 try{const codes=doc.currencies.filter(c=>c.active&&c.code!=='TRY').map(c=>c.code);const data= codes.length?await externalJson('https://api.frankfurter.dev/v2/rates?base=TRY&quotes='+codes.join(',')):[];
 if(!Array.isArray(data))throw new ApiError(502,'Kur yanıtı geçersiz.');
 const entries=codes.map(code=>{const row=data.find(row=>row.quote===code&&row.base==='TRY');if(!row||!Number.isFinite(row.rate)||row.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))throw new ApiError(502,`${code} için kur bulunamadı.`);return {currency:code,rate:row.rate,date:row.date};});
 return await catalog.mutate(body.expectedRevision,actor,doc=>{doc.localization||={};doc.localization.rates={base:'TRY',provider:'Frankfurter',fetchedAt:new Date().toISOString(),entries:[{currency:'TRY',rate:1,date:new Date().toISOString().slice(0,10)},...entries]};audit(doc,'Kurlar güncellendi',`${entries.length} para birimi`,actor);});
 }finally{pending.delete('rates');}}
 async function translate(body,actor){const {doc,revision}=await raw();check(revision,body.expectedRevision);const {kind,recordId,language}=body;
 if(!['product','variant','category'].includes(kind)||!['string','number'].includes(typeof recordId)||!doc.languages.some(l=>l.code===language&&l.active))throw new ApiError(422,'Kayıt ve hedef dili kontrol edin.');
 const {fields,sourceHash}=sourceFor(doc,kind,recordId);const key=`${kind}:${recordId}:${language}`;
 if(doc.localization?.translations?.[key]?.sourceHash===sourceHash)return catalog.read();
 if(Object.keys(doc.localization?.translations||{}).length>=5000&&!doc.localization?.translations?.[key])throw new ApiError(422,'Çeviri kayıt sınırına ulaşıldı.');
 if(pending.has(key))throw new ApiError(409,'Bu çeviri zaten hazırlanıyor.');pending.add(key);
 try{let translated=fields;
 if(language!=='tr'){
 if(!env.GOOGLE_TRANSLATE_API_KEY)throw new ApiError(503,'Otomatik çeviri için sunucuda GOOGLE_TRANSLATE_API_KEY tanımlanmalı.');
 const values=Object.values(fields);if(values.join('').length>25000)throw new ApiError(422,'Metin tek çeviri için çok uzun.');
 const data=await externalJson('https://translation.googleapis.com/language/translate/v2',{method:'POST',headers:{'content-type':'application/json','X-goog-api-key':env.GOOGLE_TRANSLATE_API_KEY},body:JSON.stringify({q:values,source:'tr',target:language,format:'text'})});
 const result=data.data?.translations;
 if(!Array.isArray(result)||result.length!==values.length||result.some(row=>typeof row.translatedText!=='string'||row.translatedText.length>16000))throw new ApiError(502,'Çeviri yanıtı geçersiz.');
 translated=Object.fromEntries(Object.keys(fields).map((key,i)=>[key,result[i].translatedText]));
 }
 return await catalog.mutate(body.expectedRevision,actor,doc=>{if(sourceFor(doc,kind,recordId).sourceHash!==sourceHash)throw new ApiError(409,'Kaynak metin değişti.');doc.localization||={};doc.localization.translations||={};doc.localization.translations[key]={kind,recordId,language,sourceLanguage:'tr',sourceHash,fields:translated,sourceFields:fields,provider:language==='tr'?'Kaynak':'Google Cloud Translation',createdAt:new Date().toISOString()};audit(doc,'Çeviri hazırlandı',`${kind}:${recordId} → ${language}`,actor);});
 }finally{pending.delete(key);}}
 return {view,rates,translate};
}
