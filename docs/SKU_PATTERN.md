# SKU kodlama düzeni

Varyantların uygulamada gösterilen biçimi `000.000000.00` şeklindedir: `Kategori.AltKategoriÜrün.Varyant`. Örnek: `100.101001.01`.

| Alan | Uzunluk | Örnek |
| --- | --- | --- |
| Ana kategori | 3 rakam | 100 |
| Alt kategori | 3 rakam | 101 |
| Ürün | 3 rakam | 001 |
| Varyant | 2 rakam | 01 |

Veritabanında ürün SKU'su `HM100.101001`, varyant SKU'su `HM100.101001.01` saklanır. Uygulama API'si, ekranlar, public ürün kartları ve CSV çıktıları öneksiz SKU kullanır. Önek `HM` olarak sabittir ve arayüzden değiştirilemez. Ürünün kendi `productCode` alanı üç rakamdır ve yalnızca kategori bağlamında anlamlıdır; küresel kayıt kimliği `id` olarak korunur.

Ürün numaraları ana/alt kategori kod çifti içinde `001–999`; varyant numaraları ürün içinde `01–99` aralığında atanır. Ürün SKU'su varyant eklenmeden de kullanılabilir. Kapasite aşıldığında yeni kayıt HTTP 422 `SKU_RANGE_EXHAUSTED` ile reddedilir; kısmi kayıt veya sayaç ilerlemesi oluşmaz. İsim/kategori düzenleme ve varyant sıralama mevcut SKU'yu değiştirmez. SKU kategori bölümleri ilk kodun verildiği kategoriyi temsil eder. Silinen varyant kodu tekrar kullanılmaz.

`skuSchemaVersion` olmayan mevcut katalog, veritabanı başlangıcındaki tek bir işlemde yeni biçime geçirilir. Ürünler kayıt kimlikleri sırasıyla, varyantlar mevcut sırasıyla numaralanır. Eski kodlar `document.skuMigrationBackup` içinde yalnızca sunucuda saklanır; bu alan katalog API'sinde yayınlanmaz. Geçiş tekrar çalıştırıldığında numaralar değişmez. Eksik kategori bağlantısı veya kapasite sorunu varsa işlem tamamen geri alınır.

QR adresleri üç rakamlık ürün koduna bağlanmaz. Eski `productCode` bağlantısı ayrı `publicCardCode` alanına taşınır; yeni ürünler de benzersiz ve kalıcı `P000001` benzeri public bağlantı kimliği alır. Böylece farklı alt kategorilerde `001` kodu kullanılabilmesine rağmen QR bağlantıları karışmaz. Public kartta görünen ürün kodu yine üç rakamdır.

Manuel SQL gerekmez. Yeni sürüm devreye alındığında mevcut katalog otomatik geçirilir. Önceki kodlarla çalışan harici dosya ve sistemler varsa yeni SKU'lara göre güncellenmelidir. Katalog tamamen elle sıfırlanırken `products`, `categories` ve `nextProductId` yanında `nextProductNumbers` da `{}` yapılmalıdır; aksi halde ayrılmış alt kategori ürün numaraları korunur.
