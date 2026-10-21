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

Katalog, ayarlar ve işlem geçmişi sürümlenmiş SQL belgesinde saklanır. `app_users`, `app_sessions` ve `app_login_limits` ayrı tablolardır. PostgreSQL satır kilidi / SQLite transaction’ı ve `expectedRevision` katalog değişikliklerini atomik tutar. Ürün ID’si ve SKU sunucuda üretilir; isim veya fiyat değişince mevcut SKU korunur. Kullanıcı güncellemeleri ayrıca `expectedVersion` kontrolü kullanır.

Parolalar scrypt ile özetlenir. Oturum token’larının yalnızca SHA-256 özeti saklanır. Cookie `HttpOnly`, `SameSite=Strict` ve HTTPS’te `Secure` kullanır; oturum sekiz saat geçerlidir. Oturumlar ve yetkiler her API isteğinde doğrulanır. Yazma isteklerinde origin kontrolü, girişte IP bazlı deneme sınırı uygulanır. Hesap / parola işlemleri işlem geçmişine yazılır; parolalar yazılmaz.

Önceki katalog kayıtları korunur. Eski platform alanları API yanıtlarından çıkarılır ve eski gönderim işleri çalıştırılmaz. Önceki frontend demosunun `localStorage` kayıtları otomatik aktarılmaz veya silinmez.

## Arayüz ve doğrulama

Referans: `https://hm1864.netlify.app/`. Kırmızı `#A50000`, altın `#CBA052`, siyah `#171512`, krem `#F8F5EF`, Avenir ve Phosphor Icons kullanılır. Logo / fontlar referans siteden yüklenir. Görseller URL olarak kaydedilir.

`npm test`: rol bazlı izinler, ilk giriş parola değişimi, kullanıcı / parola yönetimi, oturum iptali, eşzamanlılık, SKU, kategori / varyant doğrulama ve platform yollarının kaldırılmasını SQLite üzerinde test eder.

API ve yetki referansı: [docs/API.md](docs/API.md).
