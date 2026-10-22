# Uygulama mimarisi

## Uygulama, ortak bileşenler ve modüller

`src/main.jsx` giriş noktasıdır. Oturum ve ilk parola değişimi `src/app/BackendGate.jsx`, sayfa kompozisyonu `src/app/App.jsx`, yetkiye göre sıralanmış modül tanımları `src/app/modules.js` içindedir. Hash adresleri doğrudan bölüm açmayı ve tarayıcı geri / ileri gezinmesini destekler.

| Konum | Sorumluluk |
|---|---|
| `src/app/CatalogContext.jsx` | Sunucu kataloğu, revizyon, kayıt kilidi, yenileme ve hata durumu |
| `src/components/layout/AppShell.jsx` | Menü, mobil gezinme, üst bar ve sayfa başlığı |
| `src/components/ui/` | Modal / odak kontrolü, sayfalama, görsel, durum etiketi, boş durum ve modül hata sınırı |
| `src/modules/categories/` | Ana ve alt kategori ağacı, kategori formu ve ürün kategori seçimi |
| `src/modules/products/` | Ürün listesi, filtreler, seçim, dışa aktarma ve ürün düzenleyici |
| `src/modules/variants/` | Varyant listesi ve tekrar kullanılan varyant alanları |
| `src/modules/codes/` | Ürün kodu, SKU listeleri ve önek kuralları |
| `src/modules/users/` | Kullanıcı, rol, aktiflik ve yönetici parola atama |
| `src/modules/media/` | Medya dosya yönetimi, yükleme API istemcisi ve ürün içi seçici |
| `src/modules/pricing/` | Fiyat listesi ve önizlemeli toplu fiyat penceresi |
| `src/modules/account/` | Kişisel profil ve parola |
| `src/modules/overview/`, `activity/`, `help/` | Özet, geçmiş ve yardım |

Ana iş modülleri `React.lazy` ve `Suspense` ile gerektiğinde yüklenir. `ModuleBoundary` yükleme / render hatalarını sınırlar. Ortak ürün düzenleyici hem ürün hem varyant modülünden açılır; kayıt işlemi tek doğrulama ve API yolundan geçer.

## Veri ve izinler

Modüller katalog verisine `useCatalog()` ile erişir. `mutate()` kayıtları revizyonla gönderir, eşzamanlı kayıtları engeller ve çakışmada güncel kataloğu alır. Eski bir yenileme yanıtı daha yeni revizyonun üzerine yazamaz. Yerel form taslakları yalnızca başarılı sunucu yanıtından sonra kapatılır.

`src/permissions.js` ortak rol tanımıdır. Menü görünürlüğü ve yazma düğmeleri buradan yönetilir; sunucu her istekte güncel DB rolünü ayrıca doğrular. `users.manage`, `settings.write`, `products.write`, `prices.write`, `categories.write` ve `media.write` ayrı izinlerdir.

Ürün kodu ID’den türetilir (`P000001`). SKU’lar yalnızca sunucuda oluşturulur. İstemci kimlik / SKU üretmez ve mevcut kodları değiştiremez. Yeni önek yalnızca sonraki ürünlere uygulanır.

## Medya

`server/media-service.js` dosya türü / boyutu, metadata sürüm kontrolü, içerik yanıtı ve silme kurallarını yönetir. En fazla 2 MB PNG / JPEG / WEBP / GIF dosya, MIME ve dosya imzası kontrolünden geçirilir. Dosya verisi `app_media` tablosunda tutulur; liste yanıtları dosya verisini içermez. İçerik endpoint’i oturum ister ve özel önbellek politikası kullanır.

Ürün kayıtları `mediaId` taşır. Sunucu medya varlığını aynı katalog transaction’ında doğrular ve içerik URL’sini kendisi belirler. Medya silme ve ürün atama aynı katalog satır kilidini kullandığından eşzamanlı işlemler sahipsiz medya bağlantısı oluşturamaz. Silmeden önce kullanıcıdan uygulama içi onay alınır; kullanılan dosya silinemez. Dosyalar serverless diske yazılmaz. Büyük dosya / video desteği yoktur.

## Yeni modül eklemek

1. İş alanını `src/modules/<alan>/` içinde oluşturun.
2. Menü adı, sıra ve izni `src/app/modules.js` içinde tanımlayın.
3. `src/app/App.jsx` içinde lazy yükleyiciyi ve modül bileşenini bağlayın.
4. Ortak katalog kayıtları için `useCatalog`, yerel form / filtreler için modül durumunu kullanın.
5. API iznini, backend davranışını ve gerçek API’ye bağlı arayüz akışını test edin.

Kontroller: `npm test`, `npm run test:ui`, `npm run build`.

## Public ürün kartları

`src/product-card.js` açık alan projeksiyonunu, yayın uygunluğu kontrolünü ve kalıcı `/p/:productCode` adresini tanımlar. `ProductDetails.jsx` yönetim önizlemesi ve public sayfa arasında ortak görünüm bileşenidir. `ProductCardManagement.jsx` yayın anahtarı, kopyalama ve QR PNG indirmeyi yönetir. `PublicProductPage.jsx` yalnızca anonim public API’yi çağırır; `RootApp` bu adresleri oturum kapısından ayırır. Netlify `/p/*` isteklerini SPA girişine yönlendirir. Yönetim kartları `#products/:id/card` adresinden doğrudan açılabilir.

Sunucu, mevcut katalog JSON belgesinde `publicCardEnabled` saklar; mevcut kayıtlarda eksik değer kapalı sayılır. Yeni tablo/SQL migration gerekmez. Katalog yazma işlemleri yayın durumunu korur; yayın anahtarı ayrı bir `products.write` endpoint’i ile değiştirilir. Açık API ve görsel erişimi her istekte yayın ve ürün/kategori/varyant durumunu doğrular. QR oluşturma/çözme ve indirilen PNG’nin tekrar okunması gerçek Canvas ile arayüz testlerinde kontrol edilir.

## Shoelace varsayılan arayüzü

Tema, Shoelace light CSS ve Türkçe yerelleştirmeden oluşur. `src/theme/primary.css` yalnızca #DA291C temelindeki primary paleti tanımlar; nötr ve semantik renkler framework'ten gelir. `src/layout.css` grid, flex, sayfa boşlukları, duyarlı yerleşim ve yerel HTML tablo düzenini içerir. Shoelace renkleri, kenarlıkları, köşe ve gölge biçimleri, hover ve animasyonları korunur. Shadow part kuralları yalnızca metin sarmalama, minimum genişlik ve kart yüksekliği gibi yerleşim sorunlarında kullanılır. Önceki dokuz marka/modül CSS dosyası kaldırılmıştır.

Ortak kontrol adaptörleri yalnızca React olaylarını, görünür Shoelace etiketlerini, erişilebilir adları ve fieldset disabled aktarımını yönetir. Butonlar standart medium boyutundadır; ikonlar resmi prefix/suffix slotlarında gösterilir. Form uyarıları, rol/durum etiketleri, kategori/medya/varyant kartları framework bileşenleridir. Profil menüsü ve mobil menü Shoelace dropdown/drawer kullanır.
