# Kategori satış kanalları

Uygulama genelindeki kanal adları **Mağaza**, **E-Mağaza**, **Sipariş Platformları** şeklindedir. Teknik anahtarlar sırasıyla `store`, `online`, `foodDelivery` olarak korunur. Kategori, ürün ve varyant özetlerindeki etiketler küçük boyuttadır; etkin kanal yeşil, kapalı kanal soluk/pasif görünür. Görünür etiketlerde yalnızca kanal adı bulunur; durum ekran okuyucuya ayrıca iletilir. Kategori tablosunda ana kategori satırları tema uyumlu renk ve sol vurgu ile alt kategorilerden ayrılır.

Ana ve alt kategorilerde `salesAvailability` alanı üç boolean tercih saklar: `store`, `online`, `foodDelivery`. Alanın bulunmadığı eski kategoriler tüm kanallarda geçerli kabul edilir; kayıtların kodları, SKU'ları ve ürün tercihleri değiştirilmez. Manuel SQL veya şema değişikliği gerekmez.

Yeni kategori formunda kanallar başlangıçta açıktır. Üst kategoride kapalı kanal veya pasif üst kategori, alt kategori formunda ilgili anahtarı devre dışı bırakır. Engellenen kanalın alt kategorideki kayıtlı tercihi korunur. Üst kategori tekrar açıldığında alt kategori, ürün ve varyantın kendi tercihleri yeniden uygulanır.

Etkin satış durumu, aktif ana kategori ve alt kategorinin kanal izinleri ile aktif ürünün ve aktif varyantın kanal tercihlerinin kesişimidir. Eksik veya döngülü kategori bağlantısı tüm kanalları kapatır. Üründe taslak veya varyantta pasif durum da satışı kapatır. API üzerinden engellenen bir kanalın ürün tercihi açık kaydedilse bile sunucunun hesapladığı `effectiveSales` değeri kapalı kalır.

`GET /api/catalog` kategori kayıtlarında normalize edilmiş `salesAvailability` ile hesaplanan `effectiveSales` alanlarını döndürür. Ürün ve varyantların `effectiveSales` alanları da kategori kısıtlarını içerir. Kategori listesi, ürün/varyant listeleri ve CSV dışa aktarımları bu ortak hesaplamayı kullanır. Kategori ekleme ve düzenleme mevcut `categories.write` iznini, revizyon kontrolünü ve işlem geçmişini kullanır. Kaydedilmeyen alanlar önceki tercihlerle korunur; boolean dışındaki değerler ve tanımsız kanal adları HTTP 422 ile reddedilir.

Bu anahtarlar kanal uygunluğu belirler. Harici mağazalara veya platformlara otomatik yayın yapmaz.
