# Mağaza bilgileri ve kaynak aktarımı

Kanal Yönetimi > Mağazalar; mağaza kodu, resmi ad, ülke, şehir, ilçe/bölge, açık adres, telefon, çalışma saatleri, mağaza tipi, aktif durum, hizmetler, açıklama, bilgi notu ve en fazla 30 fotoğraf tutar. Diğer kanal türlerinin mevcut formu korunur.

Telefon ve saat bilinmiyorsa boş kalabilir. Çalışma saatleri; 7/24, gece yarısını geçen saatler, kapalı günler ve sezon bilgilerini korumak için metindir. Durumlar: Aktif, Pasif, Hazırlık Aşamasında. Kod boş bırakılırsa ad üzerinden benzersiz HM- kodu üretilir.

## Kaynak

`server/imports/hm1864-stores-source.json`, kullanıcının Hafiz_Mustafa_1864_Tum_Magazalar_Listesi.xlsx dosyasındaki “Mağaza Veri Girişi” sayfasının 25 kaydını içerir. Sayfa başlığı dördüncü satırdadır. Dağılım: Türkiye 19, Birleşik Krallık 1, BAE 5. Veri sayfasında mağaza kodları bulunmadığından kodlar sistemce oluşturulur.

Dubai mağazalarının beş telefon alanındaki “Uluslararası” ifadesi telefon numarası olarak aktarılmaz; bilgi notuna taşınır. Tersane İstanbul'un “Belirtilmemiş” çalışma saati boş bırakılır ve bilgi notuna açıklama eklenir. Başka kaynaklardan bilgi tahmini yapılmaz.

## Tek seferlik veritabanı aktarımı

Yeni kurulumda mağazalar başlangıç kataloğuna dahil edilir. Mevcut kurulumda `bootstrapStores` veri tabanı başlangıç işleminin kilitli transaction'ında çalışır. Yayına alınan sürüm ilk kez açıldığında aktarılır; kaynak JSON'un hazırlanması canlı veritabanına yazıldığı anlamına gelmez.

Mağaza adı (Hafız Mustafa 1864 öneki hariç) eşleştirilir. Eşleşen kaydın boş alanları tamamlanır; dolu bilgiler, pasif durum ve fotoğraflar korunur. Birden fazla eşleşme varsa mağaza atlanır ve raporda gösterilir. Kayıt sayıları ve kaynak adı katalogda saklanır.

`hm1864-stores-2026-10-30-v1` işareti aktarımı yalnızca bir kez çalıştırır. Sonradan silinen kayıtlar yeniden oluşturulmaz. Kaynak güncellemeleri yeni, bilinçli bir aktarım sürümü gerektirir. Mevcut katalog değişirse revision bir artırılır.

## Fotoğraflar

PNG, JPEG, WEBP, GIF; dosya başına 2 MB. Ortak medya hizmetinin gerçek görsel doğrulaması, WebP türevleri ve tarayıcı önbelleği kullanılır. Görsellerin kimlikleri mağaza kaydına bağlanır; gönderilen URL'ler kullanılmaz. İlk görsel kapaktır. Kullanılan fotoğraflar bağlantı kaldırılmadan Kütüphane'den silinemez. Mağaza ve fotoğraf erişimi mevcut oturum ve yetki kontrollerine tabidir.
