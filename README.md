# pm1864 — Ürün ve ekip yönetimi

Hafız Mustafa 1864 için React + Node.js katalog yönetimi. İlk etapta kategori, ürün, varyant, fiyat, kullanıcı ve yetki yönetimi bulunur. Platform bağlantıları, yayın adımları, gönderim kuyruğu ve zamanlanmış gönderim görevleri bu sürümden kaldırılmıştır. Uygulama dış platformlara veri göndermez.

## Roller ve yetkiler

| İşlem | Yönetici | Editör | Görüntüleyici |
|---|---|---|---|
| Katalog, kategori ve işlem geçmişini görüntüleme | ✓ | ✓ | ✓ |
| Kategori ekleme / düzenleme | ✓ | ✓ | — |
| Ürün / varyant ekleme / düzenleme | ✓ | ✓ | — |
| Fiyat ve toplu fiyat düzenleme | ✓ | ✓ | — |
| Kodlama düzeni görüntüleme | ✓ | — | — |
| Kullanıcı oluşturma, rol / durum düzenleme | ✓ | — | — |
| Başka kullanıcının parolasını sıfırlama | ✓ | — | — |
| Kendi parolasını değiştirme | ✓ | ✓ | ✓ |

Roller `src/permissions.js` dosyasında merkezi olarak tanımlıdır. Arayüz izin verilmeyen buton ve bölümleri göstermez; API her istekte veritabanındaki güncel kullanıcı ve rolü doğrular. İstemciden gönderilen rol bilgisi yetkilendirme için kullanılmaz.

Yönetici **Kullanıcılar ve yetkiler** ekranından hesap açar; varsayılan yeni kullanıcı rolü Görüntüleyicidir. Genel kullanıma açık kayıt yoktur. Yeni hesaplar ve yönetici tarafından parolası sıfırlanan hesaplar ilk girişte geçici parolayı değiştirmek zorundadır. Bu işlem tamamlanana kadar katalog ve yönetim API’leri erişime kapalıdır.

Rol değişikliği, pasifleştirme, e-posta değişikliği veya parola sıfırlama kullanıcının açık oturumlarını kapatır. Kişisel parola değişikliği diğer oturumları kapatır ve mevcut tarayıcıya yeni oturum verir. Kendi yönetici rolünü düşürmek / kendi hesabını pasifleştirmek engellenir; son aktif yönetici korunur. Kullanıcı güncellemeleri sürüm kontrolüyle yapılır.

## Görünüm ve yönetim listeleri

Kategori ve ürün yönetimi ortak özet kartları ve varsayılan tablo görünümü kullanır. Ürün özetinde toplam, aktif ve taslak ürün sayıları ile toplam varyant sayısı görünür; arama ve filtreler bu genel sayaçları değiştirmez. Kart görünümü, dışa aktarım ve toplu fiyat güncelleme kullanılabilir.

**Profil menüsü → Hesabım → Görünüm ayarları** bölümünden açık veya koyu tema seçip **Tema tercihini kaydet** butonuna basın. Tercih hesaba kaydedilir ve sonraki oturumlarda / farklı cihazlarda uygulanır. Shoelace açık / koyu renkleri kullanılır; birincil renk `#DA291C` olarak korunur. Üst menü, yan menü ve mobil menü seçilen temanın renklerine uyum sağlar. Mevcut kullanıcılar varsayılan açık temayla devam eder. Veritabanı alanı uygulama başlangıcında otomatik eklenir; yeni ortam değişkeni gerekmez.

## Profil fotoğrafı

**Profil menüsü → Hesabım → Profil fotoğrafı** alanından fotoğraf yükleyebilir, değiştirebilir veya kaldırabilirsiniz. PNG, JPEG, WEBP ve GIF, en fazla 2 MB desteklenir. Seçim doğrudan hesaba kaydedilir ve profil menüsündeki avatar güncellenir. Fotoğraf yoksa veya yüklenemezse baş harfler gösterilir.

Fotoğraflar ürün medya kütüphanesinden ayrı, kalıcı veritabanı kaydında tutulur ve yalnızca fotoğrafın sahibinin oturumuyla okunur. Mevcut kullanıcılar korunur; tablo ve sürüm alanı uygulama başlangıcında otomatik eklenir. Ek ortam değişkeni gerekmez.

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

