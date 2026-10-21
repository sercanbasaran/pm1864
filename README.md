# pm1864 — Hafız Mustafa 1864 ürün yönetimi

React arayüzü, Node.js API, yönetici oturumu, kalıcı katalog ve platform gönderim kuyruğu. Netlify’da frontend + Functions olarak çalışır.

## Yerel kurulum

Node.js 24 gereklidir.

```bash
npm install
npm run setup
npm run dev
```

`setup` e-posta ve gizli parola ister; yalnızca scrypt parola özetini `.env` içine kaydeder. Parolayı kod, komut satırı argümanı veya GitHub’a yazmayın. Vite’ın gösterdiği adresi açın. API `127.0.0.1:8787` üzerinde çalışır. Yerel veriler Git tarafından dışlanan `data/pm1864.sqlite` dosyasındadır.

```bash
npm test
npm run build
```

## Netlify kurulumu

Repository `sercanbasaran/pm1864`, branch `main`. `netlify.toml` build komutunu, `dist` dizinini ve Functions dizinini tanımlar.

1. Kalıcı bir PostgreSQL veritabanı oluşturun. Serverless kullanım için sağlayıcının **pooled connection URL** adresini tercih edin; sağlayıcının TLS ayarlarını koruyun. Üretimde SQLite kullanılmaz.
2. Netlify proje ortam değişkenlerine aşağıdakileri ekleyin ve yeniden deploy edin:

| Değişken | Değer |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı adresi; sunucu sırrıdır |
| `ADMIN_EMAIL` | Yönetici giriş e-postası |
| `ADMIN_PASSWORD_HASH` | `npm run setup` sonrası yerel `.env` içindeki `scrypt:…` değeri; çevreleyen çift tırnakları kaldırın |
| `APP_ORIGIN` | İsteğe bağlı, ör. `https://siteniz.netlify.app`; sondaki `/` olmadan. Boşsa isteğin origin’i kullanılır |

Bu değerler Functions çalışma ortamında erişilebilir olmalıdır; `VITE_` öneki eklemeyin. Örnek değişken listesi `.env.example` içindedir. `.env` dosyasını yüklemeyin.

3. `/api/health` ile API/veritabanı erişimini kontrol edin. Yönetici girişi sonrası kategoriler ve ürünler sunucudan yüklenir.

Gerekli ayarlar yoksa uygulama **Sunucu kurulumu gerekli** ekranı gösterir. PostgreSQL hesabı veya Netlify ortam değişkenleri bu repository tarafından otomatik oluşturulmaz. Kaynak kodun GitHub’a yüklenmesi, canlı veritabanının hazırlanmış olduğu anlamına gelmez.

## Veri ve eşzamanlılık

İlk açılışta beş başlangıç kategorisi oluşturulur; ürün kataloğu boştur. Önceki frontend demosundaki `localStorage` ürünleri otomatik olarak sunucuya aktarılmaz veya silinmez.

Katalog, ayarlar, iş kuyruğu ve denetim kayıtları sürümlenmiş bir SQL katalog belgesinde saklanır. Bu ilk sürüm, küçük / orta hacimli bir merkez katalog için tasarlanmıştır. PostgreSQL satır kilidi veya SQLite transaction’ı değişiklikleri atomik tutar. `expectedRevision` kontrolü eşzamanlı düzenlemelerde veri kaybını önler. Çakışma durumunda arayüz verileri yeniler; açık formu kontrol edip yeniden kaydedin.

Ürün ID’si ve SKU sunucuda üretilir. Ürün / kategori adı veya fiyat değiştiğinde mevcut SKU korunur. Varyantlar ürünle birlikte atomik olarak kaydedilir. Kategori kodu, isim ve bağlantı adı benzersizdir; üst kategori döngüleri reddedilir.

