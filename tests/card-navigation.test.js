import test from 'node:test';
import assert from 'node:assert/strict';
import {productCardNeighbors,variantCardNeighbors} from '../src/card-navigation.js';
const categories=[{id:'root',active:true},{id:'sub',parentId:'root',active:true},{id:'other',parentId:'root',active:true}];
const product=(id,categoryId='sub')=>({id,name:`Product ${id}`,categoryId,status:'Aktif',publicCardEnabled:true,productCode:`1010${id}`,variants:[]});
test('product navigation stays in the exact subcategory and excludes private or inactive cards',()=>{
 const products=[product(1),product(2),product(3,'other'),{...product(4),publicCardEnabled:false},product(5)];
 assert.equal(productCardNeighbors(products[1],products,categories).previous.name,'Product 1');
 assert.equal(productCardNeighbors(products[1],products,categories).next.name,'Product 5');
 assert.equal(productCardNeighbors(products[0],products,categories).previous,null);
 assert.equal(productCardNeighbors(products[4],products,categories).next,null);
 assert.equal(productCardNeighbors(products[1],products,categories,false).next.name,'Product 4');
 assert.deepEqual(productCardNeighbors(product(9,'root'),products,categories),{previous:null,next:null});
});
test('variant navigation spans owners using shared composition, deduplicates mixed products and respects publication',()=>{
 const a=product(1),b=product(2),c=product(3);
 a.variants=[{id:'a',size:'A',publicCardEnabled:true,items:[{productId:1},{productId:2}]}];
 b.variants=[{id:'b',size:'B',publicCardEnabled:true,items:[{productId:2}]},{id:'private',size:'Private',items:[{productId:1}]}];
 c.variants=[{id:'unrelated',size:'Other',publicCardEnabled:true,items:[{productId:3}]},{id:'legacy',size:'Legacy',publicCardEnabled:true,sourceProductId:1}];
 const products=[a,b,c];
 assert.equal(variantCardNeighbors(a,a.variants[0],products,categories).next.id,'b');
 const middle=variantCardNeighbors(b,b.variants[0],products,categories);
 assert.equal(middle.previous.id,'a');assert.equal(middle.next,null);
 assert.equal(variantCardNeighbors(c,c.variants[1],products,categories).previous.id,'a');
 b.status='Pasif';assert.equal(variantCardNeighbors(c,c.variants[1],products,categories).previous,null);
});
