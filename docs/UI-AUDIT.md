# Arayüz kontrolü — 22 Ekim 2026

Kontrol, yerel ve sentetik verilerle gerçek Chromium üzerinde yapıldı. Mevcut üretim kayıtları değiştirilmedi. Shoelace bileşenlerinin görsel dili, primary #DA291C ve siyah sidebar/topbar korundu.

## Düzeltilen sorunlar

| Alan | Sorun | Düzenleme |
|---|---|---|
| Ortak butonlar | Yuvarlak buton ikonlarının prefix slotu Shoelace tarafından gizleniyordu. | İkon içeren metin butonlarında prefix/suffix, yalnızca ikon içeren butonlarda default slot kullanıldı. |
| Sidebar ve profil | Grid minimum genişliği ve uzun kullanıcı adı menüyü kartın dışına taşıyordu. | Grid ve flex alt öğelerine uygun minimum genişlik, metin sarmalama ve sidebar kaydırması eklendi. |
| Genel bakış | Uzun, boşluksuz işlem detayları sayfa genişliğini artırıyordu. | Uzun metinler satıra sarılıyor; sayfa ve kartlar genişlemiyor. |
| Ürün ve varyantlar | Uzun adlar ve SKU bilgileri kontrol dışına taşıyordu. | Metin grupları düzenlendi; liste/kart adlarında başlıkla erişilebilir satır sınırı, detaylarda tam sarmalama uygulandı. |
| Veri tabloları | Fiyatlar iki satıra bölünüyor, aksiyonlar tek harflik sütunlara sıkışıyordu. | Fiyatlar bölünmez hale getirildi; sütun ve aksiyon minimumları ile tablo içi yatay kaydırma düzenlendi. |
| Satış kanalı özeti | Uzun etiketler üst üste geliyordu. | Kompakt ve tam adları title/erişilebilir ad ile sunan etiketler kullanıldı. Düzenleme ekranındaki kanal adları korundu. |
| Arama alanları | Alan dışındaki ikonlar etiketlerle hizalanmıyordu. | İkonlar Shoelace input prefix slotuna taşındı. |
| Klavye | Shadow DOM içindeki metin alanında / yazmak arama kısayolunu tetikleyebiliyordu. | Kısayol, olayın composedPath bilgisindeki düzenlenebilir kontrolleri dikkate alıyor. |
| Mobil varyant formu | Uzun varyant adı, SKU ve dört aksiyon butonu dar alana sığmıyordu. | Varyant başlığı, SKU ve aksiyon satırı sarma/genişlik kuralları düzenlendi. |
| QR kartı | 320 px genişlikte QR kod çevre boşluğu sayfayı genişletiyordu. | İç içe kartlarda QR alanının gereksiz minimum genişliği ve çevre boşluğu kaldırıldı. İndirilen PNG'nin güvenli kenar payı korundu. |
| Kart görünümü | Farklı başlık uzunluklarında içerik ve aksiyonlar hizalanmıyordu. | Kart yüksekliği, başlık/kategori alanları ve alttaki aksiyonlar hizalandı. |
| Mobil menü | Masaüstüne özgü nav seçicileri nedeniyle aralıklar kayboluyor, iç içe kaydırma oluşuyordu. | Ortak nav yerleşimi ve drawer'ın kendi kaydırma alanı kullanıldı. |
| Koyu tema | Kırmızı seçili butondaki koyu metin kontrastı yetersizdi. | Primary butonlarda beyaz ön plan kullanıldı. |

## Doğrulama

- 320, 390, 768, 1024 ve 1440 px: 16 temel rota üzerinde 80 görünüm kontrolü; sayfa dışı yatay taşma, kırpılan buton etiketi, görünmeyen ikon ve JavaScript hatası bulunmadı.
- 32 ek kontrol: ürün kart görünümü, bildirim/fiyat/toplu fiyat diyalogları, profil menüsü, mobil drawer, public kart, medya ve login. Paneller viewport içinde kaldı; beklenen görseller yüklendi.
- 17 ek form kontrolü: kategori oluşturma/düzenleme, kullanıcı düzenleme, parola sıfırlama, medya adı düzenleme ve ilk girişte parola belirleme; 320/390/1440 px.
- Ürün tablosu 1440/390/320 px olarak ayrıca kontrol edildi. Dar ekranlarda yalnızca tablo kendi bölgesinde kaydırılabilir.
- Mobil menüde son bağlantının erişimi ve gezinme sonrası drawer'ın kapanması doğrulandı.
- Metin alanına Bak/lava yazılması kısayol tarafından engellenmedi.
- Mevcut 17 Vitest arayüz akışı ve üretim derlemesi başarılı.

Bu ölçümler Chromium kapsamındadır. Uzun metinler, aktif/pasif kayıtlar, görseli olan ve olmayan ürünler ile çok seviyeli kartlar kullanıldı. Kaydırılabilir tablolardaki bilinçli içerik genişliği, sayfa taşması olarak değerlendirilmedi.
