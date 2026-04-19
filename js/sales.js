/**
 * Sales.js - Supabase Only Mode v5.0
 * Satış işlemleri modülü - Sadece Supabase kullanır
 * LocalStorage kullanılmaz - tüm veriler Supabase'den gelir
 */

// ===== SUPABASE BAĞLANTI KONTROLÜ =====

function checkSupabaseConnection() {
    return typeof window.supabase !== 'undefined' && window.supabase;
}

function isValidUuid(value) {
    return typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getCurrentSupabaseUserId() {
    try {
        if (window.SupabaseService?.currentUser?.id && isValidUuid(window.SupabaseService.currentUser.id)) {
            return window.SupabaseService.currentUser.id;
        }
    } catch (e) {}

    try {
        const sessionUser = sessionStorage.getItem('kahvepos_current_user');
        if (sessionUser) {
            const user = JSON.parse(sessionUser);
            if (user?.id && isValidUuid(user.id)) return user.id;
        }
    } catch (e) {}

    return null;
}

function normalizePaymentMethod(newSale) {
    if (newSale.paymentData && newSale.paymentData.payments) {
        return newSale.paymentData.payments;
    }
    if (typeof newSale.paymentMethod === 'string') {
        return [{ method: newSale.paymentMethod, amount: newSale.totalAmount }];
    }
    return newSale.paymentMethod || [];
}

function buildSupabaseInsertPayload(newSale, options = {}) {
    const paymentMethodJsonb = normalizePaymentMethod(newSale);
    const userId = getCurrentSupabaseUserId();
    const createdAt = newSale.createdAt || new Date().toISOString();
    
    const basePayload = {
        total_amount: newSale.totalAmount || 0,
        total_cost: newSale.totalCost || 0,
        payment_method: paymentMethodJsonb,
        items: newSale.items || [],
        created_at: createdAt,
        sale_date: salesFormatDate(createdAt)
    };

    if (options.includeId && newSale.id) {
        basePayload.id = newSale.id;
    }
    if (userId) {
        basePayload.user_id = userId;
    }

    if (options.minimalSchema) {
        return basePayload;
    }

    return {
        ...basePayload,
        profit: newSale.profit || 0,
        discount_amount: newSale.discountAmount || 0,
        payment_method_text: typeof newSale.paymentMethod === 'string'
            ? newSale.paymentMethod
            : (newSale.paymentMethod?.[0]?.method || 'cash'),
        created_by: newSale.createdBy || 'unknown'
    };
}

async function insertSaleToSupabase(newSale, options = {}) {
    // Session kontrolü ve refresh
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        console.error('❌ Oturum bulunamadı veya süre doldu');
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
    }

    const extendedPayload = buildSupabaseInsertPayload(newSale, {
        includeId: options.includeId,
        minimalSchema: false
    });

    const { data, error } = await window.supabase
        .from('sales')
        .insert(extendedPayload)
        .select();

    // Eski schema için fallback
    if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''))) {
        const minimalPayload = buildSupabaseInsertPayload(newSale, {
            includeId: options.includeId,
            minimalSchema: true
        });

        return await window.supabase
            .from('sales')
            .insert(minimalPayload)
            .select();
    }

    return { data, error };
}

function fromSupabaseSale(s) {
    return {
        id: s.id,
        items: s.items || [],
        totalAmount: s.total_amount,
        totalCost: s.total_cost,
        profit: s.profit,
        discountAmount: s.discount_amount || 0,
        paymentMethod: s.payment_method,
        payment_method_text: s.payment_method_text,
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        syncedAt: s.synced_at
    };
}

// ===== TÜM SATIŞLARI GETİR (Supabase Only) =====

async function getAllSales() {
    if (!checkSupabaseConnection()) {
        console.error('❌ Supabase bağlantısı yok!');
        showToast('İnternet bağlantısı gerekli', 'error');
        return [];
    }

    try {
        const { data, error } = await window.supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedSales = (data || []).map(fromSupabaseSale);
        console.log(`✅ ${formattedSales.length} satış yüklendi (Supabase)`);
        
        return formattedSales;
    } catch (error) {
        console.error('❌ Supabase satış yükleme hatası:', error);
        showToast('Satışlar yüklenirken hata oluştu', 'error');
        return [];
    }
}

// ===== BELİRLİ BİR TARİHTEKİ SATIŞLAR =====

async function getSalesByDate(date) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return [];
    }

    const targetDate = salesFormatDate(date);
    
    try {
        const { data, error } = await window.supabase
            .from('sales')
            .select('*')
            .eq('sale_date', targetDate)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(fromSupabaseSale);
    } catch (error) {
        console.error('❌ getSalesByDate hatası:', error);
        return [];
    }
}

// ===== BUGÜNÜN SATIŞLARI =====

async function getTodaySales() {
    return await getSalesByDate(new Date());
}

// ===== SATIŞ EKLEME (Supabase Only) =====

async function addSale(saleData) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return null;
    }

    const newSale = {
        items: saleData.items || [],
        totalAmount: saleData.totalAmount || 0,
        totalCost: saleData.totalCost || 0,
        profit: saleData.profit || 0,
        discountAmount: saleData.discountAmount || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
        paymentData: saleData.paymentData || null,
        createdBy: saleData.createdBy || getCurrentUserId(),
        createdAt: saleData.createdAt || new Date().toISOString()
    };

    console.log('📦 Satış verisi:', newSale);

    try {
        const result = await insertSaleToSupabase(newSale, { includeId: false });
        console.log('📤 Supabase cevabı:', result);
        
        const { data, error } = result;

        if (error) throw error;

        if (data && data[0]) {
            console.log('✅ Satış Supabase\'e kaydedildi:', data[0].id);
            return fromSupabaseSale(data[0]);
        }

        return newSale;
    } catch (error) {
        console.error('❌ Satış ekleme hatası:', error);
        console.error('❌ Hata detayı:', JSON.stringify(error));
        showToast('Satış kaydedilirken hata oluştu: ' + error.message, 'error');
        return null;
    }
}

