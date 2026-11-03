import test from 'node:test';
import assert from 'node:assert/strict';
import { productCardData, variantCardData } from '../src/product-card.js';

const first = {id:1, name:'Baklava', sku:'1010.100', productCode:'1010100',
  variants:[], dimensions:{length:45.5,width:30,height:25,privateField:'hidden'}};
const second = {id:2, name:'Lokum', variants:[], dimensions:{length:20,width:null,height:15}};

test('product card exposes only measurement fields and leaves absent measurements optional', () => {
  assert.deepEqual(productCardData(first,[]).dimensions,{length:45.5,width:30,height:25});
  assert.equal('dimensions' in productCardData({...first,dimensions:null},[]),false);
});

test('mixed variant cards retain each source product measurements instead of owner measurements', () => {
  const variant = {size:'Karışık kutu', items:[{productId:2,quantity:3},{productId:1,quantity:4}], sku:'1010.10001'};
  const card=variantCardData(first,variant,[],[first,second]);
  assert.deepEqual(card.variantContents.map(item=>item.dimensions),[
    {length:20,width:null,height:15},{length:45.5,width:30,height:25},
  ]);
  assert.equal('dimensions' in card,false);
  const legacy=variantCardData(first,{...variant,items:undefined,sourceProductId:1},[],[]);
  assert.equal(legacy.variantContents[0].dimensions.length,45.5);
});
