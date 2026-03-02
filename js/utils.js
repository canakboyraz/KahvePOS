/**
 * KahvePOS - Ortak Yardımcı Fonksiyonlar (utils.js)
 * Tüm modüller tarafından kullanılan shared utility fonksiyonları
 */

// ===== TARİH İŞLEMLERİ =====

const DateUtils = {
    /**
     * Tarihi YYYY-MM-DD formatına çevir (Supabase / input[type=date] uyumlu)
     * @param {Date|string} date
     * @returns {string} YYYY-MM-DD
     */
    formatDate(date) {
        const d = date instanceof Date ? date : new Date(date);

        if (isNaN(d.getTime())) {
            console.warn('⚠️ DateUtils.formatDate: Geçersiz tarih:', date);
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Tarihi DD.MM.YYYY formatında göster
     * @param {Date|string} date
     * @returns {string} DD.MM.YYYY
     */
    formatDateDisplay(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    },

    /**
     * Saati HH:MM formatında göster
     * @param {Date|string} date
     * @returns {string} HH:MM
     */
    formatTime(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    },

    /**
     * Bugünün tarihini YYYY-MM-DD formatında döndür
     * @returns {string} YYYY-MM-DD
     */
    today() {
        return this.formatDate(new Date());
    },

    /**
     * İki tarihin aynı gün olup olmadığını kontrol et
     * @param {Date|string} date1
     * @param {Date|string} date2
     * @returns {boolean}
     */
    isSameDay(date1, date2) {
        return this.formatDate(date1) === this.formatDate(date2);
    }
};

// ===== PARA BİRİMİ İŞLEMLERİ =====

const CurrencyUtils = {
    /**
     * Sayıyı para birimi formatına çevir
     * @param {number} amount
     * @returns {string} "1.234,56 ₺"
     */
    format(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '0,00 ₺';
        }
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' ₺';
    },

    /**
     * String'i sayıya çevir (para birimi parse)
     * @param {string} value
     * @returns {number}
     */
    parse(value) {
        if (!value) return 0;
        return parseFloat(String(value).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    }
};

// ===== GENEL YARDIMCILAR =====

/**
 * UUID oluştur
 * @returns {string}
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Veri boyutunu KB formatında döndür
 * @param {any} data
 * @returns {string}
 */
function getDataSize(data) {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json).length;
    return (bytes / 1024).toFixed(1) + ' KB';
}

// ===== GLOBAL EXPORT =====

window.DateUtils = DateUtils;
window.CurrencyUtils = CurrencyUtils;
window.generateUUID = generateUUID;
window.getDataSize = getDataSize;

console.log('🛠️ KahvePOS utils.js yüklendi');
