import {defaultPackagingItems} from './packaging-data.js';
export function upgradePackagingCodes(doc) {
 let changed=false;
 if(!Array.isArray(doc.packagingItems)){doc.packagingItems=defaultPackagingItems();changed=true;}
 const highest=doc.packagingItems.reduce((max,item)=>/^\d+$/.test(item.code || '')?Math.max(max,Number(item.code)):max,0);
 let next=Math.max(Number.isSafeInteger(doc.nextPackagingNumber)&&doc.nextPackagingNumber>0?doc.nextPackagingNumber:1,highest+1);
 for(const item of doc.packagingItems)if(!String(item.code || '').trim()){item.code=String(next++).padStart(3,'0');changed=true;}
 if(doc.nextPackagingNumber!==next){doc.nextPackagingNumber=next;changed=true;}
 return changed;
}
export function allocatePackagingCode(doc) {
 upgradePackagingCodes(doc);
 return String(doc.nextPackagingNumber++).padStart(3,'0');
}
