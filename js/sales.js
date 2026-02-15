/**
 * Sales.js - Hybrid Supabase Mode v4.0
 * Satış işlemleri modülü - Online (Supabase) + Offline (localStorage) desteği
 */

// Durum değişkenleri
let salesIsOnline = navigator.onLine;
let salesOfflineQueue = [];
let localSalesCache = [];

// ===== SUPABASE BAĞLANTI KONTROLÜ =====

function checkSupabaseConnection() {
    return typeof window.supabase !== 'undefined' &&
           window.supabase &&
           salesIsOnline;
}

// ===== OFFLINE QUEUE =====

function loadSalesOfflineQueue() {
    try {
        salesOfflineQueue = JSON.parse(localStorage.getItem('sales_offline_queue') || '[]');
    } catch (e) {
        salesOfflineQueue = [];
    }
}

function saveSalesOfflineQueue() {
    try {
        localStorage.setItem('sales_offline_queue', JSON.stringify(salesOfflineQueue));
    } catch (e) {
        console.error('Sales offline queue kaydedilemedi:', e);
    }
}

function addSalesToOfflineQueue(operation, data) {
    salesOfflineQueue.push({
        id: Date.now().toString(),
        operation,
        data,
        timestamp: new Date().toISOString()
    });
    saveSalesOfflineQueue();
}

async function syncSalesOfflineChanges() {
    if (!checkSupabaseConnection() || salesOfflineQueue.length === 0) {
        return;
    }

    const failedItems = [];

    for (const item of salesOfflineQueue) {
        try {
            switch (item.operation) {
                case 'add':
                    // Supabase'de ID varsa güncelle, yoksa ekle
                    const existingCheck = await window.supabase
                        .from('sales')
                        .select('id')
                        .eq('id', item.data.id)
                        .single();
                    
                    if (existingCheck.data) {
                        // Zaten var, güncelle
                        await window.supabase
                            .from('sales')
                            .update({
                                total_amount: item.data.totalAmount,
                                total_cost: item.data.totalCost,
                                profit: item.data.profit,
                                discount_amount: item.data.discountAmount || 0,
                                payment_method: item.data.paymentMethod,
                                items: item.data.items,
                                created_by: item.data.createdBy,
                                synced_at: new Date().toISOString()
                            })
                            .eq('id', item.data.id);
                    } else {
                        // Yeni ekle
                        await window.supabase
                            .from('sales')
                            .insert({
                                id: item.data.id,
                                total_amount: item.data.totalAmount,
                                total_cost: item.data.totalCost,
                                profit: item.data.profit,
                                discount_amount: item.data.discountAmount || 0,
                                payment_method: item.data.paymentMethod,
                                items: item.data.items,
                                created_by: item.data.createdBy,
                                created_at: item.data.createdAt
                            });
                    }
                    break;
                case 'delete':
                    await window.supabase
                        .from('sales')
                        .delete()
                        .eq('id', item.data.id);
                    break;
            }
        } catch (error) {
            console.error('Sales sync hatası:', error);
            failedItems.push(item);
        }
    }

    salesOfflineQueue = failedItems;
    saveSalesOfflineQueue();
    
    if (failedItems.length === 0 && salesOfflineQueue.length !== failedItems.length) {
        showToast('Satış verileri senkronize edildi', 'success');
    }
}

// ===== LOCAL CACHE =====

function updateLocalSaleCache(supabaseSale) {
    const formattedSale = {
        id: supabaseSale.id,
        items: supabaseSale.items || [],
        totalAmount: supabaseSale.total_amount,
        totalCost: supabaseSale.total_cost,
        profit: supabaseSale.profit,
        discountAmount: supabaseSale.discount_amount || 0,
        paymentMethod: supabaseSale.payment_method,
        createdBy: supabaseSale.created_by,
        createdAt: supabaseSale.created_at,
        updatedAt: supabaseSale.updated_at,
        syncedAt: supabaseSale.synced_at
    };

    const existingIndex = localSalesCache.findIndex(s => s.id === formattedSale.id);
    if (existingIndex !== -1) {
        localSalesCache[existingIndex] = formattedSale;
    } else {
        localSalesCache.push(formattedSale);
    }

    Storage.saveSales(localSalesCache);
}

// ===== TÜM SATIŞLARI GETİR =====

async function getAllSales() {
    loadSalesOfflineQueue();
    localSalesCache = Storage.getSales() || [];

    if (checkSupabaseConnection()) {
        try {
            const { data, error } = await window.supabase
                .from('sales')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                const formattedSales = data.map(s => ({
                    id: s.id,
                    items: s.items || [],
                    totalAmount: s.total_amount,
                    totalCost: s.total_cost,
                    profit: s.profit,
                    discountAmount: s.discount_amount || 0,
                    paymentMethod: s.payment_method,
                    createdBy: s.created_by,
                    createdAt: s.created_at,
                    updatedAt: s.updated_at,
                    syncedAt: s.synced_at
                }));

                // Local cache güncelle
                localSalesCache = formattedSales;
                Storage.saveSales(localSalesCache);
                
                return formattedSales;
            }
        } catch (error) {
            console.error('Supabase satış yükleme hatası:', error);
        }
    }

    // Offline mod - localStorage'u kullan
    return localSalesCache;
}

