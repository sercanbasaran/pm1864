import useImageDrop from "../../components/ui/useImageDrop.js";
import { uploadFile } from "../media/media-api.js";
import React, { useState, useRef } from "react";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import { Button, Input, Select, Textarea } from "../../components/ui/Controls.jsx";
import Card from "../../components/ui/Card.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { defaultPackagingItems } from "./packaging-data.js";
import "./packaging-center.css";
const empty = () => ({name:"",code:"",material:"Metal",length:null,width:null,height:null,emptyWeight:null,maxProductWeight:null,description:"",active:true,mediaId:"",imageUrl:"",allowedProductIds:[],allowedCategoryIds:[]});
export default function PackagingCenter({ canWrite }) {
  const { packagingItems = defaultPackagingItems(), products = [], categories = [], busy, mutate, notify, refresh } = useCatalog();
  const [draft,setDraft] = useState(null), [query,setQuery] = useState(""), [error,setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null), uploadLock = useRef(false);
  const blocked = busy || uploading;
  async function upload(files) {
    if (!draft || !canWrite || busy || uploadLock.current || !files.length) return;
    if (files.length !== 1) { setError("Tek bir ambalaj görseli seçin."); return; }
    uploadLock.current = true; setUploading(true); setError("");
    try { const {asset} = await uploadFile(files[0]); await refresh(); setDraft(current => current ? {...current, mediaId:asset.id, imageUrl:asset.url} : current); }
    catch(e) { setError(e.message); }
    finally { uploadLock.current = false; setUploading(false); if(fileInput.current) fileInput.current.value=""; }
  }
  const {dragging, dropProps} = useImageDrop(upload, blocked || !canWrite);
  const update = (key,value) => setDraft(current=>({...current,[key]:value}));
  async function save(e) { e.preventDefault(); if(blocked || !draft) return; setError(""); try { await mutate("/packaging"+(draft.id?"/"+encodeURIComponent(draft.id):""),draft,draft.id?"PUT":"POST"); notify(draft.id?"Ambalaj güncellendi.":"Ambalaj eklendi.");setDraft(null); } catch(e) {setError(e.message);} }
  async function remove(item) { if(blocked) return; setError(""); try {await mutate("/packaging/"+encodeURIComponent(item.id),{},"DELETE");notify("Ambalaj kaldırıldı.");}catch(e){setError(e.message);} }
  const visible=packagingItems.filter(item=>`${item.name} ${item.code || ""}`.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")));
  return <section className="packaging-center"><Card><div className="packaging-heading"><div><h2>Ambalaj Merkezi</h2><p>Kutu tiplerini ve ambalaj detaylarını yönetin.</p></div>{canWrite && <Button type="button" variant="primary" disabled={blocked} onClick={()=>{setDraft(empty());setError("");}}>Yeni ambalaj</Button>}</div>
    {error && <SlAlert open variant="danger">{error}</SlAlert>}
    {draft && canWrite && <form className="packaging-form" onSubmit={save}><h3>{draft.id ? "Ambalajı düzenle" : "Yeni ambalaj"}</h3><fieldset disabled={blocked} className="packaging-form-fields"><div className="packaging-form-grid">
      <Input label="Ambalaj adı" required maxLength={120} value={draft.name} onChange={e=>update("name",e.target.value)} />
      <Input label="Ambalaj kodu" readOnly value={draft.code || ""} placeholder="Kaydedildiğinde otomatik atanır" />
      <Select label="Malzeme" value={draft.material} onChange={e=>update("material",e.target.value)}><option>Metal</option><option>Karton</option><option>Diğer</option></Select>
      <Select label="Durum" value={draft.active?"active":"inactive"} onChange={e=>update("active",e.target.value==="active")}><option value="active">Aktif</option><option value="inactive">Pasif</option></Select>
      {[["length","Uzunluk (mm)"],["width","Genişlik (mm)"],["height","Yükseklik (mm)"],["emptyWeight","Boş ağırlık (g)"],["maxProductWeight","Maksimum ürün ağırlığı (g)"]].map(([key,label])=><Input key={key} label={label} type="number" min={0.01} step="any" value={draft[key] ?? ""} onChange={e=>update(key,e.target.value===""?null:Number(e.target.value))} />)}
      </div>
      <Select label="İzin verilen kategoriler" multiple clearable value={draft.allowedCategoryIds || []} onChange={e=>update("allowedCategoryIds",e.target.value)}>
        {categories.filter(c=>!c.parentId).flatMap(root=>[root,...categories.filter(c=>c.parentId===root.id)]).map(c=><option key={c.id} value={c.id}>{c.parentId ? "↳ " : ""}{c.name} · {c.code}</option>)}
      </Select>
      <small>Ana kategori seçimi alt kategorilerini de kapsar. Kategori izni, bu kategoriye sonradan eklenen ürünler için de geçerlidir. Ürünleri ayrıca tek tek onaylayabilirsiniz.</small>
      <Select label="İçerisine eklenebilecek ürünler" multiple clearable value={(draft.allowedProductIds || []).map(String)} onChange={e=>update("allowedProductIds",e.target.value.map(id=>products.find(p=>String(p.id)===id)?.id).filter(id=>id!==undefined))}>
        {products.map(p=><option key={p.id} value={String(p.id)}>{p.name} · {p.productCode}</option>)}
      </Select>
      <small>Seçilen kategorilerdeki ürünler veya tek tek onaylanan ürünler bu kutuya eklenebilir. Hiç seçim yapılmazsa bu kutuyla varyant kaydedilemez.</small>
      <section className={`packaging-image-upload image-drop-target${dragging ? " is-dragging" : ""}`} {...dropProps} aria-label="Ambalaj görseli" aria-busy={uploading}>
        <h4>Ambalaj görseli</h4>
        {draft.mediaId && <img src={draft.imageUrl || `/api/media/${encodeURIComponent(draft.mediaId)}/content`} alt={draft.name || "Ambalaj önizlemesi"} />}
        <input ref={fileInput} type="file" aria-label="Ambalaj görseli yükle" accept="image/png,image/jpeg,image/webp,image/gif" disabled={blocked} onChange={e=>upload(Array.from(e.target.files || []))} />
        <small className="image-drop-help" role="status">{uploading ? "Görsel yükleniyor…" : "Görseli buraya sürükleyin veya dosya seçin. PNG, JPEG, WEBP, GIF · En fazla 2 MB."}</small>
        {draft.mediaId && <Button type="button" disabled={blocked} onClick={()=>setDraft(current=>({...current,mediaId:"",imageUrl:""}))}>Görseli kaldır</Button>}
        <small>Görsel değişikliği Kaydet ile ambalaja uygulanır. Kaldırılan görsel kütüphanede korunur.</small>
      </section>
      <Textarea label="Açıklama ve diğer detaylar" rows={3} maxLength={4000} value={draft.description || ""} onChange={e=>update("description",e.target.value)} /></fieldset><div className="packaging-actions"><Button type="button" disabled={blocked} onClick={()=>{setDraft(null);setError("");}}>Vazgeç</Button><Button type="submit" variant="primary" disabled={blocked || !draft.name.trim()}>Kaydet</Button></div></form>}
    <Input label="Ambalaj ara" aria-label="Ambalaj ara" placeholder="Ad veya kod ara" value={query} onChange={e=>setQuery(e.target.value)} />
    <p>{visible.length} ambalaj listeleniyor</p><div className="packaging-list">{visible.map(item=>{const count=products.reduce((n,p)=>n+p.variants.filter(v=>v.packagingId===item.id).length,0);return <article key={item.id}>{item.mediaId && <img className="packaging-thumbnail" src={item.imageUrl || `/api/media/${encodeURIComponent(item.mediaId)}/content`} alt={item.name} loading="lazy" />}<div className="packaging-item-info"><strong>{item.name}</strong><small>{(item.allowedCategoryIds || []).length} kategori · {(item.allowedProductIds || []).length} ayrı ürün onayı</small><small>{item.code || "Kod belirtilmedi"} · {item.material} · {count} varyant</small><small>{[item.length && `${item.length} mm uzunluk`,item.width && `${item.width} mm genişlik`,item.height && `${item.height} mm yükseklik`,item.emptyWeight && `${item.emptyWeight} g boş ağırlık`,item.maxProductWeight && `Maksimum ${new Intl.NumberFormat("tr-TR").format(item.maxProductWeight)} g ürün kapasitesi`].filter(Boolean).join(" · ") || "Ölçüler eklenmedi"}</small>{item.description && <p>{item.description}</p>}</div><SlBadge variant={item.active?"success":"neutral"}>{item.active?"Aktif":"Pasif"}</SlBadge>{canWrite && <div className="packaging-actions"><Button type="button" disabled={blocked} onClick={()=>{setDraft({...item});setError("");}}>Düzenle</Button><Button type="button" disabled={blocked || count>0} title={count?"Kullanılan ambalajı pasife alabilirsiniz":"Ambalajı kaldır"} onClick={()=>remove(item)}>Kaldır</Button></div>}</article>;})}{!visible.length && <p>Ambalaj bulunamadı.</p>}</div>
  </Card></section>;
}
