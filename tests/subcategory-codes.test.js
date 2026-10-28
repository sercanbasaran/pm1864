import test from 'node:test';
import assert from 'node:assert/strict';
import {nextSubcategoryCode} from '../src/catalog.js';
test('subcategory codes start at 10 independently in each main category',()=>{
 const categories=[{id:'a',code:'10'},{id:'b',code:'11'},{id:'c',parentId:'a',code:'10'},{id:'d',parentId:'a',code:'12',active:false}];
 assert.equal(nextSubcategoryCode(categories,'a'),'13');assert.equal(nextSubcategoryCode(categories,'b'),'10');
});
test('subcategory capacity and valid parent are enforced',()=>{
 assert.equal(nextSubcategoryCode([{id:'r',code:'10'},{id:'c',parentId:'r',code:'99'}],'r'),'');
 assert.equal(nextSubcategoryCode([],'missing'),'');
 assert.equal(nextSubcategoryCode([{id:'c',parentId:'r',code:'10'}],'c'),'');
});