// ===== BELİRLİ BİR TARİHTEKİ SATIŞLAR =====

async function getSalesByDate(date) {
    const sales = await getAllSales();
    const targetDate = formatDate(date);
    
    return sales.filter(sale => {
        const saleDate = formatDate(new Date(sale.createdAt));
        return saleDate === targetDate;
    });
}

// ===== BUGÜNÜN SATIŞLARI =====

async function getTodaySales() {
    return await getSalesByDate(new Date());
}

// ===== SATIŞ EKLEME =====

async function addSale(saleData) {
    const newSale = {
        id: saleData.id || generateSaleUUID(),
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

    // Local storage'a ekle
    localSalesCache.unshift(newSale);
    Storage.saveSales(localSalesCache);

    // Supabase'e kaydet
    console.log('🔍 Supabase bağlantı kontrolü:', {
        supabaseDefined: typeof window.supabase !== 'undefined',
        supabaseExists: !!window.supabase,
        isOnline: salesIsOnline,
        checkResult: checkSupabaseConnection()
    });

    if (checkSupabaseConnection()) {
        try {
            // payment_method: Schema'da JSONB - uyumlu format oluştur
            let paymentMethodJsonb;
            if (newSale.paymentData && newSale.paymentData.payments) {
                // Detaylı ödeme bilgisi varsa onu kullan
                paymentMethodJsonb = newSale.paymentData.payments;
            } else if (typeof newSale.paymentMethod === 'string') {
                // String ise JSONB array formatına çevir
                paymentMethodJsonb = [{ method: newSale.paymentMethod, amount: newSale.totalAmount }];
            } else {
                paymentMethodJsonb = newSale.paymentMethod;
            }

            const insertData = {
                id: newSale.id,
                total_amount: newSale.totalAmount,
                total_cost: newSale.totalCost,
                profit: newSale.profit,
                discount_amount: newSale.discountAmount,
                payment_method: paymentMethodJsonb,
                payment_method_text: typeof newSale.paymentMethod === 'string' ? newSale.paymentMethod : (newSale.paymentMethod?.[0]?.method || 'cash'),
                items: newSale.items,
                created_by: newSale.createdBy,
                created_at: newSale.createdAt
            };

            console.log('📤 Supabase INSERT data:', insertData);

            const { data, error } = await window.supabase
                .from('sales')
                .insert(insertData)
                .select();

            if (error) {
                console.error('❌ Supabase INSERT error:', error);
                throw error;
            }
            console.log('✅ Satış Supabase\'e kaydedildi:', data);
        } catch (error) {
            console.error('❌ Supabase satış ekleme hatası:', error.message || error);
            addSalesToOfflineQueue('add', newSale);
        }
    } else {
        console.warn('⚠️ Supabase bağlantısı yok, offline kuyruğa ekleniyor');
        addSalesToOfflineQueue('add', newSale);
    }

    return newSale;
}

// UUID oluşturucu
function generateSaleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Mevcut kullanıcı ID'sini al
function getCurrentUserId() {
    const session = localStorage.getItem('currentUser');
    if (session) {
        try {
            const user = JSON.parse(session);
            return user.id || user.username || 'unknown';
        } catch (e) {
            return 'unknown';
        }
    }
    return 'unknown';
}

// ===== TARİH FORMATLAMA =====

function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function formatDateDisplay(date) {
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

// ===== ÜRÜRÜN BAZLI SATIŞ ANALİZİ =====

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

// ===== SATIŞ SİLME =====

async function deleteSale(saleId) {
    // Local storage'dan sil
    localSalesCache = localSalesCache.filter(sale => sale.id !== saleId);
    Storage.saveSales(localSalesCache);

    if (checkSupabaseConnection()) {
        try {
            const { error } = await window.supabase
                .from('sales')
                .delete()
                .eq('id', saleId);

            if (error) throw error;
            showToast('Satış silindi (Senkronize)', 'success');
        } catch (error) {
            console.error('Supabase satış silme hatası:', error);
            addSalesToOfflineQueue('delete', { id: saleId });
            showToast('Satış silindi (Offline kuyrukta)', 'warning');
        }
    } else {
        addSalesToOfflineQueue('delete', { id: saleId });
    }

    return true;
}

// ===== TARİH ARALIĞI =====

async function getSalesByDateRange(startDate, endDate) {
    const sales = await getAllSales();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= start && saleDate <= end;
    });
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

// ===== ONLINE/OFFLINE EVENT LISTENERS =====

window.addEventListener('online', () => {
    salesIsOnline = true;
    syncSalesOfflineChanges();
});

window.addEventListener('offline', () => {
    salesIsOnline = false;
});

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
    loadSalesOfflineQueue();
    
    // Eğer offline queue varsa ve online isek, sync et
    if (navigator.onLine && salesOfflineQueue.length > 0) {
        syncSalesOfflineChanges();
    }
});

// ===== GLOBAL WINDOW EXPORTS =====

// Geriye uyumluluk için mevcut fonksiyonları koru
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
