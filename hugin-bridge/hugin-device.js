/**
 * Hugin Device Module
 * Hugin Yazar Kasa (ÖKC) cihazı ile Serial iletişim yönetimi
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const config = require('./config');

class HuginDevice {
    constructor() {
        this.port = null;
        this.parser = null;
        this.currentPort = null;
        this.baudRate = config.baudRate || 9600;
        this.isConnected = false;
        this.receiptCounter = 0;
        
        // Fiş numarası için basit sayaç (gerçek uygulamada veritabanından alınmalı)
        this.lastReceiptNo = 0;
    }

    /**
     * Mevcut COM portlarını listele
     */
    async listPorts() {
        try {
            const ports = await SerialPort.list();
            
            // Windows'ta COM portlarını filtrele
            const comPorts = ports
                .filter(p => p.path && (p.path.includes('COM') || p.path.includes('/dev/tty')))
                .map(p => ({
                    path: p.path,
                    manufacturer: p.manufacturer || 'Bilinmeyen',
                    serialNumber: p.serialNumber || '-',
                    productId: p.productId || '-'
                }));
            
            return comPorts;
        } catch (error) {
            throw new Error('COM portları listelenemedi: ' + error.message);
        }
    }

    /**
     * Cihaza bağlan
     * @param {string} portPath - COM port yolu (COM1, COM2, vb. veya 'auto' için otomatik)
     * @param {number} baudRate - Baud rate (varsayılan: 9600)
     */
    async connect(portPath = 'auto', baudRate = 9600) {
        try {
            // Eğer port 'auto' ise, otomatik algıla
            if (portPath === 'auto') {
                const detectedPort = await this.autoDetectPort();
                if (!detectedPort) {
                    throw new Error('Hugin cihazı otomatik algılanamadı. Lütfen COM portunu manuel seçin.');
                }
                portPath = detectedPort;
            }

            // Zaten bağlıysa, önce bağlantıyı kes
            if (this.isConnected && this.port) {
                await this.disconnect();
            }

            // Serial port oluştur
            this.port = new SerialPort({
                path: portPath,
                baudRate: baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                autoOpen: false
            });

            // Parser oluştur (satır bazlı okuma)
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

            // Promise wrapper for open
            await new Promise((resolve, reject) => {
                this.port.open((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            this.currentPort = portPath;
            this.baudRate = baudRate;
            this.isConnected = true;

            // Cihazı başlat (ESC @ komutu - reset)
            await this.sendCommand('\x1B@');

            console.log(`[Hugin] ${portPath} portuna bağlandı (${baudRate} baud)`);
            
            return { connected: true, port: portPath };
            
        } catch (error) {
            this.isConnected = false;
            this.port = null;
            throw new Error(`Bağlantı hatası (${portPath}): ${error.message}`);
        }
    }

    /**
     * Bağlantıyı kes
     */
    async disconnect() {
        if (this.port && this.isOpen()) {
            try {
                await new Promise((resolve) => {
                    this.port.close(resolve);
                });
                console.log(`[Hugin] ${this.currentPort} bağlantısı kapatıldı`);
            } catch (error) {
                console.error('[Hugin] Kapatma hatası:', error.message);
            }
        }
        this.isConnected = false;
        this.port = null;
        this.currentPort = null;
    }

    /**
     * Portun açık olup olmadığını kontrol et
     */
    isOpen() {
        return this.port && this.port.isOpen;
    }

    /**
     * Cihaz durumunu getir
     */
    async getStatus() {
        const ports = await this.listPorts();
        
        return {
            connected: this.isConnected,
            port: this.currentPort,
            baudRate: this.baudRate,
            availablePorts: ports.length,
            ready: this.isConnected && this.isOpen()
        };
    }

    /**
     * Hugin cihazını otomatik algıla
     */
    async autoDetectPort() {
        const ports = await this.listPorts();
        
        // Hugin cihazları için bilinen VID/PID çiftleri
        // Not: Gerçek VID/PID değerleri Hugin dokümantasyonundan alınmalı
        const huginVIDs = ['0456', '0483', '0403']; // Örnek değerler
        
        // Önce Hugin olarak tanınan portları ara
        for (const portInfo of ports) {
            if (portInfo.manufacturer && 
                (portInfo.manufacturer.includes('Hugin') || 
                 portInfo.manufacturer.includes('Datecs') ||
                 portInfo.manufacturer.includes('Custom'))) {
                return portInfo.path;
            }
        }
        
        // Eğer bulunamazsa, ilk COM portunu dene
        if (ports.length > 0) {
            return ports[0].path;
        }
        
        return null;
    }

    /**
     * Komut gönder
     * @param {string} command - Gönderilecek komut
     */
    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen()) {
                reject(new Error('Cihaz bağlı değil'));
                return;
            }

            this.port.write(command, (err) => {
                if (err) {
                    reject(new Error('Komut gönderme hatası: ' + err.message));
                } else {
                    // Komutun işlenmesi için kısa bir gecikme
                    setTimeout(resolve, 100);
                }
            });
        });
    }

    /**
     * Fiş yazdır
     * @param {Object} receiptData - Fiş verileri
     */
    async printReceipt(receiptData) {
        if (!this.isConnected || !this.isOpen()) {
            throw new Error('Cihaz bağlı değil. Lütfen önce bağlanın.');
        }

        try {
            // Fiş numarasını artır
            this.lastReceiptNo++;
            const receiptNo = this.lastReceiptNo;

            // Fiş başlığı
            await this.printHeader(receiptNo);

            // Satırları yazdır
            for (const item of receiptData.items) {
                await this.printItem(item);
            }

            // İndirim varsa yazdır
            if (receiptData.discount > 0) {
                await this.printDiscount(receiptData.discount);
            }

            // Toplam ve ödeme
            await this.printTotal(receiptData);

            // Müşteri notu
            if (receiptData.note) {
                await this.printNote(receiptData.note);
            }

            // Fiş sonu
            await this.printFooter(receiptNo);

            return {
                success: true,
                receiptNo: receiptNo,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error('Fiş yazdırma hatası: ' + error.message);
        }
    }

    /**
     * Fiş başlığı yazdır
     */
    async printHeader(receiptNo) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR');
        const timeStr = now.toLocaleTimeString('tr-TR');

        // ESC @ - Initialize
        await this.sendCommand('\x1B@');
        
        // Fiş başı boşluklar
        await this.sendCommand('\n\n');
        
        // Firma adı (ortalanmış)
        await this.printCentered(config.firmName || 'KahvePOS');
        
        // Adres
        if (config.firmAddress) {
            await this.printCentered(config.firmAddress);
        }
        
        // VKN
        if (config.vkn) {
            await this.printCentered(`VKN: ${config.vkn}`);
        }
        
        // Ayırıcı
        await this.sendCommand('─'.repeat(40) + '\n');
        
        // Fiş bilgisi
        await this.sendCommand(`Fiş No: ${String(receiptNo).padStart(6, '0')}\n`);
        await this.sendCommand(`Tarih:  ${dateStr}\n`);
        await this.sendCommand(`Saat:   ${timeStr}\n`);
        await this.sendCommand('─'.repeat(40) + '\n');
        
        // Tablo başlığı
        await this.sendCommand('ÜRÜN'.padEnd(30) + ' ADET   TUTAR\n');
        await this.sendCommand('─'.repeat(40) + '\n');
    }

    /**
     * Ürün satırı yazdır
     */
    async printItem(item) {
        const lineTotal = item.quantity * item.unitPrice;
        
        // Ürün adı (ilk 30 karakter)
        const productName = (item.productName || '').substring(0, 30);
        
        // Format: "Ürün Adı              2 x 35.00 = 70.00"
        const qtyStr = String(item.quantity);
        const priceStr = item.unitPrice.toFixed(2);
        const totalStr = lineTotal.toFixed(2);
        
        await this.sendCommand(`${productName}\n`);
        await this.sendCommand(
            ' '.repeat(30 - qtyStr.length - priceStr.length) +
            `${qtyStr} x ${priceStr} = ${totalStr} ₺\n`
        );
    }

    /**
     * İndirim yazdır
     */
    async printDiscount(discountAmount) {
        await this.sendCommand('─'.repeat(40) + '\n');
        await this.sendCommand(
            'İNDİRIM'.padEnd(32) + `${discountAmount.toFixed(2)} ₺\n`
        );
    }

    /**
     * Toplam ve ödeme yazdır
     */
    async printTotal(receiptData) {
        await this.sendCommand('═'.repeat(40) + '\n');
        
        // Ara toplam
        await this.sendCommand(
            'ARA TOPLAM'.padEnd(32) + `${receiptData.subtotal.toFixed(2)} ₺\n`
        );
        
        // Genel toplam
        await this.sendCommand(
            'GENEL TOPLAM'.padEnd(32) + `${receiptData.total.toFixed(2)} ₺\n`
        );
        
        await this.sendCommand('═'.repeat(40) + '\n');
        
        // Ödeme türü
        const paymentText = receiptData.payment === 'KREDI_KARTI' 
            ? 'KREDİ KARTI' 
            : 'NAKİT';
        
        await this.sendCommand(
            paymentText.padEnd(32) + `${receiptData.total.toFixed(2)} ₺\n`
        );
    }

    /**
     * Müşteri notu yazdır
     */
    async printNote(note) {
        await this.sendCommand('\n');
        await this.sendCommand('Not: ' + note + '\n');
    }

    /**
     * Fiş sonu yazdır
     */
    async printFooter(receiptNo) {
        await this.sendCommand('\n');
        await this.sendCommand('─'.repeat(40) + '\n');
        await this.printCentered('Teşekkürler!');
        await this.printCentered('KahvePOS ile çalışıldı');
        await this.sendCommand('\n\n\n');
        
        // Fiş kesme komutu (ESC d - partial cut, ESC m - full cut)
        await this.sendCommand('\x1D\x56\x42\x00'); // Partial cut
        
        // E - Fiş sonlandırma komutu (GİB için)
        await this.sendCommand('\x1BE\n');
    }

    /**
     * Ortalanmış metin yazdır
     */
    async printCentered(text) {
        const width = 40;
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        await this.sendCommand(' '.repeat(padding) + text + '\n');
    }

    /**
     * Test fişi yazdır
     */
    async printTestReceipt() {
        const testData = {
            items: [
                {
                    productName: 'Türk Kahvesi',
                    quantity: 2,
                    unitPrice: 35.00,
                    costPrice: 15.00
                },
                {
                    productName: 'Su',
                    quantity: 1,
                    unitPrice: 5.00,
                    costPrice: 2.00
                },
                {
                    productName: 'Kuru Çikolata',
                    quantity: 3,
                    unitPrice: 20.00,
                    costPrice: 12.00
                }
            ],
            subtotal: 100.00,
            discount: 5.00,
            total: 95.00,
            note: 'Test Fişi - Cihaz Çalışıyor',
            payment: 'NAKIT',
            timestamp: new Date()
        };

        return await this.printReceipt(testData);
    }

    /**
     * X Raporu yazdır (Ara rapor)
     */
    async printXReport() {
        if (!this.isConnected || !this.isOpen()) {
            throw new Error('Cihaz bağlı değil');
        }

        // X raporu komutu
        await this.sendCommand('\x1BX\n');
        
        return { success: true };
    }

    /**
     * Z Raporu yazdır (Günlük kapanış)
     */
    async printZReport() {
        if (!this.isConnected || !this.isOpen()) {
            throw new Error('Cihaz bağlı değil');
        }

        // Z raporu komutu
        await this.sendCommand('\x1BZ\n');
        
        return { success: true };
    }
}

module.exports = HuginDevice;
