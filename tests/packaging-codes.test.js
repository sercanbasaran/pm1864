import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradePackagingCodes,allocatePackagingCode} from '../src/modules/packaging/packaging-codes.js';
test('packaging codes migrate blanks, preserve existing codes and remain stable',()=>{
 const doc={packagingItems:[{id:1,code:'007'},{id:2,code:''},{id:3,code:'BOX-01'}]};
 assert.equal(upgradePackagingCodes(doc),true);assert.deepEqual(doc.packagingItems.map(x=>x.code),['007','008','BOX-01']);
 assert.equal(upgradePackagingCodes(doc),false);assert.equal(allocatePackagingCode(doc),'009');
 doc.packagingItems.pop();assert.equal(allocatePackagingCode(doc),'010');
});
test('new packaging definitions start at 001',()=>{
 const doc={packagingItems:[]};assert.equal(allocatePackagingCode(doc),'001');assert.equal(allocatePackagingCode(doc),'002');
});
