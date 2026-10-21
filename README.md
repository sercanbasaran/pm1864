# pm1864 — Ürün ve ekip yönetimi

Hafız Mustafa 1864 için React + Node.js katalog yönetimi. İlk etapta kategori, ürün, varyant, fiyat, kullanıcı ve yetki yönetimi bulunur. Platform bağlantıları, yayın adımları, gönderim kuyruğu ve zamanlanmış gönderim görevleri bu sürümden kaldırılmıştır. Uygulama dış platformlara veri göndermez.

## Roller ve yetkiler

| İşlem | Yönetici | Editör | Görüntüleyici |
|---|---|---|---|
| Katalog, kategori ve işlem geçmişini görüntüleme | ✓ | ✓ | ✓ |
| Kategori ekleme / düzenleme | ✓ | ✓ | — |
| Ürün / varyant ekleme / düzenleme | ✓ | ✓ | — |
| Fiyat ve toplu fiyat düzenleme | ✓ | ✓ | — |
| SKU öneki ayarı | ✓ | — | — |
| Kullanıcı oluşturma, rol / durum düzenleme | ✓ | — | — |
| Başka kullanıcının parolasını sıfırlama | ✓ | — | — |
| Kendi parolasını değiştirme | ✓ | ✓ | ✓ |

Roller `src/permissions.js` dosyasında merkezi olarak tanımlıdır. Arayüz izin verilmeyen buton ve bölümleri göstermez; API her istekte veritabanındaki güncel kullanıcı ve rolü doğrular. İstemciden gönderilen rol bilgisi yetkilendirme için kullanılmaz.

Yönetici **Kullanıcılar ve yetkiler** ekranından hesap açar; varsayılan yeni kullanıcı rolü Görüntüleyicidir. Genel kullanıma açık kayıt yoktur. Yeni hesaplar ve yönetici tarafından parolası sıfırlanan hesaplar ilk girişte geçici parolayı değiştirmek zorundadır. Bu işlem tamamlanana kadar katalog ve yönetim API’leri erişime kapalıdır.

Rol değişikliği, pasifleştirme, e-posta değişikliği veya parola sıfırlama kullanıcının açık oturumlarını kapatır. Kişisel parola değişikliği diğer oturumları kapatır ve mevcut tarayıcıya yeni oturum verir. Kendi yönetici rolünü düşürmek / kendi hesabını pasifleştirmek engellenir; son aktif yönetici korunur. Kullanıcı güncellemeleri sürüm kontrolüyle yapılır.

## Yerel kurulum

Node.js 24 gereklidir.

```bash
npm install
npm run setup
npm run dev
```

İlk kurulumda `setup` e-posta ve gizli parola ister; scrypt parola özetini `.env` içine kaydeder. İlk açılışta bu bilgilerle veritabanında bir yönetici oluşturulur. Kullanıcı tablosu oluşturulduktan sonra ortam değişkenleri kullanıcı parolalarını değiştirmez; hesapları uygulama içinden yönetin. Parola unutulursa başka bir yönetici geçici parola atayabilir. E-posta ile otomatik parola kurtarma bu sürümde yoktur.

Vite’ın gösterdiği adresi açın. API `127.0.0.1:8787` üzerinde çalışır. Yerel veriler Git tarafından dışlanan `data/pm1864.sqlite` dosyasındadır. Parolalar ve `.env` GitHub’a yüklenmez.

```bash
npm test
npm run test:ui
npm run build
```

## Netlify kurulumu

Repository `sercanbasaran/pm1864`, branch `main`. `netlify.toml` build komutunu, `dist` ve Functions dizinini tanımlar. Otomatik platform yayını veya zamanlanmış fonksiyon tanımı bulunmaz.

Kalıcı PostgreSQL oluşturun ve Functions çalışma ortamında şu değişkenleri tanımlayın:

| Değişken | Değer |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantısı; sağlayıcının TLS ve bağlantı havuzu ayarlarını koruyun |
| `ADMIN_EMAIL` | İlk yönetici hesabının e-postası |
| `ADMIN_PASSWORD_HASH` | `npm run setup` ile üretilen `scrypt:…` değeri; dıştaki tırnaklar olmadan |
| `ADMIN_NAME` | İsteğe bağlı ilk yönetici adı |
| `APP_ORIGIN` | İsteğe bağlı kanonik uygulama adresi; sondaki `/` olmadan |

Bu değerlere `VITE_` öneki eklemeyin. `.env.example` örnek ayarları içerir. İlk yönetici oluşturulduktan sonra `ADMIN_*` alanları yalnızca boş veritabanının ilk kurulumu için kullanılır.

Gerekli veritabanı veya ilk hesap ayarları eksikse kurulum ekranı gösterilir. PostgreSQL hesabı ve Netlify ortam değişkenleri repo tarafından otomatik oluşturulmaz. Canlı PostgreSQL bağlantısı dağıtım ortamında ayrıca doğrulanmalıdır.

## Kayıt ve güvenlik modeli

