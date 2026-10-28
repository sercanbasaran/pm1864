import {categoryOf} from "../../hierarchy.js";
export function packagingAllowsProduct(box, id, products = [], categories = []) {
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
