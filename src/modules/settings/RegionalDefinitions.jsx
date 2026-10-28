import React, {useState} from "react";
import {useCatalog} from "../../app/CatalogContext.jsx";
import {Button,Input,Select} from "../../components/ui/Controls.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
export default function RegionalDefinitions({kind,canWrite}) {
 const catalog=useCatalog(), {busy,mutate,notify}=catalog;
 const items=catalog[kind] || [], language=kind==='languages';
 const defaultCode=catalog[language?'defaultLanguage':'defaultCurrency'];
 const [draft,setDraft]=useState(null),[error,setError]=useState('');
 async function save(event){event.preventDefault();if(busy)return;setError('');try{await mutate(`/regional-definitions/${kind}/${draft.code}`,draft,'PUT');setDraft(null);notify('Tanım kaydedildi.');}catch(e){setError(e.message);}}
 return <Card><div className="panel-title"><h2>{language?'Diller':'Para Birimleri'}</h2><SlBadge>{items.length} tanım</SlBadge></div>
 <p>Varsayılan: <strong>{items.find(item=>item.code===defaultCode)?.name || defaultCode}</strong></p>
 <div className="table-scroll"><table aria-label={language?'Diller':'Para Birimleri'}><thead><tr><th>Kod</th><th>Ad</th>{language && <th>Kendi dilinde adı</th>}<th>Durum</th><th>Varsayılan</th>{canWrite && <th>İşlemler</th>}</tr></thead><tbody>{items.map(item=><tr key={item.code}><td><code>{item.code}</code></td><td>{item.name}</td>{language && <td dir="auto">{item.nativeName}</td>}<td><SlBadge variant={item.active?'success':'neutral'}>{item.active?'Aktif':'Pasif'}</SlBadge></td><td>{item.code===defaultCode?'Varsayılan':'—'}</td>{canWrite && <td><Button type="button" disabled={busy} onClick={()=>{setError('');setDraft({...item,makeDefault:false});}}>Düzenle</Button></td>}</tr>)}</tbody></table></div>
 {draft && <Modal title={language?'Dil düzenle':'Para birimi düzenle'} busy={busy} onClose={()=>setDraft(null)}><form onSubmit={save}><fieldset disabled={busy} className="editor-fields"><Input label="Kod" value={draft.code} disabled/><Input label="Ad" value={draft.name} maxLength={100} required onChange={e=>setDraft({...draft,name:e.target.value})}/>{language && <Input label="Kendi dilinde adı" value={draft.nativeName} maxLength={100} required onChange={e=>setDraft({...draft,nativeName:e.target.value})}/>}
 <Select label="Durum" value={draft.active?'active':'inactive'} onChange={e=>setDraft({...draft,active:e.target.value==='active'})}><option value="active">Aktif</option><option value="inactive">Pasif</option></Select>
 {draft.code!==defaultCode && <Input type="checkbox" label="Varsayılan olarak kullan" checked={draft.makeDefault} onChange={e=>setDraft({...draft,makeDefault:e.target.checked})}/>}
 {error && <p role="alert">{error}</p>}<Button type="submit" variant="primary" disabled={busy}>Kaydet</Button></fieldset></form></Modal>}
 </Card>;
}
