import "../products/bulk-products.css";
import React,{useEffect,useState} from 'react';
import {useCatalog} from '../../app/CatalogContext.jsx';
import {request} from '../../api.js';
import {can} from '../../permissions.js';
import {Button,Select,Input} from '../../components/ui/Controls.jsx';
import Card from '../../components/ui/Card.jsx';
import FormatMenu from '../transfer/FormatMenu.jsx';
import {downloadTransfer} from '../transfer/transfer.js';
export default function LocalizationCenter({user}){
 const {products,categories,languages=[],currencies=[],mutate}=useCatalog();
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[kind,setKind]=useState('product'),[id,setId]=useState(''),[language,setLanguage]=useState('en'),[currency,setCurrency]=useState('USD'),[amount,setAmount]=useState('100');
 async function load(){setData(await request('/localization'));}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function run(path,body){setBusy(true);setError('');try{await mutate(path,body,'POST');await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 const records=kind==='product'?products.map(p=>({id:String(p.id),name:p.name})):kind==='category'?categories.map(c=>({id:c.id,name:c.name})):products.flatMap(p=>p.variants.map(v=>({id:v.id,name:`${v.size} · ${v.sku}`})));
 const translations=data?.translations||[],rates=data?.rates;
 const rate=rates?.entries.find(row=>row.currency===currency);
 const priceRows=rate?products.flatMap(p=>[...(p.unitPricing?.price?[{name:p.name,code:p.productCode,price:p.unitPricing.price,unit:p.unitPricing.unit}]:[]),...p.variants.map(v=>({name:v.size,code:v.sku,price:v.price,unit:v.unit}))]).map(row=>({...row,converted:currency === 'TRY' ? row.price : Math.round(row.price*rate.rate)})):[];
 const fmt=value=>new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(value);
 function exportRows(format,type){const columns=type==='translations'?['Kayıt türü','Kayıt','Dil','Alan','Kaynak metin','Çeviri','Tarih','Eski kaynak']:['Ad','Kod','Kaynak para birimi','Kaynak fiyat','Birim','Hedef para birimi','Hedef tutar','Kur','Kur tarihi','Sağlayıcı'];const rows=type==='translations'?translations.flatMap(t=>Object.entries(t.fields).map(([key,value])=>[t.kind,t.recordId,t.language,key,t.sourceFields[key],value,t.createdAt,t.stale?'Evet':'Hayır'])):priceRows.map(row=>[row.name,row.code,'TRY',row.price,row.unit,currency,row.converted,rate.rate,rate.date,rates.provider]);downloadTransfer(columns,rows,format,type==='translations'?'ceviriler':'kur-donusumleri').catch(e=>setError(e.message));}
 return <section className="product-module"><Card><h2>Çeviri ve Kur Merkezi</h2><p>Kaynak içerik Türkçe, kaynak fiyatlar TRY olarak korunur. Üretilen çeviri ve fiyat karşılıkları ayrı kaydedilir; ürün kartları otomatik değiştirilmez.</p>{error&&<p role="alert">{error}</p>}<Button type="button" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}>Kayıtlı verileri yenile</Button></Card>
 <Card><div className="panel-title"><h3>Otomatik çeviri</h3><FormatMenu direction="export" disabled={!translations.length||busy} onSelect={format=>exportRows(format,'translations')}/></div>
 {data&&!data.translationConfigured&&<p>Çeviri servisi yapılandırılmadı. Sunucuda GOOGLE_TRANSLATE_API_KEY tanımlanmalı. Kayıtlı çeviriler görüntülenebilir.</p>}
 <div className="bulk-products-grid"><Select label="Kayıt türü" value={kind} onChange={e=>{setKind(e.target.value);setId('');}}><option value="product">Ürün</option><option value="variant">Varyant</option><option value="category">Kategori</option></Select><Select label="Çevrilecek kayıt" value={id} onChange={e=>setId(e.target.value)}><option value="">Seçin</option>{records.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</Select><Select label="Hedef dil" value={language} onChange={e=>setLanguage(e.target.value)}>{languages.filter(l=>l.active).map(l=><option key={l.code} value={l.code}>{l.name}</option>)}</Select></div>
 {can(user,'products.write')&&<Button type="button" disabled={busy||!id||(!data?.translationConfigured&&language!=='tr')} onClick={()=>run('/localization/translate',{kind,recordId:id,language})}>Çeviriyi hazırla</Button>}
 <p>Otomatik çevirileri, özellikle alerjen ve saklama ifadelerini kullanımdan önce kontrol edin.</p>
 {translations.map(t=><details key={`${t.kind}:${t.recordId}:${t.language}`}><summary>{t.fields.name||t.recordId} · {t.language}{t.stale?' · Kaynak değişmiş, yeniden çevirin':''}</summary><p>{t.provider} · {new Date(t.createdAt).toLocaleString('tr-TR')}</p><dl>{Object.entries(t.fields).map(([key,value])=><div key={key}><dt>{key}</dt><dd dir="auto">{value}</dd></div>)}</dl></details>)}
 </Card>
 <Card><div className="panel-title"><h3>Kur dönüşümleri</h3><FormatMenu direction="export" disabled={!priceRows.length||busy} onSelect={format=>exportRows(format,'rates')}/></div><p>Kur kaynağı: <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter</a>. Gösterilen tutarlar referans karşılıklardır; satış fiyatları değiştirilmez.</p>
 {can(user,'settings.write')&&<Button type="button" disabled={busy} onClick={()=>run('/localization/rates',{})}>Kurları getir / yenile</Button>}
 {rates?<p>Alınma: {new Date(rates.fetchedAt).toLocaleString('tr-TR')} · {Date.now()-Date.parse(rates.fetchedAt)>24*3600000?'Kayıtlı veri 24 saatten eski.':'Kayıtlı kurlar kullanılıyor.'} Kurlar en erken 6 saat sonra yeniden alınır.</p>:<p>Henüz kur verisi alınmadı.</p>}
 <div className="bulk-products-grid"><Select label="Hedef para birimi" value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.filter(c=>c.active).map(c=><option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</Select><Input label="TRY tutarı" type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/><p>{rate&&Number.isFinite(Number(amount))?`${amount} TRY = ${fmt(currency === 'TRY' ? Number(amount) : Math.round(Number(amount)*rate.rate))} · ${rate.date}`:'Seçilen para birimi için kur yok.'}</p></div>
 <div className="table-scroll"><table><thead><tr><th>Ürün / Varyant</th><th>Kaynak TRY</th><th>{currency}</th><th>Kur tarihi</th></tr></thead><tbody>{priceRows.map(row=><tr key={row.code}><td>{row.name}</td><td>{row.price}</td><td>{fmt(row.converted)}</td><td>{rate.date}</td></tr>)}</tbody></table></div>
 </Card></section>;
}
