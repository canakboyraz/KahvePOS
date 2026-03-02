/**
 * Sales.js - Hybrid Supabase Mode v4.0
 * Satış işlemleri modülü - Online (Supabase) + Offline (localStorage) desteği
 */

// Durum değişkenleri
let salesIsOnline = navigator.onLine;
let salesOfflineQueue = [];
let localSalesCache = [];

// ===== SUPABASE BAĞLANTI KONTROLÜ =====

function salesCheckSupabaseConnection() {
    return typeof window.supabase !== 'undefined' &&
           window.supabase &&
           salesIsOnline;
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
    
    // Debug: createdAt değerini kontrol et
    console.log('🔍 salesFormatDate GİRİŞ:', { createdAt, typeof: typeof createdAt });
    
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
    const extendedPayload = buildSupabaseInsertPayload(newSale, {
        includeId: options.includeId,
        minimalSchema: false
    });

    const { data, error } = await window.supabase
        .from('sales')
        .insert(extendedPayload)
        .select();

    // 001 schema gibi eski kurulumlarda olmayan kolonlara fallback yap
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

function buildSaleDeleteFilter(data) {
    const filters = [];
    if (data?.id) filters.push(`id.eq.${data.id}`);
    if (data?.supabaseId) filters.push(`id.eq.${data.supabaseId}`);
    return filters.join(',');
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
    if (!salesCheckSupabaseConnection() || salesOfflineQueue.length === 0) {
        return;
    }

    const initialQueueLength = salesOfflineQueue.length;
    const failedItems = [];

    for (const item of salesOfflineQueue) {
        try {
            switch (item.operation) {
                case 'add':
                    if (isValidUuid(item.data?.id)) {
                        const existingCheck = await window.supabase
                            .from('sales')
                            .select('id')
                            .eq('id', item.data.id)
                            .maybeSingle();

                        if (existingCheck.error) throw existingCheck.error;

                        if (existingCheck.data) {
                            const updatePayload = {
                                total_amount: item.data.totalAmount || 0,
                                total_cost: item.data.totalCost || 0,
                                payment_method: normalizePaymentMethod(item.data),
                                items: item.data.items || []
                            };

                            const { error: updateError } = await window.supabase
                                .from('sales')
                                .update(updatePayload)
                                .eq('id', item.data.id);

                            if (updateError) throw updateError;
                            break;
                        }
                    }

                    const insertResult = await insertSaleToSupabase(item.data, { includeId: true });
                    if (insertResult.error) throw insertResult.error;
                    break;
                case 'delete':
                    const deleteFilter = buildSaleDeleteFilter(item.data);
                    if (!deleteFilter) break;
                    const { error: deleteError } = await window.supabase
                        .from('sales')
                        .delete()
                        .or(deleteFilter);
                    if (deleteError) throw deleteError;
                    break;
            }
        } catch (error) {
            console.error('Sales sync hatasi:', error);
            failedItems.push(item);
        }
    }

    salesOfflineQueue = failedItems;
    saveSalesOfflineQueue();

    if (failedItems.length === 0 && initialQueueLength > 0) {
        showToast('Satis verileri senkronize edildi', 'success');
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
    
    console.log('📊 getAllSales çağrıldı', {
        online: salesIsOnline,
        supabaseExists: !!window.supabase,
        localCacheSize: localSalesCache.length,
        checkResult: salesCheckSupabaseConnection()
    });

    // ⚠️ DEBUG: Supabase bağlantı problemi teşhisi
    if (!window.supabase) {
        console.error('❌ KRITIK: window.supabase tanımlı DEĞİL! SDK yüklenmemiş olabilir');
    }
    if (!salesIsOnline) {
        console.warn('⚠️ Offline modda - localStorage kullanılıyor');
    }

    if (salesCheckSupabaseConnection()) {
        try {
            // SUPABASE'DEN VERI ÇEK - KRITIK DÜZELTME
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
                    payment_method_text: s.payment_method_text,
                    createdBy: s.created_by,
                    createdAt: s.created_at,
                    updatedAt: s.updated_at,
                    syncedAt: s.synced_at
                }));

                // MERGE LOGIC: Supabase + localStorage birleştir
                // Local'de Supabase'de olmayan satışlar varsa ekle
                const supabaseIds = new Set(formattedSales.map(s => s.id));
                const localOnly = localSalesCache.filter(s => !supabaseIds.has(s.id));
                
                localSalesCache = [...formattedSales, ...localOnly];
                Storage.saveSales(localSalesCache);
                
                console.log('📊 getAllSales sonucu - Supabase+Local merged:', {
                    fromSupabase: formattedSales.length,
                    fromLocalOnly: localOnly.length,
                    totalMerged: localSalesCache.length
                });
                
                return localSalesCache;
            }
        } catch (error) {
            console.error('❌ Supabase satış yükleme hatası:', error);
        }
    } else {
        console.warn('⚠️ Supabase bağlantısı yok, localStorage kullanılıyor');
    }

    // Offline mod - localStorage'u kullan
    console.log('📊 getAllSales - localStorage fallback:', localSalesCache.length);
    return localSalesCache;
}

