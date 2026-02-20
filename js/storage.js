/**
 * Storage.js
 * LocalStorage işlemlerini yöneten modül
 */

const Storage = {
    // Depolama anahtarları
    KEYS: {
        PRODUCTS: 'kahvepos_products',
        SALES: 'kahvepos_sales',
        FIRST_LOAD: 'kahvepos_first_load'
    },

    // Veri alma
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Veri okuma hatası (${key}):`, error);
            return null;
        }
    },

    // Veri kaydetme
    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Veri kaydetme hatası (${key}):`, error);
            return false;
        }
    },

    // Veri silme
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Veri silme hatası (${key}):`, error);
            return false;
        }
    },

    // Ürün işlemleri
    getProducts() {
        return this.get(this.KEYS.PRODUCTS) || [];
    },

    saveProducts(products) {
        return this.set(this.KEYS.PRODUCTS, products);
    },

    // Satış işlemleri
    getSales() {
        return this.get(this.KEYS.SALES) || [];
    },

    saveSales(sales) {
        return this.set(this.KEYS.SALES, sales);
    },

    addSale(sale) {
        const sales = this.getSales();
        sales.push(sale);
        return this.saveSales(sales);
    },

    // İlk yükleme kontrolü
    isFirstLoad() {
        return !this.get(this.KEYS.FIRST_LOAD);
    },

    markFirstLoadComplete() {
        return this.set(this.KEYS.FIRST_LOAD, true);
    },

    // Veri dışa aktarma
    exportData() {
        return {
            products: this.getProducts(),
            sales: this.getSales(),
            exportDate: new Date().toISOString()
        };
    },

    // Veri içe aktarma
    importData(data) {
        if (data.products) {
            this.saveProducts(data.products);
        }
        if (data.sales) {
            this.saveSales(data.sales);
        }
        return true;
    },

    // Tüm verileri temizle
    clearAll() {
        localStorage.removeItem(this.KEYS.PRODUCTS);
        localStorage.removeItem(this.KEYS.SALES);
        this.remove(this.KEYS.FIRST_LOAD);
    }
};

// Global erişim için
window.Storage = Storage;

