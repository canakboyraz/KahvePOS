/**
 * Dashboard.js
 * Dashboard sayfası yönetimi - canlı istatistikler ve grafikler
 */

let weeklySalesChart = null;
let categoryChart = null;
let paymentMethodChart = null;
let hourlySalesChart = null;

// Dashboard verilerini yükle
async function loadDashboard() {
    await updateDashboardStats();
    await loadWeeklySalesChart();
    await loadCategoryChart();
    await loadPaymentMethodsChart();
    await loadTopProducts();
}

// Dashboard istatistiklerini güncelle
async function updateDashboardStats() {
    const todaySales = await getTodaySales();
    const summary = calculateDailySummary(todaySales);
    
    // Bugünün satışları
    document.getElementById('dash-today-sales').textContent = summary.totalSales.toFixed(2) + ' ₺';
    document.getElementById('dash-today-profit').textContent = summary.totalProfit.toFixed(2) + ' ₺';
    document.getElementById('dash-order-count').textContent = summary.orderCount;
    
    // Ürün sayısı
    document.getElementById('dash-product-count').textContent = allProducts.filter(p => p.active).length;
    
    // Dünkü satışlarla karşılaştırma (yüzde değişim)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySales = await getSalesByDate(yesterday);
    const yesterdaySummary = calculateDailySummary(yesterdaySales);
    
    if (yesterdaySummary.totalSales > 0) {
        const salesChange = ((summary.totalSales - yesterdaySummary.totalSales) / yesterdaySummary.totalSales * 100).toFixed(1);
        const profitChange = ((summary.totalProfit - yesterdaySummary.totalProfit) / Math.max(yesterdaySummary.totalProfit, 1) * 100).toFixed(1);
        
        const salesChangeEl = document.getElementById('dash-sales-change');
        const profitChangeEl = document.getElementById('dash-profit-change');
        
        salesChangeEl.textContent = (salesChange >= 0 ? '↑ ' : '↓ ') + Math.abs(salesChange) + '%';
        salesChangeEl.className = 'stat-change ' + (salesChange >= 0 ? 'positive' : 'negative');
        
        profitChangeEl.textContent = (profitChange >= 0 ? '↑ ' : '↓ ') + Math.abs(profitChange) + '%';
        profitChangeEl.className = 'stat-change ' + (profitChange >= 0 ? 'positive' : 'negative');
    }
}

// Haftalık satış grafiği
async function loadWeeklySalesChart() {
    const ctx = document.getElementById('weekly-sales-chart');
    if (!ctx) return;
    
    const last7Days = [];
    const salesData = [];
    const profitData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(formatDateDisplay(date));
        
        const daySales = await getSalesByDate(date);
        const summary = calculateDailySummary(daySales);
        salesData.push(summary.totalSales);
        profitData.push(summary.totalProfit);
    }
    
    if (weeklySalesChart) {
        weeklySalesChart.destroy();
    }
    
    weeklySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [
                {
                    label: 'Satış (₺)',
                    data: salesData,
                    borderColor: '#6F4E37',
                    backgroundColor: 'rgba(111, 78, 55, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Kar (₺)',
                    data: profitData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Kategori dağılımı grafiği
async function loadCategoryChart() {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;
    
    const todaySales = await getTodaySales();
    const categorySales = {};
    
    todaySales.forEach(sale => {
        sale.items.forEach(item => {
            const product = getProductById(item.productId);
            if (product) {
                const category = CATEGORIES[product.category];
                const categoryName = category ? category.name : 'Diğer';
                if (!categorySales[categoryName]) {
                    categorySales[categoryName] = { sales: 0, icon: category ? category.icon : '📦' };
                }
                categorySales[categoryName].sales += item.unitPrice * item.quantity;
            }
        });
    });
    
    const labels = Object.keys(categorySales);
    const data = Object.values(categorySales).map(c => c.sales);
    const icons = Object.values(categorySales).map(c => c.icon);
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map((l, i) => icons[i] + ' ' + l),
            datasets: [{
                data: data,
                backgroundColor: [
                    '#6F4E37',
                    '#C4A484',
                    '#4CAF50',
                    '#FF9800',
                    '#2196F3',
                    '#9C27B0'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

// En çok satan ürünler
async function loadTopProducts(topContainer = 'top-products-list') {
    const container = document.getElementById(topContainer);
    if (!container) return;
    
    const allSalesData = await getAllSales();
    const productSales = {};
    
    allSalesData.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    productId: item.productId,
                    productName: item.productName,
                    productIcon: item.productIcon || '📦',
                    quantity: 0,
                    totalSales: 0
                };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].totalSales += item.unitPrice * item.quantity;
        });
    });
    
    const sorted = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-light); text-align: center; padding: 2rem;">Henüz satış verisi yok</p>';
        return;
    }
    
    container.innerHTML = sorted.map((item, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';
        
        return `
            <div class="top-product-item">
                <div class="top-product-rank ${rankClass}">${index + 1}</div>
                <div class="top-product-info">
                    <div class="top-product-name">${item.productIcon} ${item.productName}</div>
                    <div class="top-product-sales">${item.quantity} adet satıldı</div>
                </div>
                <div class="top-product-value">${item.totalSales.toFixed(2)} ₺</div>
            </div>
        `;
    }).join('');
}

