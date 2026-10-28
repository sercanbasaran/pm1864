import test from 'node:test';
import assert from 'node:assert/strict';
import {fillMissing,matchingProduct} from '../src/modules/transfer/fill-missing.js';
test('fills blank nested fields, preserving zero, false, arrays and original data',()=>{
 const old={name:'Original',description:' ',price:0,active:false,items:[{id:1}],unitPricing:{unit:'Dilim',price:50,weight:null},channels:{store:false}};
 const next=fillMissing(old,{name:'Changed',description:'New',price:99,active:true,items:[{id:2}],unitPricing:{unit:'Gram',price:99,weight:40},channels:{store:true,online:true}});
 assert.equal(next.name,'Original');assert.equal(next.description,'New');assert.equal(next.price,0);assert.equal(next.active,false);assert.deepEqual(next.items,[{id:1}]);assert.deepEqual(next.unitPricing,{unit:'Dilim',price:50,weight:40});assert.deepEqual(next.channels,{store:false,online:true});assert.equal(old.unitPricing.weight,null);
});
test('matches current product code, dotted SKU and legacy code, rejecting ambiguous matches',()=>{
 const p={id:1,productCode:'1010100',sku:'1010.100',legacyProductCodes:['0100101001']};
 for(const code of ['1010100','1010.100','HM1010.100','0100101001'])assert.equal(matchingProduct([p],code).id,1);
 assert.equal(matchingProduct([p],''),undefined);assert.throws(()=>matchingProduct([p,{...p,id:2}],'1010100'));
});
