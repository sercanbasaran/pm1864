// Build the complete migration on an isolated copy. Callers must persist it in
// one transaction only after the returned document passes all checks.
export function prepareSkuV3(source) {
  const doc = structuredClone(source);
  if (doc.skuSchemaVersion === 3) return doc;
  const roots = doc.categories.filter(c => !c.parentId);
  if (roots.length > 90) throw Error('En fazla 90 ana kategori desteklenir.');
  const originalCategories = doc.categories.map(({id,code}) => ({id,code}));
  const originalProducts = doc.products.map(p => ({id:p.id,productCode:p.productCode,sku:p.sku,publicSlug:p.publicSlug,variants:p.variants.map(v => ({id:v.id,sku:v.sku}))}));
  for (const [index, root] of roots.entries()) {
    root.code = String(index + 10);
    const children = doc.categories.filter(c => c.parentId === root.id);
    if (children.length > 90) throw Error(`${root.name}: en fazla 90 alt kategori desteklenir.`);
    children.forEach((child, i) => { child.code = String(i + 10); });
  }
  if (doc.categories.some(c => c.parentId && !roots.some(root => root.id === c.parentId))) throw Error('Kategori hiyerarşisi geçersiz.');
  const counters = {};
  for (const product of [...doc.products].sort((a,b) => Number(a.id) - Number(b.id))) {
    const category = doc.categories.find(c => c.id === product.categoryId);
    const root = category?.parentId ? roots.find(c => c.id === category.parentId) : category;
    if (!root) throw Error(`Ürünün kategorisi bulunamadı: ${product.id}`);
    const group = root.code + (category.parentId ? category.code : '00');
    const sequence = counters[group] ?? 100;
    if (sequence > 999) throw Error(`${group}: ürün kodu sınırı aşıldı.`);
    if (!Array.isArray(product.variants) || product.variants.length > 99) throw Error(`${product.id}: varyant kodu sınırı aşıldı.`);
    counters[group] = sequence + 1;
    product.publicCardCode ||= product.productCode || `P${String(product.id).padStart(6,'0')}`;
    product.slugHistory = [...new Set([...(product.slugHistory || []), ...(product.publicSlug ? [product.publicSlug] : [])])];
    product.productCode = group + String(sequence);
    product.sku = `${group}.${sequence}`;
    product.variants.forEach((variant,i) => { variant.sku = `${product.sku}${String(i+1).padStart(2,'0')}`; });
    product.nextVariantNumber = product.variants.length + 1;
  }
  doc.skuV3MigrationBackup = { categories: originalCategories, products: originalProducts, nextProductNumbers: source.nextProductNumbers };
  doc.nextProductNumbers = counters;
  doc.skuSchemaVersion = 3;
  return doc;
}
