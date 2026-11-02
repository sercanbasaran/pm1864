import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, migrate } from '../server/db.js';
import { hashPassword } from '../server/security.js';
import { createApp } from '../server/app.js';
import { createCatalogService, seedCatalog } from '../server/catalog-service.js';
import { createMediaService } from '../server/media-service.js';

test('rolled-back release opens schema 3 without migrating or overwriting newer data', async () => {
  const db = await openDatabase({SQLITE_PATH: ':memory:'});
  try {
    await migrate(db, seedCatalog());
    const doc = {...seedCatalog(), skuSchemaVersion: 3,
      packagingItems: [{id:'box', name:'New box'}],
      products: [{id:1, name:'Baklava', categoryId:'cat-100', productCode:'1000100',
        sku:'1000.100', dimensions:{width:30}, variants:[{id:'v1', sku:'1000.10001',
        size:'XL', items:[{productId:1,quantity:4}], placements:[{x:1,y:2}]}]}]};
    const original = JSON.stringify(doc);
    await db.query('UPDATE app_catalog SET revision=?,document=? WHERE id=1',[7,original]);
    // Identity marker is deliberately absent: old identity migration would reject
    // seven-digit codes, so this also verifies the entire old pipeline is skipped.
    const app = await createApp({database:db,env:{ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD_HASH:await hashPassword('test-password-1864')}});
    const response = await app.handle(new Request('https://pm.test/api/session'));
    assert.equal(response.status,401);
    const service = createCatalogService(db);
    const catalog = await service.read();
    assert.equal(catalog.readOnly,true);
    assert.equal(catalog.products[0].productCode,'1000100');
    assert.deepEqual(catalog.products[0].variants[0].placements,[{x:1,y:2}]);
    const rejected = error => error.code === 'CATALOG_SCHEMA_READ_ONLY';
    await assert.rejects(service.saveCategory({expectedRevision:7,category:{}},null,'admin'), rejected);
    await assert.rejects(service.bulk({expectedRevision:7,ids:[1],percent:10},'admin'),rejected);
    await assert.rejects(createMediaService(db).remove('image',{expectedVersion:1},'admin'),rejected);
    const row = (await db.query('SELECT revision,document FROM app_catalog WHERE id=1')).rows[0];
    assert.equal(row.revision,7);
    assert.equal(row.document,original);
  } finally { await db.close(); }
});