Oturumlar ayrı SQL tablosunda, rastgele token’ın yalnızca SHA-256 özeti ile tutulur. Cookie `HttpOnly`, `SameSite=Strict` ve HTTPS’te `Secure` kullanır; sekiz saat geçerlidir. Çıkış oturumu sunucuda iptal eder. Değişiklik isteklerinde origin doğrulanır. Giriş denemeleri IP bazında veritabanında sınırlandırılır. Bu sürüm tek yönetici hesabı kullanır; rol / ekip yönetimi içermez.

## Platform yayınları

Manuel yayın ve otomatik yayın aynı kalıcı kuyruğu kullanır. Her ürün / platform / sürüm için ayrı iş oluşur. Netlify Scheduled Function dakikada bir en fazla iki işi işler; yerelde worker 30 saniyede bir çalışır. Platformlar ekranında **Kuyruğu işle** ile manuel çalıştırma da vardır.

Gerçek platform API sözleşmeleri ve hesap anahtarları sağlanmadığı için dört kanal için **webhook adaptör sözleşmesi** hazırlanmıştır; bu kod doğrudan Ticimax, Trendyol, Yemeksepeti veya FineDine API entegrasyonu iddia etmez. O platformun API’sine dönüştürme yapan kendi adaptörünüz gerekir.

| Kanal | Webhook ortam değişkenleri |
|---|---|
| Online Mağaza | `SYNC_ONLINE_URL`, `SYNC_ONLINE_TOKEN` |
| Trendyol | `SYNC_TRENDYOL_URL`, `SYNC_TRENDYOL_TOKEN` |
| Yemeksepeti | `SYNC_YEMEKSEPETI_URL`, `SYNC_YEMEKSEPETI_TOKEN` |
| FineDine | `SYNC_FINEDINE_URL`, `SYNC_FINEDINE_TOKEN` |

Webhook URL’si HTTPS olmalıdır. İstek `Authorization: Bearer <token>` ve değişmeyen `Idempotency-Key: <jobId>` başlıklarını taşır. Alıcı, aynı anahtarın tekrarlarını tek işlem olarak ele almalı ve işlemi kalıcı kabul ettikten sonra 2xx dönmelidir. Gövde örneği `docs/API.md` içindedir.

Bağlantısı olmayan kanal `blocked` olur; ürün güncel kabul edilmez. Geçici ağ, 429 ve 5xx hatalarında en fazla üç deneme yapılır. Başarılı gönderim yalnızca ilgili kanalın **aynı ürün sürümünü** güncel işaretler. Eski sürüm gönderimi, daha yeni düzenlemeyi güncel göstermez. `failed` / `blocked` işler arayüzden yeniden denenebilir. Worker lease’i, çakışan çalıştırmalarda aynı işin eşzamanlı gönderilmesini önler; lease süresi aşılırsa güvenli tekrar için alıcının idempotency desteği gerekir.

Yalnızca simülasyon isteniyorsa `SYNC_MODE=demo` açıkça tanımlanabilir. Sonuçlar arayüz ve işlem geçmişinde demo olarak etiketlenir. Varsayılan mod `webhook`tur.

## Arayüz

`https://hm1864.netlify.app/` referans alınarak `#A50000`, `#CBA052`, `#171512`, `#F8F5EF`, Avenir tipografisi ve köşeli bileşenler kullanılır. Logo / fontlar referans siteden yüklenir; erişim yoksa sistem fontlarına geçilir. İkonlar Phosphor Icons paketindendir. Görseller bu sürümde URL olarak kaydedilir; dosya yükleme ve medya depolama içermez.

## Doğrulama

`npm test` kategori doğrulaması, oturum / çıkış, giriş sınırı, origin kontrolü, sunucu SKU’su, eşzamanlı yazma çakışması, atomik fiyat değişimi, verinin yeniden başlatmada korunması, kuyruk engelleme / yeniden deneme ve eski sürüm gönderimi senaryolarını SQLite üzerinde doğrular. PostgreSQL adapter’ı eklenmiştir; canlı PostgreSQL bağlantısı ayrıca dağıtım ortamında test edilmelidir.

API referansı: [docs/API.md](docs/API.md).
