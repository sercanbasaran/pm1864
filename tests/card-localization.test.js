import test from 'node:test';
import assert from 'node:assert/strict';
import {cardLocalization} from '../server/card-localization.js';
import {sourceFor} from '../server/localization-service.js';
import {convertedPrice} from '../src/card-localization.js';
test('cards expose only current translations for this record and active definitions',()=>{
 const doc={products:[{id:1,name:'Baklava',variants:[]},{id:2,name:'Private',variants:[]}],languages:[{code:'en',active:true},{code:'fr',active:false}],currencies:[{code:'USD',active:true},{code:'EUR',active:false}],localization:{translations:{},rates:{entries:[{currency:'USD',rate:0.5,date:'2026-10-28'}]}}};
 const sourceHash=sourceFor(doc,'product',1).sourceHash;
 doc.localization.translations={a:{kind:'product',recordId:1,language:'en',sourceHash,fields:{name:'English',secret:'hidden'}},b:{kind:'product',recordId:2,language:'en',sourceHash,fields:{name:'Private'}},c:{kind:'product',recordId:1,language:'fr',sourceHash,fields:{name:'French'}}};
 const result=cardLocalization(doc,'product',1);
 assert.deepEqual(result.translations,{en:{name:'English'}});
 assert.equal(result.currencies.length,1);
 doc.products[0].name='Changed';assert.deepEqual(cardLocalization(doc,'product',1).translations,{});
});
test('foreign prices round to nearest integer while TRY retains cents',()=>{
 assert.equal(convertedPrice(101,'USD',0.5),'$51');
 assert.equal(convertedPrice(100.2,'USD',0.5),'$50');
 assert.equal(convertedPrice(101.25,'TRY',1),'₺101,25');
});