// Rapor sayfası için saatlik satış grafiği
async function loadHourlySalesChart(date) {
    const ctx = document.getElementById('hourly-sales-chart');
    if (!ctx) return;
    
    const sales = await getSalesByDate(date);
    const hourlyData = Array(24).fill(0);
    
    sales.forEach(sale => {
        const hour = new Date(sale.createdAt).getHours();
        hourlyData[hour] += sale.totalAmount;
    });
    
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    
    if (hourlySalesChart) {
        hourlySalesChart.destroy();
    }
    
    hourlySalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Satış (₺)',
                data: hourlyData,
                backgroundColor: 'rgba(111, 78, 55, 0.7)',
                borderColor: '#6F4E37',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Top 10 ürün listesi (Rapor sayfası için)
async function loadTop10Products(date) {
    const container = document.getElementById('top10-list');
    if (!container) return;
    
    const sales = await getSalesByDate(date);
    const productSales = {};
    
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    productId: item.productId,
                    productName: item.productName,
                    productIcon: item.productIcon || '📦',
                    quantity: 0,
                    totalSales: 0,
                    totalProfit: 0
                };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].totalSales += item.unitPrice * item.quantity;
            productSales[item.productId].totalProfit += (item.unitPrice - item.costPrice) * item.quantity;
        });
    });
    
    const sorted = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-light); text-align: center; padding: 2rem;">Bu tarihte satış yok</p>';
        return;
    }
    
    container.innerHTML = sorted.map((item, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'top1';
        else if (index === 1) rankClass = 'top2';
        else if (index === 2) rankClass = 'top3';
        
        return `
            <div class="top10-item">
                <div class="top10-rank ${rankClass}">${index + 1}</div>
                <div class="top10-details">
                    <div class="top10-name">${item.productIcon} ${item.productName}</div>
                    <div class="top10-stats">${item.quantity} adet • ${item.totalSales.toFixed(2)} ₺ satış</div>
                </div>
                <div class="top10-value">${item.totalProfit.toFixed(2)} ₺</div>
            </div>
        `;
    }).join('');
}

// Ödeme metodları grafiği
async function loadPaymentMethodsChart() {
    const ctx = document.getElementById('payment-methods-chart');
    if (!ctx) return;
    
    const todaySales = await getTodaySales();
    const paymentSummary = calculateDailyPaymentSummary(todaySales);
    
    if (paymentSummary.length === 0) {
        return;
    }

    if (paymentMethodChart) {
        paymentMethodChart.destroy();
    }

    const labels = paymentSummary.map(p => p.name);
    const data = paymentSummary.map(p => p.amount);
    const colors = paymentSummary.map(p => p.color);

    paymentMethodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: 'var(--color-surface)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed.toFixed(2) + ' ₺ (%' + percentage + ')';
                        }
                    }
                }
            }
        }
    });
}

// Günlük ödeme metodu özeti hesapla
function calculateDailyPaymentSummary(sales) {
    const paymentMethods = {
        'cash': { name: 'Nakit 💵', color: '#4CAF50' },
        'credit_card': { name: 'Kredi Kartı 💳', color: '#2196F3' },
        'debit_card': { name: 'Banka Kartı 💳', color: '#FF9800' },
        'transfer': { name: 'Havale/EFT 🏦', color: '#9C27B0' },
        'mobile': { name: 'Mobil 📱', color: '#E91E63' },
        'credit': { name: 'Veresiye 📝', color: '#F44336' }
    };

    const summary = {};

    sales.forEach(sale => {
        if (sale.paymentData?.payments && Array.isArray(sale.paymentData.payments)) {
            // Çoklu ödeme
            sale.paymentData.payments.forEach(payment => {
                const methodId = payment.method || 'cash';
                const methodInfo = paymentMethods[methodId] || { name: payment.methodName || 'Diğer', color: '#999' };
                
                if (!summary[methodId]) {
                    summary[methodId] = {
                        methodId: methodId,
                        name: methodInfo.name,
                        color: methodInfo.color,
                        amount: 0
                    };
                }
                
                summary[methodId].amount += payment.amount || 0;
            });
        } else if (sale.paymentMethod) {
            // Tek ödeme yöntemi (eski format)
            const methodId = sale.paymentMethod.toLowerCase();
            const methodInfo = paymentMethods[methodId] || { name: sale.paymentMethod, color: '#999' };
            
            if (!summary[methodId]) {
                summary[methodId] = {
                    methodId: methodId,
                    name: methodInfo.name,
                    color: methodInfo.color,
                    amount: 0
                };
            }
            
            summary[methodId].amount += sale.totalAmount || 0;
        } else {
            // Varsayılan olarak nakit
            if (!summary['cash']) {
                summary['cash'] = {
                    methodId: 'cash',
                    name: 'Nakit 💵',
                    color: '#4CAF50',
                    amount: 0
                };
            }
            summary['cash'].amount += sale.totalAmount || 0;
        }
    });

    return Object.values(summary).sort((a, b) => b.amount - a.amount);
}

// Dashboard'ı yenile (dışarıdan çağrılabilir)
async function refreshDashboard() {
    if (document.getElementById('dashboard-page').classList.contains('active')) {
        await loadDashboard();
    }
}

// Satış yapıldığında dashboard'ı güncelle
const originalCheckout = window.checkout;
window.checkout = function() {
    const result = originalCheckout.apply(this, arguments);
    refreshDashboard();
    return result;
};

