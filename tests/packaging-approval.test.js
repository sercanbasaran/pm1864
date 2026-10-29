import test from 'node:test';
import assert from 'node:assert/strict';
import {packagingAllowsProduct,packagingApprovalIssue} from '../src/modules/packaging/packaging-approval.js';
test('box approval checks every composition product and legacy owner fallback',()=>{
 const box={name:'Metal kutu',allowedProductIds:[1]};const products=[{id:1,name:'Baklava'},{id:2,name:'Lokum'}];
 assert.equal(packagingAllowsProduct(box,1),true);assert.equal(packagingAllowsProduct({},1),false);
 assert.equal(packagingApprovalIssue({items:[{productId:1}]},box,1,products),'');
 assert.match(packagingApprovalIssue({items:[{productId:1},{productId:2}]},box,1,products),/Lokum/);
 assert.match(packagingApprovalIssue({},box,2,products),/Lokum/);
});

test('category approval includes descendants and combines with individual products',()=>{
 const categories=[{id:'root'},{id:'sub',parentId:'root'},{id:'other'}];
 const products=[{id:1,name:'Baklava',categoryId:'sub'},{id:2,name:'Lokum',categoryId:'other'}];
 const box={allowedCategoryIds:['root'],allowedProductIds:[]};
 assert.equal(packagingAllowsProduct(box,1,products,categories),true);
 assert.equal(packagingAllowsProduct(box,2,products,categories),false);
 assert.equal(packagingApprovalIssue({items:[{productId:1}]},box,1,products,categories),'');
 box.allowedProductIds=[2];assert.equal(packagingAllowsProduct(box,2,products,categories),true);
 box.allowedCategoryIds=['sub'];assert.equal(packagingAllowsProduct(box,1,products,categories),true);
 assert.equal(packagingAllowsProduct({allowedCategoryIds:['other']},1,products,categories),false);
});

test('category selection populates products; removals override categories and remain excluded for variants',async()=>{
 const {packagingEffectiveProductIds,selectPackagingCategories,selectPackagingProducts}=await import('../src/modules/packaging/packaging-approval.js');
 const categories=[{id:'root'},{id:'sub',parentId:'root'},{id:'other'}];const products=[{id:1,name:'A',categoryId:'root'},{id:2,name:'B',categoryId:'sub'},{id:3,name:'C',categoryId:'other'}];
 let box=selectPackagingCategories({allowedProductIds:[3]},['root'],products,categories);
 assert.deepEqual(packagingEffectiveProductIds(box,products,categories),[1,2,3]);
 box=selectPackagingProducts(box,['1','3'],products,categories);assert.deepEqual(box.excludedProductIds,[2]);
 assert.equal(packagingAllowsProduct(box,2,products,categories),false);assert.match(packagingApprovalIssue({items:[{productId:2}]},box,1,products,categories),/B/);
 assert.deepEqual(packagingEffectiveProductIds(box,[...products,{id:4,name:'D',categoryId:'sub'}],categories),[1,3,4]);
 box=selectPackagingProducts(box,['1','2','3'],products,categories);assert.deepEqual(box.excludedProductIds,[]);
 box=selectPackagingCategories(box,[],products,categories);assert.deepEqual(packagingEffectiveProductIds(box,products,categories),[3]);
});
