/**
 * Sales.js
 * Satış işlemleri modülü
 */

// Tüm satışları getir
function getAllSales() {
    return Storage.getSales();
}

// Belirli bir tarihteki satışları getir
function getSalesByDate(date) {
    const sales = getAllSales();
    const targetDate = formatDate(date);
    
    return sales.filter(sale => {
        const saleDate = formatDate(new Date(sale.createdAt));
        return saleDate === targetDate;
    });
}

// Bugünün satışlarını getir
function getTodaySales() {
    return getSalesByDate(new Date());
}

// Tarih formatla (YYYY-MM-DD)
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Saat formatla (HH:MM)
function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Tarih görüntüleme formatı (GG.AA.YYYY)
function formatDateDisplay(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}.${month}.${year}`;
}

// Günlük özet hesapla
function calculateDailySummary(sales) {
    return {
        totalSales: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        totalCost: sales.reduce((sum, sale) => sum + sale.totalCost, 0),
        totalProfit: sales.reduce((sum, sale) => sum + sale.profit, 0),
        orderCount: sales.length,
        itemCount: sales.reduce((sum, sale) => sum + sale.itemCount, 0)
    };
}

// Ürün bazlı satış analizi
function calculateProductSales(sales) {
    const productStats = {};
    
    sales.forEach(sale => {
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
            stats.quantity += item.quantity;
            stats.totalSales += item.unitPrice * item.quantity;
            stats.totalCost += item.costPrice * item.quantity;
            stats.profit += (item.unitPrice - item.costPrice) * item.quantity;
        });
    });
    
    // Satış miktarına göre sırala
    return Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity);
}

// Satış silme (admin için)
function deleteSale(saleId) {
    const sales = getAllSales();
    const updatedSales = sales.filter(sale => sale.id !== saleId);
    Storage.saveSales(updatedSales);
    return true;
}

// Belirli bir tarih aralığındaki satışları getir
function getSalesByDateRange(startDate, endDate) {
    const sales = getAllSales();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= start && saleDate <= end;
    });
}

// Son N günün satışlarını getir
function getLastNDaysSales(days) {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days + 1);
    
    return getSalesByDateRange(startDate, today);
}

// Satış verilerini CSV'ye dönüştür
function exportSalesToCSV(sales) {
    const headers = ['Tarih', 'Saat', 'Ürünler', 'Satış', 'Maliyet', 'Kar'];
    const rows = sales.map(sale => {
        const itemsStr = sale.items.map(item => `${item.productName} x${item.quantity}`).join(', ');
        return [
            formatDateDisplay(new Date(sale.createdAt)),
            formatTime(new Date(sale.createdAt)),
            `"${itemsStr}"`,
            sale.totalAmount.toFixed(2),
            sale.totalCost.toFixed(2),
            sale.profit.toFixed(2)
        ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
}

// CSV indirme
function downloadSalesCSV(sales, filename = 'satislar.csv') {
    const csv = exportSalesToCSV(sales);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
