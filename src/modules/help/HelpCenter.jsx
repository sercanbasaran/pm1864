import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import Card from "../../components/ui/Card.jsx";
import { Button, Input } from "../../components/ui/Controls.jsx";
import React, { useState } from "react";
import { MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";
import { can } from "../../permissions.js";
export default function HelpCenter({ user, onNavigate }) {
  const [query, setQuery] = useState("");
  const entries = [
    [
      "Ana modüller ve alt modüller",
      "Ürün yönetimi ana modülü",
      "catalog.read",
      "Ürün yönetimi altında kategori, ürün ve varyant; Satış yönetimi altında fiyat, satış grupları ve menü; Kanal yönetimi altında Mağaza, E-Mağaza ve Sipariş Platformları; Sistem Ayarları altında Kod/SKU, para birimleri ve diller; Kullanıcı Yönetimi altında kullanıcılar ve kullanıcı rolleri; Kütüphane altında görseller ve dokümanlar bulunur. Menüde ana modül başlığına tıklayarak alt modülleri açın. Modüle genel bakış sayfasından alt modüllere geçebilirsiniz. Hazırlık aşamasında yazan alanlarda kayıt işlemleri henüz devrede değildir.",
    ],
    [
      "Kategori oluşturma",
      "Kategori yönetimi",
      "categories.write",
      "Ana kategori oluşturun; Alt kategori ekle ile ürün alt gruplarını bağlayın. Yapı iki kategori seviyesiyle sınırlıdır. Bağlantı alanı otomatik önerilir. Kodu oluşturduktan sonra değiştiremezsiniz. Pasif kategorilere yeni ürün eklenmez.",
    ],
    [
      "Ürün ve varyant yönetimi",
      "Ürün yönetimi",
      "catalog.read",
      "Ürüne tıklayın. Genel bilgilerde ad, ana kategori, alt kategori, açıklama, alerjen, görsel URL’si ve durumu düzenleyin. Varyant & fiyat sekmesinde boyut, gramaj, fiyat ve dilim sayısını girin. En az bir varyant gerekir. SKU kayıtta otomatik oluşur.",
    ],
    [
      "Varyant yönetimi",
      "Varyant yönetimi",
      "catalog.read",
      "Varyantları ana kategori, alt kategori, ürün ve durum bazında filtreleyin. Ürün seçip Varyant ekle ile ad, gramaj, dilim sayısı, fiyat ve aktiflik belirleyin. Yönet düğmesiyle sıralayın, çoğaltın veya silin. Son varyant silinemez. Varyant SKU kodları otomatik oluşur ve değişikliklerde korunur.",
    ],
    [
      "Fiyatları güncelleme",
      "Fiyat yönetimi",
      "catalog.read",
      "Fiyat düzenle ile bir ürünün varyant fiyatlarını birlikte kaydedin. Toplu güncelle ile filtrelediğiniz ürünlere yüzde artış veya indirim uygulayın. Onaylamadan önce eski ve yeni fiyatları inceleyin.",
    ],
    [
      "Kayıtları dışa aktarma",
      "Ürün yönetimi",
      "catalog.read",
      "Ürün ve varyant listelerinde içe ve dışa aktarma menülerinden JSON, CSV, XML veya Excel biçimini seçin. Dışa aktarma geçerli filtrelerle eşleşen kayıtları içerir; içe aktarma yeni kayıt oluşturur. Fiyat, kod ve işlem geçmişi listelerinde de dışa aktarma seçenekleri bulunur.",
    ],
    [
      "Yapılan değişiklikleri izleme",
      "İşlem geçmişi",
      "catalog.read",
      "İşlem, açıklama, kullanıcı veya tarih aralığıyla arama yapın. Kayıtlardaki saatler İstanbul saatidir. Son 1.000 işlem saklanır.",
    ],
    [
      "Ekibin erişimini yönetme",
      "Kullanıcılar",
      "users.manage",
      "Kullanıcı ekle ile hesap ve geçici parola tanımlayın. Yönetici tam erişime, editör katalog ve fiyat yönetimine, görüntüleyici okuma erişimine sahiptir. Yeni hesaplar ilk girişte şifre değiştirir. Pasifleştirme açık oturumları kapatır.",
    ],
    [
      "Ürün kodları ve SKU",
      "Ürün kodu ve SKU yönetimi",
      "catalog.read",
      "Ürün kodlarını ve ürün / varyant SKU’larını arayın veya dışa aktarın. Varyant SKU biçimi 0000.000000.00; sıralama ana kategori, alt kategori, ürün ve varyant şeklindedir. Kodlar otomatik atanır; uygulamada marka öneki gösterilmez. İsim veya kategori değişikliği mevcut SKU’yu değiştirmez.",
    ],
    [
      "Görsel kütüphanesi",
      "Görseller",
      "catalog.read",
      "Yönetici ve editörler PNG, JPEG, WEBP veya GIF görselleri yükleyebilir. Dosya başına sınır 2 MB’dır. Görseli ürün düzenleyicisindeki kütüphane alanından seçin. Kullanılan görseli silmeden önce üründeki bağlantıyı kaldırın.",
    ],
    [
      "Profil ve parola",
      "Hesabım",
      "catalog.read",
      "Adınızı ve parolanızı Hesabım bölümünden değiştirin. Parola değişikliği diğer oturumları kapatır. E-posta değişikliklerini yöneticiniz yapar.",
    ],
    [
      "Eşzamanlı düzenlemeler",
      "Ürün yönetimi",
      "catalog.read",
      "Başka biri sizden önce kaydettiğinde eski verinin üzerine yazılmaz. Güncel veriler yüklenir; girdiğiniz değişiklikleri kontrol edip tekrar kaydedin.",
    ],
  ];
  const visible = entries.filter(
    ([title, , permission, text]) =>
      can(user, permission) &&
      `${title} ${text}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  return (
    <Card className="panel help-center">
      <div className="panel-title">
        <h2>Kullanım rehberi</h2>
      </div>
      <div className="module-toolbar">
        <div className="search">
          <Input
            prefix={<MagnifyingGlass size={17} />}
            aria-label="Yardımda ara"
            placeholder="Nasıl yardımcı olabiliriz?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {visible.map(([title, page, , text]) => (
        <SlDetails key={title} summary={title}>
          <p>{text}</p>
          <Button className="text-btn" onClick={() => onNavigate(page)}>
            {page} bölümünü aç
            <ArrowRight size={15} />
          </Button>
        </SlDetails>
      ))}
      {!visible.length && (
        <p className="muted">Aramanızla eşleşen yardım konusu bulunamadı.</p>
      )}
    </Card>
  );
}
