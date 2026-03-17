# Kahve Dükkanı Web Sitesi Planı — Next.js SEO Optimized

## 📋 ÖZET YÖNETİCİ

Bu plan, Kocaeli/Kartepe'deki self-servis kahve dükkanınız için Next.js ile tasarlanmış, **SEO-optimized** bir tanıtım sitesidir. Hedef: yerel ve genel arama motorlarında üst sıralarda yer almak, müşterileri çekmek.

---

## 1️⃣ MARKA ADI ÖNERİLERİ (SEO Uyumlu)

### 🏆 Önerilen (Sırasıyla En İyi):

| Sıra | Marka Adı | Avantajları | Dezavantajları |
|------|-----------|------------|-----------------|
| **1** | **Kartepe Kahve** | Yerel SEO güçlü, hatırlanabilir, .com.tr müsait | Genel çok kalabilir |
| **2** | **Dumlupınar Espresso** | Çok spesifik, nişe hedefli, premium hava | Çok dar çıkabilir |
| **3** | **Kocaeli Modern Kahve** | Geniş bölge, trend veriyor | Uzun domain adı |
| **4** | **Kartepe Kahvesi** | Doğal, samimi, yerel | "Kahve" kadar direct değil |

### 🎯 En İyi Seçim Tavsiyem:
**"Kartepe Kahve"** — Kısa, hatırlanabilir, yerel arama terimleriyle match, sıcak tasarımla uyumlu.

**Domain Seçenekleri:**
- `kartepe-kahve.com.tr` ✅
- `karpekahve.com.tr` ✅
- `kartepe-kahve.com` (uluslararası imaj)

---

## 2️⃣ TEKNOLOJİ SEÇİMİ: Next.js NEDEN DOĞRU?

### ✅ Next.js Avantajları (Sizin için):

| Özellik | Fayda |
|---------|-------|
| **Static Site Generation (SSG)** | SEO'ya mükemmel, çok hızlı yükleme |
| **Server-Side Rendering (SSR)** | Dinamik içerik güncelleme imkanı |
| **Built-in Image Optimization** | Kahve fotoğrafları otomatik optimize |
| **Automatic Code Splitting** | Sayfa yükü çok hızlı |
| **Vercel ile 1-Click Deploy** | Yayına almak sekiz saniye |
| **SEO-Friendly** | Meta tags, structured data kolay |
| **Mobile Responsive** | Tüm cihazlarda mükemmel |

### ❌ Alternatifler ve Neden Uygun Değildir:

- **Statik HTML/CSS**: SEO için sınırlı, güncellemesi zor
- **React-only**: SEO zayıf, fazla karmaşık
- **WordPress**: Hosting maliyeti fazla, yönetimi karışık
- **Wix/Squarespace**: Sınırlı kontrol, GÖK'ü kısıtlı

### 🎯 Sonuç:
**Next.js MÜKEMMEL seçim** — hızlı, SEO-optimized, kolay yönetim.

---

## 3️⃣ SİTE YAPISAL MİMARİSİ

### 📑 Sayfa Hiyerarşisi

```
KARTEPE KAHVE Web Sitesi
│
├── 🏠 Anasayfa (/)
│   ├── Hero Bölüm (Başlık + CTA)
│   ├── Hakkımızda Preview
│   ├── Öne Çıkan Ürünler (3-4)
│   ├── Neden Bizi Seçin
│   └── CTA: İletişim / Ziyaret Edin
│
├── 📖 Hakkımızda (/hakkimizda)
│   ├── Hikaye
│   ├── Misyon / Vizyon
│   ├── Takım (opsiyonel)
│   ├── Mekân Fotoğrafları
│   └── Değerlerimiz
│
├── ☕ Menü & Ürünler (/menu)
│   ├── Espresso Seçenekleri
│   ├── Kahve Türleri
│   ├── Soğuk İçecekler
│   ├── Pastane & Snackler
│   └── Özel Menü
│
├── 📷 Galeri (/galeri)
│   ├── Mekân Fotoğrafları
│   ├── Ürün Fotoğrafları
│   └── Müşteri Anları (Instagram Feed integrasyonu)
│
├── 📞 İletişim (/iletisim)
│   ├── İletişim Formu
│   ├── Harita
│   ├── Adres & Saatler
│   ├── Telefon & Email
│   └── Sosyal Medya Bağlantıları
│
├── 🔒 Gizlilik Politikası (/privacy)
└── ⚖️ Kullanım Şartları (/terms)
```

