# SKU kodlama düzeni

Varyant gösterimi `0000.000000.00`: `AnaKategori.AltKategoriÜrün.Varyant`.

| Alan | Uzunluk | Örnek |
| --- | --- | --- |
| Ana kategori | 4 rakam | 0100, 1000, 1100 |
| Alt kategori | 3 rakam | 101; alt kategori yoksa 000 |
| Ürün | 3 rakam | 001 |
| Varyant | 2 rakam | 01 |

Ürün SKU'su `0100.101001`, varyant SKU'su `0100.101001.01` olur. Veritabanında sabit `HM` ön eki bulunur; API, arayüz, public kart ve CSV öneksizdir. Ürünün `productCode` alanı üç hane olarak kalır. Kayıt kimlikleri kategori kodlarından bağımsızdır.

## Kategori kodları

Ana kategori önerileri ilk boş yüzlük değeri seçer: `0100`, `0200`, …, `0900`, `1000`, `1100`, `1200`, …, `9900`. Mevcut üç haneli ana kategoriler başlarına sıfır eklenerek dönüştürülür. Yeni ana kategoride dört, alt kategoride üç rakam zorunludur. Kayıt sonrası kod ve ana/alt kategori türü değiştirilmez; bir alt kategori başka ana kategoriye taşınabilir.

Kategori ekleme formunun ilk alanı ana kategori seçimidir. Seçenekler `Kategori adı (0100)` biçimindedir. Alt kategori önerisi, ana kategori kodunun son üç hanesi + 1 değerinden başlar ve kullanılan kategori kodlarını (pasif olanlar dahil) atlar. `0100 → 101`, `0900 → 901`, `1000 → 001`, `1100 → 101` (101 doluysa bir sonraki boş kod). 999'a kadar boş kod kalmazsa oluşturma engellenir. Alt kategori kodları üç haneli olarak ve kategoriler arasında benzersiz tutulur.

Alt kategori isteğe bağlıdır. Doğrudan ana kategoriye bağlanan ürün için sanal alt kategori bölümü `000` kullanılır: `1000.000001.01`, `1000.000002.01`. Her ana/alt kategori kod grubu kendi ürün sırasını tutar.

## Sınırlar ve kalıcı kimlikler

Ürün sırası kod grubu içinde `001–999`, varyant sırası ürün içinde `01–99` aralığındadır. Silinen kayıtların ayrılmış numaraları korunur; isim/kategori düzenlemesi SKU'yu değiştirmez. SKU'nun kategori bölümü, kod verildiği andaki kategoriyi temsil eder. Sınır aşılırsa HTTP 422 `SKU_RANGE_EXHAUSTED` döner; kısmi kayıt yapılmaz.

QR adresi üç haneli ürün numarası yerine ayrı `publicCardCode` kimliğine bağlıdır: `/p/P000001`. Biçim geçişinde ve kategori düzenlemesinde QR adresi değişmez.

## Sürüm 2 geçişi

Veritabanı açılışında geçiş tek bir transaction içinde çalışır; PostgreSQL katalog satırını kilitler. Manuel SQL gerekmez.

- Sürüm 1: ana kategori `100 → 0100`, ürün `HM100.101007 → HM0100.101007`, varyant `HM100.101007.24 → HM0100.101007.24`. Yalnızca ilk bölüm genişler; ürün/varyant numaraları yeniden atanmaz. Önceden kategorisi taşınmış ürünlerin SKU'su da kayıtlı SKU üzerinden genişletilir.
- Ürün sayaçlarının ana kategori bölümü de genişler. Silinmiş ürünlere ait sayaçlar ve varyantların `nextVariantNumber` değerleri korunur.
- Önceki kodlar ve sayaçlar `document.skuWidthMigrationBackup` içinde saklanır. Daha eski `skuMigrationBackup` korunur. Bu yedekler katalog API'sinde yayınlanmaz.
- SKU sürümü olmayan eski kataloglarda hiyerarşi/varyant geçişi ve ilk numaralama doğrudan dört haneli biçime yapılır; önceki kodlar `skuMigrationBackup` alanında saklanır.
- Tekrar çalıştırma değişiklik veya yeni revision üretmez. Geçersiz/çakışan kod durumunda transaction geri alınır.

Daha önce dışa aktarılmış SKU dosyaları dört haneli biçime güncellenmelidir. Hesap, medya, ürün kimliği, fiyat, varyant kimliği ve QR adresi bu geçişte değişmez.
