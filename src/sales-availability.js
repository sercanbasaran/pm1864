export const salesChannels=[{key:'store',label:'Mağaza satışı'},{key:'online',label:'Online satış'},{key:'foodDelivery',label:'Yemek sipariş platformu satışı'}];
export function validateSalesAvailability(value){
 if(value===undefined)return '';
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.entries(value).some(([key,v])=>!salesChannels.some(c=>c.key===key)||typeof v!=='boolean'))return 'Satış kanalları yalnızca açık veya kapalı olarak belirtilmeli.';
 return '';
}
export function salesAvailability(value,previous,variant=false){return Object.fromEntries(salesChannels.map(({key})=>[key,value?.[key]??previous?.[key]??variant]))}
export function effectiveSales(product,variant){const parent=salesAvailability(product.salesAvailability),child=salesAvailability(variant?.salesAvailability,undefined,true);return Object.fromEntries(salesChannels.map(({key})=>[key,product.status==='Aktif'&&(!variant||variant.active!==false)&&parent[key]&&(!variant||child[key])]))}
