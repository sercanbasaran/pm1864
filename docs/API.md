# API ve erişim modeli

API kökü `/api`. Yanıtlar JSON ve `Cache-Control: no-store` kullanır. Yazma istekleri aynı origin’den `Content-Type: application/json` ile gönderilir. Sunucu rolü her istekte veritabanından okur; istemciden gelen role güvenmez.

| Metot | Yol | Yetki / gövde |
|---|---|---|
| GET | `/health` | Açık; API / veritabanı durumu |
| POST | `/login` | Açık; `{email,password}` |
| GET | `/session` | Oturum; `{user}` |
| POST | `/logout` | Oturum; `{}` |
| PATCH | `/preferences` | Oturum; `{expectedVersion,theme:"light" veya "dark"}`; yalnızca kendi görünüm tercihi |
| GET | `/profile/avatar` | Oturum; yalnızca kendi fotoğrafı, özel / önbelleksiz görsel yanıtı |
| PUT | `/profile/avatar` | Oturum; `{expectedVersion,mimeType,data}`; base64 PNG/JPEG/WEBP/GIF, en fazla 2 MB |
| DELETE | `/profile/avatar` | Oturum; `{expectedVersion}`; kendi fotoğrafını kaldırır |
| PATCH | `/profile` | Oturum; `{expectedVersion,name}`; yalnızca kendi profil adı |
| POST | `/password` | Oturum; `{currentPassword,newPassword}` |
| GET | `/catalog` | `catalog.read`; `{catalog}` |
| POST | `/categories` | `categories.write`; `{expectedRevision,category}` |
| PUT | `/categories/:id` | `categories.write`; `{expectedRevision,category}` |
| POST | `/variant-types` | `products.write`; `{expectedRevision,name}`; benzersiz 1–50 karakter ad |
| DELETE | `/variant-types/:id` | `products.write`; `{expectedRevision}`; kullanımda ise `409 VARIANT_TYPE_IN_USE` |
| POST | `/products` | `products.write`; `{expectedRevision,product}` |
| PUT | `/products/:id` | `products.write`; `{expectedRevision,product}` |
| PATCH | `/products/:id/card` | `products.write`; `{expectedRevision,enabled:boolean}` |
| GET | `/public/products/:productCode` | Açık; yalnızca yayınlanmış ürün kartı, `{product}` |
| GET | `/public/products/:productCode/image` | Açık; yalnızca yayınlanmış ürüne bağlı görsel baytları |
| PATCH | `/prices/products/:id` | `prices.write`; `{expectedRevision,prices:[123.45,234.56]}`; varyant sırasına göre tüm fiyatlar |
| POST | `/prices/bulk` | `prices.write`; `{expectedRevision,ids,percent,direction}` |
| PATCH | `/settings` | `settings.write`; sabit önek doğrulaması: `{expectedRevision,settings:{skuPrefix:"HM"}}`; başka önekler reddedilir |
| GET | `/users` | `users.manage`; `{users,roles}` |
| POST | `/users` | `users.manage`; `{user:{name,email,role,active,password}}` |
| PUT | `/users/:id` | `users.manage`; `{expectedVersion,user:{name,email,role,active}}` |
| POST | `/users/:id/password` | `users.manage`; `{expectedVersion,password}` |

Rol kimlikleri: `admin`, `editor`, `viewer`. Kullanıcı oluşturma 201 döner. Kullanıcı listesi / yanıtı parola veya parola özeti içermez. Yeni kullanıcı ve yönetici parola sıfırlaması `mustChangePassword: true` döndürür. Bu durumda yalnızca session, logout ve password yolları kullanılabilir; diğerleri `403 PASSWORD_CHANGE_REQUIRED` döner.

`POST /password` başarılı olduğunda diğer oturumlar iptal edilir; mevcut tarayıcıya yeni cookie verilir ve `{user}` döner. Parolalar 12–512 karakter olmalıdır. Yeni parola mevcut paroladan farklı olmalıdır. Genel kayıt / otomatik e-posta kurtarma yolu yoktur.

## Katalog örnekleri

