// Dimensions are internal millimetres; 1 cm³ = 1,000 mm³, 1 L = 1,000,000 mm³.
export const packagingShape = item => item?.shape || (/silindir/i.test(item?.name || '') ? 'cylinder' : 'rectangular');
export function packagingVolume(item) {
 const cylinder=packagingShape(item)==='cylinder';
 const dimensions=cylinder ? [item?.diameter,item?.height] : [item?.length,item?.width,item?.height];
 if(!dimensions.every(value=>Number.isFinite(value)&&value>0))return null;
 const mm3=cylinder ? Math.PI*(item.diameter/2)**2*item.height : dimensions.reduce((total,value)=>total*value,1);
 if(!Number.isFinite(mm3))return null;
 return {cm3:mm3/1000,litres:mm3/1000000};
}
export function packagingVolumeLabel(item) {
 const volume=packagingVolume(item);
 if(!volume)return '';
 const format=value=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:6}).format(value);
 return `≈ ${format(volume.cm3)} cm³ · ${format(volume.litres)} L`;
}
