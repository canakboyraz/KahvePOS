# 🖨️ Hugin ÖKC Bridge - KahvePOS Entegrasyonu

Hugin Yazar Kasa (ÖKC) cihazlarını KahvePOS web uygulaması ile entegre eden köprü uygulaması.

## 📋 Gereksinimler

- **Node.js** v16.0.0 veya üzeri
- **Hugin 3100/3200** yazar kasa cihazı
- **USB/COM** kablosu
- **Windows** işletim sistemi

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle

```bash
cd hugin-bridge
npm install
```

### 2. Yapılandırma

`config.json` dosyasını düzenleyin:

```json
{
  "port": 3000,
  "defaultPort": "COM3",
  "baudRate": 9600,
  "autoConnect": true,
  "firmName": "Kahve Dükkanım",
  "firmAddress": "Örnek Mah. İstanbul",
  "vkn": "1234567890"
}
```

### 3. Bridge'i Başlat

```bash
npm start
```

Başarılı başlatma sonrası şunu görmelisiniz:

```
╔═══════════════════════════════════════════════════╗
║     🖨️  Hugin ÖKC Bridge - KahvePOS               ║
╠═══════════════════════════════════════════════════╣
║     Sunucu çalışıyor: http://localhost:3000      ║
╚═══════════════════════════════════════════════════╝
```

## 📡 API Referansı

### Durum Kontrolü

```
GET /api/status
```

**Yanıt:**
```json
{
  "success": true,
  "bridge": {
    "running": true,
    "version": "1.0.0",
    "uptime": 123.456
  },
  "device": {
    "connected": true,
    "port": "COM3",
    "baudRate": 9600,
    "ready": true
  }
}
```

### COM Portlarını Listele

```
GET /api/ports
```

**Yanıt:**
```json
{
  "success": true,
  "ports": [
    {
      "path": "COM1",
      "manufacturer": "FTDI",
      "serialNumber": "A12345"
    }
  ]
}
```

### Cihaza Bağlan

```
POST /api/connect
Content-Type: application/json

{
  "port": "COM3",
  "baudRate": 9600
}
```

### Fiş Yazdır

```
POST /api/print-receipt
Content-Type: application/json

{
  "items": [
    {
      "productName": "Türk Kahvesi",
      "quantity": 2,
      "unitPrice": 35.00,
      "costPrice": 15.00
    }
  ],
  "subtotal": 70.00,
  "discount": 5.00,
  "total": 65.00,
  "note": "Şekersiz",
  "payment": "NAKIT"
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Fiş başarıyla yazdırıldı",
  "receiptNo": "000001",
  "timestamp": "2025-02-04T12:30:00.000Z"
}
```

### Test Fişi

```
POST /api/test-print
```

### X Raporu (Ara Rapor)

```
POST /api/x-report
```

### Z Raporu (Günlük Kapanış)

```
POST /api/z-report
```

## 🔧 COM Port Algılama

### Windows'ta COM Port Numarasını Bulma:

1. **Aygıt Yöneticisi**'ni açın
2. **Bağlantı Noktaları (COM & LPT)** bölümünü genişletin
3. "USB Serial Port (COMx)" olarak görünen portu not edin
4. Bu port numarasını `config.json`'a yazın

### Sürücü Kurulumu:

Hugin cihazı tanınmıyorsa:
1. Hugin'in resmi web sitesinden sürücüleri indirin
2. Sürücüleri yükleyin
3. Bilgisayarı yeniden başlatın

## 🐛 Sorun Giderme

### "Port açılamıyor" hatası

- Port başka bir uygulama tarafından kullanılıyor olabilir
- Cihaz bağlı değil veya kapalı olabilir
- COM port numarası yanlış olabilir

### "Cihaz algılanamıyor" hatası

- USB kablosunu kontrol edin
- Cihazı açıp kapayın
- Sürücülerin yüklü olduğundan emin olun

### Fiş yazdırılmıyor

- Kağıt bitmiş olabilir
- Cihaz meşgul olabilir (önceki işlem)
- Bağlantıyı kesip yeniden bağlayın

## 📜 Lisans

MIT License - KahvePOS
