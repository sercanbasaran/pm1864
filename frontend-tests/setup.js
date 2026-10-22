import {vi} from 'vitest';
import './canvas.js';
class Observer{observe(){}unobserve(){}disconnect(){}}
globalThis.ResizeObserver=Observer;globalThis.IntersectionObserver=Observer;
Object.defineProperty(window,'matchMedia',{writable:true,value:query=>({matches:query.includes('prefers-reduced-motion'),media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true}})});
Element.prototype.scrollIntoView=function(){};
Element.prototype.getAnimations=function(){return []};
Element.prototype.animate=function(){const a=new EventTarget();a.finished=Promise.resolve();a.cancel=()=>a.dispatchEvent(new Event('cancel'));a.finish=()=>a.dispatchEvent(new Event('finish'));queueMicrotask(()=>a.finish());return a};
document.getAnimations=()=>[];
