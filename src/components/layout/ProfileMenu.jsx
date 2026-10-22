import React,{useRef,useState} from 'react';
import SlDropdown from '@shoelace-style/shoelace/dist/react/dropdown/index.js';
import SlMenu from '@shoelace-style/shoelace/dist/react/menu/index.js';
import SlMenuItem from '@shoelace-style/shoelace/dist/react/menu-item/index.js';
import SlAvatar from '@shoelace-style/shoelace/dist/react/avatar/index.js';
import SlDivider from '@shoelace-style/shoelace/dist/react/divider/index.js';
import {UserCircle,IdentificationCard,Question,SignOut,Gear} from '@phosphor-icons/react';
import {Button} from '../ui/Controls.jsx';
import {initials} from '../../catalog-tools.js';
import {roleFor} from '../../permissions.js';
export default function ProfileMenu({user,onNavigate,onLogout,onError}){
 const ref=useRef(null),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 async function select(e){const value=e.detail.item.value;await ref.current.hide();if(value==='logout'){setBusy(true);try{await onLogout()}catch(error){onError(error.message)}finally{setBusy(false)}}else onNavigate(value)}
 return <div className="profile-area">
  <SlAvatar initials={initials(user)} label={user.name}/>
  <SlDropdown ref={ref} stayOpenOnSelect hoist placement="bottom-start" onSlShow={()=>setOpen(true)} onSlHide={()=>setOpen(false)}>
   <Button slot="trigger" type="button" caret className="profile-menu-trigger" aria-label="Profil menüsünü aç" aria-haspopup="menu" aria-expanded={open} disabled={busy}>{user.name}</Button>
   <SlMenu aria-label="Profil menüsü" onSlSelect={select}>
    <div className="profile-menu-heading"><strong>{user.name}</strong><small>{user.email}</small><small>{roleFor(user.role)?.name}</small></div>
    <SlDivider/>
    <SlMenuItem value="account"><UserCircle slot="prefix" size={20}/>Hesabım</SlMenuItem>
    <SlMenuItem value="account?section=profile"><IdentificationCard slot="prefix" size={20}/>Profil bilgileri</SlMenuItem>
    <SlMenuItem value="settings"><Gear slot="prefix" size={20}/>Ayarlar</SlMenuItem>
    <SlMenuItem value="help"><Question slot="prefix" size={20}/>Yardım merkezi</SlMenuItem>
    <SlDivider/>
    <SlMenuItem value="logout"><SignOut slot="prefix" size={20}/>Oturumu kapat</SlMenuItem>
   </SlMenu>
  </SlDropdown>
 </div>;
}