---

## 4️⃣ SEO STRATEJİSİ

### 🎯 Anahtar Kelimeler (Hedef)

#### Birincil (Yazı yazı):
- "Kartepe kahve" (yerel)
- "Kahve dükkanı Kartepe"
- "Espresso Kocaeli"

#### İkincil:
- "Self servis kahve"
- "Modern kahve dükkanı"
- "Kahvesi Dumlupınar"

#### Uzun Tail:
- "Kartepe'de açık kahve dükkanları"
- "En iyi kahve Kocaeli"
- "Self servis espresso Kartepe"

### 📝 Her Sayfa için Meta Stratejisi

| Sayfa | Title (60 karakter) | Meta Description (160 karakter) |
|-------|---------------------|----------------------------------|
| **Anasayfa** | "Kartepe Kahve \| Modern Self-Servis Kahve Dükkanı" | "Kartepe'nin kalp atışında modern kahve dükkanımızı keşfedin. Özel kahve çeşitleri, rahat mekan, self-servis." |
| **Menü** | "Menü \| Kartepe Kahve \| Premium Kahve Seçenekleri" | "Espresso, cappuccino, latte ve daha fazlası. Kartepe Kahve'nin duyuşturma menüsüne göz atın." |
| **Hakkımızda** | "Hakkımızda \| Kartepe Kahve \| Kahve Sevgisinin Hikayesi" | "Kartepe Kahve'nin uzun hikayesi. Kalite, stil ve sıcak atmosfer bizim tüm kararlarda merkezi." |
| **Galeri** | "Galeri \| Kartepe Kahve \| Mekân & Ürün Fotoğrafları" | "Modern rustik tasarımımızı ve lezzetli ürünlerimizi görüntülerde keşfedin." |
| **İletişim** | "İletişim \| Kartepe Kahve \| Bize Ulaşın" | "Kartepe Kahve'ye ziyaret etmek veya iletişime geçmek. Adres, telefon ve iletişim formu." |

