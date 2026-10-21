# pm1864

Hafız Mustafa 1864 için React tabanlı ürün yönetimi frontend demosu.

## Çalıştırma

Node.js 22.12 veya üzeri kullanın.

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
```

## Özellikler

- Ürün kataloğu, kategori ve durum filtreleri, Türkçe arama, liste/kart görünümü.
- Ürün açıklaması, alerjen, görsel URL’si ve yayın durumu düzenleme.
- Varyant bazında gramaj, dilim sayısı ve fiyat yönetimi.
- Yeni ürünlerde otomatik SKU; mevcut ana ürün kodunu koruma.
- Seçilen veya filtrelenen ürünlere toplu yüzdesel fiyat güncellemesi.
- Online Mağaza, Trendyol, Yemeksepeti ve FineDine gönderim simülasyonu.
- Manuel / otomatik yayın, işlem geçmişi ve CSV dışa aktarma.
- Tarayıcıda `localStorage` ile veri saklama ve mobil uyumlu tasarım.

## Demo sınırları

Fiyatlar ve ürün ayrıntıları örnek verilerdir. Gerçek platformlara veri gönderilmez. Demo bir sunucu, merkezi veritabanı veya kullanıcı yetkilendirmesi içermez.

Gerçek kullanıma geçişte platform API bağlantıları, sunucu tarafı SKU benzersizliği, ürün eşlemeleri, gönderim kuyruğu, kanal bazlı yayın sürümleri ve hata yönetimi gerekir.

Ürün fotoğrafları markanın herkese açık sitesinden referans edilir. Fotoğraflar yüklenemediğinde yer tutucu çizim gösterilir. İkonlar Phosphor Icons paketindendir.
