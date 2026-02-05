/**
 * Payments.js
 * Ödeme Yöntemleri Yönetimi Modülü - KahvePOS v3.0
 * 
 * Özellikler:
 * - Çoklu ödeme yöntemi desteği
 * - Split payment (birden fazla ödeme)
 * - Bahşiş ekleme
 * - Kasa sayımı
 */

const Payment = {
    // Ödeme yöntemleri
    methods: {
        CASH: {
            id: 'cash',
            name: 'Nakit',
            icon: '💵',
            color: '#4CAF50'
        },
        CREDIT_CARD: {
            id: 'credit_card',
            name: 'Kredi Kartı',
            icon: '💳',
            color: '#2196F3'
        },
        DEBIT_CARD: {
            id: 'debit_card',
            name: 'Banka Kartı',
            icon: '💳',
            color: '#FF9800'
        },
        TRANSFER: {
            id: 'transfer',
            name: 'Havale/EFT',
            icon: '🏦',
            color: '#9C27B0'
        },
        MOBILE: {
            id: 'mobile',
            name: 'Mobil Ödeme',
            icon: '📱',
            color: '#E91E63'
        },
        CREDIT: {
            id: 'credit',
            name: 'Borç/Veresİye',
            icon: '📝',
            color: '#F44336'
        }
    },

    // Mevcut ödemeler
    payments: [],
    tipAmount: 0,
    
    /**
     * Ödeme yöntemi bilgisi getir
     */
    getMethod(methodId) {
        return this.methods[methodId.toUpperCase()] || this.methods.CASH;
    },

    /**
     * Tüm ödeme yöntemlerini listele
     */
    getMethods() {
        return Object.values(this.methods);
    },

    /**
     * Ödeme ekle
     */
    addPayment(methodId, amount) {
        const method = this.getMethod(methodId);
        
        this.payments.push({
            id: Date.now(),
            method: method.id,
            methodName: method.name,
            amount: parseFloat(amount),
            timestamp: new Date().toISOString()
        });

        this.updatePaymentSummary();
    },

    /**
     * Ödemeyi kaldır
     */
    removePayment(paymentId) {
        this.payments = this.payments.filter(p => p.id !== paymentId);
        this.updatePaymentSummary();
    },

    /**
     * Tüm ödemeleri temizle
     */
    clearPayments() {
        this.payments = [];
        this.tipAmount = 0;
        this.updatePaymentSummary();
    },

    /**
     * Toplam ödeme miktarını hesapla
     */
    getTotalPaid() {
        return this.payments.reduce((sum, p) => sum + p.amount, 0);
    },

    /**
     * Kalan ödeme miktarı
     */
    getRemainingAmount(totalAmount) {
        return totalAmount - this.getTotalPaid();
    },

    /**
     * Ödemeler tamamlanmış mı?
     */
    isPaymentComplete(totalAmount) {
        return this.getTotalPaid() >= totalAmount;
    },

    /**
     * Bahşiş miktarını ayarla
     */
    setTipAmount(amount) {
        this.tipAmount = parseFloat(amount) || 0;
        this.updatePaymentSummary();
    },

    /**
     * Ödeme özetini güncelle (UI)
     */
    updatePaymentSummary() {
        const container = document.getElementById('payment-entries');
        const summaryContainer = document.getElementById('payment-summary');
        
        if (!container) return;

        // Ödeme listesi
        if (this.payments.length === 0) {
            container.innerHTML = `
                <div class="payment-empty">
                    <p>Henüz ödeme eklenmedi</p>
                </div>
            `;
        } else {
            container.innerHTML = this.payments.map(payment => {
                const method = this.getMethod(payment.method);
                return `
                    <div class="payment-entry">
                        <span class="payment-icon">${method.icon}</span>
                        <span class="payment-method">${payment.methodName}</span>
                        <span class="payment-amount">${payment.amount.toFixed(2)} ₺</span>
                        <button class="payment-remove" onclick="Payment.removePayment(${payment.id})">✕</button>
                    </div>
                `;
            }).join('');
        }

        // Özet
        const totalPaid = this.getTotalPaid();
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="payment-summary-row">
                    <span>Toplam Ödeme:</span>
                    <span id="payment-total-paid">${totalPaid.toFixed(2)} ₺</span>
                </div>
                <div class="payment-summary-row">
                    <span>Kalan:</span>
                    <span id="payment-remaining" class="${totalPaid > 0 ? 'text-success' : 'text-warning'}">
                        ${this.getRemainingAmount(getCartTotal()).toFixed(2)} ₺
                    </span>
                </div>
            `;
        }

        // Tamamla butonu durumunu güncelle
        const completeBtn = document.getElementById('payment-complete-btn');
        if (completeBtn) {
            completeBtn.disabled = !this.isPaymentComplete(getCartTotal());
        }
    },

    /**
     * Ödemeyi tamamla
     */
    async completePayment(orderData) {
        // Ödeme bilgilerini siparişe ekle
        orderData.payments = [...this.payments];
        orderData.tipAmount = this.tipAmount;
        orderData.totalPaid = this.getTotalPaid();
        orderData.paymentMethods = this.payments.map(p => p.method);

        // Ödeme dağılımı
        const paymentBreakdown = this.getPaymentBreakdown();
        orderData.paymentBreakdown = paymentBreakdown;

        return orderData;
    },

    /**
     * Ödeme dağılımını getir (rapor için)
     */
    getPaymentBreakdown() {
        const breakdown = {};
        
        this.payments.forEach(payment => {
            if (!breakdown[payment.method]) {
                breakdown[payment.method] = {
                    method: payment.methodName,
                    amount: 0,
                    count: 0
                };
            }
            breakdown[payment.method].amount += payment.amount;
            breakdown[payment.method].count++;
        });

        return Object.values(breakdown);
    },

    /**
     * Günlük ödeme özeti
     */
    async getDailyPaymentSummary(date = new Date()) {
        const sales = getSalesByDate(date);
        const summary = {
            date: formatDate(date),
            total: 0,
            byMethod: {}
        };

        // Başlangıç değerleri
        Object.keys(this.methods).forEach(key => {
            const method = this.methods[key];
            summary.byMethod[method.id] = {
                name: method.name,
                icon: method.icon,
                amount: 0,
                count: 0
            };
        });

        // Satışları topla
        sales.forEach(sale => {
            summary.total += sale.totalAmount;

            if (sale.paymentBreakdown) {
                sale.paymentBreakdown.forEach(payment => {
                    const methodKey = Object.keys(this.methods).find(
                        key => this.methods[key].id === payment.method || 
                               this.methods[key].name === payment.method
                    );
                    
                    if (methodKey) {
                        const method = this.methods[methodKey];
                        summary.byMethod[method.id].amount += payment.amount;
                        summary.byMethod[method.id].count += payment.count;
                    }
                });
            } else {
                // Eski format (tek ödeme yöntemi)
                const methodKey = Object.keys(this.methods).find(
                    key => this.methods[key].name === sale.paymentMethod ||
                           this.methods[key].id === sale.paymentMethod
                );
                if (methodKey) {
                    summary.byMethod[this.methods[methodKey].id].amount += sale.totalAmount;
                    summary.byMethod[this.methods[methodKey].id].count++;
                }
            }
        });

        return summary;
    },

    /**
     * Kasa sayımı
     */
    async getCashCount(expectedAmount, actualAmount) {
        return {
            expected: parseFloat(expectedAmount),
            actual: parseFloat(actualAmount),
            difference: parseFloat(actualAmount) - parseFloat(expectedAmount),
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Hızlı ödeme (tek tıklama ile)
     */
    quickPay(methodId, amount) {
        this.clearPayments();
        this.addPayment(methodId, amount);
        return this.isPaymentComplete(amount);
    }
};

// ============================
// YARDIMCI FONKSİYONLAR
// ============================

/**
 * Sepet toplamını al (cart.js'den)
 */
function getCartTotal() {
    if (typeof calculateCartTotal === 'function') {
        return calculateCartTotal();
    }
    return 0;
}

/**
 * Satışları tarihe göre filtrele
 */
function getSalesByDate(date) {
    const sales = Storage.getSales() || [];
    const targetDate = formatDateForPayment(date);
    
    return sales.filter(sale => {
        const saleDate = formatDateForPayment(new Date(sale.createdAt));
        return saleDate === targetDate;
    });
}

/**
 * Tarihi formatla (YYYY-MM-DD)
 */
function formatDateForPayment(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Global scope'a ekle
if (typeof window !== 'undefined') {
    window.Payment = Payment;
}