### 🔗 Yapılandırılmış Veri (Schema.org)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Kartepe Kahve",
  "image": "https://kartepe-kahve.com/logo.jpg",
  "description": "Modern self-servis kahve dükkanı",
  "telephone": "+90 xxx xxx xxxx",
  "url": "https://kartepe-kahve.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Dumlupınar Mahallesi, Kartepe",
    "addressLocality": "Kocaeli",
    "addressCountry": "TR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "40.7XXX",
    "longitude": "29.8XXX"
  },
  "priceRange": "₺₺",
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": "Monday-Sunday",
    "opens": "07:00",
    "closes": "22:00"
  }
}
```

### 📍 Yerel SEO (Google My Business)

- ✅ Google My Business profili oluştur
- ✅ Fotoğraf ve açıklamalar düzenli güncelle
- ✅ Müşteri yorumlarını yanıtla
- ✅ Adres, telefon, saatler güncel tut
- ✅ Düzenli posts paylaş (yeni menü, etkinlik vb.)

---

## 5️⃣ SİTE FONKSİYONELLİĞİ

### 📋 Her Sayfanın Komponenti ve SEO Öğeleri

#### **1. Anasayfa**
- **Hero Section**: Büyük kahve fotoğrafı + başlık + CTA buton
- **Hakkımızda Preview**: 150 kelime özet
- **Öne Çıkan Ürünler**: 4 ürün kartı (görsel + başlık + fiyat)
- **Neden Bizi Seçin**: 3 feature (Modern, Self-Servis, Kaliteli)
- **Testimonyals**: 3-4 müşteri yorumu
- **CTA**: "Şimdi Ziyaret Edin" butonu

#### **2. Menü Sayfası**
- **Kategoriler**: Tabs/Accordion (Espresso, Kahveler, Soğuk İçecekler, Pastane)
- **Ürün Kartları**: Görsel, ad, açıklama, fiyat
- **Fotoğraflar**: Her kategoride en az 1 ürün görseli
- **Açıklamalar**: Her ürün için 1-2 cümle açıklaması

#### **3. Hakkımızda Sayfası**
- **Başlık**: "Kartepe Kahve'nin Hikayesi"
- **Gövde**: 3-4 paragraf (hikaye, misyon, değerler)
- **Galeri**: 4-6 mekân fotoğrafı
- **Timeline** (opsiyonel): Önemli tarihler
- **Takım** (opsiyonel): Sahibi / Barista tanıtımı

#### **4. Galeri Sayfası**
- **Grid Layout**: 12+ fotoğraf
- **Filtreleme** (opsiyonel): Kategori (Mekân, Ürün, Etkinlik)
- **Lightbox**: Fotoğraf detay görüntüsü
- **İnstagram Feed**: Otomatik güncellemeler

#### **5. İletişim Sayfası**
- **İletişim Formu**: Ad, email, telefon, mesaj
- **Google Harita**: Konumunuz gösterilecek
- **İletişim Bilgileri**: Telefon, email, adres, saatler
- **Sosyal Medya İkonları**: Facebook, Instagram, Twitter
- **Directions**: "Yol Tarifi Al" butonu

### 🔄 İçerik Yönetimi

- Menü değişiklikleri: Admin panel veya manuel JSON
- Fotoğraf güncellemeleri: CMS veya doğrudan storage
- İletişim formu: Email bildirimi

---

## 6️⃣ TEKNIK GEREKSİNİMLER

### 🛠️ Next.js Proje Yapısı

```
kahve-website/
├── public/
│   ├── images/
│   │   ├── hero.jpg
│   │   ├── gallery/
│   │   └── menu/
│   └── favicon.ico
├── src/
│   ├── pages/
│   │   ├── index.js (Anasayfa)
│   │   ├── hakkimizda.js
│   │   ├── menu.js
│   │   ├── galeri.js
│   │   ├── iletisim.js
│   │   └── 404.js
│   ├── components/
│   │   ├── Header.js
│   │   ├── Footer.js
│   │   ├── Hero.js
│   │   ├── ProductCard.js
│   │   ├── ContactForm.js
│   │   └── Gallery.js
│   ├── styles/
│   │   ├── globals.css
│   │   └── components.module.css
│   ├── utils/
│   │   ├── seo.js
│   │   └── constants.js
│   └── data/
│       ├── menu.json
│       ├── team.json
│       └── socials.json
├── next.config.js
├── package.json
└── vercel.json
```

### 📦 Gerekli Bağımlılıklar (Dependencies)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.x",
    "react-dom": "^18.x",
    "next-image-export-optimizer": "^1.x",
    "react-hook-form": "^7.x",
    "axios": "^1.x"
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

### ⚙️ SEO Optimizasyon

- **next-seo**: Meta tag yönetimi
- **next-sitemap**: Otomatik sitemap oluşturma
- **robots.txt**: Arama motoru yönergesi
- **Performance**: Image optimization, CSS minification

### 📱 Responsive Tasarım

- Mobile-first yaklaşım
- Breakpoints: 640px, 1024px, 1280px
- Touch-friendly buttons ve forms
- Hızlı yükleme (LCP < 2.5s)

---

## 7️⃣ RENK PALETİ & TASARIM

Mevcut interior tasarımınızla uyumlu:

```css
/* Ana Renkler */
--primary: #3E2723      /* Koyu Ceviz */
--accent: #D4AF37       /* Altın */
--bg-light: #FFFFFF     /* Beyaz */
--bg-cream: #F5F5DC     /* Krem */
--text-dark: #333333    /* Koyu Gri */
--text-light: #666666   /* Açık Gri */

/* Vurgu */
--success: #4CAF50      /* Yeşil */
--warning: #FF9800      /* Turuncu */
--error: #F44336        /* Kırmızı */
```

---

## 8️⃣ İÇERİK PLANI

### 📝 Yazılacak Metinler

#### Anasayfa Hero:
```
"Kartepe'nin En Modern Kahve Deneyimi"
"Self-servis stili, prémium kahve kalitesi"