// ===== BELİRLİ BİR TARİHTEKİ SATIŞLAR =====

async function getSalesByDate(date) {
    const targetDate = formatDate(date);
    
    console.log('📅 getSalesByDate çağrıldı:', targetDate);
    
    // Önce Supabase'den tarih bazlı sorgu dene (daha hızlı)
    if (salesCheckSupabaseConnection()) {
        try {
            const { data, error } = await window.supabase
                .from('sales')
                .select('*')
                .eq('sale_date', targetDate)
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
                    payment_method_text: s.payment_method_text,
                    createdBy: s.created_by,
                    createdAt: s.created_at,
                    updatedAt: s.updated_at
                }));

                // Local'de de o tarihte satış varsa merge et
                const localSales = await getAllSales();
                const supabaseIds = new Set(formattedSales.map(s => s.id));
                const localForDate = localSales.filter(sale => {
                    const saleDate = formatDate(new Date(sale.createdAt));
                    return saleDate === targetDate && !supabaseIds.has(sale.id);
                });
                
                const merged = [...formattedSales, ...localForDate];
                console.log('📅 getSalesByDate Supabase sonucu:', merged.length);
                return merged;
            }
        } catch (error) {
            console.error('❌ getSalesByDate Supabase hatası:', error);
        }
    }
    
    // Fallback: Tüm sales'ten filtrele
    const sales = await getAllSales();
    const filtered = sales.filter(sale => {
        const saleDate = formatDate(new Date(sale.createdAt));
        return saleDate === targetDate;
    });
    
    console.log('📅 getSalesByDate fallback sonucu:', filtered.length);
    return filtered;
}

// ===== BUGÜNÜN SATIŞLARI =====

async function getTodaySales() {
    return await getSalesByDate(new Date());
}

// ===== SATIŞ EKLEME =====

