# Kod şeması 3

Kategori ve alt kategori kodları 10–99 aralığındadır. Alt kategori numaraları her ana kategori içinde bağımsız ilerler. Alt kategorisiz ürünler için 00 ayrılmıştır.

- Ürün sırası: kategori kod grubu başına 100–999 (900 ürün).
- Varyant sırası: ürün başına 01–99; mevcut 50 varyant kayıt limiti korunur.
- Ürün SKU: 1010.100; varyant SKU: 1010.10001.
- Birleşik ürün kodu: 1010100 (ana kategori, alt kategori ve ürün sırası); içe aktarma bu kodu kullanır.

`server/db.js` başlangıç göçü, `upgradeSku` üzerinden tüm eski şemaları sürüm 3'e taşır. Yeni bir dağıtım/uygulama başlangıcı gereklidir; kaynak kod değişikliği tek başına çalışan uzak veritabanını değiştirmez.

Geçiş tek veritabanı işlemi içindedir. Kapasite, kategori bağlantısı veya kimlik çakışması hatasında hiçbir değişiklik kaydedilmez. Kategoriler önceki sayısal kodlarına; ürünler kalıcı ID'lerine göre sıralanarak kodlanır. Önceki kategori/ürün/varyant kodları ve sayaçlar `skuV3MigrationBackup` içinde korunur. Geçiş ikinci kez çalışmaz.

Ürün ve varyant ID'leri, ürün içerikleri, miktarları, fiyatları, görselleri ve yayın tercihleri değişmez. Eski kart kodu, ürün bağlantısı ve bağlantı geçmişi korunur; eski birleşik ürün kodu da bir bağlantı takma adı olarak saklanır. Sonraki düzenlemelerde eski adreslerin korunması sunucu tarafından sürdürülür. Kategori değiştirme ve ana kategoriye dönüştürme, daha önce atanmış ürün/varyant SKU'sunu değiştirmez.

## Doğrulama

- Tüm sunucu testleri: 110 başarılı.
- Kod gösterimi, kategori formları/filtreleri, ürün sihirbazı, aktarım biçimleri, çoklu ürün oluşturma ve doğrudan ana kategori ürünleri: 21 ilgili arayüz testi başarılı.
- Tüm arayüz paketi tamamlanmadığından tüm arayüz testlerinin geçtiği iddia edilmemektedir.
