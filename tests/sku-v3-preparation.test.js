import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSkuV3} from '../src/migrations/sku-v3.js';
test('prepares deterministic two-digit categories and preserves existing card addresses', () => {
 const input={skuSchemaVersion:2,categories:[{id:'r',code:'0100'},{id:'c',parentId:'r',code:'101'}],products:[{id:1,categoryId:'c',productCode:'0100101001',sku:'HM0100.101001',publicSlug:'baklava-eski',variants:[{id:'v',sku:'HM0100.101001.01'}]},{id:2,categoryId:'r',productCode:'0100000002',variants:[]}],nextProductNumbers:{}};
 const result=prepareSkuV3(input);
 assert.equal(result.categories[0].code,'10');assert.equal(result.categories[1].code,'10');
 assert.equal(result.products[0].sku,'1010.100');assert.equal(result.products[0].variants[0].sku,'1010.10001');
 assert.equal(result.products[1].sku,'1000.100');assert.equal(result.products[0].publicCardCode,'0100101001');
 assert.deepEqual(result.products[0].slugHistory,['baklava-eski']);assert.equal(input.categories[0].code,'0100');
});
test('rejects oversized hierarchies without mutating the source', () => {
 const input={skuSchemaVersion:2,categories:Array.from({length:91},(_,i)=>({id:String(i),code:String(i)})),products:[]};
 assert.throws(()=>prepareSkuV3(input),/90 ana kategori/);assert.equal(input.categories[0].code,'0');
});