```json
{"expectedRevision":0,"category":{"name":"Pastalar","code":"500","slug":"pastalar","description":"Özel pasta çeşitleri","parentId":"","active":true}}
```

```json
{"expectedRevision":1,"product":{"name":"Fıstıklı Pasta","category":"Pastalar","status":"Aktif","description":"Ürün açıklaması","allergens":"Süt, gluten, fıstık","customImage":"https://example.com/pasta.webp","variants":[{"size":"Porsiyon","typeId":"type-portion","weight":180,"price":500,"slices":1}]}}
```

`id`, `sku`, `version` ve tarihler sunucuda üretilir. SKU sabittir. Kategori kodu güncellemede korunur. Ürün durumları `Aktif` ve `Taslak`tır; dış platform yayın durumunu ifade etmez.

## Kullanıcı örneği

```json
{"user":{"name":"Katalog Editörü","email":"editor@example.com","role":"editor","active":true,"password":"en-az-12-karakterlik-gecici-parola"}}
```

Parolayı URL’ye, uygulama loglarına veya GitHub’a yazmayın. Yönetici geçici parolayı kullanıcıya güvenli bir kanaldan iletir; uygulama mesaj / e-posta göndermez.

Kullanıcı güncellemede `expectedVersion`, son `GET /users` yanıtındaki `version` değeridir. Kendi hesabını pasifleştirme veya kendi rolünü düşürme, son aktif yöneticiyi kaldırma ve yinelenen e-posta kullanımı engellenir. Rol / e-posta / aktiflik değişiklikleri ilgili oturumları kapatır. Kalıcı silme yolu yoktur; pasifleştirme kullanılır.

## Hatalar

`401`: geçersiz / sona ermiş / iptal edilmiş oturum; `403 FORBIDDEN`: yetki yok; `403 PASSWORD_CHANGE_REQUIRED`: geçici parola değiştirilmeli; `403 ORIGIN_REJECTED`: yanlış origin; `409`: katalog / kullanıcı sürüm çakışması veya yönetici koruması; `422`: veri doğrulama; `503`: kurulum eksikliği.

Platform, sync ve jobs yolları bu sürümde yoktur; 404 döner. Zamanlanmış gönderim fonksiyonu bulunmaz.

## Bağlantı testi

`GET /.netlify/functions/db-test` bağımsız Netlify Function’ıdır; `/api` kökü altında değildir. Oturum gerektirmez, yalnızca veritabanı zamanını test eder. `DATABASE_URL` Netlify Functions ortamında tanımlı olmalıdır. Yanıtlar: 200 başarı + zaman; 503 yapılandırma eksik; 500 bağlantı hatası; 405 yanlış metot. Yanıtlar önbelleğe alınmaz.

Giriş denemelerinde uygulama düzeyinde sayı sınırı veya 15 dakikalık bekleme süresi yoktur. Yanlış e-posta / parola 401 döndürür; sonraki doğru giriş engellenmez.

## Fiyat ve profil güncellemeleri

Varyant fiyat güncellemesi ürünün diğer alanlarını değiştirmez. Tüm varyantlar için sıra korunarak en fazla iki ondalıklı, 0’dan büyük ve en fazla 100.000.000 TRY değer girilir. Varyant sayısı eşleşmeli, katalog revizyonu güncel olmalıdır. Toplu güncelleme de kuruş hassasiyetini korur, en az 0,01 TRY üretir ve üst sınırı aşan işlem bütünüyle reddedilir.

Profil güncellemesi oturumdaki kullanıcının adını değiştirir. İstemciden gelen rol, e-posta ve aktiflik alanları kullanılmaz. Diğer kullanıcıların profili bu endpoint ile değiştirilemez. `expectedVersion` uyuşmazlığında 409 döner; değişiklik işlem geçmişine kaydedilir.

## Ana kategori / Alt kategori / Ürün / Varyant

Kategori `parentId: ''` ise ana kategoridir; alt kategori `parentId` ile bir ana kategoriye bağlanır. İki seviyeden derin yapı ve döngü reddedilir. İsimler aynı ebeveyn içinde benzersizdir; kod ve slug katalog genelinde benzersiz kalır. Ürün bağlı alt kategori doğrudan ana kategoriye dönüştürülemez.