// Mevcut kullanıcı ID'sini al
function getCurrentUserId() {
    const session = sessionStorage.getItem('kahvepos_current_user');
    if (session) {
        try {
            const user = JSON.parse(session);
            return user.username || user.id || 'unknown';
        } catch (e) {
            return 'unknown';
        }
    }

    return 'unknown';
}

// ===== TARİH FORMATLAMA =====

function salesFormatDate(date) {
    if (typeof DateUtils !== 'undefined') {
        return DateUtils.formatDate(date);
    }
    // Fallback
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        console.warn('⚠️ salesFormatDate geçersiz tarih:', date);
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
}

// Global formatDate fonksiyonu
function formatDate(date) {
    return salesFormatDate(date);
}

function formatTime(date) {
    if (typeof DateUtils !== 'undefined') {
        return DateUtils.formatTime(date);
    }
    // Fallback
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function formatDateDisplay(date) {
    if (typeof DateUtils !== 'undefined') {
        return DateUtils.formatDateDisplay(date);
    }
    // Fallback
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}.${month}.${year}`;
}

// ===== GÜNLÜK ÖZET =====

function calculateDailySummary(sales) {
    return {
        totalSales: sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0),
        totalCost: sales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0),
        totalProfit: sales.reduce((sum, sale) => sum + (sale.profit || 0), 0),
        orderCount: sales.length,
        itemCount: sales.reduce((sum, sale) => {
            const itemsCount = sale.items ? sale.items.reduce((s, i) => s + (i.quantity || 0), 0) : 0;
            return sum + itemsCount;
        }, 0)
    };
}

// ===== ÜRÜN BAZLI SATIŞ ANALİZİ =====

function calculateProductSales(sales) {
    const productStats = {};
    
    sales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        productId: item.productId,
                        productName: item.productName,
                        productIcon: item.productIcon || '📦',
                        quantity: 0,
                        totalSales: 0,
                        totalCost: 0,
                        profit: 0
                    };
                }
                
                const stats = productStats[item.productId];
                stats.quantity += item.quantity || 0;
                stats.totalSales += (item.unitPrice || 0) * (item.quantity || 0);
                stats.totalCost += (item.costPrice || 0) * (item.quantity || 0);
                stats.profit += ((item.unitPrice || 0) - (item.costPrice || 0)) * (item.quantity || 0);
            });
        }
    });
    
    return Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity);
}

// ===== SATIŞ SİLME (Supabase Only) =====

async function deleteSale(saleId) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return false;
    }

    if (!confirm('Bu satışı silmek istediğinize emin misiniz?')) {
        return false;
    }

    try {
        const { error } = await window.supabase
            .from('sales')
            .delete()
            .eq('id', saleId);

        if (error) throw error;
        
        showToast('Satış silindi', 'success');
        return true;
    } catch (error) {
        console.error('❌ Satış silme hatası:', error);
        showToast('Satış silinirken hata oluştu', 'error');
        return false;
    }
}

// ===== TARİH ARALIĞI =====

async function getSalesByDateRange(startDate, endDate) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return [];
    }

    const start = salesFormatDate(startDate);
    const end = salesFormatDate(endDate);

    try {
        const { data, error } = await window.supabase
            .from('sales')
            .select('*')
            .gte('sale_date', start)
            .lte('sale_date', end)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(fromSupabaseSale);
    } catch (error) {
        console.error('❌ getSalesByDateRange hatası:', error);
        return [];
    }
}

async function getLastNDaysSales(days) {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days + 1);
    
    return await getSalesByDateRange(startDate, today);
}

// ===== CSV DÖNÜŞTÜRME =====

function exportSalesToCSV(sales) {
    const headers = ['Tarih', 'Saat', 'Ürünler', 'Satış', 'Maliyet', 'Kar'];
    const rows = sales.map(sale => {
        const itemsStr = sale.items ? 
            sale.items.map(item => `${item.productName} x${item.quantity}`).join(', ') : 
            '';
        return [
            formatDateDisplay(new Date(sale.createdAt)),
            formatTime(new Date(sale.createdAt)),
            `"${itemsStr}"`,
            (sale.totalAmount || 0).toFixed(2),
            (sale.totalCost || 0).toFixed(2),
            (sale.profit || 0).toFixed(2)
        ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
}

function downloadSalesCSV(sales, filename = 'satislar.csv') {
    const csv = exportSalesToCSV(sales);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// ===== GLOBAL WINDOW EXPORTS =====

window.Sales = {
    getAllSales,
    getSalesByDate,
    getTodaySales,
    addSale,
    deleteSale,
    getSalesByDateRange,
    getLastNDaysSales,
    calculateDailySummary,
    calculateProductSales,
    exportSalesToCSV,
    downloadSalesCSV
};

window.addSale = addSale;
window.getAllSales = getAllSales;
window.getSalesByDate = getSalesByDate;
window.getTodaySales = getTodaySales;
window.deleteSale = deleteSale;
window.getSalesByDateRange = getSalesByDateRange;
window.getLastNDaysSales = getLastNDaysSales;
window.calculateDailySummary = calculateDailySummary;
window.calculateProductSales = calculateProductSales;
window.formatDate = formatDate;
window.salesFormatDate = salesFormatDate;
window.formatDateDisplay = formatDateDisplay;
