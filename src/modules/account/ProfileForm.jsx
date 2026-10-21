import {MaterialButton,MaterialInput} from '../../components/ui/Material.jsx';
import React,{useState} from 'react';
import {request} from '../../api.js';
export default function ProfileForm({user,onChanged}) {
 const [name,setName]=useState(user.name),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{const {user:updated}=await request('/profile',{method:'PATCH',body:{name,expectedVersion:user.version}});await onChanged(updated)}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <form className="profile-form" onSubmit={save}>{error&&<div className="form-error" role="alert">{error}</div>}<label>Ad soyad<MaterialInput required minLength={1} maxLength={100} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><label>E-posta adresi<MaterialInput value={user.email} readOnly/><small className="input-help">E-posta değişikliklerini yöneticiniz Kullanıcılar ve yetkiler bölümünden yapabilir.</small></label><MaterialButton className="btn dark" disabled={busy||name.trim()===user.name}>{busy?'Kaydediliyor…':'Profilimi kaydet'}</MaterialButton></form>;
}
