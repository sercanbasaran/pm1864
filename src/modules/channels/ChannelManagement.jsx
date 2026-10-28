import React, {useState} from "react";
import {useCatalog} from "../../app/CatalogContext.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {Button,Input,Textarea,Select} from "../../components/ui/Controls.jsx";
export default function ChannelManagement({kind,canWrite}) {
 const {managedChannels=[],mutate,busy,notify}=useCatalog();
 const empty={name:"",description:"",active:true};
 const [draft,setDraft]=useState(null),[error,setError]=useState(""),[deleting,setDeleting]=useState(null);
 const title={stores:"Mağazalar","digital-stores":"E-Mağazalar","food-platforms":"Sipariş Platformları"}[kind];
 async function save(event){event.preventDefault();try{await mutate(`/managed-channels/${kind}${draft.id ? '/'+draft.id : ''}`,draft,draft.id?'PUT':'POST');setDraft(null);setError("");notify("Kanal kaydedildi.");}catch(e){setError(e.message);}}
 async function remove(){try{await mutate(`/managed-channels/${kind}/${deleting.id}`,{},'DELETE');setDeleting(null);notify("Kanal silindi.");}catch(e){setError(e.message);}}
 return <Card><div className="panel-title"><h2>{title}</h2>{canWrite && <Button type="button" onClick={()=>{setError("");setDraft({...empty});}}>Yeni ekle</Button>}</div>{error && <p role="alert">{error}</p>}
 {!managedChannels.some(c=>c.kind===kind) && <p>Henüz kayıt eklenmedi.</p>}
 <div className="table-scroll"><table><thead><tr><th>Ad</th><th>Açıklama</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>{managedChannels.filter(c=>c.kind===kind).map(c=><tr key={c.id}><td>{c.name}</td><td>{c.description || '—'}</td><td>{c.active?'Aktif':'Pasif'}</td><td>{canWrite && <><Button type="button" disabled={busy} onClick={()=>{setError("");setDraft({...c});}}>Düzenle</Button> <Button type="button" disabled={busy} onClick={()=>{setError("");setDeleting(c);}}>Sil</Button></>}</td></tr>)}</tbody></table></div>
 {draft && <Modal title={draft.id?'Kanal düzenle':'Kanal ekle'} busy={busy} onClose={()=>setDraft(null)}><form onSubmit={save}><fieldset disabled={busy} className="editor-fields"><Input label="Ad" required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><Textarea label="Açıklama" maxLength={1000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/><Select label="Durum" value={draft.active?'active':'inactive'} onChange={e=>setDraft({...draft,active:e.target.value==='active'})}><option value="active">Aktif</option><option value="inactive">Pasif</option></Select><Button type="submit" variant="primary" disabled={busy}>Kaydet</Button></fieldset>{error && <p role="alert">{error}</p>}</form></Modal>}
 {deleting && <Modal title="Kanal sil" busy={busy} onClose={()=>setDeleting(null)}><p>{deleting.name} silinecek. Bu işlem geri alınamaz.</p>{error && <p role="alert">{error}</p>}<Button type="button" onClick={()=>setDeleting(null)} disabled={busy}>Vazgeç</Button> <Button type="button" variant="danger" onClick={remove} disabled={busy}>Sil</Button></Modal>}
 </Card>;
}
