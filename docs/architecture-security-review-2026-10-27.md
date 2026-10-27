# USTA — Mimari ve güvenlik incelemesi

Tarih: 27 Ekim 2026. İncelenen başlangıç: `0964fb75f37cf6e7177f412b0221c9db48391a46` sonrasındaki yerel kaynak. Bu rapora eşlik eden değişiklikler henüz Git'e gönderilmedi.

## Sonuç ve kapsam

Uygulama küçük bir ekip ve katalog için işlevsel bir modüler monolittir. Sunucu tarafında rol kontrolü, parametrik SQL, oturum iptali, revizyon kontrolü ve fiyatların yeniden hesaplanması vardır. Ancak katalog büyüdükçe tek JSON belge, ilk ürün altında saklanan varyantlar ve büyük sayfa bileşenleri bakım ve eşzamanlılık sorunları yaratır.

İnceleme; React uygulaması ve modülleri, ortak bileşenler, domain yardımcıları, Node API, kullanıcı/medya servisleri, SQLite/PostgreSQL katmanı, Netlify yapılandırması, CSS, bağımlılıklar ve testleri kapsar. Kaynak kod ve yerel testlere dayanır. Canlı sisteme saldırı, PostgreSQL yük testi, yedekten geri dönüş tatbikatı, dağıtım sırlarının veya barındırma hesabının denetimi yapılmadı. Bir açık bulunmaması, bütün saldırılara karşı güvence anlamına gelmez.

## Mevcut yapı

| Katman | Dosyalar / yapı | Değerlendirme |
| --- | --- | --- |
| Başlatma ve yönlendirme | `src/main.jsx`, `src/app/App.jsx`, hash rotaları, public `/p`, `/v`, `/kategori` | App; yönlendirme, kayıt hazırlama ve ekran bağlamayı birlikte yapıyor. Public rotalar ayrılmış. |
| Veri ve oturum | `BackendGate`, `CatalogContext`, `src/api.js` | Merkezi istek/hata yönetimi var. Her mutasyon katalog döndürüyor; genel revizyon her modülü etkiliyor. |
| Modüller | Ürünler, kategoriler, varyantlar, fiyat, medya, ambalaj, kullanıcılar, sistem ayarları | Klasör ayrımı var; bazı sayfalarda filtre, tablo, form ve diyalog aynı bileşende. Planlanan modüller tamamlanmış işlev olarak değerlendirilmemeli. |
| Ortak UI | Shoelace sarmalayıcıları, Card, Modal, Pagination, ManagementSummary | Yeniden kullanım iyi. Shadow DOM, native kontroller ve fieldset davranışları birlikte test edilmeli. |
| İş kuralları | `variant-composition`, `hierarchy`, `sku`, `unit-pricing`, `sales-availability` | Tarayıcı ve API aynı saf kuralları kullanabiliyor. Sunucu modüllerinin `src` altına bağımlılığı katman sınırını belirsizleştiriyor. |
| HTTP | `server/app.js` | Oturum, origin, JSON ve izin kontrolleri merkezi; büyük koşullu rota zinciri büyümeye açık. |
| Servisler | Catalog, Users, Media | Katalog servisi 1.100 satırın üzerinde. Ürün, kategori, fiyat ve yayınlama aynı serviste. |
| Veritabanı | `app_catalog`, `app_users`, `app_sessions`, `app_media`, `app_user_avatars` | Katalog tek satırdaki TEXT JSON. PostgreSQL satır kilidi, SQLite işlem kuyruğu yazma çakışmalarını engelliyor. |
| Medya | DB içinde base64, 2 MB sınırı, MIME imzası kontrolü | Boyut ve tür kontrolü var; tam görsel decode/piksel sınırı yok. |
| CSS | Global `layout.css`, `custom.css`, modül CSS dosyaları ve Shoelace tokenları | Tema tokenları doğru temel. Genel seçiciler ve sonradan eklenen override'lar çakışma riskini artırıyor. |
| Dağıtım | Vite, Netlify function, yerel Node sunucusu | Üretimde DATABASE_URL zorunlu. DB tanılama ayrı fonksiyon ve ayrı havuz kullanıyor. |

