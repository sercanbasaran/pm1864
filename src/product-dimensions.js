export const dimensionFields = [['length','Uzunluk'],['width','Genişlik'],['height','Yükseklik']];
export function validateProductDimensions(value) {
 if(value == null)return '';
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!dimensionFields.some(([name])=>name===key)))return 'Ürün ölçüleri geçersiz.';
 if(dimensionFields.some(([key])=>value[key]!=null&&(!Number.isFinite(value[key])||value[key]<0.01||value[key]>100000)))return 'Ürün ölçüleri 0,01–100.000 mm arasında pozitif sayı olmalıdır.';
 return '';
}
export function normalizeProductDimensions(value) {
 if(!value || dimensionFields.every(([key])=>value[key]==null))return null;
 return Object.fromEntries(dimensionFields.map(([key])=>[key,value[key]??null]));
}
export function productDimensionsLabel(value) {
 return dimensionFields.filter(([key])=>Number.isFinite(value?.[key])&&value[key]>0).map(([key,label])=>`${label}: ≈ ${new Intl.NumberFormat('tr-TR').format(value[key])} mm`).join(' · ');
}
