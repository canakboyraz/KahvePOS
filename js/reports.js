/**
 * Reports.js
 * Raporlama modülü - v3.0
 * Grafik ve dönem filtreleme ile
 */

let currentReportPeriod = 'today';

// Raporu yükle
async function loadReport() {
    const dateInput = document.getElementById('report-date');
    const selectedDate = dateInput ? dateInput.value : new Date();
    
    const sales = await getSalesByDate(selectedDate);
    const summary = calculateDailySummary(sales);
    const productSales = calculateProductSales(sales);
    
    // Özet kartları güncelle
    const totalSalesEl = document.getElementById('total-sales');
    const totalCostEl = document.getElementById('total-cost');
    const totalProfitEl = document.getElementById('total-profit');
    const orderCountEl = document.getElementById('order-count');
    
    if (totalSalesEl) totalSalesEl.textContent = summary.totalSales.toFixed(2) + ' ₺';
    if (totalCostEl) totalCostEl.textContent = summary.totalCost.toFixed(2) + ' ₺';
    if (totalProfitEl) totalProfitEl.textContent = summary.totalProfit.toFixed(2) + ' ₺';
    if (orderCountEl) orderCountEl.textContent = summary.orderCount;
    
    // Grafiği yükle
    await loadHourlySalesChart(selectedDate);
    
    // Top 10 listesi
    await loadTop10Products(selectedDate);
    
    // Ürün bazlı satış tablosu
    renderProductSalesTable(productSales);
    
    // Sipariş geçmişi tablosu
    renderOrdersTable(sales);
    
    // Kullanıcı bazlı satış tablosu (yeni)
    renderUserSalesTable(sales);
    
    // Boş durum kontrolü
    const emptyReport = document.getElementById('empty-report');
    const reportCards = document.getElementById('report-cards');
    const reportSections = document.querySelectorAll('.report-section');
    const chartsSection = document.querySelector('.charts-section');
    
    if (!emptyReport || !reportCards) return;
    
    if (sales.length === 0) {
        emptyReport.style.display = 'block';
        reportCards.style.display = 'none';
        if (chartsSection) chartsSection.style.display = 'none';
        reportSections.forEach(section => {
            if (section) section.style.display = 'none';
        });
    } else {
        emptyReport.style.display = 'none';
        reportCards.style.display = 'grid';
        if (chartsSection) chartsSection.style.display = 'block';
        reportSections.forEach(section => {
            if (section) section.style.display = 'block';
        });
    }
}

