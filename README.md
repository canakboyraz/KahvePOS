# ☕ KahvePOS v3.0 - Akıllı Satış Sistemi

Modern, kullanımı kolay ve özellik dolu kahve dükkanı satış noktası (POS) uygulaması.

![Version](https://img.shields.io/badge/version-3.0.0-brown)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Yenilikler v3.0

### ✨ Yeni Özellikler

- **🎛️ Dashboard Sayfası** - Canlı istatistikler, grafikler ve bugünün özeti
- **🖨️ Hugin Yazar Kasa Entegrasyonu** - GİB uyumlu fiş yazdırma (ÖKC)
- **⌨️ Gelişmiş Klavye Kısayolları** - F1-F5, Enter, Escape, Ctrl+S, Ctrl+D
- **🔍 Hızlı Ürün Arama** - İsim veya kategori filtreleme
- **🏷️ Sepet İyileştirmeleri** - İndirim, müşteri notu, alt toplam
- **⏰ Oturum Yönetimi** - Otomatik çıkış, şifre değiştirme, aktivite takibi
- **💾 Yedekleme/Geri Yükleme** - Tüm verileri tek dosyada yedekle
- **📥 Veri Import/Export** - Excel/CSV formatında dışa aktarım
- **📈 Gelişmiş Raporlar** - Chart.js grafikleri, Top 10 ürünler
- **🌙 Karanlık Mod** - Göz yormayan gece modu
- **🎨 Özelleştirilebilir Tema** - 5 farklı renk teması
- **📱 PWA Desteği** - Offline çalışma, masaüstü yükleme

## 📦 Kurulum

1. Projeyi indirin veya klonlayın:
```bash
git clone https://github.com/yourusername/kahvepos.git
cd KahvePOS
```

2. Dosyaları web sunucunuza yükleyin veya yerel sunucu başlatın:
```bash
# Python ile
python -m http.server 8080

# Veya Node.js ile
npx serve .

# Veya VS Code Live Server eklentisi ile
```

3. Tarayıcıda açın:
```
http://localhost:8080
```

## 🔑 Varsayılan Kullanıcı Bilgileri

| Kullanıcı Adı | Şifre | Rol |
|--------------|-------|-----|
| canakboyraz | 09081993 | Yönetici |
| Barista1 | 1234 | Barista |
| Barista2 | 1234 | Barista |

⚠️ **Önemli:** İlk girişten sonra şifrenizi değiştirin!

## ⌨️ Klavye Kısayolları

| Kısayol | İşlev |
|---------|-------|
| **F1** | Dashboard |
| **F2** | Satış Ekranı / Arama |
| **F3** | Ürünler |
| **F4** | Raporlar |
| **F5** | Kullanıcılar |
| **Enter** | Siparişi Tamamla |
| **Escape** | Modal Kapat / Sepet Temizle |
| **Ctrl+D** | Karanlık Mod |
| **Ctrl+S** | Yedek Al |
| **Ctrl+,** | Ayarlar |

## 🎨 Temalar

Uygulama 5 farklı renk teması sunar:

- ☕ **Kahve** (Varsayılan) - Warm brown tones
- 🌊 **Mavi** - Professional blue
- 🌿 **Yeşil** - Fresh green
- 💜 **Mor** - Elegant purple
- ❤️ **Kırmızı** - Bold red

## 📱 PWA Kurulumu

KahvePOS'u masaüstüne veya mobil cihaza yükleyin:

1. Uygulamayı tarayıcıda açın
2. Adres çubuğundaki yükleme ikonuna tıklayın
3. "Yükle" veya "Add to Home Screen" seçeneğini seçin

## 📁 Proje Yapısı

```
KahvePOS/
├── index.html          # Ana sayfa
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── css/
│   └── style.css      # Ana stil dosyası
├── js/
│   ├── app.js         # Ana uygulama
│   ├── cart.js        # Sepet yönetimi
│   ├── dashboard.js   # Dashboard
│   ├── products.js    # Ürün yönetimi
│   ├── reports.js     # Raporlama
│   ├── sales.js       # Satış işlemleri
│   ├── settings.js    # Ayarlar
│   ├── storage.js     # LocalStorage
│   ├── backup.js      # Yedekleme
│   └── users.js       # Kullanıcı yönetimi
└── icons/            # PWA ikonları
```

## 🌟 Özellikler

### 📊 Dashboard
- Bugünün satış özeti
- Haftalık satış grafiği
- Kategori dağılımı
- En çok satan ürünler
- Hızlı işlem butonları

### 🛒 Satış Ekranı
- Hızlı ürün ekleme
- Kategori filtreleme
- Ürün arama
- İndirim uygulama
- Müşteri notu ekleme

### 📦 Ürün Yönetimi
- Ürün ekleme/düzenleme/silme
- Maliyet ve satış fiyatı
- Kategori atama
- İkon seçimi
- CSV içe/dışa aktarım

### 📈 Raporlama
- Günlük, haftalık, aylık raporlar
- Saatlik satış grafiği
- Top 10 ürün listesi
- Ürün bazlı satış analizi
- Sipariş geçmişi
- Yazdırma desteği

### 👥 Kullanıcı Yönetimi
- Rol tabanlı yetkilendirme
- Şifre değiştirme
- Aktivite takibi
- Otomatik oturum kapatma

### ⚙️ Ayarlar
- Karanlık/aydınlık mod
- Renk teması seçimi
- Otomatik çıkış süresi
- Veri yedekleme
- Veri temizleme

## 🔒 Veri Güvenliği

- Tüm veriler tarayıcıda saklanır (LocalStorage)
- Şifreler düz metin olarak saklanır (geliştirme aşaması)
- Düzenli yedekleme önerilir
- JSON formatında tam yedek alabilirsiniz

## 🖨️ Hugin Yazar Kasa Entegrasyonu

KahvePOS, Hugin 3100/3200 GİB uyumlu yazar kasaları ile entegre çalışabilir.

### Kurulum

1. **Bridge Uygulamasını Başlat:**
   ```bash
   cd hugin-bridge
   npm install
   npm start
   ```

2. **Cihazı Bağla:**
   - Hugin cihazını USB ile bilgisayara bağlayın
   - Windows Aygıt Yöneticisi'nden COM port numarasını öğrenin
   - KahvePOS Ayarlar → Yazar Kasa bölümünden yapılandırın

3. **Test Fişi Yazdır:**
   - Ayarlar menüsünden "Test Fişi" butonuna tıklayın
   - Fiş başarıyla yazdırılıyorsa sistem hazır!

### Özellikler

- ✅ Otomatik fiş yazdırma (sipariş tamamlandığında)
- ✅ GİB uyumlu fiş formatı
- ✅ X Raporu (ara rapor)
- ✅ Z Raporu (günlük kapanış)
- ✅ İndirimli fiş desteği
- ✅ Müşteri notu fişte görünür
- ✅ Bridge bağlantı durumu izleme

### Desteklenen Cihazlar

- Hugin 3100 (USB/COM)
- Hugin 3200 (USB/COM)

Daha fazla bilgi için [`hugin-bridge/README.md`](hugin-bridge/README.md) dosyasına bakın.

## 🌐 Tarayıcı Desteği

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## 📄 Lisans

MIT License - Kullanım, değiştirme ve dağıtım özgür.

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen issue ve pull request gönderin.

## 📞 Destek

Sorunlarınız için GitHub Issues kullanın veya e-posta gönderin.

---

**KahvePOS v3.0** - Kahve dükkanınız için akıllı çözüm ☕