CTA: "Menümüzü Keşfedin" → /menu
```

#### Hakkımızda (Özet):
```
"Kocaeli/Kartepe'de açılan Kartepe Kahve, modern rustik tasarımı 
ve yüksek kaliteli kahve çeşitleri ile dikkat çekmektedir. 
Self-servis konseptiyle, her müşterimiz özel bir kahve deneyimi yaşar."
```

#### Menü Başlıkları:
- Espresso Seçenekleri
- Sıcak Kahveler
- Soğuk İçecekler
- Pastane & Snackler
- Özel Tavsiyeler

---

## 9️⃣ DEPLOYMENT & HOSTING

### 🚀 Önerilen Stack

| Bileşen | Seçim | Neden |
|---------|-------|-------|
| **Hosting** | Vercel | Next.js resmi hosting, ücretsiz, otomatik deploy |
| **Domain** | Namecheap / Godaddy | Türkçe domain desteği, kolay |
| **Email** | Gmail Business / Zoho | Professional email |
| **CDN** | Vercel (built-in) | Otomatik, global |
| **Database** | (Başlangıçta ihtiyaç yok) | - |

### 📋 Deployment Adımları

1. GitHub'a push
2. Vercel'e bağla (1 tıkla)
3. Domain bağla (DNS ayarları)
4. SSL otomatik
5. LIVE! 🎉

---

## 🔟 PERFORMANS HEDEFLERİ (Google PageSpeed)

| Metrik | Hedef |
|--------|-------|
| **LCP** (Largest Contentful Paint) | < 2.5s |
| **FID** (First Input Delay) | < 100ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 |
| **SEO Score** | 95+ |
| **Performance** | 90+ |

---

## 1️⃣1️⃣ SOSYAL MEDYA & MARKETING

### 📱 Entegrasyonlar

- **Instagram Feed**: Anasayfa'da live feed
- **Social Share**: Her sayfada paylaş butonları
- **Open Graph**: Facebook/Twitter entegrasyonu
- **Google Analytics**: Ziyaretçi takibi

### 📊 Tavsiye Edilen Sosyal Profiller

- Instagram: @kartepe.kahve
- Facebook: Kartepe Kahve
- Google My Business: Profil
- TripAdvisor: (Opsiyonel)

---

## 1️⃣2️⃣ UZUN DÖNEM GELIŞTIRMELER

### 🔮 Faz 2 (6 ay sonra):

- Blog bölümü (kahve tipleri, hazırlama teknikleri)
- İngilizce dil desteği (uluslararası SEO)
- WhatsApp entegrasyonu (sipariş öneri)
- Müşteri sistemi (loyalite programı)

### 🔮 Faz 3 (1 yıl sonra):

- E-ticaret sistemi (online siparişler)
- Tahsisatı online ödeme
- Müşteri hesapları
- Sipariş takibi

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Marka adı ve domain satın al
- [ ] GitHub repo oluştur
- [ ] Next.js projesi initialize et
- [ ] Bütün sayfaları oluştur
- [ ] İçerikleri yaz ve optimize et
- [ ] Fotoğraf ve galeri hazırla
- [ ] Meta descriptions ve titles ekle
- [ ] sitemap.xml oluştur
- [ ] robots.txt oluştur
- [ ] Responsive test yap
- [ ] Vercel'e deploy et
- [ ] Domain bağla
- [ ] Google Search Console'a ekle
- [ ] Google My Business oluştur
- [ ] Analytics kuruluşu
- [ ] AÇILIŞ! 🎉

---

## 📊 MALİYET ÖZETI

| Kalem | Tahmini Maliyet |
|-------|-----------------|
| Domain (.com.tr) | 100-200 TL/yıl |
| Vercel Hosting | Ücretsiz (Pro: $20/ay) |
| Email (Zoho) | 100-500 TL/yıl |
| SSL Certificate | Ücretsiz (Vercel) |
| **Toplam (Başlangıç)** | **Ücretsiz - 200 TL/yıl** |

---

## 🎯 SONUÇ

Bu plan, **Next.js** ile kurulu, **SEO-optimized** bir kahve dükkanı sitesidir. Yerel arama sonuçlarında öne çıkacak, mobil uyumlu ve hızlıdır. İçeriğin kalitesi ve fotoğraf seçimi, sitenin başarısında kritik rol oynar.

**Başlamaya hazır mısınız?** Onay verdikten sonra **Code moduna** geçerek geliştirmeye başlayabilirim.