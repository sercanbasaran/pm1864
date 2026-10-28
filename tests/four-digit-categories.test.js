// Regression coverage for the replacement of the previous four-digit schema.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nextCategoryCode,nextSubcategoryCode,validateCategory} from '../src/catalog.js';
import {upgradeSku,allocateProductCode} from '../src/sku.js';
import {openDatabase,migrate} from '../server/db.js';
import {seedCatalog} from '../server/catalog-service.js';
function legacy(){const doc=seedCatalog();doc.skuSchemaVersion=2;doc.categories.forEach((c,i) => {c.code=String((i+1)*100).padStart(4,'0');});doc.categories.push({id:'child',name:'Child',code:'101',parentId:doc.categories[0].id});doc.products=[{id:7,name:'Legacy',categoryId:'child',productCode:'0100101001',publicCardCode:'P000007',publicSlug:'legacy-old',sku:'HM0100.101001',version:4,variants:[{id:'v',sku:'HM0100.101001.24',price:100,weight:500}]}];return doc;}
test('two-digit category namespaces permit matching child codes under different roots',()=>{
 const cats=[{id:'a',name:'A',code:'10',slug:'a'},{id:'b',name:'B',code:'11',slug:'b'},{id:'c',name:'Child',code:'10',slug:'child',parentId:'a'}];
 assert.equal(nextCategoryCode(cats),'12');assert.equal(nextSubcategoryCode(cats,'b'),'10');
 assert.equal(validateCategory({id:'d',name:'Other',code:'10',slug:'other',parentId:'b'},cats),'');
 assert.match(validateCategory({id:'d',name:'Other',code:'0100',slug:'other'},cats),/iki rakam/);
 assert.equal(nextCategoryCode([{code:'99'}]),'');
});
test('migration from schema 2 preserves product and variant IDs and public URLs, then runs once',async()=>{
 const db=await openDatabase({SQLITE_PATH:':memory:'});try{
 const seed=legacy();await db.query('CREATE TABLE app_catalog (id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,document TEXT NOT NULL)');await db.query('INSERT INTO app_catalog VALUES (1,5,?)',[JSON.stringify(seed)]);
 await migrate(db,seed);let row=(await db.query('SELECT * FROM app_catalog WHERE id=1')).rows[0];const doc=JSON.parse(row.document);
 assert.equal(doc.skuSchemaVersion,3);assert.equal(doc.products[0].id,7);assert.equal(doc.products[0].variants[0].id,'v');assert.equal(doc.products[0].publicCardCode,'P000007');assert.equal(doc.products[0].publicSlug,'legacy-old');assert.equal(doc.products[0].version,4);assert.equal(doc.products[0].variants[0].sku,'1010.10001');assert.ok(doc.products[0].legacyProductCodes.includes('0100101001'));assert.equal(Number(row.revision),6);
 await migrate(db,seed);assert.deepEqual((await db.query('SELECT * FROM app_catalog WHERE id=1')).rows[0],row);
 }finally{await db.close();}
});
test('failed migration rolls back the document and database',async()=>{
 const db=await openDatabase({SQLITE_PATH:':memory:'});try{const seed=legacy();seed.products[0].categoryId='missing';const before=JSON.stringify(seed);assert.throws(()=>upgradeSku(seed),/kategori/);assert.equal(JSON.stringify(seed),before);
 await db.query('CREATE TABLE app_catalog (id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,document TEXT NOT NULL)');await db.query('INSERT INTO app_catalog VALUES (1,9,?)',[before]);await assert.rejects(migrate(db,seed),/kategori/);const row=(await db.query('SELECT * FROM app_catalog WHERE id=1')).rows[0];assert.equal(row.document,before);assert.equal(Number(row.revision),9);
 }finally{await db.close();}
});
test('root and child products start at 100 and have separate counters',()=>{const doc={categories:[{id:'r',code:'10'},{id:'c',code:'10',parentId:'r'}],products:[]};assert.deepEqual(allocateProductCode(doc,doc.categories[0]),{sku:'1000.100',productCode:'1000100'});assert.deepEqual(allocateProductCode(doc,doc.categories[1]),{sku:'1010.100',productCode:'1010100'});assert.equal(allocateProductCode(doc,doc.categories[0]).sku,'1000.101');});
