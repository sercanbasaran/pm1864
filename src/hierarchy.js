import { normalizeName, slugify, nextSubcategoryCode } from "./catalog.js";
export const roots = (categories) => categories.filter((c) => !c.parentId);
export function categoryOf(product, categories) {
  return (
    categories.find((c) => c.id === product.categoryId) ||
    categories.find((c) => c.name === product.category)
  );
}
export function rootOf(category, categories) {
  let c = category;
  const seen = new Set();
  while (c?.parentId && !seen.has(c.id)) {
    seen.add(c.id);
    c = categories.find((p) => p.id === c.parentId);
  }
  return c;
}
export function categoryPath(category, categories) {
  if (!category) return "";
  const root = rootOf(category, categories);
  return root && root.id !== category.id
    ? `${root.name} / ${category.name}`
    : category.name;
}
export function categoryMatches(product, filter, categories) {
  if (!filter || filter === "Tüm ürünler") return true;
  const c = categoryOf(product, categories),
    r = rootOf(c, categories);
  return [c?.id, r?.id, c?.name, r?.name].includes(filter);
}
export function selectable(category, categories) {
  const root = rootOf(category, categories);
  return !!category?.active && !!root?.active;
}
export function defaultSubcategory(doc, root) {
  let child = doc.categories.find(
    (c) => c.parentId === root.id && normalizeName(c.name) === "genel",
  );
  if (!child) {
    child = {
      id: `default-${root.id}`,
      name: "Genel",
      code: doc.schemaVersion !== 2 ? Array.from({length:90}, (_,i) => String(i+10)).find(code => !doc.categories.some(c => c.parentId === root.id && c.code === code)) || "" : nextSubcategoryCode(doc.categories, root.id),
      slug: slugify(root.slug + "-genel"),
      description: "Önceki ürün kayıtlarının korunduğu alt kategori.",
      parentId: root.id,
      active: root.active,
    };
    if (!child.code)
      throw new Error(
        "Eski ürünler için kullanılabilir alt kategori kodu bulunamadı.",
      );
    doc.categories.push(child);
  }
  return child;
}
// Idempotent migration; product and SKU identities are preserved.
export function upgradeHierarchy(doc) {
  const previous = doc.categories.map((c) => ({ ...c }));
  for (const c of doc.categories) {
    const chain = [];
    let current = previous.find((p) => p.id === c.id);
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current);
      current = previous.find((p) => p.id === current.parentId);
    }
    if (chain.length > 2) {
      c.parentId = chain[0].id;
      c.name = chain
        .slice(1)
        .map((p) => p.name)
        .join(" / ")
        .slice(0, 70);
      if (
        doc.categories.some(
          (o) =>
            o.id !== c.id &&
            o.parentId === c.parentId &&
            normalizeName(o.name) === normalizeName(c.name),
        )
      )
        c.name = (c.name.slice(0, 64) + " " + c.code).slice(0, 70);
    }
  }
  for (const p of doc.products) {
    let c = doc.categories.find(
      (c) =>
        c.id ===
        (p.categoryId || previous.find((old) => old.name === p.category)?.id),
    );
    if (doc.schemaVersion !== 2 && c && !c.parentId)
      c = defaultSubcategory(doc, c);
    if (c) {
      p.categoryId = c.id;
      p.category = c.name;
    }
    let next = Math.max(
      Number(p.nextVariantNumber) || 1,
      ...p.variants.map(
        (v) => Number((doc.skuSchemaVersion === 3 ? v.sku?.match(/^\d{4}\.\d{3}(\d{2})$/) : v.sku?.match(/(?:-V|\.)(\d+)$/))?.[1] || 0) + 1,
      ),
    );
    const used = new Set(p.variants.map((v) => v.sku).filter(Boolean));
    for (const [i, v] of p.variants.entries()) {
      v.id ||= `legacy-${p.id}-${i + 1}`;
      if (!v.sku) {
        let sku;
        do {
          sku = `${p.sku}-V${String(next++).padStart(4, "0")}`;
        } while (used.has(sku));
        v.sku = sku;
        used.add(sku);
      }
      v.active ??= true;
    }
    p.nextVariantNumber = next;
  }
  doc.schemaVersion = 2;
  return doc;
}
