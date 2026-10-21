import {roots,categoryMatches} from './hierarchy.js';
export const money = value => new Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY', minimumFractionDigits:2, maximumFractionDigits:2}).format(value);
export const bulkPrice=(price,percent,direction)=>Math.max(0.01,Math.round((price*(1+(direction==='increase'?1:-1)*percent/100)+Number.EPSILON)*100)/100);
export function dateTime(value) {
 const date=new Date(value);
 return Number.isNaN(date.getTime()) ? 'Tarih belirtilmedi' : new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(date);
}
export function initials(user) {return (user.name||user.email||'').trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toLocaleUpperCase('tr')||'HM'}
export function csvText(rows) {
 const safe=value=>{const text=String(value??'');return /^[\s]*[=+@-]/.test(text)?"'"+text:text};
 return '\uFEFF'+rows.map(row=>row.map(value=>'"'+safe(value).replaceAll('"','""')+'"').join(';')).join('\r\n');
}
export function downloadCSV(rows,filename) {
 const url=URL.createObjectURL(new Blob([csvText(rows)],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function catalogSummary(products,categories) {
 return {variants:products.reduce((count,p)=>count+p.variants.length,0),drafts:products.filter(p=>p.status==='Taslak'),withoutImages:products.filter(p=>!p.customImage),withoutDescriptions:products.filter(p=>!p.description?.trim()),groups:roots(categories).map(c=>({...c,count:products.filter(p=>categoryMatches(p,c.id,categories)).length}))};
}