## Bu çalışmada uygulanan düzenlemeler

| Düzenleme | Gerekçe ve kapsam |
| --- | --- |
| SheetJS `xlsx` 0.18.5 → üreticinin 0.20.3 dağıtımı | Bilinen prototype pollution ve ReDoS advisories kapsamındaki eski sürüm kaldırıldı. Paket adresi ve integrity lockfile'da tutuluyor. |
| Excel parser worker + 10 saniye süre sınırı | Ayrıştırma ana pencerenin global nesnelerini ve ana iş parçacığını kullanmıyor. Worker tamamlanınca veya hata/süre aşımında sonlandırılıyor. |
| Parser modülü ve 500 satır / 32 sütun sınırı | Sheet verisini JSON'a dönüştürmeden önce aralık sınırlandırılıyor; ilk sheet okunuyor. HTML/formül/VBA işleme seçenekleri kapatıldı. Sıkıştırılmış dosya belleği için tam sandbox değildir. |
| Excel şablon kodu dinamik import | XLSX normal ürün listelemesi sırasında ana ürün modülüne yüklenmiyor. Build çıktısında ürün yönetimi JS parçası yaklaşık 438 KB'den 19 KB'ye indi; XLSX ayrı yükleniyor. Bu bir ağ performans benchmark'ı değildir. |
| `server/errors.js`, `server/audit.js` | Kullanıcı/medya servislerinin yalnızca hata ve audit için katalog servisine bağlanması kaldırıldı. Eski importlar için katalog servisinde re-export korundu. |
| `server/http/json-body.js` | JSON içerik türü tam doğrulanıyor; byte sınırı akış okunurken kontrol ediliyor. Aşımda okuma iptal ediliyor. Normal ve görsel isteklerin mevcut farklı sınırları korundu. |
| Oturum token biçimi kontrolü | Beklenen 43 karakterli base64url olmayan çerezlerle veritabanı sorgusu yapılmıyor. |
| SQLite foreign key kontrolü | `PRAGMA foreign_keys=ON` ile tanımlı avatar ilişkisi gerçekten uygulanıyor. JSON içindeki ürün/varyant ilişkilerini kapsamaz. |
| Oturum indeksleri | Email üzerinden iptal ve süre üzerinden temizleme sorgularına idempotent indeksler eklendi. |
| Üretim DB tanılama koruması | `NETLIFY=true` veya `NODE_ENV=production` iken `ENABLE_DB_DIAGNOSTICS=true` açıkça verilmedikçe db-test 404 döner. Normal API health etkilenmez. |
| Görsel bırakma CSS ayrımı | İlgili stiller global custom.css yerine ortak upload hook'una bağlı CSS dosyasına taşındı. |

## Güvenlik ve manipülasyon bulguları

Önem dereceleri yerel kod incelemesi değerlendirmesidir; bağımsız CVSS puanı değildir. “Açık” kalan iş demektir. Kanıtlanmış kusur ile operasyonel varsayım ayrı belirtilmiştir.