// Dönem seçici
async function setReportPeriod(period) {
    currentReportPeriod = period;
    
    // Butonları güncelle
    document.querySelectorAll('.period-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Tarihi ayarla
    const dateInput = document.getElementById('report-date');
    if (!dateInput) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    switch (period) {
        case 'today':
            dateInput.value = `${year}-${month}-${day}`;
            await loadReport();
            break;
            
        case 'week':
            // Bu haftanın satışlarını topla
            const weekSales = await getLastNDaysSales(7);
            await loadWeekReport(weekSales);
            break;
            
        case 'month':
            // Bu ayın satışlarını topla
            const monthStart = new Date(year, today.getMonth(), 1);
            const monthSales = await getSalesByDateRange(monthStart, today);
            await loadMonthReport(monthSales);
            break;
    }
}

// Haftalık rapor
async function loadWeekReport(sales) {
    const summary = calculateDailySummary(sales);
    const productSales = calculateProductSales(sales);
    
    updateReportSummary(summary);
    renderProductSalesTable(productSales);
    renderOrdersTable(sales);
    renderUserSalesTable(sales);
    await loadTop10Products(null, sales);
    
    // Haftalık grafik
    loadWeeklyChart(sales);
}

// Aylık rapor
async function loadMonthReport(sales) {
    const summary = calculateDailySummary(sales);
    const productSales = calculateProductSales(sales);
    
    updateReportSummary(summary);
    renderProductSalesTable(productSales);
    renderOrdersTable(sales);
    renderUserSalesTable(sales);
    await loadTop10Products(null, sales);
    
    // Aylık grafik
    loadMonthlyChart(sales);
}

// Rapor özetini güncelle
function updateReportSummary(summary) {
    const totalSalesEl = document.getElementById('total-sales');
    const totalCostEl = document.getElementById('total-cost');
    const totalProfitEl = document.getElementById('total-profit');
    const orderCountEl = document.getElementById('order-count');
    
    if (totalSalesEl) totalSalesEl.textContent = summary.totalSales.toFixed(2) + ' ₺';
    if (totalCostEl) totalCostEl.textContent = summary.totalCost.toFixed(2) + ' ₺';
    if (totalProfitEl) totalProfitEl.textContent = summary.totalProfit.toFixed(2) + ' ₺';
    if (orderCountEl) orderCountEl.textContent = summary.orderCount;
    
    // Boş durum kontrolü
    const emptyReport = document.getElementById('empty-report');
    const reportCards = document.getElementById('report-cards');
    
    if (emptyReport && reportCards) {
        if (summary.orderCount === 0) {
            emptyReport.style.display = 'block';
            reportCards.style.display = 'none';
        } else {
            emptyReport.style.display = 'none';
            reportCards.style.display = 'grid';
        }
    }
}

// Haftalık grafik
function loadWeeklyChart(sales) {
    const ctx = document.getElementById('hourly-sales-chart');
    if (!ctx) return;
    
    const dailyData = {};
    
    sales.forEach(sale => {
        const date = formatDate(new Date(sale.createdAt));
        if (!dailyData[date]) {
            dailyData[date] = 0;
        }
        dailyData[date] += sale.totalAmount;
    });
    
    const labels = Object.keys(dailyData).map(d => formatDateDisplay(d));
    const data = Object.values(dailyData);
    
    if (hourlySalesChart) {
        hourlySalesChart.destroy();
    }
    
    hourlySalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Günlük Satış (₺)',
                data: data,
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

// Aylık grafik
function loadMonthlyChart(sales) {
    const ctx = document.getElementById('hourly-sales-chart');
    if (!ctx) return;
    
    const dailyData = {};
    
    sales.forEach(sale => {
        const date = formatDate(new Date(sale.createdAt));
        if (!dailyData[date]) {
            dailyData[date] = 0;
        }
        dailyData[date] += sale.totalAmount;
    });
    
    const sortedDates = Object.keys(dailyData).sort();
    const labels = sortedDates.map(d => {
        const parts = d.split('-');
        return `${parts[2]}.${parts[1]}`;
    });
    const data = sortedDates.map(d => dailyData[d]);
    
    if (hourlySalesChart) {
        hourlySalesChart.destroy();
    }
    
    hourlySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Günlük Satış (₺)',
                data: data,
                borderColor: '#6F4E37',
                backgroundColor: 'rgba(111, 78, 55, 0.1)',
                fill: true,
                tension: 0.4
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

// Ürün satış tablosunu oluştur
function renderProductSalesTable(productSales) {
    const tableBody = document.getElementById('product-sales-table');
    if (!tableBody) return;
    
    if (productSales.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--color-text-light);">
                    Satış kaydı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = productSales.map(item => `
        <tr>
            <td>${item.productIcon} ${item.productName}</td>
            <td class="numeric">${item.quantity}</td>
            <td class="numeric">${item.totalSales.toFixed(2)} ₺</td>
            <td class="numeric">${item.totalCost.toFixed(2)} ₺</td>
            <td class="numeric">${item.profit.toFixed(2)} ₺</td>
        </tr>
    `).join('');
}

// Sipariş tablosunu oluştur
function renderOrdersTable(sales) {
    const tableBody = document.getElementById('orders-table');
    if (!tableBody) return;
    
    if (sales.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--color-text-light);">
                    Sipariş bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    // Zamanına göre sırala (yeniden eskiye)
    const sortedSales = [...sales].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    tableBody.innerHTML = sortedSales.map(sale => {
        const itemsStr = sale.items.map(item =>
            `${item.productIcon} ${item.productName} ×${item.quantity}`
        ).join(', ');
        
        const noteDisplay = sale.customerNote ? `<br><small style="color: var(--color-text-light);">Not: ${sale.customerNote}</small>` : '';
        
        const userName = sale.createdBy || 'Bilinmeyen';
        
        return `
            <tr>
                <td>${formatTime(new Date(sale.createdAt))}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.3rem;">
                        <span class="user-badge">👤</span>
                        <span>${userName}</span>
                    </div>
                </td>
                <td>${itemsStr}${noteDisplay}</td>
                <td class="numeric">${sale.totalAmount.toFixed(2)} ₺</td>
                <td>${sale.customerNote || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Kullanıcı bazlı satış tablosunu oluştur
function renderUserSalesTable(sales) {
    const tableBody = document.getElementById('user-sales-table');
    if (!tableBody) return;
    
    if (sales.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--color-text-light);">
                    Satış kaydı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    // Kullanıcı bazlı satışları grupla
    const userSales = {};
    
    sales.forEach(sale => {
        const userName = sale.createdBy || 'Bilinmeyen';
        
        if (!userSales[userName]) {
            userSales[userName] = {
                userName: userName,
                orderCount: 0,
                totalSales: 0,
                totalProfit: 0,
                products: {}
            };
        }
        
        userSales[userName].orderCount++;
        userSales[userName].totalSales += sale.totalAmount || 0;
        
        // Her ürünü kaydet
        if (sale.items) {
            sale.items.forEach(item => {
                const productKey = item.productId || item.productName;
                if (!userSales[userName].products[productKey]) {
                    userSales[userName].products[productKey] = {
                        name: item.productName,
                        icon: item.productIcon || '📦',
                        quantity: 0,
                        total: 0
                    };
                }
                userSales[userName].products[productKey].quantity += item.quantity;
                userSales[userName].products[productKey].total += item.price * item.quantity;
            });
        }
        
        // Kar hesapla
        const saleCost = sale.items ? sale.items.reduce((sum, item) =>
            sum + ((item.cost || 0) * item.quantity), 0) : 0;
        userSales[userName].totalProfit += (sale.totalAmount || 0) - saleCost;
    });
    
    // Array'e çevir ve satışa göre sırala (büyükten küçüğe)
    const sortedUsers = Object.values(userSales).sort((a, b) => b.totalSales - a.totalSales);
    
    tableBody.innerHTML = sortedUsers.map(user => {
        // En çok satılan 3 ürünü göster
        const topProducts = Object.values(user.products)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 3)
            .map(p => `${p.icon} ${p.name} (${p.quantity})`)
            .join(', ');
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="user-avatar-small">👤</span>
                        <strong>${user.userName}</strong>
                    </div>
                </td>
                <td class="numeric">${user.orderCount}</td>
                <td class="numeric">${user.totalSales.toFixed(2)} ₺</td>
                <td class="numeric" style="color: var(--color-success);">${user.totalProfit.toFixed(2)} ₺</td>
                <td>
                    <span class="products-summary">${topProducts || '-'}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// Kullanıcı bazlı satış hesaplama (detaylı)
function calculateUserSalesStats(sales) {
    const userStats = {};
    
    sales.forEach(sale => {
        const userName = sale.createdBy || 'Bilinmeyen';
        
        if (!userStats[userName]) {
            userStats[userName] = {
                userName: userName,
                orderCount: 0,
                totalSales: 0,
                totalCost: 0,
                totalProfit: 0,
                products: {},
                paymentMethods: {}
            };
        }
        
        userStats[userName].orderCount++;
        userStats[userName].totalSales += sale.totalAmount || 0;
        
        // Ürün detayları
        if (sale.items) {
            sale.items.forEach(item => {
                const productKey = item.productId || item.productName;
                if (!userStats[userName].products[productKey]) {
                    userStats[userName].products[productKey] = {
                        name: item.productName,
                        icon: item.productIcon || '📦',
                        quantity: 0,
                        totalSales: 0,
                        totalCost: 0
                    };
                }
                userStats[userName].products[productKey].quantity += item.quantity;
                userStats[userName].products[productKey].totalSales += item.price * item.quantity;
                userStats[userName].products[productKey].totalCost += (item.cost || 0) * item.quantity;
            });
        }
        
        // Maliyet ve kar
        const saleCost = sale.items ? sale.items.reduce((sum, item) =>
            sum + ((item.cost || 0) * item.quantity), 0) : 0;
        userStats[userName].totalCost += saleCost;
        userStats[userName].totalProfit += (sale.totalAmount || 0) - saleCost;
        
        // Ödeme yöntemi
        if (sale.paymentMethod) {
            const method = sale.paymentMethod;
            if (!userStats[userName].paymentMethods[method]) {
                userStats[userName].paymentMethods[method] = 0;
            }
            userStats[userName].paymentMethods[method] += sale.totalAmount || 0;
        }
    });
    
    return Object.values(userStats).sort((a, b) => b.totalSales - a.totalSales);
}

// Raporu yazdır
async function printReport() {
    const dateInput = document.getElementById('report-date');
    const selectedDate = dateInput ? dateInput.value : new Date();
    
    let sales, dateDisplay;
    
    if (currentReportPeriod === 'today') {
        sales = await getSalesByDate(selectedDate);
        dateDisplay = formatDateDisplay(selectedDate);
    } else if (currentReportPeriod === 'week') {
        sales = await getLastNDaysSales(7);
        dateDisplay = 'Son 7 Gün';
    } else {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        sales = await getSalesByDateRange(monthStart, today);
        dateDisplay = 'Bu Ay';
    }
    
    const summary = calculateDailySummary(sales);
    const productSales = calculateProductSales(sales);
    
    // Yazdırma için özel HTML oluştur
    const printWindow = window.open('', '_blank');
    
    let productRows = '';
    productSales.forEach(item => {
        productRows += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">${item.productIcon} ${item.productName}</td>
                <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right;">${item.totalSales.toFixed(2)} ₺</td>
                <td style="padding: 10px; text-align: right;">${item.totalCost.toFixed(2)} ₺</td>
                <td style="padding: 10px; text-align: right;">${item.profit.toFixed(2)} ₺</td>
            </tr>
        `;
    });
    
    let orderRows = '';
    sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(sale => {
        const itemsStr = sale.items.map(item => 
            `${item.productName} ×${item.quantity}`
        ).join(', ');
        
        orderRows += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">${formatTime(new Date(sale.createdAt))}</td>
                <td style="padding: 10px;">${itemsStr}</td>
                <td style="padding: 10px; text-align: right;">${sale.totalAmount.toFixed(2)} ₺</td>
                <td style="padding: 10px;">${sale.customerNote || '-'}</td>
            </tr>
        `;
    });
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>KahvePOS - Satış Raporu - ${dateDisplay}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #6F4E37; text-align: center; }
                h2 { color: #6F4E37; border-bottom: 2px solid #6F4E37; padding-bottom: 10px; }
                .summary { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
                .summary-item { text-align: center; margin: 10px; }
                .summary-label { color: #757575; font-size: 0.9rem; }
                .summary-value { font-size: 1.5rem; font-weight: bold; color: #6F4E37; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #6F4E37; color: white; padding: 10px; text-align: left; }
                .numeric { text-align: right; }
                .date { text-align: center; color: #757575; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>☕ KahvePOS - Satış Raporu</h1>
            <p class="date">Dönem: ${dateDisplay}</p>
            
            <h2>Özet</h2>
            <div class="summary">
                <div class="summary-item">
                    <div class="summary-label">Toplam Satış</div>
                    <div class="summary-value">${summary.totalSales.toFixed(2)} ₺</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Toplam Maliyet</div>
                    <div class="summary-value">${summary.totalCost.toFixed(2)} ₺</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Net Kar</div>
                    <div class="summary-value" style="color: #4CAF50;">${summary.totalProfit.toFixed(2)} ₺</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Sipariş Sayısı</div>
                    <div class="summary-value">${summary.orderCount}</div>
                </div>
            </div>
            
            ${productSales.length > 0 ? `
            <h2>Ürün Bazlı Satış</h2>
            <table>
                <thead>
                    <tr>
                        <th>Ürün</th>
                        <th class="numeric">Adet</th>
                        <th class="numeric">Satış</th>
                        <th class="numeric">Maliyet</th>
                        <th class="numeric">Kar</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>
            ` : ''}
            
            ${sales.length > 0 ? `
            <h2>Sipariş Geçmişi</h2>
            <table>
                <thead>
                    <tr>
                        <th>Saat</th>
                        <th>Ürünler</th>
                        <th class="numeric">Tutar</th>
                        <th>Not</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderRows}
                </tbody>
            </table>
            ` : ''}
            
            <p style="text-align: center; color: #757575; margin-top: 40px; font-size: 0.9rem;">
                ${new Date().toLocaleString('tr-TR')}
            </p>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Tarihi bugüne ayarla
function setTodayDate() {
    const dateInput = document.getElementById('report-date');
    if (!dateInput) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}

// Sayfa yüklendiğinde tarihi ayarla ve raporu yükle
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('report-date');
    if (dateInput) {
        setTodayDate();
    }
});
