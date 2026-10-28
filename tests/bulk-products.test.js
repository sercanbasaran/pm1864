import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/security.js';

test('bulk product changes validate all selected products and commit atomically', async () => {
  const password = 'Bulk-product-test-1864';
  const app = await createApp({ env: { SQLITE_PATH: ':memory:', ADMIN_EMAIL: 'bulk@test.example', ADMIN_PASSWORD_HASH: await hashPassword(password) } });
  let cookie = '';
  const call = async (path, method = 'GET', body) => {
    const response = await app.handle(new Request('https://test.example/api' + path, { method, headers: { origin: 'https://test.example', cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, ...await response.json() };
  };
  try {
    await call('/login', 'POST', { email: 'bulk@test.example', password });
    let catalog = (await call('/catalog')).catalog;
    for (const name of ['Birinci', 'İkinci']) {
      catalog = (await call('/products', 'POST', { expectedRevision: catalog.revision, product: { name, category: 'Baklavalar', status: 'Aktif', variants: [], unitPricing: { unit: 'Dilim', price: 10, weight: 40 } } })).catalog;
    }
    const ids = catalog.products.slice(0, 2).map(p => p.id);
    let result = await call('/products/bulk', 'POST', { expectedRevision: catalog.revision, ids, changes: { unit: 'Adet', weight: 0, price: 20 } });
    assert.equal(result.status, 422);
    assert.equal((await call('/catalog')).catalog.products[0].unitPricing.price, 10);
    result = await call('/products/bulk', 'POST', { expectedRevision: catalog.revision, ids, changes: { unit: 'Adet', weight: 50, price: 20, channels: { store: true } } });
    assert.equal(result.status, 200);
    for (const product of result.catalog.products.filter(p => ids.includes(p.id))) {
      assert.deepEqual(product.unitPricing, { unit: 'Adet', price: 20, weight: 50 });
      assert.equal(product.salesAvailability.store, true);
    }
    assert.equal((await call('/products/bulk', 'POST', { expectedRevision: catalog.revision, ids, changes: { price: 25 } })).status, 409);
  } finally { await app.close(); }
});

test('bulk changes recalculate linked variants while keeping manual price overrides', async () => {
  const password = 'Bulk-variant-test-1864';
  const app = await createApp({ env: { SQLITE_PATH: ':memory:', ADMIN_EMAIL: 'bulk-variant@test.example', ADMIN_PASSWORD_HASH: await hashPassword(password) } });
  let cookie = '';
  const call = async (path, method = 'GET', body) => {
    const response = await app.handle(new Request('https://test.example/api' + path, { method, headers: { origin: 'https://test.example', cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, ...await response.json() };
  };
  try {
    await call('/login', 'POST', { email: 'bulk-variant@test.example', password });
    let c = (await call('/catalog')).catalog;
    c = (await call('/products', 'POST', { expectedRevision: c.revision, product: { name: 'İçerik', category: 'Baklavalar', status: 'Aktif', variants: [], unitPricing: { unit: 'Dilim', price: 10, weight: 40 } } })).catalog;
    const p = c.products[0];
    const variant = { size: 'Üçlü', typeId: c.variantTypes[0].id, sourceProductId: p.id, items: [{productId:p.id, quantity:3}], quantity:3, packaging:'Tabakta servis', priceOverride:40, consumables:[], images:[], price:40, weight:120, slices:3, unit:'Dilim', active:true };
    const saved = await call(`/products/${p.id}`, 'PUT', { expectedRevision: c.revision, product: { ...p, variants: [variant] } });
    assert.equal(saved.status, 200); c = saved.catalog;
    const result = await call('/products/bulk', 'POST', {expectedRevision:c.revision, ids:[p.id], changes:{price:20}});
    assert.equal(result.status, 200);
    const updated = result.catalog.products.find(item => item.id === p.id).variants[0];
    assert.equal(updated.calculatedPrice, 60); assert.equal(updated.price, 40);
  } finally { await app.close(); }
});
