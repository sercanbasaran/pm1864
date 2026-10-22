import React,{useRef,useState} from 'react';
import SlAlert from '@shoelace-style/shoelace/dist/react/alert/index.js';
import {Camera,Trash} from '@phosphor-icons/react';
import {Button,Input} from '../../components/ui/Controls.jsx';
import UserAvatar from '../../components/ui/UserAvatar.jsx';
import {request} from '../../api.js';
export default function AvatarSettings({user,onChanged}){
 const input=useRef(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function upload(e){
  const file=e.target.files?.[0];e.target.value='';if(!file||busy)return;
  setError('');setMessage('');
  if(!file.size||file.size>2*1024*1024||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setError('PNG, JPEG, WEBP veya GIF biçiminde en fazla 2 MB fotoğraf seçin.');return}
  setBusy(true);try{
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Fotoğraf okunamadı. Yeniden seçin.'));reader.readAsDataURL(file)});
   const {user:updated}=await request('/profile/avatar',{method:'PUT',body:{expectedVersion:user.version,mimeType:file.type,data}});
   await onChanged(updated);setMessage('Profil fotoğrafınız kaydedildi.');
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function remove(){if(busy)return;setBusy(true);setError('');setMessage('');try{
  const {user:updated}=await request('/profile/avatar',{method:'DELETE',body:{expectedVersion:user.version}});
  await onChanged(updated);setMessage('Profil fotoğrafınız kaldırıldı.');
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="avatar-settings" aria-labelledby="avatar-settings-title" aria-busy={busy}>
  <h2 id="avatar-settings-title">Profil fotoğrafı</h2>
  <div className="avatar-settings-content"><UserAvatar user={user} className="account-avatar"/><div>
   <p>PNG, JPEG, WEBP veya GIF · En fazla 2 MB</p>
   <Input ref={input} type="file" className="visually-hidden" aria-label="Profil fotoğrafı dosyası" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={upload}/>
   <div className="overview-actions"><Button type="button" variant="primary" disabled={busy} onClick={()=>input.current?.click()}><Camera size={18}/>{busy?'İşleniyor…':user.avatarUrl?'Fotoğrafı değiştir':'Fotoğraf yükle'}</Button>{user.avatarUrl&&<Button type="button" disabled={busy} onClick={remove}><Trash size={18}/>Fotoğrafı kaldır</Button>}</div>
   <small className="input-help">Seçtiğiniz fotoğraf doğrudan hesabınıza kaydedilir.</small>
  </div></div>
  {error&&<SlAlert open variant="danger">{error}</SlAlert>}{message&&<SlAlert open variant="success">{message}</SlAlert>}
 </section>;
}
