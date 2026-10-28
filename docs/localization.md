# Çeviri ve Kur Merkezi

Sistem Ayarları > Çeviri ve Kur Merkezi, kaynak ürün/kategori/varyant kayıtlarını değiştirmeden otomatik çıktıları görüntüler ve JSON, CSV, XML, Excel (.xls) olarak indirir. Bu modül otomatik yayınlama yapmaz.

## Veri ve işlem akışı

- `server/localization-service.js`: servis adaptörleri, kaynak hash'i, kur önbelleği, yetki sonrası işlem ve kayıt.
- `GET /api/localization`: katalog okuma yetkisi ile kayıtlı çeviri ve kur görüntüsü.
- `POST /api/localization/translate`: ürün yazma yetkisi, `kind` (product/variant/category), `recordId`, aktif hedef `language`, `expectedRevision`.
- `POST /api/localization/rates`: sistem ayarları yetkisi ve `expectedRevision`.
- Üç uç da oturum doğrulaması kullanır. Yazmalar origin kontrolünden ve iyimser sürüm kontrolünden geçer.
- Kur ve çeviri kayıtları mevcut katalog belgesindeki `localization` alanında kalıcı tutulur. Ana katalog yanıtına eklenmez; merkezin API'sinden ve kartın kendisine ait güvenli alt küme üzerinden okunur. Mevcut veritabanı yedekleri bu alanı da kapsar.

## Çeviri

Google Cloud Translation Basic v2 adaptörü kullanılır. Sunucu ortamına `GOOGLE_TRANSLATE_API_KEY` eklenmeli; ilgili Google projesinde Translation API ve gerekli faturalandırma/kota ayarları yapılmalıdır. Anahtar tarayıcıya veya katalog verisine verilmez. Çeviri talebi kullanıcı "Çeviriyi hazırla" dediğinde gönderilir; servis kotasını kullanır. Kaynak dil Türkçe olarak sabittir; Sistem Ayarları'ndaki varsayılan görüntüleme dili kaynak metnin dilini değiştirmez.

Alanlar: ad, kısa açıklama, içindekiler, alerjenler, servis önerisi, saklama ve uzun süreli muhafaza. Sayısal besin değerleri, ürün kodları, ölçüler ve fiyatlar çevrilmez. Metin çıktıları düz metin olarak işlenir; HTML çalıştırılmaz. Türkçe hedefi dış servise gitmeden kaynak metin olarak saklanır.

Kaynak hash'i aynıysa saklanan çıktı kullanılır. Kaynak değişirse eski çıktı silinmez, "kaynak değişmiş" olarak işaretlenir; yeniden hazırlama ile güncellenir. Her kayıtta dil, sağlayıcı, kaynak alanlar, çeviri alanları ve oluşturulma tarihi bulunur. Depolama üst sınırı 5.000 çeviri kaydıdır. Sürekli/planlı arka plan çeviri işi yoktur. Ürün kartlarının dilini otomatik değiştirmez.

## Kurlar

Frankfurter v2 sunucu adaptörü, aktif para birimlerinin TRY karşılıklarını tarihleriyle alır. Altı saatlik önbellek, aynı veriyi tekrar istemeyi sınırlar. Kurlar kullanıcı talebiyle güncellenir; kaynak servis günlük referans kurlar sağlar. Döviz verisi 24 saatten eskiyse arayüzde belirtilir. Eksik veya geçersiz bir kur varsa yeni görüntü kaydedilmez; önceki görüntü korunur.

Kaynak ürün fiyatları halen TRY'dir. Varsayılan para birimi tanımı kaynak fiyatın birimini değiştirmez. Kur dönüşümü satış fiyatı belirleme veya ödeme tahsilatı değildir. Döviz karşılıkları en yakın tam sayıya yuvarlanır; TRY kaynak tutarının kuruş hassasiyeti korunur; indirilen dönüşümler aynı tutarları ve kullanılan kuru, tarihi, sağlayıcıyı içerir.

## Hata ve eşzamanlılık

Dış servis çağrıları veritabanı kilidi dışında gerçekleşir. Yanıt geldikten sonra sürüm ve kaynak hash'i kontrol edilerek tek işlemde saklanır. Kaynak arada değişirse kayıt reddedilir; yeniden deneme gerekir. Servis hatası eski kayıtları silmez. 15 saniyelik zaman aşımı ve yanıt doğrulaması vardır. Aynı çalışan sunucu örneğinde aynı çeviri/kur talebi eşzamanlı gönderilemez; farklı örnekler sürüm kontrolüyle korunur.

## Servis belgeleri

- https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate
- https://frankfurter.dev/javascript/

Geliştirme testleri sağlayıcı yanıtlarını taklit eder. Canlı Google anahtarıyla çeviri ve dağıtım ağından Frankfurter erişimi ayrıca doğrulanmalıdır.


## Ürün ve varyant kartları

Public kartlar ve yönetimdeki kart önizlemeleri dil ve para birimi seçicileri sunar. Varsayılan Türkçe / TRY'dir. Kart uçları yalnızca ilgili kaydın aktif dillerdeki güncel çeviri alanlarını, aktif para birimi tanımlarını ve kayıtlı kurları döndürür; başka kayıtların çevirileri, kaynak metin önbelleği ve API anahtarları açılmaz. Kartların mevcut yayın ve oturum kontrolleri korunur.

Kaynak değiştiğinde eski çeviri seçilemez. Hazırlanmamış çeviriler ve eksik kurlar devre dışıdır. Seçim dış servis çağrısı veya veritabanı yazması yapmaz. Kaynak fiyatlar değişmez. Ürün birim fiyatı, varyant satış fiyatı ve karttaki varyant tablosu aynı dönüşüm kuralını kullanır. İçerik metinleri çevrilir; sabit arayüz başlıkları ve ölçü adları Türkçe kalır. Arapça, Farsça ve Urduca içerik sağdan sola gösterilir.
