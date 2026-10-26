import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUnitPricing,normalizeUnitPricing} from '../src/unit-pricing.js';
test('unit pricing requires weight for counted units and normalizes mass units',()=>{
 for(const unit of ['Dilim','Kap','Adet']){
 assert.ok(validateUnitPricing({unit,price:100}));
 assert.equal(validateUnitPricing({unit,price:100,weight:45}), '');
 }
 assert.equal(normalizeUnitPricing({unit:'Kilogram',price:1200}).weight,1000);
 assert.equal(normalizeUnitPricing({unit:'Gram',price:1.2}).weight,1);
 assert.ok(validateUnitPricing({unit:'Kutu',price:1}));
 assert.ok(validateUnitPricing({unit:'Gram',price:-1}));
 assert.equal(validateUnitPricing(null),'');
});
