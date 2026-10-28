import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCurrencies,defaultLanguages,upgradeRegionalDefinitions} from '../src/regional-definitions.js';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
test('approved HM1864 definitions are imported once without losing custom definitions',()=>{
 assert.deepEqual(defaultCurrencies().map(c=>c.code),['USD','GBP','TRY','AED','EUR','DKK','SEK','CNY','JPY']);
 assert.deepEqual(defaultLanguages().map(c=>c.code),['tr','en','ar','de','fr','it','es','ru','zh-CN','ja','hi','ur','fa','pt']);
 const doc={currencies:[{code:'TRY',name:'Mevcut ad',active:false},{code:'CHF',name:'Frank',active:true}]};
 assert.equal(upgradeRegionalDefinitions(doc),true);assert.equal(doc.currencies.length,10);assert.equal(doc.currencies[0].name,'Mevcut ad');assert.equal(doc.languages.length,14);assert.equal(doc.defaultCurrency,'TRY');
 doc.languages[0].name='Güncellendi';assert.equal(upgradeRegionalDefinitions(doc),false);assert.equal(doc.languages[0].name,'Güncellendi');
});
test('regional settings persist, enforce permissions, validate defaults and reject stale updates',async()=>{
 const password='Regional-definition-test-1864',email='regional@test.example';const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:await hashPassword(password)}});let cookie='';
 const call=async(path,method='GET',body)=>{const response=await app.handle(new Request('https://test.example/api'+path,{method,headers:{origin:'https://test.example',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()};};
 try{
 await call('/login','POST',{email,password});let c=(await call('/catalog')).catalog;assert.equal(c.currencies.length,9);assert.equal(c.languages.length,14);assert.equal(c.defaultCurrency,'TRY');assert.equal(c.defaultLanguage,'tr');
 const old=c.revision;
 assert.equal((await call('/regional-definitions/currencies/TRY','PUT',{expectedRevision:old,name:'Türk lirası',active:false})).status,422);
 let result=await call('/regional-definitions/languages/en','PUT',{expectedRevision:old,name:'İngilizce',nativeName:'English',active:true,makeDefault:true});assert.equal(result.status,200);assert.equal(result.catalog.defaultLanguage,'en');c=result.catalog;
 assert.equal((await call('/regional-definitions/languages/en','PUT',{expectedRevision:old,name:'İngilizce',nativeName:'English',active:true})).status,409);
 await app.db.query('UPDATE app_users SET role=? WHERE email=?',['editor',email]);
 assert.equal((await call('/regional-definitions/currencies/USD','PUT',{expectedRevision:c.revision,name:'Dolar',active:true})).status,403);
 }finally{await app.close();}
});
