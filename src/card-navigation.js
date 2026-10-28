import {categoryOf} from './hierarchy.js';
import {productCardEligible, productCardPath, variantCardEligible} from './product-card.js';
export function adjacentCards(rows, current) {
 const index=rows.findIndex(row=>String(row.id)===String(current));
 return {previous:index>0?rows[index-1]:null,next:index>=0&&index<rows.length-1?rows[index+1]:null};
}
export function productCardNeighbors(product, products, categories, publicOnly=true) {
 const category=categoryOf(product,categories);
 if(!category?.parentId)return {previous:null,next:null};
 const rows=products.filter(p=>categoryOf(p,categories)?.id===category.id && (!publicOnly || (p.publicCardEnabled===true && productCardEligible(p,categories))))
 .map(p=>({id:p.id,name:p.name,href:productCardPath(p),route:`products/${p.id}/card`}));
 return adjacentCards(rows,product.id);
}
const contents=(p,v)=>new Set(v.items?.length?v.items.map(i=>String(i.productId)):[String(v.sourceProductId??p.id)]);
export function variantCardNeighbors(product, variant, products, categories, publicOnly=true) {
 const ids=contents(product,variant);
 const rows=products.flatMap(p=>p.variants.filter(v=>[...contents(p,v)].some(id=>ids.has(id)) && (!publicOnly || (v.publicCardEnabled===true && variantCardEligible(p,v,categories,products))))
 .map(v=>({id:v.id,name:v.size,href:`/v/${encodeURIComponent(v.id)}`,route:`variants/${p.id}/card?variant=${encodeURIComponent(v.id)}`})));
 return adjacentCards(rows,variant.id);
}
