/**
 * Hugin ÖKC Bridge Server
 * KahvePOS Web Uygulaması ile Hugin Yazar Kasa arasında köprü
 * 
 * Port: 3000
 * Bağlantı: USB/COM Serial
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const HuginDevice = require('./hugin-device');
const config = require('./config');

const app = express();
const PORT = config.port || 3000;

// Hugin cihaz örneği
const hugin = new HuginDevice();

// Middleware
app.use(cors({
    origin: '*', // KahvePOS'tan erişim için
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ============ API ENDPOINTS ============

/**
 * GET /api/status
 * Bridge ve cihaz durumunu kontrol et
 */
app.get('/api/status', async (req, res) => {
    try {
        const status = await hugin.getStatus();
        res.json({
            success: true,
            bridge: {
                running: true,
                version: '1.0.0',
                uptime: process.uptime()
            },
            device: status
        });
    } catch (error) {
        res.json({
            success: false,
            bridge: {
                running: true,
                version: '1.0.0',
                uptime: process.uptime()
            },
            device: {
                connected: false,
                error: error.message
            }
        });
    }
});

/**
 * GET /api/ports
 * Mevcut COM portlarını listele
 */
app.get('/api/ports', async (req, res) => {
    try {
        const ports = await hugin.listPorts();
        res.json({
            success: true,
            ports: ports
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/connect
 * Belirtilen COM portuna bağlan
 */
app.post('/api/connect', async (req, res) => {
    try {
        const { port, baudRate } = req.body;
        await hugin.connect(port, baudRate);
        res.json({
            success: true,
            message: `${port} portuna bağlanıldı`,
            port: port
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/disconnect
 * Bağlantıyı kapat
 */
app.post('/api/disconnect', async (req, res) => {
    try {
        await hugin.disconnect();
        res.json({
            success: true,
            message: 'Bağlantı kapatıldı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/print-receipt
 * Fiş yazdır
 * 
 * Body:
 * {
 *   items: [{ productName, quantity, unitPrice, costPrice }],
 *   subtotal: number,
 *   discount: number,
 *   total: number,
 *   note: string,
 *   payment: "NAKIT" | "KREDI_KARTI"
 * }
 */
app.post('/api/print-receipt', async (req, res) => {
    try {
        const { items, subtotal, discount, total, note, payment } = req.body;
        
        // Validasyon
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz sipariş verisi: items dizisi gerekli'
            });
        }
        
        if (total === undefined || total <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz toplam tutar'
            });
        }
        
        // Fiş yazdır
        const result = await hugin.printReceipt({
            items,
            subtotal: subtotal || total,
            discount: discount || 0,
            total,
            note: note || '',
            payment: payment || 'NAKIT',
            timestamp: new Date()
        });
        
        res.json({
            success: true,
            message: 'Fiş başarıyla yazdırıldı',
            receiptNo: result.receiptNo,
            timestamp: result.timestamp
        });
        
    } catch (error) {
        console.error('Fiş yazdırma hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Fiş yazdırılamadı'
        });
    }
});

/**
 * POST /api/test-print
 * Test fişi yazdır
 */
app.post('/api/test-print', async (req, res) => {
    try {
        const result = await hugin.printTestReceipt();
        res.json({
            success: true,
            message: 'Test fişi yazdırıldı',
            receiptNo: result.receiptNo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/x-report
 * X Raporu (Ara rapor)
 */
app.post('/api/x-report', async (req, res) => {
    try {
        const result = await hugin.printXReport();
        res.json({
            success: true,
            message: 'X Raporu yazdırıldı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/z-report
 * Z Raporu (Günlük kapanış)
 */
app.post('/api/z-report', async (req, res) => {
    try {
        const result = await hugin.printZReport();
        res.json({
            success: true,
            message: 'Z Raporu yazdırıldı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/config
 * Mevcut yapılandırmayı getir
 */
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: {
            port: hugin.currentPort,
            baudRate: hugin.baudRate,
            firmName: config.firmName,
            firmAddress: config.firmAddress,
            vkn: config.vkn
        }
    });
});

/**
 * POST /api/config
 * Yapılandırmayı güncelle
 */
app.post('/api/config', async (req, res) => {
    try {
        const { firmName, firmAddress, vkn, port, baudRate } = req.body;
        
        // Config dosyasını güncelle
        const fs = require('fs');
        const newConfig = {
            ...config,
            firmName: firmName || config.firmName,
            firmAddress: firmAddress || config.firmAddress,
            vkn: vkn || config.vkn,
            defaultPort: port || config.defaultPort,
            baudRate: baudRate || config.baudRate
        };
        
        fs.writeFileSync('./config.json', JSON.stringify(newConfig, null, 2));
        
        res.json({
            success: true,
            message: 'Yapılandırma güncellendi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============ ERROR HANDLING ============

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint bulunamadı'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Sunucu hatası:', err);
    res.status(500).json({
        success: false,
        error: 'Sunucu hatası: ' + err.message
    });
});

// ============ SERVER START ============

app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║     🖨️  Hugin ÖKC Bridge - KahvePOS               ║');
    console.log('╠═══════════════════════════════════════════════════╣');
    console.log(`║     Sunucu çalışıyor: http://localhost:${PORT}      ║`);
    console.log('║                                                   ║');
    console.log('║     API Endpoints:                                ║');
    console.log('║     GET  /api/status       - Durum kontrolü       ║');
    console.log('║     GET  /api/ports        - COM portları         ║');
    console.log('║     POST /api/connect      - Cihaza bağlan        ║');
    console.log('║     POST /api/print-receipt - Fiş yazdır          ║');
    console.log('║     POST /api/test-print   - Test fişi            ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    
    // Otomatik bağlantı denemesi
    if (config.autoConnect && config.defaultPort) {
        console.log(`[AUTO] ${config.defaultPort} portuna bağlanılıyor...`);
        hugin.connect(config.defaultPort, config.baudRate)
            .then(() => console.log(`[AUTO] ${config.defaultPort} portuna bağlandı!`))
            .catch(err => console.log(`[AUTO] Bağlantı başarısız: ${err.message}`));
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nKapatılıyor...');
    await hugin.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nKapatılıyor...');
    await hugin.disconnect();
    process.exit(0);
});