Arayüz Shoelace’in standart light temasını kullanır. Tek marka özelleştirmesi primary `#DA291C` ve bu rengin primary tonlarıdır. Yazı tipi, bileşen boyutları, kenarlıklar, gölgeler, hover ve animasyonlar Shoelace varsayılanlarıdır. İkonlarda Phosphor Icons korunur. Görseller medya kütüphanesinden seçilebilir veya harici URL olarak kaydedilebilir.

`npm test`: rol bazlı izinler, ilk giriş parola değişimi, kullanıcı / parola yönetimi, oturum iptali, eşzamanlılık, SKU, kategori / varyant doğrulama ve platform yollarının kaldırılmasını SQLite üzerinde test eder.

API ve yetki referansı: [docs/API.md](docs/API.md).

## Supabase / PostgreSQL bağlantı testi

Netlify Functions ortamına `DATABASE_URL` ekleyip deploy ettikten sonra `https://<site-adresi>/.netlify/functions/db-test` adresini açın. `postgres` paketiyle TLS üzerinden `SELECT NOW()` çalıştırır; başarı durumunda `{success: true, message: "Supabase bağlantısı başarılı!", time: "…"}` döner.

Bağlantı adresi eksikse 503, bağlantı başarısızsa 500, GET dışındaki isteklerde 405 döner. Veritabanı bağlantı adresi ve sürücünün ham hata mesajı istemciye gönderilmez. Bu endpoint yalnızca bağlantı testidir; ana uygulamanın oturum veya rol kontrollerini değiştirmez. Canlı bağlantının doğrulanması için Netlify ortamında gerçek `DATABASE_URL` gerekir.

## Çalışan ekranlar

- Genel bakış: gerçek kategori / varyant adetleri, eksik içerik listeleri ve son işlemler. Kartlar ilgili katalog filtresini açar.
- Katalog: kategori, durum, eksik görsel / açıklama filtreleri; ad ve fiyat sıralaması; `/` ile arama odağı; liste / kart görünümü; kategori, ürün ve varyant ekleme / güncelleme.
- Fiyat yönetimi: ürün varyant fiyatlarını ayrı API üzerinden düzenleme, filtreli toplu fiyat önizlemesi, kuruş hassasiyetinde kayıt ve CSV indirme.
- Profil menüsü → Ayarlar → İşlem geçmişi: kullanıcı, metin ve İstanbul tarih aralığı filtreleri, sayfalama ve CSV. Genel bakış, sidebar’daki ilk bağlantıdır.
- Bildirimler: taslak ve görseli eksik ürünlere bağlantılar; değerler güncel katalogdan hesaplanır.
- Hesabım: kalıcı profil adı ve parola güncelleme. Baş harfler hesap bilgilerinden üretilir.
- Yardım merkezi: aranabilir kullanım rehberi ve yetkiye uygun ekran bağlantıları.

Sabit demo fotoğrafları kullanılmaz. Görseli olmayan veya yüklenemeyen üründe açık bir yer tutucu gösterilir. Medya modülünden yüklenen dosyalar kalıcı PostgreSQL kaydında saklanır; harici HTTP(S) görsel URL’leri de desteklenir.

`npm run test:ui`, DOM ortamında gerçek uygulama API’sine bağlı giriş, kategori / ürün oluşturma, fiyat düzenleme, toplu önizleme, profil, bildirim, filtre, dışa aktarma ve görüntüleyici erişimi akışlarını doğrular. Üretim Supabase verileri testlerde kullanılmaz.

## Varyant tipleri

**Varyant yönetimi → Varyant tipleri** alanından yönetici ve editörler tip ekleyip kaldırabilir. Başlangıç tipleri Adet, Dilim, Porsiyon, Kutu ve Gramaj'dır. Aktif veya pasif bir varyantta kullanılan tip kaldırılamaz; önce o varyantların tiplerini değiştirin. Tipler katalog sürümü ve işlem geçmişiyle kalıcı saklanır.

Ürün ekleme ve düzenlemede **her varyant için Varyant tipi seçimi zorunludur**. Yeni varyantta seçim boş başlar. Dilim tipi seçildiğinde **Dilim adedi** alanına 1–100.000 arasında tam sayı girilmelidir. Aynı kural API'de de uygulanır. Birim ve ambalaj alanları ayrı kalır; örneğin Dilim tipi bir varyantın satış birimi Kutu olabilir.

