import SlAlert from '@shoelace-style/shoelace/dist/react/alert/index.js';
import {Button,Select} from '../../components/ui/Controls.jsx';
import React,{useEffect,useState} from 'react';
import {request} from '../../api.js';
export default function MediaPicker({value,onChange}){
 const [assets,setAssets]=useState([]),[error,setError]=useState('');
 async function load(){setError('');try{setAssets((await request('/media')).assets)}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 return <div className="media-picker"><div><Select label="Medya kütüphanesinden görsel" aria-label="Ürün medya görseli" value={value} onChange={e=>onChange(assets.find(a=>a.id===e.target.value)||null)}><option value="">Görsel seçilmedi / Harici URL</option>{value&&!assets.some(a=>a.id===value)&&<option value={value}>Mevcut seçili görsel</option>}{assets.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></div>{error&&<SlAlert open variant="danger" className="form-error">{error}<Button type="button" className="text-btn" onClick={load}>Yeniden dene</Button></SlAlert>}<small className="input-help">Yeni görselleri Medya modülünden yükleyebilirsiniz.</small></div>;
}
