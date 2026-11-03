import test from 'node:test';
import assert from 'node:assert/strict';
import {exportMediaAllowed} from '../server/export-media.js';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
test('temporary access is opt-in and limited to referenced variant, constituent, owner and box images',()=>{
 const doc={settings:{publicExportImages:true},products:[{id:1,mediaId:'owner',variants:[{images:[{id:'variant'}],items:[{productId:2}],packagingId:'b'}]},{id:2,images:[{id:'source'}]},{id:3,mediaId:'unused'}],packagingItems:[{id:'b',mediaId:'box'},{id:'other',mediaId:'private'}]};
 for(const id of ['owner','variant','source','box'])assert.equal(exportMediaAllowed(doc,id),true);
 for(const id of ['unused','private','missing'])assert.equal(exportMediaAllowed(doc,id),false);
 doc.settings.publicExportImages=false;assert.equal(exportMediaAllowed(doc,'owner'),false);
});
test('existing export URLs load anonymously only when enabled; metadata and unrelated images stay private, disabling revokes access',async()=>{
 const app=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'test@example.test',ADMIN_PASSWORD_HASH:await hashPassword('Temporary-export-1864')}});
 const data='iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4v4/rPwgzwBgAZVILGYGCVCcAAAAASUVORK5CYII=';
 let cookie='';
 async function call(path,method='GET',body,anonymous=false){const r=await app.handle(new Request('https://test.local/api'+path,{method,headers:{origin:'https://test.local',cookie:anonymous?'':cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;}
 try{
 await call('/login','POST',{email:'test@example.test',password:'Temporary-export-1864'});
 const {asset}=await (await call('/media','POST',{name:'Image',mimeType:'image/png',data})).json();
 let c=await app.service.read();
 c=await app.service.mutate(c.revision,'test',doc=>{doc.products.push({id:1,name:'Export',status:'Taslak',mediaId:asset.id,variants:[{id:'v1',size:'Test'}]});});
 assert.equal((await call(`/media/${asset.id}/content`,'GET',null,true)).status,401);
 c=await app.service.mutate(c.revision,'test',doc=>{doc.settings.publicExportImages=true;});
 const image=await call(`/media/${asset.id}/content`,'GET',null,true);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.equal(image.headers.get('cache-control'),'no-store');
 assert.equal((await call(`/media/${asset.id}`,'GET',null,true)).status,401);assert.equal((await call('/media','GET',null,true)).status,401);
 await app.service.mutate(c.revision,'test',doc=>{doc.settings.publicExportImages=false;});
 assert.equal((await call(`/media/${asset.id}/content`,'GET',null,true)).status,401);
 }finally{await app.close();}
});