Ürün `categoryId` alanı ile alt kategoriye atanır. `category` geriye uyumluluk için alt kategori adını taşır; ilişkiler ve filtreler ID üzerinden çözülür. Doğrudan bir ana kategori ID’si veya geçersiz ID ile ürün oluşturmak 422 döndürür. Yeni atamalarda hem ana hem alt kategori aktif olmalıdır. Eski kategori adı payload’ları otomatik Genel alt kategorisi ile desteklenir.

Varyantlar mevcut `POST /products` ve `PUT /products/:id` üzerinden atomik kaydedilir. `variants` dizisindeki mevcut varyantlar `id` değerini korumalıdır; yeni varyantta `id` / `sku` gönderilmez. Sunucu SKU ve ID üretir. `active` varsayılanı `true`dur. Başka ürüne ait veya aynı payload’da tekrar kullanılan varyant ID’si reddedilir. Ad değişikliği / sıralama mevcut SKU’yu korur; diziden çıkarılan varyant silinir. En az 1, en fazla 50 varyant gereklidir. Varyant `sku` ve ürün `nextVariantNumber` alanları sunucu yönetimindedir.

## Medya API’si

| Metot | Yol | İzin / Gövde |
|---|---|---|
| GET | `/media` | `catalog.read`; `{assets}` metadata listesi |
| POST | `/media` | `media.write`; `{name,mimeType,data}`; data saf base64, data URL değil; 201 |
| GET | `/media/:id/content` | `catalog.read`; görsel baytları |
| PATCH | `/media/:id` | `media.write`; `{name,expectedVersion}` |
| DELETE | `/media/:id` | `media.write`; JSON `{expectedVersion}` |

Dosya sınırı 2 MB. Desteklenen türler PNG, JPEG, WEBP, GIF; MIME ve dosya imzası doğrulanır. Medya yüklemesinde JSON sınırı 2.900.000 bayt, diğer API isteklerinde 262.144 bayttır. SVG ve diğer türler reddedilir. Yanlış veri 422; eski medya sürümü 409; bağlı dosya silme `409 MEDIA_IN_USE` döndürür. Liste ve katalog yanıtları dosya verisini içermez.

Ürün oluşturma / güncellemede `mediaId` gönderilebilir. Sunucu kaydı doğrular ve `customImage` alanını `/api/media/:id/content` olarak belirler. Bağlantıyı kaldırmak için `mediaId: ''`, `customImage: ''` gönderilir. Harici görsel URL’si alternatifi korunur. Medya işlemleri katalog revizyonunu ve işlem geçmişini günceller.

## Ürün kodu

Katalog ürünlerinde `productCode` üç rakamdır (`001`). Ürün SKU biçimi `100.101001`, varyant SKU biçimi `100.101001.01` olur. Saklanan SKU başına sunucuda sabit `HM` eklenir; API ve ekranlar bu öneki göstermez. Kodlar istemciden değiştirilemez. Kalıcı QR kimliği ayrı `publicCardCode` alanında saklanır. Ayrıntılar: [SKU düzeni](SKU_PATTERN.md).

## Public ürün kartları ve QR

Kart adresi `/p/P000001` biçimindedir ve ürünün kalıcı `publicCardCode` değerine dayanır. `publicCardEnabled` varsayılan olarak kapalıdır; yalnızca `/products/:id/card` üzerinden değiştirilebilir. Ürün oluşturma/güncelleme payload’ı bu izni değiştiremez. Yayınlama için ürün, ana ve alt kategori aktif; en az bir varyant aktif olmalıdır. Taslak ürün, pasif kategori, aktif varyantı olmayan ürün ve yayınlanmamış kart, public JSON/görsel endpoint’lerinde 404 döndürür.

