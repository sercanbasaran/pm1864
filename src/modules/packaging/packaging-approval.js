import {categoryOf} from "../../hierarchy.js";
export function packagingAllowsProduct(box, id, products = [], categories = []) {
 if (box?.excludedProductIds?.some(value => String(value) === String(id))) return false;
 if (box?.allowedProductIds?.some(value => String(value) === String(id))) return true;
 const product=products.find(p=>String(p.id)===String(id));
 let category=product && categoryOf(product,categories);
 const seen=new Set();
 while(category && !seen.has(category.id)) {
  seen.add(category.id);
  if(box?.allowedCategoryIds?.includes(category.id))return true;
  category=categories.find(c=>c.id===category.parentId);
 }
 return false;
}
export function packagingApprovalIssue(variant, box, ownerId, products, categories = []) {
 const ids=variant.items?.length?variant.items.map(item=>item.productId):[variant.sourceProductId??ownerId];
 const denied=ids.filter(id=>!packagingAllowsProduct(box,id,products,categories));
 if(!denied.length)return '';
 return `${box?.name || 'Seçilen kutu'} için ürün ekleme onayı yok: ${denied.map(id=>products.find(p=>String(p.id)===String(id))?.name || 'Bilinmeyen ürün').join(', ')}. Ambalaj Merkezi’nde izin verilen ürünleri güncelleyin veya farklı kutu seçin.`;
}

export const packagingCategoryProductIds = (categoryIds, products, categories) => products.filter(p=>packagingAllowsProduct({allowedCategoryIds:categoryIds},p.id,products,categories)).map(p=>p.id);
export const packagingEffectiveProductIds = (box, products, categories) => products.filter(p=>packagingAllowsProduct(box,p.id,products,categories)).map(p=>p.id);
export function selectPackagingCategories(box, ids, products, categories) {
 const covered=packagingCategoryProductIds(ids,products,categories).map(String);
 return {...box,allowedCategoryIds:ids,excludedProductIds:(box.excludedProductIds || []).filter(id=>covered.includes(String(id)))};
}
export function selectPackagingProducts(box, ids, products, categories) {
 const selected=new Set(ids.map(String));
 const covered=packagingCategoryProductIds(box.allowedCategoryIds || [],products,categories);
 return {...box,
  allowedProductIds:products.filter(p=>selected.has(String(p.id)) && !covered.some(id=>String(id)===String(p.id))).map(p=>p.id),
  excludedProductIds:covered.filter(id=>!selected.has(String(id))),
 };
}
