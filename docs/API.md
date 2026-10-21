# API ve erişim modeli

API kökü `/api`. Yanıtlar JSON ve `Cache-Control: no-store` kullanır. Yazma istekleri aynı origin’den `Content-Type: application/json` ile gönderilir. Sunucu rolü her istekte veritabanından okur; istemciden gelen role güvenmez.

| Metot | Yol | Yetki / gövde |
|---|---|---|
| GET | `/health` | Açık; API / veritabanı durumu |
| POST | `/login` | Açık; `{email,password}` |
| GET | `/session` | Oturum; `{user}` |
| POST | `/logout` | Oturum; `{}` |
| PATCH | `/profile` | Oturum; `{expectedVersion,name}`; yalnızca kendi profil adı |
| POST | `/password` | Oturum; `{currentPassword,newPassword}` |
| GET | `/catalog` | `catalog.read`; `{catalog}` |
| POST | `/categories` | `categories.write`; `{expectedRevision,category}` |
| PUT | `/categories/:id` | `categories.write`; `{expectedRevision,category}` |
| POST | `/products` | `products.write`; `{expectedRevision,product}` |
| PUT | `/products/:id` | `products.write`; `{expectedRevision,product}` |
| PATCH | `/prices/products/:id` | `prices.write`; `{expectedRevision,prices:[123.45,234.56]}`; varyant sırasına göre tüm fiyatlar |
| POST | `/prices/bulk` | `prices.write`; `{expectedRevision,ids,percent,direction}` |
| PATCH | `/settings` | `settings.write`; `{expectedRevision,settings:{skuPrefix}}` |
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
{"expectedRevision":1,"product":{"name":"Fıstıklı Pasta","category":"Pastalar","status":"Aktif","description":"Ürün açıklaması","allergens":"Süt, gluten, fıstık","customImage":"https://example.com/pasta.webp","variants":[{"size":"Porsiyon","weight":180,"price":500,"slices":1}]}}
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
