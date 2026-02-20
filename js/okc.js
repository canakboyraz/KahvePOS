/**
 * OKC.js
 * Yazar Kasa (ÖKC) Entegrasyon Modülü - Hugin Bridge Bağlantısı
 * KahvePOS v4.0
 */

const OKC = {
    // Bridge API URL'i
    bridgeUrl: 'http://localhost:3000/api',
    
    // Ayarlar
    enabled: false,
    autoPrint: true,
    port: 'auto',
    connected: false,
    
    // Son durum bilgileri
    lastStatus: null,
    lastError: null,

    /**
     * Modülü başlat ve ayarları yükle
     */
    init() {
        this.loadSettings();
        
        // Eğer aktifse, bridge durumunu kontrol et
        if (this.enabled) {
            this.checkStatus();
            
            // Her 30 saniyede bir durum kontrolü
            setInterval(() => {
                if (this.enabled) {
                    this.checkStatus();
                }
            }, 30000);
        }
    },

    /**
     * Ayarları localStorage'dan yükle
     */
    loadSettings() {
        const settings = Storage.get('okc_settings');
        if (settings) {
            this.enabled = settings.enabled || false;
            this.autoPrint = settings.autoPrint !== false;
            this.port = settings.port || 'auto';
        }
        return settings;
    },

    /**
     * Ayarları localStorage'a kaydet
     */
    saveSettings() {
        const settings = {
            enabled: this.enabled,
            autoPrint: this.autoPrint,
            port: this.port
        };
        Storage.set('okc_settings', settings);
        return true;
    },

    /**
     * Bridge ve cihaz durumunu kontrol et
     */
    async checkStatus() {
        try {
            const response = await fetch(`${this.bridgeUrl}/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                this.lastStatus = data;
                this.connected = data.device && data.device.connected;
                this.lastError = null;
                return data;
            } else {
                throw new Error('Bridge yanıt vermedi');
            }
        } catch (error) {
            this.lastStatus = null;
            this.connected = false;
            this.lastError = error.message;
            return {
                success: false,
                bridge: { running: false },
                device: { connected: false },
                error: error.message
            };
        }
    },

    /**
     * Mevcut COM portlarını listele
     */
    async listPorts() {
        try {
            const response = await fetch(`${this.bridgeUrl}/ports`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                return data.ports || [];
            }
            return [];
        } catch (error) {
            console.error('Port listesi alınamadı:', error);
            return [];
        }
    },

    /**
     * Belirtilen porta bağlan
     */
    async connect(port = 'auto', baudRate = 9600) {
        try {
            const response = await fetch(`${this.bridgeUrl}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port, baudRate })
            });

            const data = await response.json();
            
            if (data.success) {
                this.connected = true;
                this.port = port;
                this.saveSettings();
                showToast('Yazar kasaya bağlanıldı', 'success');
            } else {
                throw new Error(data.error || 'Bağlantı başarısız');
            }
            
            return data;
        } catch (error) {
            this.connected = false;
            showToast('Yazar kasa bağlantısı başarısız: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Bağlantıyı kes
     */
    async disconnect() {
        try {
            const response = await fetch(`${this.bridgeUrl}/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            this.connected = false;
            return data;
        } catch (error) {
            console.error('Bağlantı kesme hatası:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fiş yazdır
     */
    async printReceipt(orderData) {
        // ÖKC kapalıysa, atla
        if (!this.enabled) {
            return { success: true, skipped: true, message: 'ÖKC devre dışı' };
        }

        try {
            // Fiş verilerini hazırla
            const receiptData = {
                items: orderData.items.map(item => ({
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    costPrice: item.costPrice || 0
                })),
                subtotal: orderData.subtotal || orderData.totalAmount,
                discount: orderData.discountAmount || 0,
                total: orderData.totalAmount,
                note: orderData.customerNote || '',
                payment: 'NAKIT' // Varsayılan ödeme türü
            };

            // Bridge'e gönder
            const response = await fetch(`${this.bridgeUrl}/print-receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(receiptData)
            });

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    receiptNo: result.receiptNo,
                    timestamp: result.timestamp
                };
            } else {
                throw new Error(result.error || 'Fiş yazdırılamadı');
            }

        } catch (error) {
            console.error('ÖKC Fiş yazdırma hatası:', error);
            return {
                success: false,
                error: error.message || 'Bridge bağlantısı yok'
            };
        }
    },

    /**
     * Test fişi yazdır
     */
    async printTestReceipt() {
        if (!this.enabled) {
            showToast('ÖKC devre dışı. Lütfen önce aktif edin.', 'warning');
            return { success: false, error: 'ÖKC devre dışı' };
        }

        try {
            const response = await fetch(`${this.bridgeUrl}/test-print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (result.success) {
                showToast('Test fişi yazdırıldı! Fiş No: ' + result.receiptNo, 'success');
            } else {
                throw new Error(result.error);
            }

            return result;

        } catch (error) {
            showToast('Test fişi yazdırılamadı: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    },

    /**
     * X Raporu yazdır (Ara rapor)
     */
    async printXReport() {
        try {
            const response = await fetch(`${this.bridgeUrl}/x-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            
            if (result.success) {
                showToast('X Raporu yazdırıldı', 'success');
            } else {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            showToast('X Raporu yazdırılamadı: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    },

    /**
     * Z Raporu yazdır (Günlük kapanış)
     */
    async printZReport() {
        if (!confirm('Z Raporu günü kapatır ve sıfırlar. Devam etmek istediğinize emin misiniz?')) {
            return { success: false, cancelled: true };
        }

        try {
            const response = await fetch(`${this.bridgeUrl}/z-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            
            if (result.success) {
                showToast('Z Raporu yazdırıldı - Gün kapatıldı', 'success');
            } else {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            showToast('Z Raporu yazdırılamadı: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    },

    /**
     * ÖKC'yi aç/kapat
     */
    toggle(enabled) {
        this.enabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            // Aktif edildiğinde bridge durumunu kontrol et
            this.checkStatus();
        }
    },

    /**
     * Otomatik yazdırmayı aç/kapat
     */
    setAutoPrint(enabled) {
        this.autoPrint = enabled;
        this.saveSettings();
    },

    /**
     * COM portunu ayarla
     */
    setPort(port) {
        this.port = port;
        this.saveSettings();
    }
};

// Sayfa yüklendiğinde OKC modülünü başlat
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        OKC.init();
    });
}

