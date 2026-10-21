# API

Tüm yanıtlar JSON ve `Cache-Control: no-store` kullanır. `/api/health` ile `/api/login` dışındaki yollar geçerli oturum ister. Mutation istekleri aynı origin’den, `Content-Type: application/json` ile gönderilir.

| Metot | Yol | Gövde |
|---|---|---|
| GET | `/api/health` | API ve veritabanı durumu |
| POST | `/api/login` | `{ "email": "…", "password": "…" }` |
| GET | `/api/session` | Mevcut yönetici |
| POST | `/api/logout` | `{}` |
| GET | `/api/catalog` | `{catalog}`: kategoriler, ürünler, ayarlar, kuyruk, geçmiş, revision |
| POST | `/api/categories` | `{expectedRevision, category}` |
| PUT | `/api/categories/:id` | `{expectedRevision, category}` |
| POST | `/api/products` | `{expectedRevision, product}` |
| PUT | `/api/products/:id` | `{expectedRevision, product}` |
| POST | `/api/prices/bulk` | `{expectedRevision, ids: [1], percent: 10, direction: "increase"}` |
| PATCH | `/api/settings` | `{expectedRevision, settings: {autoSync: false, skuPrefix: "HM"}}` |
| POST | `/api/sync` | `{expectedRevision, ids: [1], channels: [0,1]}` |
| POST | `/api/jobs/retry` | `{expectedRevision, jobId: "…"}` |
| POST | `/api/jobs/process` | `{}`; en fazla iki işi işler |

Kanal kimlikleri: 0 Online Mağaza, 1 Trendyol, 2 Yemeksepeti, 3 FineDine.

## Kategori örneği

```json
{"expectedRevision":0,"category":{"name":"Pastalar","code":"500","slug":"pastalar","description":"Özel pasta çeşitleri","parentId":"","active":true}}
```

Kategori güncellemesinde `id` URL’de verilir; kategori kodu değiştirilemez. Pasif kategoriye yeni ürün eklenmez; mevcut ürünler saklanır.

## Ürün örneği

```json
{"expectedRevision":1,"product":{"name":"Fıstıklı Pasta","category":"Pastalar","status":"Aktif","description":"Ürün açıklaması","allergens":"Süt, gluten, fıstık","customImage":"https://example.com/pasta.webp","channels":[0,3],"variants":[{"size":"Porsiyon","weight":180,"price":500,"slices":1}]}}
```

`id`, `sku`, `version`, `channelVersions` ve tarihler sunucu tarafından yönetilir; istemciden gönderilerek değiştirilemez. Kayıt yanıtı en güncel `{catalog}` nesnesini içerir. Ürün fiyatı TRY cinsindedir. Bu sürümde silme yerine ürünün `Taslak`, kategorinin `active: false` yapılması kullanılır.

## Webhook gövdesi

```json
{"event":"product.updated","jobId":"uuid","platform":"ONLINE","version":2,"product":{"id":1,"sku":"HM-500-0001","version":2,"name":"Fıstıklı Pasta","category":"Pastalar","status":"Aktif","variants":[{"size":"Porsiyon","weight":180,"price":500,"slices":1}],"channels":[0,3]}}
```

Gerçek ürün gövdesi açıklama, alerjen, görsel ve güncelleme tarihini de içerir. SKU ve varyant adı birlikte varyantı tanımlar. İstemci, varyant adlarının aynı ürün içinde benzersiz olmasını sağlamalıdır; sunucu bunu ayrıca doğrular.

## Hatalar

```json
{"error":{"code":"REVISION_CONFLICT","message":"Katalog başka bir işlemde güncellendi. Verileri yenileyip yeniden deneyin."}}
```

`401`: oturum / giriş; `403`: origin; `409`: eski revision; `413`: büyük istek; `415`: yanlış içerik türü; `422`: veri doğrulama; `429`: giriş sınırı; `503`: veritabanı / yönetici kurulum eksikliği.

API, veritabanı adresini, parola özetini, oturum token’ını veya platform erişim anahtarlarını katalog yanıtlarında döndürmez.