async function addSale(saleData) {
    const localId = saleData.id || generateSaleUUID();
    const newSale = {
        id: localId,
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

    // Local storage'a ekle (her zaman)
    localSalesCache.unshift(newSale);
    Storage.saveSales(localSalesCache);

    // Supabase'e kaydet
    console.log('🔍 SUPABASE KONTROL BAŞLIYOR...', {
        supabaseDefined: typeof window.supabase !== 'undefined',
        supabaseExists: !!window.supabase,
        isOnline: salesIsOnline,
        checkResult: salesCheckSupabaseConnection(),
        supabaseFromWindow: !!window.supabase,
        supabaseFrom: window.supabase ? 'found' : 'NOT FOUND'
    });

    if (salesCheckSupabaseConnection()) {
        console.log('✅ Supabase bağlantısı var, kayıt deneniyor...');
        try {
            const { data, error } = await insertSaleToSupabase(newSale, { includeId: false });

            console.log('📊 INSERT SONUCU:', { data, error });

            if (error) {
                console.error('❌ Supabase INSERT error:', error);
                throw error;
            }

            // Supabase'in urettigi UUID'yi localStorage'a da kaydet
            if (data && data[0]) {
                newSale.supabaseId = data[0].id;
                const cacheIndex = localSalesCache.findIndex(s => s.id === localId);
                if (cacheIndex !== -1) {
                    localSalesCache[cacheIndex].supabaseId = data[0].id;
                    Storage.saveSales(localSalesCache);
                }
            }
            console.log("✅ Satis Supabase'e kaydedildi:", data);
        } catch (error) {
            console.error('❌ Supabase satis ekleme hatasi:', error.message || error);
            console.error('❌ HATA DETAYI:', error);
            addSalesToOfflineQueue('add', newSale);
        }
    } else {
        console.warn('⚠️ Supabase baglantisi yok, offline kuyruga ekleniyor');
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
    const session = sessionStorage.getItem('kahvepos_current_user');
    if (session) {
        try {
            const user = JSON.parse(session);
            return user.username || user.id || 'unknown';
        } catch (e) {
            return 'unknown';
        }
    }

    const legacySession = localStorage.getItem('currentUser');
    if (legacySession) {
        try {
            const user = JSON.parse(legacySession);
            return user.username || user.id || 'unknown';
        } catch (e) {
            return 'unknown';
        }
    }

    return 'unknown';
}

// ===== TARİH FORMATLAMA =====
// Not: DateUtils (utils.js) yüklendiyse onu kullan, yoksa fallback

function salesFormatDate(date) {
    if (typeof DateUtils !== 'undefined') {
        return DateUtils.formatDate(date);
    }
    // Fallback: Eski formatDate fonksiyonu
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

// Global formatDate fonksiyonu (legacy kod için)
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
    const saleToDelete = localSalesCache.find(sale => sale.id === saleId);
    const deletePayload = {
        id: saleId,
        supabaseId: saleToDelete?.supabaseId
    };

    // Local storage'dan sil
    localSalesCache = localSalesCache.filter(sale => sale.id !== saleId);
    Storage.saveSales(localSalesCache);

    if (salesCheckSupabaseConnection()) {
        try {
            const deleteFilter = buildSaleDeleteFilter(deletePayload);
            if (!deleteFilter) throw new Error('Silinecek satış kimliği bulunamadı');

            const { error } = await window.supabase
                .from('sales')
                .delete()
                .or(deleteFilter);

            if (error) throw error;
            showToast('Satış silindi (Senkronize)', 'success');
        } catch (error) {
            console.error('Supabase satış silme hatası:', error);
            addSalesToOfflineQueue('delete', deletePayload);
            showToast('Satış silindi (Offline kuyrukta)', 'warning');
        }
    } else {
        addSalesToOfflineQueue('delete', deletePayload);
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

window.addEventListener('online', () => {
    salesIsOnline = true;
    console.log('🌐 Online olundu, offline queue senkronize ediliyor...');
    syncSalesOfflineChanges().then(() => {
        console.log('✅ Offline queue senkronizasyonu tamamlandı');
        // Rapor sayfası açıksa, verileri yenile
        if (window.loadReport) {
            window.loadReport();
        }
    }).catch(error => {
        console.error('❌ Offline queue senkronizasyonu başarısız:', error);
    });
});

window.addEventListener('offline', () => {
    salesIsOnline = false;
    console.log('⚠️ Offline moduna geçildi');
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

// 🚀 KRITIK FIX: Global scope'ta direkt erişim için (cart.js ve reports.js tarafından çağrıldığı için)
window.addSale = addSale;
window.getAllSales = getAllSales;
window.getSalesByDate = getSalesByDate;
window.getTodaySales = getTodaySales;
window.deleteSale = deleteSale;
window.getSalesByDateRange = getSalesByDateRange;
window.getLastNDaysSales = getLastNDaysSales;
window.calculateDailySummary = calculateDailySummary;
window.calculateProductSales = calculateProductSales;

