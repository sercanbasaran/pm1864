import test from 'node:test';
import assert from 'node:assert/strict';
import {nextCategoryCode,slugify,validateCategory,validateProduct,duplicateVariant} from '../src/catalog.js';
const categories=[{id:'a',name:'Baklavalar',code:'0100',slug:'baklavalar',parentId:'',active:true},{id:'b',name:'Fıstıklı',code:'200',slug:'fistikli',parentId:'a',active:true}];
const draft={id:'c',name:'Pastalar',code:'0500',slug:'pastalar',parentId:'',active:true};
test('Turkish category names produce stable URL slugs and unused codes',()=>{assert.equal(slugify('Çay & Türk Kahvesi'),'cay-turk-kahvesi');assert.equal(nextCategoryCode(categories),'0200');assert.equal(validateCategory(draft,categories),'')});
test('category names, codes and URLs must remain unique',()=>{assert.match(validateCategory({...draft,name:'  baklavalar  '},categories),/adı zaten/);assert.match(validateCategory({...draft,code:'0100'},categories),/kodu zaten/);assert.match(validateCategory({...draft,slug:'baklavalar'},categories),/bağlantısı zaten/)});
test('parent selection cannot form a cycle or reference a missing category',()=>{assert.match(validateCategory({...categories[0],code:'100',parentId:'b'},categories),/döngü/);assert.match(validateCategory({...draft,code:'500',parentId:'missing'},categories),/bulunamadı/)});
const product={name:'Fıstıklı Kare',category:'Baklavalar',isNew:true,channels:[0],variants:[{size:'XS',typeId:'type-item',price:100,weight:500,slices:12}]};
test('new products require active categories and valid values across all editor tabs',()=>{assert.equal(validateProduct(product,categories),null);assert.equal(validateProduct({...product,category:'Eksik'},categories).tab,'Genel bilgiler');for(const key of ['price','weight','slices'])assert.equal(validateProduct({...product,variants:[{...product.variants[0],[key]:NaN}]},categories).tab,'Varyant & fiyat');assert.equal(validateProduct(product,categories.map(c=>({...c,active:false}))).tab,'Genel bilgiler')});
test('variant names are normalized when checking duplicates; empty names are rejected',()=>{assert.match(validateProduct({...product,variants:[product.variants[0],{...product.variants[0],size:' xs ',typeId:'type-item'}]},categories).message,/farklı/);assert.match(validateProduct({...product,variants:[{...product.variants[0],size:' ',typeId:'type-item'}]},categories).message,/dolu/)});

test('duplicate variants have unique names within length limit and never reuse identity',()=>{
 const original={id:'variant-id',sku:'HM-100-1-V0001',size:'A'.repeat(45),typeId:'type-item',price:100.25,weight:500,slices:12,active:false};const first=duplicateVariant(original,[original]);const second=duplicateVariant(original,[original,first]);
 assert.ok(first.size.length<=45);assert.ok(second.size.length<=45);assert.notEqual(first.size,original.size);assert.notEqual(first.size,second.size);assert.ok(!('id' in first));assert.ok(!('sku' in first));assert.equal(first.price,original.price);assert.equal(first.active,false);
});
