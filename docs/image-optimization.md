# Görsel boyutları ve thumbnail üretimi

Orijinaller `app_media` tablosunda korunur. Yüklemede Sharp ile EXIF yönü düzeltilir ve `app_media_derivatives` tablosuna üç WebP kopya yazılır. Alfa kanalı korunur, kırpma ve büyütme yapılmaz. GIF için ilk kare kullanılır; orijinal animasyon korunur. Girdi en fazla 2 MB ve 40 megapikseldir. Hasarlı yeni görseller reddedilir. Thumbnail işlemleri aynı sunucu örneğinde sıraya alınır.

| Profil | Dosyanın azami boyutu | Gösterim |
| --- | --- | --- |
| thumb | 128 × 128 px | Tablo: 64 × 64, kutu seçeneği: 40 × 40, görsel seçimi: 100 × 100 |
| tile | 480 × 480 px | Logo: en fazla 480 px; ürün döşemesi ve kütüphane: 240 px yükseklik, ambalaj önizleme: 180 × 180 / 88 × 88 |
| detail | 1200 × 1200 px | Detay galerisi: 1:1, ekran genişliğine göre küçülür |

Dosyalar en-boy oranını korur; thumbnail gösterim alanlarında merkezden `cover` kullanılır. Orijinal görüntü değişmez; kesme yalnızca sabit alandaki CSS gösterimindedir. Ürün detayındaki mevcut `cover` davranışı korunur. `loading`, `decoding` ve boyutlar yerleşim kaymasını ve ilk sayfa yükünü azaltır.

`src/image-sizes.js` kullanım yerine göre URL üretir. Kütüphane, ürün, varyant ve kategori kartı API adreslerine yalnızca `?size=thumb|tile|detail` eklenir. Mevcut yayın ve oturum kontrolleri sürer. Rastgele boyutlar reddedilir. Orijinal uçları değişmez. Kütüphane orijinalleri ve türetilmiş görseller tarayıcıya özel 24 saatlik HTTP önbelleği kullanır (`private, max-age=86400, must-revalidate`, `Vary: Cookie`). Süre dolmadan sunucuya yeniden istek gerekmez. Süre dolunca ETag/304 ile yalnızca değişen içerik indirilir. Sunucuya gelen her istekte mevcut erişim izni doğrulanır; tarayıcıda zaten bulunan kopyalar tazelik süresi boyunca kullanılabilir. Yeni yükleme yeni medya kimliğiyle farklı URL oluşturur. Gizli görseller public CDN'e verilmez.

Eski kütüphane görselinde istenen kopya yoksa ilk görüntülemede oluşturulur ve saklanır. Geriye dönük toplu hazırlama: Kütüphane → Görseller → **Eski görselleri optimize et**. Yetkili `POST /api/media/thumbnails` her istekte en fazla beş eksik kaydı işler ve devam imleci döndürür. İşlem durdurulup yeniden başlatılabilir; tamamlanmış kayıtlar atlanır. Bozuk görseller isimleriyle raporlanır, orijinaller silinmez. Başka kayıtlardan bağımsız bu işlem katalog revizyonunu değiştirmez. Bağlı olmayan bir görsel silindiğinde kopyaları foreign key cascade ile silinir.

Eski `hm1864.netlify.app` üzerindeki public dosyalar ve yerel statik dosyalar production'da Netlify Image CDN üzerinden aynı boyutlarla optimize edilir. Bu kopyalar CDN'de tutulur. Diğer harici alan adları otomatik olarak indirilmez veya proxy yapılmaz; orijinal URL korunur. Yeni bir kaynak alan adı gerekiyorsa `image-sizes.js` ve `netlify.toml` allowlist'i birlikte güncellenmelidir.

Dağıtım: `sharp` production bağımlılığıdır ve Netlify fonksiyon paketine dış modül olarak dahil edilir. Migration yalnızca thumbnail tablosunu oluşturur; uygulama başlangıcında bütün görselleri çözümlemez. Canlıda toplu dönüşümün tamamlandığı ancak yetkili endpoint veya kütüphane işlemi çalıştırılarak doğrulanabilir.

Profil fotoğrafları için ayrıca 128 px WebP kopya `app_user_avatar_thumbnails` tablosunda tutulur. Yeni yüklemede oluşturulur, eski profillerde ilk küçük görsel isteğinde hazırlanır. Yalnızca fotoğraf sahibinin oturumuyla sunulur; değiştirme ve kaldırmada sürüm/bağlantı kontrolleri korunur.


Profil fotoğraflarında kullanıcı + sürüm içeren URL'ler aynı 24 saatlik tarayıcı önbelleğini kullanır. Fotoğraf değişince veya tekrar yüklenince sürümlü URL değişir; fotoğraf kaldırılınca kullanıcı verisindeki URL boşalır. Sürümsüz eski avatar adresleri beş dakika saklanır. JSON/katalog ve oturum yanıtları `no-store` kalır; service worker veya localStorage içine büyük görsel verisi yazılmaz.


Yönetim ekranlarında görsel URL'sine `viewer` kullanıcı kimliği eklenir. Giriş, hesap değişimi, çıkış ve oturum sonlanmasında kapsam güncellenir. Böylece aynı dokümanda bellekte tutulan görseller de farklı kullanıcılar arasında aynı URL ile eşleşmez. Bu kimlik yetkilendirme sağlamaz; sunucu mevcut oturumu her yeni ağ isteğinde ayrıca kontrol eder.