| ID | Önem | Durum | Bulgu / olası etki | Öneri |
| --- | --- | --- | --- | --- |
| SEC-01 | Yüksek | Düzeltildi | Eski XLSX parser'ı kullanıcı dosyalarını doğrudan ana pencerede okuyordu; bilinen advisories var. | 0.20.3 + worker + sınırlar uygulandı. Bağımlılık taraması sürdürülmeli. |
| SEC-02 | Yüksek | Açık | `/api/login` her istekte scrypt çalıştırıyor; kaynak kodda hız sınırı yok. Parola tahmini ve CPU tüketimi mümkün. Mevcut backend testleri başarısız denemelerin doğru parolayı kilitlememesini bekliyor. | Güvenilir Netlify/edge istemci kimliği üzerinden dağıtık hız sınırı; hesap bazlı kalıcı kilitleme yerine geciktirme/challenge. Kullanıcının gönderdiği X-Forwarded-For'a körü körüne güvenilmemeli. Bu incelemede barındırma/WAF yapılandırması doğrulanamadı. |
| SEC-03 | Orta | Düzeltildi | JSON boyutu `request.text()` sonrasında kontrol edildiğinden tüm veri önce belleğe alınıyordu. | Akış sırasında limit uygulanıyor. Platformun istek süresi ve eşzamanlılık sınırları ayrıca gereklidir. |
| SEC-04 | Orta | Düzeltildi | Üretim DB test fonksiyonu anonim istekle bağlantı/sorgu çalıştırıyor ve altyapı bilgisi döndürüyordu. | Üretimde varsayılan kapalı. Gerekirse geçici açılıp ağ erişimi sınırlandırılmalı. |
| SEC-05 | Orta | Açık | Görsel doğrulama dosya imzası ve byte sınırıyla sınırlı. Çok yüksek piksel boyutları veya bozuk ama imzası doğru dosyalar tarayıcıyı zorlayabilir. | Güvenilir decoder ile piksel/boyut sınırı, yeniden encode ve metadata temizleme. SVG zaten kabul edilmiyor. |
| SEC-06 | Orta | Açık | `customImage` için dış HTTP(S) URL destekleniyor. Ziyaretçi IP/referrer bilgisi dış görsel sunucusuna gidebilir. Sunucu URL'yi fetch etmediğinden bu akışta SSRF doğrulanmadı. | URL allowlist veya yüklenen medya kullanımına geçiş. Mevcut dış görseller için geçiş envanteri gerekir. |
| SEC-07 | Orta | Açık | Katalog iş mantığında JSON ilişkileri için DB foreign key yok. Hatalı yeni kod, geçersiz ürün/medya bağlantısı oluşturabilir. | İlişkisel şema ve FK; geçişe kadar merkezi domain doğrulama. |
| SEC-08 | Orta | Açık | Katalog yazmalarında izin istek başında okunuyor. İşlem sırasında rol değişimiyle oluşabilecek dar yarış penceresi katalog transaction'ında tekrar doğrulanmıyor. Kullanıcı yönetimi kendi admin kontrolünü transaction içinde yapıyor. | Kritik yazmalarda actor kimliğini transaction içinde yeniden kontrol et. İstismar testi yapılmadı; kod tabanlı yarış riski. |
| SEC-09 | Düşük/Orta | Açık | Genel sayfa CSP yok; framing koruması mevcut. Dış görseller ve Shoelace stilleri politika tasarımını etkiliyor. | Önce report-only CSP ile gerçek kaynakları ölç, sonra enforce et. Körlemesine CSP eklemek görselleri/worker'ı bozabilir. |
| SEC-10 | Operasyonel | Doğrulanmadı | PostgreSQL TLS doğrulaması, bağlantı yetkileri, PITR/yedekler ve üretim sırlarının durumu kaynak koddan belirlenemiyor. | Üretim ayarları ve geri yükleme tatbikatıyla doğrula; parolaları rapora/istemciye aktarma. |

SQL enjeksiyonu için incelenen sorgular parametreli. React metin render'ı kullanılıyor; incelemede `dangerouslySetInnerHTML`/eval tabanlı doğrudan bir XSS yolu görülmedi. Bu sonuç üçüncü parti tüm bağımlılıkların veya bütün olası girdilerin güvenli olduğu anlamına gelmez. CSV dışa aktarmada formül başlangıcı karakterlerine karşı mevcut kaçış korunuyor. API'de origin kontrolü, HttpOnly/SameSite=Strict çerez, şifre/rol değişiminde oturum iptali ve public kart alan allowlist'i mevcut.

## Mimari ve işleyiş riskleri