Mevcut katalog ilk açılışta kayıpsız güncellenir: dilim sayısı pozitif varyantlar Dilim, diğerleri Adet tipiyle eşleşir. Ürün/varyant kimlikleri, SKU, fiyat, dilim sayıları ve kullanıcılar korunur. Ek ortam değişkeni veya elle SQL işlemi gerekmez. Varyant tipi listeleme, filtreleme, CSV ve public ürün kartında gösterilir.

## Kategori ve varyant hiyerarşisi

Katalog yapısı **Ana kategori → Alt kategori → Ürün → Varyant** şeklindedir. Kategoriler ekranında ana kategori kartının içinden alt kategori eklenir. Ürün formu iki ayrı kategori seçimi kullanır; ürünler `categoryId` ile bir alt kategoriye bağlanır. Aynı alt kategori adı farklı ana kategorilerde kullanılabilir; kod ve bağlantı benzersizdir. Ana kategori veya alt kategori pasifse yeni ürün ataması yapılmaz. Üçüncü kategori seviyesi oluşturulamaz.

Varyant yönetimi ekranı kategori, alt kategori, ürün, aktiflik ve SKU araması sunar. Ürün seçip varyant ekleyebilir; mevcut varyantları düzenleyebilir, çoğaltabilir, sıralayabilir, pasifleştirebilir ve silebilirsiniz. Değişiklikler ürün düzenleyicisindeki **Değişiklikleri kaydet** ile birlikte kaydedilir. Son varyant silinemez; ürün başına en fazla 50 varyant vardır.

Her varyantın kalıcı `id` ve otomatik `sku` değeri bulunur (`100.101001.01`). İsim, sıra veya kategori değişikliği mevcut ürün / varyant SKU’sunu değiştirmez. Silinen varyantın sıra numarası yeni varyantta tekrar kullanılmaz. Varyantlar aynı ürün içinde benzersiz adlandırılır.

Mevcut katalog ilk çalışmada sürüm 2 yapısına transaction içinde geçirilir: ana kategoriye doğrudan bağlı ürünler aynı ana kategorinin **Genel** alt kategorisine alınır; ürün, kullanıcı, fiyat ve SKU verileri korunur. Daha derin eski kategori yolları, kimlikler korunarak iki seviyeye indirilir; eski ara yol alt kategori adına yansır. Önceki API istemcilerinin kategori adıyla gönderdiği kayıtlar için Genel alt kategorisi uyumluluğu korunmuştur; yeni arayüz `categoryId` gönderir. Ek ortam değişkeni veya elle SQL kurulumu gerekmez.

## Modüler uygulama yapısı

Ana menü sırası: Kategori yönetimi → Ürün yönetimi → Varyant yönetimi → Ürün kodu ve SKU yönetimi → Kullanıcı yönetimi → Medya. Alt kategoriler Kategori yönetimi içinden eklenir. Genel bakış, fiyat, işlem geçmişi, hesap ve yardım araçları ayrı çalışma alanında kalır. Yetkisiz modüller menüde gösterilmez ve API erişimi sunucuda engellenir.

`src/main.jsx` yalnızca uygulamayı başlatır. `src/app/` uygulama çatısı, modül kaydı ve merkezi katalog durumunu; `src/components/` ortak bileşenleri; `src/modules/` iş alanlarına göre ekranları içerir. Modüller ayrı JavaScript parçaları olarak gerektiğinde yüklenir. Teknik rehber: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Ürün kodu (`001`), ürün SKU’su (`100.101001`) ve varyant SKU’su (`100.101001.01`) ayrı alanlardır. Kod modülü arama, listeleme ve CSV sunar. Kalıcı QR kimliği ayrı tutulur.

Medya modülü gerçek dosya yükleme, önizleme, yeniden adlandırma, arama, ürüne bağlama ve kullanılmayan dosyayı onayla silme işlemleri içerir. PNG / JPEG / WEBP / GIF, en fazla 2 MB desteklenir. Dosyalar `app_media` tablosunda saklanır; katalog yalnızca medya kimliği ve URL’sini taşır. Görsel içeriği yetkili oturumla okunur. Yönetici ve editör yükleyebilir / düzenleyebilir; görüntüleyici okuyabilir. Kullanımdaki dosya sunucuda da silinemez. Yeni ortam değişkeni gerekmez; tablo uygulama açılışında oluşturulur.

### Shoelace arayüzü

