import React,{useState} from 'react';
import {MagnifyingGlass,ArrowRight} from '@phosphor-icons/react';
import {can} from '../../permissions.js';
export default function HelpCenter({user,onNavigate}) {
 const [query,setQuery]=useState('');
 const entries=[
  ['Kategori oluşturma','Kategori yönetimi','categories.write','Ana kategori oluşturun; Alt kategori ekle ile ürün alt gruplarını bağlayın. Yapı iki kategori seviyesiyle sınırlıdır. Bağlantı alanı otomatik önerilir. Kodu oluşturduktan sonra değiştiremezsiniz. Pasif kategorilere yeni ürün eklenmez.'],
  ['Ürün ve varyant yönetimi','Ürün yönetimi','catalog.read','Ürüne tıklayın. Genel bilgilerde ad, ana kategori, alt kategori, açıklama, alerjen, görsel URL’si ve durumu düzenleyin. Varyant & fiyat sekmesinde boyut, gramaj, fiyat ve dilim sayısını girin. En az bir varyant gerekir. SKU kayıtta otomatik oluşur.'],
  ['Varyant yönetimi','Varyant yönetimi','catalog.read','Varyantları ana kategori, alt kategori, ürün ve durum bazında filtreleyin. Ürün seçip Varyant ekle ile ad, gramaj, dilim sayısı, fiyat ve aktiflik belirleyin. Yönet düğmesiyle sıralayın, çoğaltın veya silin. Son varyant silinemez. Varyant SKU kodları otomatik oluşur ve değişikliklerde korunur.'],
  ['Fiyatları güncelleme','Fiyat yönetimi','catalog.read','Fiyat düzenle ile bir ürünün varyant fiyatlarını birlikte kaydedin. Toplu güncelle ile filtrelediğiniz ürünlere yüzde artış veya indirim uygulayın. Onaylamadan önce eski ve yeni fiyatları inceleyin.'],
  ['Kayıtları dışa aktarma','Ürün yönetimi','catalog.read','Katalogdaki Dışa aktar düğmesi seçili filtrelerle eşleşen tüm ürünlerin varyantlarını CSV olarak indirir. Fiyat yönetimi ve işlem geçmişinde ayrı dışa aktarma seçenekleri bulunur.'],
  ['Yapılan değişiklikleri izleme','İşlem geçmişi','catalog.read','İşlem, açıklama, kullanıcı veya tarih aralığıyla arama yapın. Kayıtlardaki saatler İstanbul saatidir. Son 1.000 işlem saklanır.'],
  ['Ekibin erişimini yönetme','Kullanıcı yönetimi','users.manage','Kullanıcı ekle ile hesap ve geçici parola tanımlayın. Yönetici tam erişime, editör katalog ve fiyat yönetimine, görüntüleyici okuma erişimine sahiptir. Yeni hesaplar ilk girişte şifre değiştirir. Pasifleştirme açık oturumları kapatır.'],
  ['Ürün kodları ve SKU','Ürün kodu ve SKU yönetimi','catalog.read','Ürün kodlarını ve ürün / varyant SKU’larını arayın veya dışa aktarın. Kodlar kalıcıdır. Yöneticiler yeni ürünlerde kullanılacak SKU önekini değiştirebilir.'],
  ['Medya kütüphanesi','Medya','catalog.read','Yönetici ve editörler PNG, JPEG, WEBP veya GIF görselleri yükleyebilir. Dosya başına sınır 2 MB’dır. Görseli ürün düzenleyicisindeki medya alanından seçin. Kullanılan görseli silmeden önce üründeki bağlantıyı kaldırın.'],
  ['Profil ve parola','Hesabım','catalog.read','Adınızı ve parolanızı Hesabım bölümünden değiştirin. Parola değişikliği diğer oturumları kapatır. E-posta değişikliklerini yöneticiniz yapar.'],
  ['Eşzamanlı düzenlemeler','Ürün yönetimi','catalog.read','Başka biri sizden önce kaydettiğinde eski verinin üzerine yazılmaz. Güncel veriler yüklenir; girdiğiniz değişiklikleri kontrol edip tekrar kaydedin.'],
 ];
 const visible=entries.filter(([title,,permission,text])=>can(user,permission)&&`${title} ${text}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
 return <section className="panel help-center"><div className="panel-title"><h2>Kullanım rehberi</h2></div><div className="module-toolbar"><div className="search"><MagnifyingGlass size={17}/><input aria-label="Yardımda ara" placeholder="Nasıl yardımcı olabiliriz?" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>{visible.map(([title,page,,text])=><details key={title}><summary>{title}</summary><p>{text}</p><button className="text-btn" onClick={()=>onNavigate(page)}>{page} bölümünü aç<ArrowRight size={15}/></button></details>)}{!visible.length&&<p className="muted">Aramanızla eşleşen yardım konusu bulunamadı.</p>}</section>;
}
