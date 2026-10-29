import {imageUrl} from "../../image-sizes.js";
import {packagingVolumeLabel} from "./packaging-volume.js";
import React from 'react';
import {Select} from '../../components/ui/Controls.jsx';
import './packaging-center.css';
export default function PackagingSelect({items=[],value='',onChange,disabled=false,includeInactive=false}) {
 const selected=items.find(item=>item.id===value);
 const image=item=>item.mediaId ? `/api/media/${encodeURIComponent(item.mediaId)}/content` : '';
 return <div className="packaging-select">
  <Select label="Kutu tipi" value={value} onChange={onChange} disabled={disabled}>
   <option value="">Kutu tipi seçin</option>
   {items.filter(item=>item.active || (includeInactive && item.id===value)).map(item=><option key={item.id} value={item.id}>
    {image(item)&&<img slot="prefix" className="packaging-option-image" src={imageUrl(image(item),"thumb")} width={40} height={40} decoding="async" alt="" loading="lazy"/>}
    {item.name}{item.active?'':' (Pasif)'}
   </option>)}
  </Select>
  {selected && <div className="packaging-selected-preview">
   {image(selected)?<img src={imageUrl(image(selected),"tile")} width={88} height={88} loading="lazy" decoding="async" alt={selected.name}/>:<span>Görsel eklenmedi</span>}
   <div><strong>{selected.name}</strong><small>{selected.code} · {selected.material}{selected.maxProductWeight ? ` · Maksimum ${new Intl.NumberFormat('tr-TR').format(selected.maxProductWeight)} g` : ''}</small>{packagingVolumeLabel(selected) && <small>Hesaplanan hacim: {packagingVolumeLabel(selected)}</small>}</div>
  </div>}
 </div>;
}
