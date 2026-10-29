let activeUser;
export function setImageCacheUser(id) {
 activeUser=id == null ? '' : String(id);
 try {if(activeUser)sessionStorage.setItem('image-cache-user',activeUser);else sessionStorage.removeItem('image-cache-user');}catch {}
}
export function imageCacheUser() {
 if(activeUser!==undefined)return activeUser;
 try {return sessionStorage.getItem('image-cache-user') || '';}catch{return '';}
}
