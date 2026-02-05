# KahvePOS - Ön Fiyat Ekranı ve Satış Takip Sistemi

## 📋 Proje Özeti

Kahve dükkanı için basit, kullanımı kolay bir web tabanlı fiyat ekranı ve satış takip sistemi. Tarayıcıda çalışır, telefon ve tabletten de erişilebilir. Veritabanı gerektirmez, tüm veriler tarayıcının localStorage özelliğinde saklanır.

---

## 🎯 Temel Özellikler

### 1. Ürün Yönetimi
- Ürün ekleme (ad, maliyet fiyatı, satış fiyatı, kategori)
- Ürün düzenleme ve silme
- Kategori bazlı organize etme (örn: Sıcak İçecekler, Soğuk İçecekler, Tatlılar)

### 2. Ön Fiyat Ekranı (Ana Ekran)
- Büyük, tıklanabilir ürün kartları
- Kategoriye göre filtreleme
- Hızlı seçim için grid düzeni
- Müşteriye gösterilebilir temiz arayüz

### 3. Sipariş/Sepet Sistemi
- Tıkla ve ekle mantığı
- Adet artırma/azaltma
- Anlık toplam hesaplama
- Siparişi tamamla butonu (POS'a yazılacak tutar)

### 4. Gün Sonu Raporu
- Günlük toplam satış
- Ürün bazlı satış adetleri
- Maliyet ve kar hesabı
- Tarih filtreleme

---

## 🏗️ Teknik Mimari

```
KahvePOS/
├── index.html              # Ana sayfa (SPA yapısı)
├── css/
│   └── style.css           # Tüm stiller
├── js/
│   ├── app.js              # Ana uygulama mantığı
│   ├── products.js         # Ürün yönetimi modülü
│   ├── cart.js             # Sepet modülü
│   ├── sales.js            # Satış kayıt modülü
│   └── reports.js          # Raporlama modülü
├── data/
│   └── sample-products.json # Örnek ürün verisi
└── plans/
    └── kahvepos-plan.md    # Bu plan dosyası
```

---

## 📱 Ekran Tasarımları

### Ana Ekran (Ön Fiyat Ekranı)

```
┌─────────────────────────────────────────────────────────────┐
│  ☕ KahvePOS                    [Ürünler] [Rapor] [Ayarlar] │
├─────────────────────────────────────────────────────────────┤
│  [Tümü] [Sıcak] [Soğuk] [Tatlı] [Diğer]    <- Kategori Tab  │
├───────────────────────────────────┬─────────────────────────┤
│                                   │                         │
│  ┌─────────┐  ┌─────────┐        │   📋 SEPET              │
│  │ ☕      │  │ ☕      │        │                         │
│  │ Türk    │  │ Filtre  │        │   Türk Kahvesi    x2    │
│  │ Kahvesi │  │ Kahve   │        │              2 x 35₺    │
│  │   35₺   │  │   45₺   │        │                         │
│  └─────────┘  └─────────┘        │   Latte          x1     │
│                                   │              1 x 55₺    │
│  ┌─────────┐  ┌─────────┐        │                         │
│  │ ☕      │  │ 🧁     │        │   ─────────────────     │
│  │ Latte   │  │ Brownie │        │   TOPLAM: 125₺          │
│  │   55₺   │  │   40₺   │        │                         │
│  └─────────┘  └─────────┘        │   [Sepeti Temizle]      │
│                                   │   [✓ Siparişi Tamamla]  │
│         ... daha fazla ürün      │                         │
└───────────────────────────────────┴─────────────────────────┘
```

### Gün Sonu Rapor Ekranı

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Gün Sonu Raporu                              [Geri Dön] │
├─────────────────────────────────────────────────────────────┤
│  Tarih: [04.02.2026 ▼]                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 GÜNLÜK ÖZET                                             │
│  ───────────────────────────────                            │
│  Toplam Satış:        1,250₺                                │
│  Toplam Maliyet:        625₺                                │
│  NET KAR:               625₺                                │
│  Sipariş Sayısı:          18                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📦 ÜRÜN BAZLI SATIŞ                                        │
│  ───────────────────────────────                            │
│  Ürün              Adet    Satış    Maliyet    Kar          │
│  ─────────────────────────────────────────────────          │
│  Türk Kahvesi       25     875₺      375₺     500₺          │
│  Latte              12     660₺      240₺     420₺          │
│  Brownie             8     320₺      160₺     160₺          │
│  ...                                                        │
│                                                             │
│  [📄 Yazdır]                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 Veri Yapıları

### Ürün (Product)
```javascript
{
  id: "uuid-string",
  name: "Türk Kahvesi",
  costPrice: 15,        // Maliyet fiyatı
  salePrice: 35,        // Satış fiyatı
  category: "sicak",    // Kategori slug
  active: true,         // Aktif/pasif
  createdAt: "2026-02-04T10:00:00Z"
}
```

### Sipariş (Order)
```javascript
{
  id: "uuid-string",
  items: [
    { productId: "...", productName: "Türk Kahvesi", quantity: 2, unitPrice: 35, costPrice: 15 }
  ],
  totalAmount: 125,
  totalCost: 45,
  profit: 80,
  createdAt: "2026-02-04T14:30:00Z"
}
```

### Kategoriler
```javascript
[
  { id: "sicak", name: "Sıcak İçecekler", icon: "☕" },
  { id: "soguk", name: "Soğuk İçecekler", icon: "🧊" },
  { id: "tatli", name: "Tatlılar", icon: "🧁" },
  { id: "diger", name: "Diğer", icon: "📦" }
]
```

---

## 🎨 Tasarım Kararları

### Renk Paleti (Kahve Teması)
- **Ana Renk:** #6F4E37 (Kahve kahverengisi)
- **İkincil:** #C4A484 (Açık kahve)
- **Arka Plan:** #FFF8F0 (Krem)
- **Vurgu:** #D4A574 (Karamel)
- **Başarı:** #4CAF50 (Yeşil)
- **Uyarı:** #FF9800 (Turuncu)

### Tipografi
- **Başlıklar:** Sistem font, bold
- **Metin:** Sistem font, normal
- **Fiyat:** Monospace font (kolay okunabilirlik)

### Responsive Kırılma Noktaları
- **Masaüstü:** > 1024px (4 sütun ürün grid)
- **Tablet:** 768px - 1024px (3 sütun)
- **Mobil:** < 768px (2 sütun, sepet aşağıda)

---

## 🔄 Kullanıcı Akışları

### Sipariş Alma Akışı
1. Müşteri gelir, ne istediğini söyler
2. Kullanıcı ürüne tıklar → sepete eklenir
3. Birden fazla ürün varsa tekrarlanır
4. Toplam tutar ekranda görünür
5. Kullanıcı tutarı POS cihazına yazar
6. Ödeme alındıktan sonra "Siparişi Tamamla" tıklanır
7. Sipariş kaydedilir, sepet temizlenir

### Gün Sonu Rapor Akışı
1. "Rapor" butonuna tıklanır
2. Günün satış özeti görüntülenir
3. İstenirse tarih değiştirilebilir
4. Gerekirse yazdırılabilir

---

## ⚙️ Ürün Yönetimi Ekranı

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Ürün Yönetimi                                [Geri Dön] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [+ Yeni Ürün Ekle]                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Türk Kahvesi                                        │    │
│  │ Kategori: Sıcak İçecekler                           │    │
│  │ Maliyet: 15₺  |  Satış: 35₺  |  Kar: 20₺           │    │
│  │                                   [Düzenle] [Sil]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Latte                                               │    │
│  │ Kategori: Sıcak İçecekler                           │    │
│  │ Maliyet: 20₺  |  Satış: 55₺  |  Kar: 35₺           │    │
│  │                                   [Düzenle] [Sil]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Geliştirme Aşamaları

### Faz 1: Temel Yapı
- HTML iskelet oluşturma
- CSS temel stilleri
- LocalStorage yardımcı fonksiyonları

### Faz 2: Ürün Yönetimi
- Ürün CRUD işlemleri
- Kategori yönetimi
- Ürün listesi görünümü

### Faz 3: Satış Ekranı
- Ürün grid görünümü
- Sepet fonksiyonları
- Sipariş tamamlama

### Faz 4: Raporlama
- Günlük satış raporu
- Ürün bazlı analiz
- Kar/maliyet hesaplamaları

### Faz 5: İyileştirmeler
- Responsive düzenlemeler
- Yazdırma desteği
- Kullanıcı deneyimi iyileştirmeleri

---

## 📝 Notlar

- **Sunucu Gerektirmez:** Tüm veriler tarayıcıda saklanır (localStorage)
- **Çevrimdışı Çalışır:** İnternet bağlantısı olmadan kullanılabilir
- **Veri Yedekleme:** Veriler JSON olarak dışa aktarılabilir
- **Taşınabilir:** Klasör kopyalanarak başka bilgisayarda kullanılabilir

---

## ❓ Onay Bekleyen Kararlar

1. Ürün görselleri eklensin mi? (Emoji yeterli olabilir)
2. İndirim/kampanya özelliği gerekli mi?
3. Birden fazla kullanıcı desteği olsun mu?
4. Verilerin buluta yedeklenmesi gerekli mi?