Arayüz bileşenleri Shoelace 2.20.1 ile çalışır. Yalnızca primary renk sistemi `src/theme/primary.css` içinde #DA291C temelinde tanımlanır. `src/layout.css` sayfa yerleşimini ve Shoelace’in sunmadığı semantik tabloları düzenler; bileşenlerin durum stillerini korur; gerektiğinde metin sarmalama ve ölçülendirme için layout part’larını kullanır. Önceki marka CSS dosyaları kaldırılmıştır. React bileşenleri düğme, giriş, seçim, metin alanı, checkbox, switch, kart, menü, diyalog, mobil çekmece, uyarı, etiket, tooltip ve accordion için Shoelace kullanır. Veri tabloları semantik HTML ile sunulur. Ortak kontroller src/components/ui/Controls.jsx içindedir. Tema ve Türkçe yerelleştirme src/theme/ShoelaceTheme.jsx üzerinden yüklenir.

Shoelace paketinin sürümü sabittir; resmi proje aktif geliştirmeyi sonlandırmıştır. Geçiş, kullanıcının Shoelace tercihi doğrultusunda yapılmıştır. Kontrol ikonları build sırasında yerel public/shoelace/assets klasörüne kopyalanır; Netlify dağıtımında CDN gerektirmez. npm install ve npm run build yeterlidir; ek ortam değişkeni veya veritabanı geçişi yoktur.

Arayüz testleri Shadow DOM sorguları ve gerçek API kullanır. Vitest, @lit/react paketinin browser sürümünü seçer; Node sürümü arayüzdeki özellikleri ve olayları bağlamadığından jsdom testlerine uygun değildir.

### Ürün ve varyant satış kanalları

Ürün ve varyant formlarındaki Shoelace anahtarları mağaza, online ve yemek sipariş platformu satışını ayrı ayrı yönetir. Ürün kanal tercihi, varyant kanal tercihi, ürünün aktif durumu ve varyantın aktif durumu birlikte değerlendirilir. Üründe kapalı bir kanal bütün varyantlarda kapalıdır; yeniden açıldığında varyant tercihleri korunur. Kanal bilgisi bulunmayan ürünler kapalı başlar; varyant tercihleri varsayılan olarak ürünü takip eder. API katalog yanıtında `salesAvailability` tercihler, `effectiveSales` ise geçerli satış durumudur. Eski istemciler bu alanları göndermediğinde mevcut tercihler korunur. İşlemler mevcut ürün düzenleme yetkisini ve katalog sürüm kontrolünü kullanır. Bu ayarlar dış platform entegrasyonu veya otomatik yayınlama yapmaz; ek ortam değişkeni veya SQL geçişi gerekmez.

### Tam sayfa kayıt işlemleri

Ürün, varyant, kategori, alt kategori ve kullanıcı ekleme/düzenleme işlemleri yönetim alanı içinde ayrı sayfalarda açılır. Örnek adresler `#products/new`, `#products/1/edit`, `#categories/new` ve `#users/new` biçimindedir. Mevcut kayıtların bağlantıları sayfa yenilendiğinde tekrar açılır. Listeye dön ve Vazgeç ilgili listeye döner; Kaydet başarılı olduğunda da liste açılır. Kaydetme başarısızsa taslak ve hata mesajı sayfada kalır. Üst ve alt aksiyonlar aynı formu kullanır. Netlify yönlendirmeleri, veritabanı ve ortam değişkenleri için ek ayar gerekmez.

## Ürün kartı ve QR kullanımı

1. **Ürün yönetimi** listesindeki ürünün QR ikonuna veya kart görünümündeki **Ürün kartı ve QR** düğmesine tıklayın.
2. Kart önizlemesinde görsel, açıklama, aktif varyantların fiyat/gramaj/birim/ambalaj bilgileri ve girilmiş besin/alerjen/saklama alanlarını kontrol edin.
3. Yönetici veya editör hesabıyla **Ürün kartını yayınla** anahtarını açın. Ürün ve kategoriler aktif, en az bir varyant aktif olmalıdır. Kartlar başlangıçta yayınlanmaz.
4. Bağlantıyı kopyalayın veya **QR kodu indir** ile PNG indirin. Okutulduğunda `/p/P000001` gibi bir public adres açılır; giriş gerekmez. Adres, QR oluşturduğunuz ortamın alan adını kullanır; basılı kullanım için production adresinden indirin.