| ID | Öncelik | Kanıt / sorun | Hedef düzenleme |
| --- | --- | --- | --- |
| ARC-01 | Yüksek | Bütün katalog tek satır; her yazma global revision ve PostgreSQL kilidini paylaşıyor. Medya yükleme ve profil audit'i bile katalog revision değiştiriyor. | Ürün/kategori/varyant başına sürüm; bağımsız audit tablosu; sunucuda pagination/filter. |
| ARC-02 | Yüksek | Varyantlar ilk oluşturuldukları ürünün `variants` dizisinde saklanıyor; içerikteki ilk ürün sonradan kaldırılabiliyor. SKU ve depolama sahibi ile gerçek içerik ayrışıyor. | Bağımsız `variants` ve `variant_items`. Mevcut id, SKU, public URL, yayın durumu korunmalı; numaralar yeniden üretilmemeli. |
| ARC-03 | Yüksek | Fiyat/gramaj/bilgi kayıt sırasında hesaplanıyor; kaynak ürün değişince bağımlı varyantlar otomatik yeniden hesaplanmıyor. | Açık fiyat politikası: sabit snapshot mı canlı maliyet mi? Karardan sonra bağımlılık indeksleme ve transaction içinde yeniden hesaplama/“yeniden hesaplanmalı” işareti. |
| ARC-04 | Orta | ProductImport satırları tek tek POST ediyor. Hata/bağlantı kesintisinde kısmi başarı olur; kullanıcı tekrar yüklerse yinelenen kayıt riski var. | Batch API + idempotency key + ön doğrulama ve açık atomiklik politikası. |
| ARC-05 | Orta | Tüm katalog ve en fazla 1.000 audit kaydı her catalog.read rolüne gönderiliyor. | Modül odaklı projection, ayrı audit.read izni ve sayfalama. Ticari veriler için viewer kapsamı gözden geçirilmeli. |
| ARC-06 | Orta | Audit JSON içinde, 1.000 kayıtla sınırlı ve aynı DB kaydına erişen süreç tarafından değiştirilebilir. | Append-only audit tablosu ve ayrı saklama/erişim politikası. Bu hali uzun süreli değiştirilemez denetim kaydı değildir. |
| ARC-07 | Orta | Medya base64 DB'de; byte boyutu yaklaşık 1/3 ek depolama ve DB aktarımı yükü oluşturur. | Nesne depolama + DB metadata; private medya/public kart erişim kontrolü korunmalı. |
| ARC-08 | Orta | App ~490, CategoryManagement ~780, ProductManagement ~580 satır. | Rota çözümü, filtre state'i, sorgu projeksiyonları, tablo/kart ve editör bileşenlerini ayrı sorumluluklara böl. |
| ARC-09 | Orta | İki global CSS dosyası toplam 2.000 satırın üzerinde; modül ve global override'lar karışıyor. | Modül kök seçicileri veya CSS Modules; token → primitive → layout → module katman sırası. Görsel regresyon kontrolüyle kademeli geçiş. |
| ARC-10 | Orta | Başlangıç bundle'ı hâlâ yaklaşık 521 KB; bazı editörler App'te statik import ediliyor. | Public ve admin entry ayrımı; editörlerin lazy import'u; gerçek cihazda ölçüm. XLSX ayrımı bu çalışmada tamamlandı. |
| ARC-11 | Orta | Bilgi birleştirme eşit metinleri temizliyor; anlamsal olarak benzer veya kısmen ortak cümleleri güvenle ayıramıyor. | İçindekiler/alerjenleri metin yerine tanımlı içerik ilişkileriyle modelle. Negatif uyarı veya saklama sürelerini “benzer” diye silme. |
| ARC-12 | Orta | SQLite iş akışı test ediliyor; gerçek PostgreSQL pool/lock davranışı için entegrasyon ortamı burada çalıştırılmadı. | Geçici PostgreSQL CI matrisi, paralel mutation ve migration tekrar testleri. |

## Hedef katmanlar ve geçiş sırası

Bu çalışma tüm uygulamayı bir defada yeniden yazmaz. Uyumluluk korunarak önce güvenlik sınırları ve ortak çekirdek ayrıldı. Kalan değişiklikler aşağıdaki sırada, veri geçişi ve regresyon testleriyle yapılmalı.

