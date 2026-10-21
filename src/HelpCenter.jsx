import React,{useState} from 'react';
import {MagnifyingGlass,ArrowRight} from '@phosphor-icons/react';
import {can} from './permissions.js';
export default function HelpCenter({user,onNavigate}) {
 const [query,setQuery]=useState('');
 const entries=[
  ['Kategori oluşturma','Kategoriler','categories.write','Kategori ekle ile ad, benzersiz üç haneli kod ve üst kategori belirleyin. Bağlantı alanı otomatik önerilir. Kodu oluşturduktan sonra değiştiremezsiniz. Pasif kategorilere yeni ürün eklenmez.'],
  ['Ürün ve varyant yönetimi','Ürün kataloğu','catalog.read','Ürüne tıklayın. Genel bilgilerde ad, kategori, açıklama, alerjen, görsel URL’si ve durumu düzenleyin. Varyant & fiyat sekmesinde boyut, gramaj, fiyat ve dilim sayısını girin. En az bir varyant gerekir. SKU kayıtta otomatik oluşur.'],
  ['Fiyatları güncelleme','Fiyat yönetimi','catalog.read','Fiyat düzenle ile bir ürünün varyant fiyatlarını birlikte kaydedin. Toplu güncelle ile filtrelediğiniz ürünlere yüzde artış veya indirim uygulayın. Onaylamadan önce eski ve yeni fiyatları inceleyin.'],
  ['Kayıtları dışa aktarma','Ürün kataloğu','catalog.read','Katalogdaki Dışa aktar düğmesi seçili filtrelerle eşleşen tüm ürünlerin varyantlarını CSV olarak indirir. Fiyat yönetimi ve işlem geçmişinde ayrı dışa aktarma seçenekleri bulunur.'],
  ['Yapılan değişiklikleri izleme','İşlem geçmişi','catalog.read','İşlem, açıklama, kullanıcı veya tarih aralığıyla arama yapın. Kayıtlardaki saatler İstanbul saatidir. Son 1.000 işlem saklanır.'],
  ['Ekibin erişimini yönetme','Kullanıcılar ve yetkiler','users.manage','Kullanıcı ekle ile hesap ve geçici parola tanımlayın. Yönetici tam erişime, editör katalog ve fiyat yönetimine, görüntüleyici okuma erişimine sahiptir. Yeni hesaplar ilk girişte şifre değiştirir. Pasifleştirme açık oturumları kapatır.'],
  ['Profil ve parola','Hesabım','catalog.read','Adınızı ve parolanızı Hesabım bölümünden değiştirin. Parola değişikliği diğer oturumları kapatır. E-posta değişikliklerini yöneticiniz yapar.'],
  ['Eşzamanlı düzenlemeler','Ürün kataloğu','catalog.read','Başka biri sizden önce kaydettiğinde eski verinin üzerine yazılmaz. Güncel veriler yüklenir; girdiğiniz değişiklikleri kontrol edip tekrar kaydedin.'],
 ];
 const visible=entries.filter(([title,,permission,text])=>can(user,permission)&&`${title} ${text}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
 return <section className="panel help-center"><div className="panel-title"><h2>Kullanım rehberi</h2></div><div className="module-toolbar"><div className="search"><MagnifyingGlass size={17}/><input aria-label="Yardımda ara" placeholder="Nasıl yardımcı olabiliriz?" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>{visible.map(([title,page,,text])=><details key={title}><summary>{title}</summary><p>{text}</p><button className="text-btn" onClick={()=>onNavigate(page)}>{page} bölümünü aç<ArrowRight size={15}/></button></details>)}{!visible.length&&<p className="muted">Aramanızla eşleşen yardım konusu bulunamadı.</p>}</section>;
}
