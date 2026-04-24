/**
 * Trendyol.js
 * Trendyol Yemek Entegrasyon Modülü - KahvePOS v4.0
 * 
 * Özellikler:
 * - Trendyol siparişlerini otomatik çekme
 * - Webhook ile anlık sipariş alma
 * - Ürün eşleştirme (SKU / İsim bazlı)
 * - Sipariş durumu takibi
 */

const Trendyol = {
    // Ayarlar
    enabled: false,
    autoSync: true,
    syncInterval: null,
    syncIntervalMs: 5 * 60 * 1000, // 5 dakika
    
    // Supabase Edge Function URL'leri
    webhookUrl: null,
    ordersUrl: null,
    
    // Son senkronizasyon
    lastSync: null,
    lastOrderCount: 0,

    /**
     * Modülü başlat
     */
    init() {
        this.loadSettings();
        
        // Edge Function URL'leri
        const supabaseUrl = 'https://rnibcfiwsleobsdlfqfg.supabase.co';
        this.webhookUrl = `${supabaseUrl}/functions/v1/trendyol-webhook`;
        this.ordersUrl = `${supabaseUrl}/functions/v1/trendyol-orders`;
        
        if (this.enabled && this.autoSync) {
            this.startAutoSync();
        }
        
        console.log(`🛵 Trendyol modülü ${this.enabled ? 'aktif' : 'pasif'}`);
    },

    /**
     * Ayarları yükle
     */
    loadSettings() {
        const settings = localStorage.getItem('kahvepos_trendyol_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.enabled = parsed.enabled || false;
            this.autoSync = parsed.autoSync !== false;
            this.syncIntervalMs = parsed.syncIntervalMs || 5 * 60 * 1000;
        }
    },

    /**
     * Ayarları kaydet
     */
    saveSettings() {
        localStorage.setItem('kahvepos_trendyol_settings', JSON.stringify({
            enabled: this.enabled,
            autoSync: this.autoSync,
            syncIntervalMs: this.syncIntervalMs
        }));
    },

    /**
     * Otomatik senkronizasyonu başlat
     */
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // İlk senkronizasyonu hemen yap
        this.fetchOrders();
        
        // Periyodik senkronizasyon
        this.syncInterval = setInterval(() => {
            this.fetchOrders();
        }, this.syncIntervalMs);
        
        console.log(`🔄 Trendyol otomatik senkronizasyon başladı (${this.syncIntervalMs / 1000}s)`);
    },

    /**
     * Otomatik senkronizasyonu durdur
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    },

    /**
     * Trendyol'dan yeni siparişleri çek
     */
    async fetchOrders() {
        if (!this.enabled) return { success: false, error: 'Trendyol devre dışı' };
        
        try {
            const supabaseUrl = 'https://rnibcfiwsleobsdlfqfg.supabase.co';
            const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaWJjZml3c2xlMGJzZGxmcWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MzA1NDAsImV4cCI6MjA1NDUwNjU0MH0.R3vH3KGN1jXZOVwMY0fSx6gW1dJPYB8nTcRPbHGJCsg';
            
            const response = await fetch(
                `${supabaseUrl}/functions/v1/trendyol-orders?action=fetch`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const result = await response.json();
            this.lastSync = new Date();
            
            if (result.success) {
                this.lastOrderCount = result.processed || 0;
                if (result.processed > 0) {
                    showToast(`🛵 Trendyol: ${result.processed} yeni sipariş!`, 'success');
                    // Dashboard'u güncelle
                    if (typeof refreshDashboard === 'function') {
                        refreshDashboard();
                    }
                }
                console.log(`✅ Trendyol sync: ${result.message}`);
            } else {
                console.warn('⚠️ Trendyol sync hatası:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Trendyol fetch error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Trendyol siparişlerini listele
     */
    async listOrders() {
        try {
            const supabaseUrl = 'https://rnibcfiwsleobsdlfqfg.supabase.co';
            const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaWJjZml3c2xlMGJzZGxmcWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MzA1NDAsImV4cCI6MjA1NDUwNjU0MH0.R3vH3KGN1jXZOVwMY0fSx6gW1dJPYB8nTcRPbHGJCsg';
            
            const response = await fetch(
                `${supabaseUrl}/functions/v1/trendyol-orders?action=list`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const result = await response.json();
            return result.orders || [];
        } catch (error) {
            console.error('❌ Trendyol list error:', error);
            return [];
        }
    },

    /**
     * Trendyol modülünü aç/kapat
     */
    toggle(enabled) {
        this.enabled = enabled;
        this.saveSettings();
        
        if (enabled && this.autoSync) {
            this.startAutoSync();
        } else {
            this.stopAutoSync();
        }
    },

    /**
     * Durum bilgisi al
     */
    getStatus() {
        return {
            enabled: this.enabled,
            autoSync: this.autoSync,
            lastSync: this.lastSync,
            lastOrderCount: this.lastOrderCount,
            isRunning: !!this.syncInterval
        };
    }
};

// Sayfa yüklendiğinde başlat
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        Trendyol.init();
    });
}