Açık JSON alanları: `productCode`, `sku`, `name`, kategori yolu `category`, `description`, `customImage`, `nutrition`, `storageConditions`, `allergens`, `longTermStorage`, `variants`. Yalnızca aktif varyantların `sku`, `size`, `weight`, `unit`, `packaging`, `slices`, `price` alanları gösterilir. Katalog revizyonu, işlem geçmişi, kullanıcılar, medya metadata’sı ve satış kanalı ayarları paylaşılmaz. Yüklenen görseller ayrı public ürün endpoint’inden, her istekte yayın durumu kontrol edilerek sunulur; özel medya API’si oturum istemeye devam eder. Yanıtlar önbelleğe alınmaz.

Kart yayından kaldırılıp yeniden yayınlandığında ürün adresi ve QR değişmez. Güncel ürün ve fiyat verileri aynı bağlantıdan alınır. QR kod Shoelace `sl-qr-code` ile tarayıcıda üretilir; PNG dosyasına beyaz güvenli kenar payı eklenir. Dış QR servisine ürün bilgisi gönderilmez. Kartı yayınlama/kapatma işlemi revizyon kontrolüne ve işlem geçmişine tabidir.

## Görünüm tercihi

Kullanıcı yanıtları `theme` alanını içerir. Varsayılan `light`, diğer geçerli değer `dark`tır. `PATCH /preferences` yalnızca oturum sahibini günceller; kullanıcı kimliği veya rol kabul etmez. `expectedVersion` son oturum / profil yanıtından alınır. Başarılı yanıt güncel `{user}` bilgisini döndürür; geçersiz tema 422, eski sürüm 409 döndürür. Tercih `app_users.theme` alanında kalıcıdır. Mevcut hesaplara bu alan veri kaybı olmadan başlangıçta eklenir.


Kullanıcı yanıtındaki `avatarUrl`, fotoğraf yoksa boş metindir. Görsel URL’si hesap kimliği ve fotoğraf sürümünü içerir; yükleme/değiştirme/kaldırma kullanıcı `version` değerini günceller. Başka kullanıcı kimliği gönderilse de yazma işlemi yalnızca oturum sahibini etkiler. GET isteğinde farklı `user` sorgusu 404 döndürür. Geçersiz dosya 422, sürüm çakışması 409, oturumsuz erişim 401 döndürür. Fotoğraf baytları kullanıcı veya katalog JSON yanıtlarına dahil edilmez.

## Varyant tipi ve dilim adedi

`GET /catalog` yanıtı `variantTypes: [{id,name,requiresQuantity}]` listesini döndürür. Ürün kaydetmede her varyantın `typeId` alanı bu listedeki bir kimlikle eşleşmelidir; yeni veya güncellenen varyantta eksik/geçersiz tip 422 döndürür. Dilim tipinde `slices` 1–100000 arasında tam sayı olmalıdır; boş, sıfır, negatif, kesirli veya metin değerler reddedilir. Başlangıç tipleri `type-item`, `type-slice`, `type-portion`, `type-box`, `type-weight` kimliklerini kullanır. Eklenen tip kimliklerini sunucu üretir; listeden okuyun.

`POST /variant-types` normalize edilmiş yinelenen adı reddeder. Dilim adıyla yeniden oluşturulan tipte `requiresQuantity` sunucuda daima true olur. Tip limiti 50'dir. `DELETE` aktif veya pasif ürün/varyant referansı bulunduğunda reddedilir. Tür işlemleri diğer katalog değişiklikleriyle aynı kilidi, `expectedRevision` kontrolünü ve işlem geçmişini kullanır. Tipler SKU öneki ayarlarından bağımsız saklanır. Public ürün kartında yalnızca tipin görünen adı `variant.typeName` olarak yer alır; tip kimlikleri ve yönetim listesi yayınlanmaz.


SKU şeması: [SKU_PATTERN.md](SKU_PATTERN.md). Ürün numarası alt kategori içinde 001–999, varyant numarası ürün içinde 01–99 aralığındadır; kapasite aşımı HTTP 422 `SKU_RANGE_EXHAUSTED` döndürür. Eski katalog otomatik, atomik ve tekrarlanabilir bir geçişle güncellenir. `skuMigrationBackup` ve sayaçlar public API’ye dahil edilmez.
