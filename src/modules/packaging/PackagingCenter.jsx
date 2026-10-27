import React, { useState } from "react";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import { Button, Input, Select, Textarea } from "../../components/ui/Controls.jsx";
import Card from "../../components/ui/Card.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { defaultPackagingItems } from "./packaging-data.js";
import "./packaging-center.css";
const empty = () => ({name:"",code:"",material:"Metal",length:null,width:null,height:null,emptyWeight:null,description:"",active:true});
export default function PackagingCenter({ canWrite }) {
  const { packagingItems = defaultPackagingItems(), products = [], busy, mutate, notify } = useCatalog();
  const [draft,setDraft] = useState(null), [query,setQuery] = useState(""), [error,setError] = useState("");
  const update = (key,value) => setDraft(current=>({...current,[key]:value}));
  async function save(e) { e.preventDefault(); if(busy || !draft) return; setError(""); try { await mutate("/packaging"+(draft.id?"/"+encodeURIComponent(draft.id):""),draft,draft.id?"PUT":"POST"); notify(draft.id?"Ambalaj güncellendi.":"Ambalaj eklendi.");setDraft(null); } catch(e) {setError(e.message);} }
  async function remove(item) { if(busy) return; setError(""); try {await mutate("/packaging/"+encodeURIComponent(item.id),{},"DELETE");notify("Ambalaj kaldırıldı.");}catch(e){setError(e.message);} }
  const visible=packagingItems.filter(item=>`${item.name} ${item.code || ""}`.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")));
  return <section className="packaging-center"><Card><div className="packaging-heading"><div><h2>Ambalaj Merkezi</h2><p>Kutu tiplerini ve ambalaj detaylarını yönetin.</p></div>{canWrite && <Button type="button" variant="primary" onClick={()=>{setDraft(empty());setError("");}}>Yeni ambalaj</Button>}</div>
    {error && <SlAlert open variant="danger">{error}</SlAlert>}
    {draft && canWrite && <form className="packaging-form" onSubmit={save}><h3>{draft.id ? "Ambalajı düzenle" : "Yeni ambalaj"}</h3><div className="packaging-form-grid">
      <Input label="Ambalaj adı" required maxLength={120} value={draft.name} onChange={e=>update("name",e.target.value)} />
      <Input label="Ambalaj kodu" maxLength={50} value={draft.code || ""} onChange={e=>update("code",e.target.value)} />
      <Select label="Malzeme" value={draft.material} onChange={e=>update("material",e.target.value)}><option>Metal</option><option>Karton</option><option>Diğer</option></Select>
      <Select label="Durum" value={draft.active?"active":"inactive"} onChange={e=>update("active",e.target.value==="active")}><option value="active">Aktif</option><option value="inactive">Pasif</option></Select>
      {[["length","Uzunluk (mm)"],["width","Genişlik (mm)"],["height","Yükseklik (mm)"],["emptyWeight","Boş ağırlık (g)"]].map(([key,label])=><Input key={key} label={label} type="number" min={0.01} step="any" value={draft[key] ?? ""} onChange={e=>update(key,e.target.value===""?null:Number(e.target.value))} />)}
      </div><Textarea label="Açıklama ve diğer detaylar" rows={3} maxLength={4000} value={draft.description || ""} onChange={e=>update("description",e.target.value)} /><div className="packaging-actions"><Button type="button" disabled={busy} onClick={()=>{setDraft(null);setError("");}}>Vazgeç</Button><Button type="submit" variant="primary" disabled={busy || !draft.name.trim()}>Kaydet</Button></div></form>}
    <Input label="Ambalaj ara" aria-label="Ambalaj ara" placeholder="Ad veya kod ara" value={query} onChange={e=>setQuery(e.target.value)} />
    <p>{visible.length} ambalaj listeleniyor</p><div className="packaging-list">{visible.map(item=>{const count=products.reduce((n,p)=>n+p.variants.filter(v=>v.packagingId===item.id).length,0);return <article key={item.id}><div><strong>{item.name}</strong><small>{item.code || "Kod belirtilmedi"} · {item.material} · {count} varyant</small><small>{[item.length && `${item.length} mm uzunluk`,item.width && `${item.width} mm genişlik`,item.height && `${item.height} mm yükseklik`,item.emptyWeight && `${item.emptyWeight} g boş ağırlık`].filter(Boolean).join(" · ") || "Ölçüler eklenmedi"}</small>{item.description && <p>{item.description}</p>}</div><SlBadge variant={item.active?"success":"neutral"}>{item.active?"Aktif":"Pasif"}</SlBadge>{canWrite && <div className="packaging-actions"><Button type="button" disabled={busy} onClick={()=>{setDraft({...item});setError("");}}>Düzenle</Button><Button type="button" disabled={busy || count>0} title={count?"Kullanılan ambalajı pasife alabilirsiniz":"Ambalajı kaldır"} onClick={()=>remove(item)}>Kaldır</Button></div>}</article>;})}{!visible.length && <p>Ambalaj bulunamadı.</p>}</div>
  </Card></section>;
}
