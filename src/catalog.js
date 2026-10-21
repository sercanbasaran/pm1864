export const slugify = value => value.toLocaleLowerCase('tr').replaceAll('ı','i').replaceAll('ğ','g').replaceAll('ü','u').replaceAll('ş','s').replaceAll('ö','o').replaceAll('ç','c').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const normalizeName = value => value.trim().replace(/\s+/g,' ').toLocaleLowerCase('tr');
export function nextCategoryCode(categories){const used=new Set(categories.map(c=>c.code));return Array.from({length:9},(_,i)=>String((i+1)*100)).find(c=>!used.has(c))||Array.from({length:899},(_,i)=>String(i+101)).find(c=>!used.has(c))||''}
export function validateCategory(draft,categories){
 if(!draft.name.trim())return 'Kategori adı gerekli.';
 if(!/^\d{3}$/.test(draft.code)||Number(draft.code)<100)return 'Kategori kodu 100–999 arasında üç rakam olmalı.';
 if(!slugify(draft.slug))return 'Geçerli bir kategori bağlantısı gerekli.';
 const others=categories.filter(c=>c.id!==draft.id);
 if(others.some(c=>normalizeName(c.name)===normalizeName(draft.name)))return 'Bu kategori adı zaten kullanılıyor.';
 if(others.some(c=>c.code===draft.code))return 'Bu kategori kodu zaten kullanılıyor.';
 if(others.some(c=>c.slug===slugify(draft.slug)))return 'Bu kategori bağlantısı zaten kullanılıyor.';
 let parent=draft.parentId;const seen=new Set([draft.id]);
 while(parent){if(seen.has(parent))return 'Üst kategori seçimi döngü oluşturamaz.';seen.add(parent);const found=categories.find(c=>c.id===parent);if(!found)return 'Üst kategori bulunamadı.';parent=found.parentId}
 return '';
}
export function validateProduct(product,categories){
 if(!product.name.trim())return {tab:'Genel bilgiler',message:'Ürün adı gerekli.'};
 if(!categories.some(c=>c.name===product.category&&(!product.isNew||c.active)))return {tab:'Genel bilgiler',message:'Aktif bir kategori seçin.'};
 if(product.variants.length>50)return {tab:'Varyant & fiyat',message:'Bir üründe en fazla 50 varyant olabilir.'};
 if(!product.variants.length)return {tab:'Varyant & fiyat',message:'En az bir varyant gerekli.'};
 const names=product.variants.map(v=>normalizeName(v.size));
 if(names.some(n=>!n)||new Set(names).size!==names.length)return {tab:'Varyant & fiyat',message:'Varyant adları dolu ve birbirinden farklı olmalı.'};
 if(product.variants.some(v=>!Number.isFinite(v.price)||v.price<=0||Math.abs(v.price*100-Math.round(v.price*100))>0.00001||!Number.isFinite(v.weight)||v.weight<=0||!Number.isInteger(v.slices)||v.slices<0))return {tab:'Varyant & fiyat',message:'Her varyant için en fazla iki ondalıklı pozitif fiyat, pozitif gramaj ve sıfır veya pozitif tam dilim sayısı girin.'};
 return null;
}