Ürün güncellemeleri aynı QR bağlantısına yansır. Anahtarı kapatmak public kartı ve bağlı görselini erişime kapatır. Taslak ürünler, pasif kategoriler ve aktif varyantı olmayan ürünler gösterilmez. Public sayfa kullanıcı/işlem geçmişi gibi yönetim verilerini paylaşmaz. Netlify’da `/p/*` yönlendirmesi tanımlıdır; ek ortam değişkeni veya manuel SQL kurulumu gerekmez. Bağlantının çalışması için güncel frontend ve API birlikte deploy edilmelidir.



## Ana modül ve alt modül mimarisi

Navigasyon tanımları `src/app/modules.js` içindedir. `moduleGroups` ana modülleri ve alt modül kimliklerini, `modules` ise yetki ve yönlendirme kayıtlarını tutar. Ekran ve düzenleme bağlantılarının mevcut kimlikleri korunmuştur (`#products`, `#products/:id/edit`, `#categories`, `#variants`, `#prices`). Ana modül sayfaları `#product-management`, `#sales-management`, `#channel-management` adreslerindedir.

| Ana modül | Alt modüller |
| --- | --- |
| Ürün yönetimi | Kategori yönetimi, Ürün yönetimi, Varyant yönetimi |
| Satış yönetimi | Fiyat yönetimi, Satış grupları, Menü |
| Kanal yönetimi | Mağaza, E-Mağaza, Sipariş Platformları |
| Sistem Ayarları | Ürün kodu ve SKU yönetimi, Para birimleri, Diller |
| Kullanıcı Yönetimi | Kullanıcılar, Kullanıcı rolleri |
| Kütüphane | Görseller, Dokümanlar |

Genel bakış en üsttedir. Kullanıcı ve görsel ekranları kendi ana modüllerinin altındadır. Profil, yardım, ayarlar ve işlem geçmişi profil menüsünde kalır. Masaüstü ve mobil menüler aynı kayıtları ve izin denetimini kullanır. Aktif ekranın ana modülü otomatik açılır; modül yolu ana modüle dönüş sağlar.

Kategori, ürün, varyant, kod/SKU ve fiyat ekranları mevcut API'leri kullanır. Satış grupları, menü ve kanal alt modülleri bu aşamada yalnızca mimari sayfalardır; arayüzde “Hazırlık aşamasında” olarak belirtilir. Bu alanlara ait kalıcı veri modeli, kayıt işlemleri veya platform bağlantısı henüz eklenmemiştir. Sahte kayıt veya otomatik platform yayını yapılmaz. Yeni işlev eklerken ekranın yanı sıra sunucu yetkisi ve kalıcı veri modeli de uygulanmalıdır.


Sistem Ayarları (`#system-settings`), Kullanıcı Yönetimi (`#user-management`) ve Kütüphane (`#library`) ana modülleri eklendi. Eski `#codes`, `#users`, `#users/:id/edit` ve `#media` bağlantıları korunur; `#media` artık Görseller ekranını açar. Profil menüsündeki Ayarlar/işlem geçmişi (`#settings`), Sistem Ayarları'ndan ayrıdır. Kullanıcılar ve Kullanıcı rolleri (`#user-roles`) yalnızca `users.manage` yetkisine sahiplere görünür. Rol tablosu, mevcut merkezi rol tanımlarını gösterir; rol ekleme veya yetki değiştirme işlemi sunmaz. Para birimleri (`#currencies`) ve Diller (`#languages`) `settings.write` izniyle görüntülenen hazırlık sayfalarıdır; henüz para dönüşümü veya çeviri ayarı uygulamaz. Dokümanlar (`#documents`) hazırlık sayfasıdır; belge yükleme henüz devrede değildir. Görsel yükleme, düzenleme ve silme mevcut medya API'si ve izinleriyle çalışır.


## Güncel SKU düzeni

Varyant gösterimi **000.000000.00**: kategori (3), alt kategori (3), ürün (3), varyant (2) rakam. Örnek **100.101001.01**. Veritabanında sabit `HM` önekiyle saklanır; ekranlar ve CSV öneksizdir. Önek değiştirme alanı kaldırılmıştır. Ürün numarası alt kategori içinde, varyant numarası ürün içinde artar. Mevcut katalog otomatik geçirilir; eski kodlar belge içinde yedeklenir, kayıt kimlikleri ve QR adresleri korunur. [Geçiş, sınırlar ve ayrıntılar](docs/SKU_PATTERN.md).
