import {MaterialButton,MaterialSelect} from '../../components/ui/Material.jsx';
import React,{useEffect,useState} from 'react';
import {request} from '../../api.js';
export default function MediaPicker({value,onChange}){
 const [assets,setAssets]=useState([]),[error,setError]=useState('');
 async function load(){setError('');try{setAssets((await request('/media')).assets)}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 return <div className="media-picker"><label>Medya kütüphanesinden görsel<MaterialSelect aria-label="Ürün medya görseli" value={value} onChange={e=>onChange(assets.find(a=>a.id===e.target.value)||null)}><option value="">Görsel seçilmedi / Harici URL</option>{value&&!assets.some(a=>a.id===value)&&<option value={value}>Mevcut seçili görsel</option>}{assets.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</MaterialSelect></label>{error&&<div className="form-error" role="alert">{error}<MaterialButton type="button" className="text-btn" onClick={load}>Yeniden dene</MaterialButton></div>}<small className="input-help">Yeni görselleri Medya modülünden yükleyebilirsiniz.</small></div>;
}