Katalog, ayarlar ve işlem geçmişi sürümlenmiş SQL belgesinde saklanır. `app_users`, `app_sessions` ve `app_media` ayrı tablolardır. PostgreSQL satır kilidi / SQLite transaction’ı ve `expectedRevision` katalog değişikliklerini atomik tutar. Ürün ID’si ve SKU sunucuda üretilir; isim veya fiyat değişince mevcut SKU korunur. Kullanıcı güncellemeleri ayrıca `expectedVersion` kontrolü kullanır.

Parolalar scrypt ile özetlenir. Oturum token’larının yalnızca SHA-256 özeti saklanır. Cookie `HttpOnly`, `SameSite=Strict` ve HTTPS’te `Secure` kullanır; oturum sekiz saat geçerlidir. Oturumlar ve yetkiler her API isteğinde doğrulanır. Yazma isteklerinde origin kontrolü uygulanır. Giriş denemeleri için uygulama düzeyinde bekleme süresi uygulanmaz. Hesap / parola işlemleri işlem geçmişine yazılır; parolalar yazılmaz.

Önceki katalog kayıtları korunur. Eski platform alanları API yanıtlarından çıkarılır ve eski gönderim işleri çalıştırılmaz. Önceki frontend demosunun `localStorage` kayıtları otomatik aktarılmaz veya silinmez.

## Arayüz ve doğrulama

Referans: `https://hm1864.netlify.app/`. Kırmızı `#A50000`, altın `#CBA052`, siyah `#171512`, krem `#F8F5EF`, Avenir ve Phosphor Icons kullanılır. Logo / fontlar referans siteden yüklenir. Görseller medya kütüphanesinden seçilebilir veya harici URL olarak kaydedilebilir.

`npm test`: rol bazlı izinler, ilk giriş parola değişimi, kullanıcı / parola yönetimi, oturum iptali, eşzamanlılık, SKU, kategori / varyant doğrulama ve platform yollarının kaldırılmasını SQLite üzerinde test eder.

API ve yetki referansı: [docs/API.md](docs/API.md).

## Supabase / PostgreSQL bağlantı testi

Netlify Functions ortamına `DATABASE_URL` ekleyip deploy ettikten sonra `https://<site-adresi>/.netlify/functions/db-test` adresini açın. `postgres` paketiyle TLS üzerinden `SELECT NOW()` çalıştırır; başarı durumunda `{success: true, message: "Supabase bağlantısı başarılı!", time: "…"}` döner.

Bağlantı adresi eksikse 503, bağlantı başarısızsa 500, GET dışındaki isteklerde 405 döner. Veritabanı bağlantı adresi ve sürücünün ham hata mesajı istemciye gönderilmez. Bu endpoint yalnızca bağlantı testidir; ana uygulamanın oturum veya rol kontrollerini değiştirmez. Canlı bağlantının doğrulanması için Netlify ortamında gerçek `DATABASE_URL` gerekir.

## Çalışan ekranlar

- Genel bakış: gerçek kategori / varyant adetleri, eksik içerik listeleri ve son işlemler. Kartlar ilgili katalog filtresini açar.
- Katalog: kategori, durum, eksik görsel / açıklama filtreleri; ad ve fiyat sıralaması; `/` ile arama odağı; liste / kart görünümü; kategori, ürün ve varyant ekleme / güncelleme.
- Fiyat yönetimi: ürün varyant fiyatlarını ayrı API üzerinden düzenleme, filtreli toplu fiyat önizlemesi, kuruş hassasiyetinde kayıt ve CSV indirme.
- İşlem geçmişi: kullanıcı, metin ve İstanbul tarih aralığı filtreleri, sayfalama ve CSV.
- Bildirimler: taslak ve görseli eksik ürünlere bağlantılar; değerler güncel katalogdan hesaplanır.
- Hesabım: kalıcı profil adı ve parola güncelleme. Baş harfler hesap bilgilerinden üretilir.
- Yardım merkezi: aranabilir kullanım rehberi ve yetkiye uygun ekran bağlantıları.

Sabit demo fotoğrafları kullanılmaz. Görseli olmayan veya yüklenemeyen üründe açık bir yer tutucu gösterilir. Medya modülünden yüklenen dosyalar kalıcı PostgreSQL kaydında saklanır; harici HTTP(S) görsel URL’leri de desteklenir.

`npm run test:ui`, DOM ortamında gerçek uygulama API’sine bağlı giriş, kategori / ürün oluşturma, fiyat düzenleme, toplu önizleme, profil, bildirim, filtre, dışa aktarma ve görüntüleyici erişimi akışlarını doğrular. Üretim Supabase verileri testlerde kullanılmaz.

## Kategori ve varyant hiyerarşisi

Katalog yapısı **Ana kategori → Alt kategori → Ürün → Varyant** şeklindedir. Kategoriler ekranında ana kategori kartının içinden alt kategori eklenir. Ürün formu iki ayrı kategori seçimi kullanır; ürünler `categoryId` ile bir alt kategoriye bağlanır. Aynı alt kategori adı farklı ana kategorilerde kullanılabilir; kod ve bağlantı benzersizdir. Ana kategori veya alt kategori pasifse yeni ürün ataması yapılmaz. Üçüncü kategori seviyesi oluşturulamaz.

