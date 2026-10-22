import {createCanvas} from '@napi-rs/canvas';

// Render QR codes with a real Canvas implementation instead of mocking pixels.
const surfaces=new WeakMap(),contexts=new WeakMap();
function surface(element){
 let canvas=surfaces.get(element);
 if(!canvas||canvas.width!==element.width||canvas.height!==element.height){canvas=createCanvas(Math.max(1,element.width),Math.max(1,element.height));surfaces.set(element,canvas)}
 return canvas;
}
HTMLCanvasElement.prototype.getContext=function(type){
 if(type!=='2d')return null;
 if(!contexts.has(this))contexts.set(this,new Proxy({}, {
  get:(_,key)=>{const context=surface(this).getContext('2d'),value=context[key];
   if(key==='drawImage')return (source,...args)=>context.drawImage(source instanceof HTMLCanvasElement?surface(source):source,...args);
   return typeof value==='function'?value.bind(context):value;
  },
  set:(_,key,value)=>{surface(this).getContext('2d')[key]=value;return true}
 }));
 return contexts.get(this);
};
HTMLCanvasElement.prototype.toBlob=function(callback,type='image/png'){callback(new Blob([surface(this).toBuffer(type)],{type}))};
HTMLCanvasElement.prototype.toDataURL=function(type='image/png'){return surface(this).toDataURL(type)};