1. **Sunucu sınırı:** `server/http` altında body/origin/session/permission bileşenleri; rotalar modül bazlı kayıt edilir. Her handler yalnızca DTO doğrulama, use case çağrısı ve yanıt şekillendirme yapar.
2. **Domain:** `shared/domain` altında pure kurallar; tarayıcı ve API aynı doğrulamayı kullanır. Domain, React veya DB bilmez. `errors` ve `audit` ayrımı bu yöndeki ilk adımdır.
3. **Use case ve repository:** ProductService, VariantService, CategoryService, PricingService; storage yalnızca repository üzerinden. Hesaplama kuralları serviste, transaction sınırı use case'te açık olmalı.
4. **Veritabanı:** Versioned migrations; `categories(parent_id)`, `products(category_id)`, `variants`, `variant_items(variant_id, product_id, quantity)`, medya bağlantıları ve audit tabloları. Fiyat için integer kuruş veya decimal; gramaj için sabit hassasiyet. JSON snapshot'ları kontrollü veri göçüyle aktarılır. Kayıt sayıları, toplam fiyatlar, SKU ve QR eşitliği doğrulanmadan eski belge kaldırılmaz.
5. **Frontend:** `features/<modül>/{pages,components,hooks,api}`; UI primitive'leri `components/ui`; ekranların veri alma/iş kuralları/sunum sorumlulukları ayrılır. Form state ile sunucu state ayrı tutulur.
6. **CSS:** Tema tokenları tek kaynak; global dosyalarda reset/layout, modül CSS'inde modül seçicileri. Shoelace `::part` kuralları ilgili primitive'in yanında tutulur. Mobil/liste/döşeme/public/print için görsel kontroller gerekir.
7. **Kalite kapıları:** Build + domain/API testleri + UI testleri + PostgreSQL test matrisi + dependency scan. Bağımlılık yükseltmesi lockfile ve regresyon testleriyle yapılır. Gerçek browser worker/print kontrolleri JSDOM testlerinin yerine geçmez.

## Kaynaklar

- SheetJS üretici kurulum belgesi: https://docs.sheetjs.com/docs/getting-started/installation/frameworks/
- Prototype pollution advisory: https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
- ReDoS advisory: https://github.com/advisories/GHSA-5pgg-2g8v-p4x9

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm run build` | Başarılı. Ana bundle için 500 KB uyarısı sürüyor. |
| `npm test` | 105 / 105 başarılı; yeni body sınırı, SQLite FK/indeks, üretim diagnostic ve Excel aralık testleri dahil. |
| Tam `npm run test:ui` | 91 testten 64 başarılı, 27 başarısız; 25 dosyadan 8'i başarısız. Bu tarama yeni worker test dosyası eklenmeden başlatıldı. |
| Değişiklik odaklı UI seti | 6 dosyada 11 / 11 başarılı: worker başarı/süre aşımı, varyant wizard/oluşturma/silme, görsel bırakma, avatar. |
| `npm audit --json` | 0 bilinen açık raporlandı. Üretici CDN paketleri için audit veritabanı kapsamı sınırlı olabileceğinden SheetJS advisories ayrıca incelendi. |
| PostgreSQL / gerçek browser / canlı sistem | Bu oturumda çalıştırılmadı. |

Tam UI setindeki örnek uyuşmazlıklar: kaldırılmış kategori satış kanalı sütununun beklenmesi, önceki varyant düzenleme butonlarının aranması, eski ürün kodu ve kategori yardım metni beklentileri, değişmiş form DOM yerleşimleri. `workflows.test.jsx` içinde ortak ekran/başlık seçimi üzerinden çok sayıda test kesiliyor. Bunların tümü bu çalışmada tek tek sınıflandırılıp düzeltilmedi; hepsini eski test saymak doğru olmaz. Başarısız testler silinmedi veya skip edilmedi. Tam arayüz regresyon seti yeşil değildir; kapsamlı dağıtım öncesi test sözleşmeleri mevcut akışlarla uzlaştırılmalı ve gerçek tarayıcı testi eklenmelidir.

Güncelleme: güvenlik sınırları ve modül ayrımı ilk aşama olarak uygulandı. Bağımsız varyant veri modeli, ilişkisel katalog geçişi, tüm büyük sayfaların parçalanması ve global CSS dönüşümü bu değişiklik paketinde tamamlanmış değildir. Bunları tamamlanmış gibi değerlendirmeyin.