Varyant yönetimi ekranı kategori, alt kategori, ürün, aktiflik ve SKU araması sunar. Ürün seçip varyant ekleyebilir; mevcut varyantları düzenleyebilir, çoğaltabilir, sıralayabilir, pasifleştirebilir ve silebilirsiniz. Değişiklikler ürün düzenleyicisindeki **Değişiklikleri kaydet** ile birlikte kaydedilir. Son varyant silinemez; ürün başına en fazla 50 varyant vardır.

Her varyantın kalıcı `id` ve otomatik `sku` değeri bulunur (`HM-100-0001-V0001`). İsim, sıra veya kategori değişikliği mevcut ürün / varyant SKU’sunu değiştirmez. Silinen varyantın sıra numarası yeni varyantta tekrar kullanılmaz. Varyantlar aynı ürün içinde benzersiz adlandırılır.

Mevcut katalog ilk çalışmada sürüm 2 yapısına transaction içinde geçirilir: ana kategoriye doğrudan bağlı ürünler aynı ana kategorinin **Genel** alt kategorisine alınır; ürün, kullanıcı, fiyat ve SKU verileri korunur. Daha derin eski kategori yolları, kimlikler korunarak iki seviyeye indirilir; eski ara yol alt kategori adına yansır. Önceki API istemcilerinin kategori adıyla gönderdiği kayıtlar için Genel alt kategorisi uyumluluğu korunmuştur; yeni arayüz `categoryId` gönderir. Ek ortam değişkeni veya elle SQL kurulumu gerekmez.

## Modüler uygulama yapısı

Ana menü sırası: Kategori yönetimi → Ürün yönetimi → Varyant yönetimi → Ürün kodu ve SKU yönetimi → Kullanıcı yönetimi → Medya. Alt kategoriler Kategori yönetimi içinden eklenir. Genel bakış, fiyat, işlem geçmişi, hesap ve yardım araçları ayrı çalışma alanında kalır. Yetkisiz modüller menüde gösterilmez ve API erişimi sunucuda engellenir.

`src/main.jsx` yalnızca uygulamayı başlatır. `src/app/` uygulama çatısı, modül kaydı ve merkezi katalog durumunu; `src/components/` ortak bileşenleri; `src/modules/` iş alanlarına göre ekranları içerir. Modüller ayrı JavaScript parçaları olarak gerektiğinde yüklenir. Teknik rehber: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Ürün kodu (`P000001`), ürün SKU’su ve varyant SKU’su ayrı alanlardır. Kod modülü arama, listeleme, CSV ve yeni ürünler için SKU öneki yönetimi sunar; mevcut kodlar değişmez.

Medya modülü gerçek dosya yükleme, önizleme, yeniden adlandırma, arama, ürüne bağlama ve kullanılmayan dosyayı onayla silme işlemleri içerir. PNG / JPEG / WEBP / GIF, en fazla 2 MB desteklenir. Dosyalar `app_media` tablosunda saklanır; katalog yalnızca medya kimliği ve URL’sini taşır. Görsel içeriği yetkili oturumla okunur. Yönetici ve editör yükleyebilir / düzenleyebilir; görüntüleyici okuyabilir. Kullanımdaki dosya sunucuda da silinemez. Yeni ortam değişkeni gerekmez; tablo uygulama açılışında oluşturulur.

### Material UI arayüzü

Arayüz, React için Material UI ve Emotion kullanır. Marka renkleri, tipografi ve ortak bileşen ayarları `src/theme/MaterialTheme.jsx` içinde tanımlıdır. Menü ve üst çubuk Drawer/AppBar, pencereler Dialog, tablolamalar Table, durumlar Chip, bildirimler Snackbar/Alert bileşenleriyle çalışır. Modüllerdeki ortak düğme, giriş, seçim ve tablo bileşenleri `src/components/ui/Material.jsx` üzerinden yönetilir. `src/material.css`, modül yerleşimlerini Material tema ile uyumlu hale getirir. Bu değişiklik ek ortam değişkeni veya veritabanı geçişi gerektirmez.

### Ürün ve varyant satış kanalları

Ürün ve varyant formlarındaki Material UI anahtarları mağaza, online ve yemek sipariş platformu satışını ayrı ayrı yönetir. Ürün kanal tercihi, varyant kanal tercihi, ürünün aktif durumu ve varyantın aktif durumu birlikte değerlendirilir. Üründe kapalı bir kanal bütün varyantlarda kapalıdır; yeniden açıldığında varyant tercihleri korunur. Kanal bilgisi bulunmayan ürünler kapalı başlar; varyant tercihleri varsayılan olarak ürünü takip eder. API katalog yanıtında `salesAvailability` tercihler, `effectiveSales` ise geçerli satış durumudur. Eski istemciler bu alanları göndermediğinde mevcut tercihler korunur. İşlemler mevcut ürün düzenleme yetkisini ve katalog sürüm kontrolünü kullanır. Bu ayarlar dış platform entegrasyonu veya otomatik yayınlama yapmaz; ek ortam değişkeni veya SQL geçişi gerekmez.
