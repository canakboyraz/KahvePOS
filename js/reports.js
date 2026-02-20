/**
 * Reports.js
 * Raporlama modülü - v4.0
 * Grafik ve dönem filtreleme ile
 */

let currentReportPeriod = 'today';

// Ödeme metodları global değişkenleri
let paymentMethodChart = null;

function formatCurrency(value) {
    return `${(Number(value) || 0).toFixed(2)} TL`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Raporu yükle
async function loadReport() {
    const dateInput = document.getElementById('report-date');
    const selectedDate = dateInput ? dateInput.value : new Date();
    
    console.log('📊 RAPOR YÜKLEME:', {
        selectedDate,
        dateInputValue: dateInput?.value,
        currentReportPeriod
    });
    
    const sales = await getSalesByDate(selectedDate);
    
    console.log('📊 SATIŞ VERİSİ:', {
        salesCount: sales.length,
        sales: sales.slice(0, 3) // İlk 3 satışı göster
    });
    
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
    // TODO: loadHourlySalesChart fonksiyonu henüz tanımlı değil
    // await loadHourlySalesChart(selectedDate);
    
    // Top 10 listesi
    await loadTop10Products(selectedDate, sales);
    
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
    
    // Ödeme metodu raporlaması
    renderPaymentMethodsTable(sales);
    renderPaymentMethodChart(sales);
    
    // Yeni ödeme analizi bölümleri
    renderDailyPaymentSummary(sales);
    renderPaymentUserMatrix(sales);
    renderTransactionDetails(sales);
}

/**
 * Ödeme Metodları Tablosu
 */
function renderPaymentMethodsTable(sales) {
    const tableBody = document.getElementById('payment-methods-table');
    if (!tableBody) return;

    const paymentSummary = calculatePaymentMethodSummary(sales);
    
    if (paymentSummary.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--color-text-light);">
                    Ödeme kaydı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = paymentSummary.map(payment => `
        <tr>
            <td>
                <span class="payment-badge ${payment.methodId}">
                    ${payment.icon} ${payment.methodName}
                </span>
            </td>
            <td class="numeric">${payment.transactionCount}</td>
            <td class="numeric">${payment.totalAmount.toFixed(2)} ₺</td>
            <td class="numeric">${payment.percentage.toFixed(1)}%</td>
            <td class="numeric">${payment.averageAmount.toFixed(2)} ₺</td>
        </tr>
    `).join('');
}

/**
 * Ödeme Metodları Ödeme Özeti Hesapla
 */
function calculatePaymentMethodSummary(sales) {
    const paymentMethods = {
        'cash': { name: 'Nakit', icon: '💵', color: '#4CAF50' },
        'credit_card': { name: 'Kredi Kartı', icon: '💳', color: '#2196F3' },
        'debit_card': { name: 'Banka Kartı', icon: '💳', color: '#FF9800' },
        'transfer': { name: 'Havale/EFT', icon: '🏦', color: '#9C27B0' },
        'mobile': { name: 'Mobil Ödeme', icon: '📱', color: '#E91E63' },
        'credit': { name: 'Veresiye', icon: '📝', color: '#F44336' }
    };

    const summary = {};
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

    sales.forEach(sale => {
        if (sale.paymentData?.payments && Array.isArray(sale.paymentData.payments)) {
            // Çoklu ödeme
            sale.paymentData.payments.forEach(payment => {
                const methodId = payment.method || 'cash';
                const methodInfo = paymentMethods[methodId] || { name: payment.methodName || 'Diğer', icon: '📦' };
                
                if (!summary[methodId]) {
                    summary[methodId] = {
                        methodId: methodId,
                        methodName: methodInfo.name,
                        icon: methodInfo.icon,
                        color: methodInfo.color,
                        totalAmount: 0,
                        transactionCount: 0
                    };
                }
                
                summary[methodId].totalAmount += payment.amount || 0;
                summary[methodId].transactionCount++;
            });
        } else if (sale.paymentMethod) {
            // Tek ödeme yöntemi (eski format)
            const methodId = sale.paymentMethod.toLowerCase();
            const methodInfo = paymentMethods[methodId] || { name: sale.paymentMethod, icon: '📦' };
            
            if (!summary[methodId]) {
                summary[methodId] = {
                    methodId: methodId,
                    methodName: methodInfo.name,
                    icon: methodInfo.icon,
                    color: methodInfo.color,
                    totalAmount: 0,
                    transactionCount: 0
                };
            }
            
            summary[methodId].totalAmount += sale.totalAmount || 0;
            summary[methodId].transactionCount++;
        } else {
            // Varsayılan olarak nakit
            if (!summary['cash']) {
                summary['cash'] = {
                    methodId: 'cash',
                    methodName: 'Nakit',
                    icon: '💵',
                    color: '#4CAF50',
                    totalAmount: 0,
                    transactionCount: 0
                };
            }
            summary['cash'].totalAmount += sale.totalAmount || 0;
            summary['cash'].transactionCount++;
        }
    });

    // Yüzdeleri ve ortalamaları hesapla
    return Object.values(summary).map(method => ({
        ...method,
        percentage: totalRevenue > 0 ? (method.totalAmount / totalRevenue) * 100 : 0,
        averageAmount: method.transactionCount > 0 ? method.totalAmount / method.transactionCount : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Ödeme Metodları Grafiği
 */
function renderPaymentMethodChart(sales) {
    const ctx = document.getElementById('payment-methods-chart');
    if (!ctx) return;

    const paymentSummary = calculatePaymentMethodSummary(sales);
    
    if (paymentSummary.length === 0) {
        return;
    }

    if (paymentMethodChart) {
        paymentMethodChart.destroy();
    }

    const labels = paymentSummary.map(p => p.methodName);
    const data = paymentSummary.map(p => p.totalAmount);
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

// Dönem seçici
async function setReportPeriod(period, clickedElement = null) {
    currentReportPeriod = period;
    
    // Butonları güncelle (event parametresi olmadan çalışması için)
    document.querySelectorAll('.period-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Tıklanan butonu bul ve active ekle
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else {
        // Event parametresi yoksa, data-period atributuna göre bul
        const buttons = document.querySelectorAll('.period-tab');
        buttons.forEach(btn => {
            if (btn.textContent.includes(
                period === 'today' ? 'Bugün' :
                period === 'week' ? 'Hafta' : 'Ay'
            )) {
                btn.classList.add('active');
            }
        });
    }
    
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
    
    // Ödeme metodi analizleri
    renderDailyPaymentSummary(sales);
    renderPaymentUserMatrix(sales);
    renderTransactionDetails(sales);
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
    
    // Ödeme metodi analizleri
    renderDailyPaymentSummary(sales);
    renderPaymentUserMatrix(sales);
    renderTransactionDetails(sales);
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
                <td colspan="6" style="text-align: center; color: var(--color-text-light);">
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
        
        // Ödeme metodu belirleme (farklı kaynaklardan)
        let paymentMethodText = '';
        
        // 1. Önce payment_method_text kontrol et
        if (sale.payment_method_text) {
            paymentMethodText = sale.payment_method_text;
        }
        // 2. paymentMethod string ise direkt kullan
        else if (typeof sale.paymentMethod === 'string') {
            paymentMethodText = sale.paymentMethod;
        }
        // 3. paymentMethod array ise ilk elemanı al
        else if (Array.isArray(sale.paymentMethod) && sale.paymentMethod.length > 0) {
            const firstPayment = sale.paymentMethod[0];
            paymentMethodText = firstPayment.method || firstPayment.methodName || 'Nakit';
        }
        // 4. paymentData varsa oradan al
        else if (sale.paymentData) {
            paymentMethodText = sale.paymentData.methodName || sale.paymentData.method || 'Nakit';
        }
        // 5. Hiçbiri yoksa varsayılan
        else {
            paymentMethodText = 'Nakit';
        }
        
        const paymentMethodIcon = getPaymentMethodIcon(paymentMethodText);
        const paymentMethodBadge = `<span class="payment-method-badge" style="background: ${getPaymentMethodColor(paymentMethodText)}; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.85rem; color: white; white-space: nowrap;">${paymentMethodIcon} ${paymentMethodText}</span>`;
        
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
                <td>${paymentMethodBadge}</td>
                <td>${sale.customerNote || '-'}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Ödeme metodu simgesi
 * Hem Türkçe isimler hem de İngilizce ID'leri destekler
 */
function getPaymentMethodIcon(method) {
    const icons = {
        // Türkçe isimler (normal)
        'Nakit': '💵',
        'Kredi Kartı': '💳',
        'Banka Kartı': '💳',
        'Havale/EFT': '🏦',
        'Mobil Ödeme': '📱',
        'İkram': '🎁',
        'Borç/Veresiye': '📝',
        // Türkçe isimler (büyük harf - eski veri)
        'NAKIT': '💵',
        'KREDİ KARTI': '💳',
        'BANKA KARTI': '💳',
        'HAVALE/EFT': '🏦',
        'MOBİL ÖDEME': '📱',
        'İKRAM': '🎁',
        'BORÇ/VERESİYE': '📝',
        // İngilizce ID'ler (Payment objesinden)
        'cash': '💵',
        'credit_card': '💳',
        'debit_card': '💳',
        'transfer': '🏦',
        'mobile': '📱',
        'credit': '🎁',
        // Büyük harf ID'ler
        'CASH': '💵',
        'CREDIT_CARD': '💳',
        'DEBIT_CARD': '💳',
        'TRANSFER': '🏦',
        'MOBILE': '📱',
        'CREDIT': '🎁'
    };
    return icons[method] || '💰';
}

/**
 * Ödeme metodu rengi
 * Hem Türkçe isimler hem de İngilizce ID'leri destekler
 */
function getPaymentMethodColor(method) {
    const colors = {
        // Türkçe isimler (normal)
        'Nakit': '#4CAF50',
        'Kredi Kartı': '#2196F3',
        'Banka Kartı': '#FF9800',
        'Havale/EFT': '#9C27B0',
        'Mobil Ödeme': '#E91E63',
        'İkram': '#F44336',
        'Borç/Veresiye': '#757575',
        // Türkçe isimler (büyük harf - eski veri)
        'NAKIT': '#4CAF50',
        'KREDİ KARTI': '#2196F3',
        'BANKA KARTI': '#FF9800',
        'HAVALE/EFT': '#9C27B0',
        'MOBİL ÖDEME': '#E91E63',
        'İKRAM': '#F44336',
        'BORÇ/VERESİYE': '#757575',
        // İngilizce ID'ler (Payment objesinden)
        'cash': '#4CAF50',
        'credit_card': '#2196F3',
        'debit_card': '#FF9800',
        'transfer': '#9C27B0',
        'mobile': '#E91E63',
        'credit': '#F44336',
        // Büyük harf ID'ler
        'CASH': '#4CAF50',
        'CREDIT_CARD': '#2196F3',
        'DEBIT_CARD': '#FF9800',
        'TRANSFER': '#9C27B0',
        'MOBILE': '#E91E63',
        'CREDIT': '#F44336'
    };
    return colors[method] || '#757575';
}

// Kullanıcı bazlı satış tablosunu oluştur
function renderUserSalesTable(sales) {
    const tableBody = document.getElementById('user-sales-table');
    const insightContainer = document.getElementById('user-sales-insights');
    if (!tableBody) return;

    if (sales.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--color-text-light);">
                    Satis kaydi bulunmuyor
                </td>
            </tr>
        `;
        if (insightContainer) insightContainer.innerHTML = '';
        return;
    }

    const sortedUsers = calculateUserSalesStats(sales);
    const totalSales = sortedUsers.reduce((sum, user) => sum + user.totalSales, 0);
    const totalOrders = sortedUsers.reduce((sum, user) => sum + user.orderCount, 0);

    if (insightContainer) {
        renderUserSalesInsights(sortedUsers, totalSales, totalOrders);
    }

    tableBody.innerHTML = sortedUsers.map(user => {
        const topProducts = user.topProducts
            .map(p => `${p.icon} ${escapeHtml(p.name)} (${p.quantity})`)
            .join(', ');

        const paymentMix = user.topPaymentMethod
            ? `${escapeHtml(user.topPaymentMethod.name)} %${user.topPaymentMethod.ratio.toFixed(0)}`
            : '-';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="user-avatar-small">U</span>
                        <strong>${escapeHtml(user.userName)}</strong>
                        <span class="user-performance-badge ${user.performanceLevel}">${user.performanceLabel}</span>
                    </div>
                </td>
                <td class="numeric">${user.orderCount}</td>
                <td class="numeric">${formatCurrency(user.totalSales)}</td>
                <td class="numeric" style="color: var(--color-success);">${formatCurrency(user.totalProfit)}</td>
                <td>
                    <span class="products-summary">Ort. sepet: <strong>${formatCurrency(user.averageTicket)}</strong></span>
                    <span class="products-summary">Ciro payi: <strong>%${user.salesShare.toFixed(1)}</strong> - En iyi saat: <strong>${user.peakHourLabel}</strong></span>
                    <span class="products-summary">Odeme mix: <strong>${paymentMix}</strong></span>
                    <span class="products-summary">${topProducts || '-'}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function calculateUserSalesStats(sales) {
    const userStats = {};
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

    sales.forEach(sale => {
        const userName = sale.createdBy || 'Bilinmeyen';

        if (!userStats[userName]) {
            userStats[userName] = {
                userName: userName,
                orderCount: 0,
                totalSales: 0,
                totalCost: 0,
                totalProfit: 0,
                totalItems: 0,
                maxOrder: 0,
                products: {},
                hourlySales: Array(24).fill(0),
                paymentMethods: {}
            };
        }

        const saleTotal = sale.totalAmount || 0;
        userStats[userName].orderCount++;
        userStats[userName].totalSales += saleTotal;
        userStats[userName].maxOrder = Math.max(userStats[userName].maxOrder, saleTotal);
        userStats[userName].hourlySales[new Date(sale.createdAt).getHours()] += saleTotal;

        if (sale.items) {
            sale.items.forEach(item => {
                const productKey = item.productId || item.productName;
                const quantity = item.quantity || 0;
                const unitPrice = item.unitPrice ?? item.price ?? 0;
                const costPrice = item.costPrice ?? item.cost ?? 0;

                if (!userStats[userName].products[productKey]) {
                    userStats[userName].products[productKey] = {
                        name: item.productName,
                        icon: item.productIcon || 'U',
                        quantity: 0,
                        totalSales: 0,
                        totalCost: 0
                    };
                }

                userStats[userName].products[productKey].quantity += quantity;
                userStats[userName].products[productKey].totalSales += unitPrice * quantity;
                userStats[userName].products[productKey].totalCost += costPrice * quantity;
                userStats[userName].totalItems += quantity;
            });
        }

        const saleCost = sale.totalCost ?? (sale.items ? sale.items.reduce((sum, item) => {
            const costPrice = item.costPrice ?? item.cost ?? 0;
            return sum + (costPrice * (item.quantity || 0));
        }, 0) : 0);

        userStats[userName].totalCost += saleCost;
        userStats[userName].totalProfit += (sale.profit ?? (saleTotal - saleCost));

        if (sale.paymentData?.payments?.length) {
            sale.paymentData.payments.forEach(payment => {
                const method = payment.methodName || payment.method || 'Diger';
                if (!userStats[userName].paymentMethods[method]) {
                    userStats[userName].paymentMethods[method] = 0;
                }
                userStats[userName].paymentMethods[method] += payment.amount || 0;
            });
        } else if (sale.paymentMethod) {
            const method = sale.paymentMethod;
            if (!userStats[userName].paymentMethods[method]) {
                userStats[userName].paymentMethods[method] = 0;
            }
            userStats[userName].paymentMethods[method] += saleTotal;
        }
    });

    return Object.values(userStats)
        .map(user => {
            const topProducts = Object.values(user.products)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 3);

            const paymentEntries = Object.entries(user.paymentMethods).sort((a, b) => b[1] - a[1]);
            const topPaymentMethod = paymentEntries.length
                ? {
                    name: paymentEntries[0][0],
                    ratio: user.totalSales > 0 ? (paymentEntries[0][1] / user.totalSales) * 100 : 0
                }
                : null;

            const peakHourIndex = user.hourlySales.reduce((maxIdx, amount, idx, arr) =>
                amount > arr[maxIdx] ? idx : maxIdx, 0
            );

            const salesShare = totalRevenue > 0 ? (user.totalSales / totalRevenue) * 100 : 0;
            const averageTicket = user.orderCount > 0 ? user.totalSales / user.orderCount : 0;
            const score = (salesShare * 0.6) + (averageTicket * 0.4 / 10);

            let performanceLevel = 'medium';
            let performanceLabel = 'Stabil';
            if (score >= 40) {
                performanceLevel = 'top';
                performanceLabel = 'Lider';
            } else if (score >= 20) {
                performanceLevel = 'high';
                performanceLabel = 'Yuksek';
            }

            return {
                ...user,
                topProducts,
                topPaymentMethod,
                averageTicket,
                salesShare,
                performanceLevel,
                performanceLabel,
                peakHourLabel: `${String(peakHourIndex).padStart(2, '0')}:00`
            };
        })
        .sort((a, b) => b.totalSales - a.totalSales);
}

function renderUserSalesInsights(userStats, totalSales, totalOrders) {
    const container = document.getElementById('user-sales-insights');
    if (!container) return;

    if (!userStats.length) {
        container.innerHTML = '';
        return;
    }

    const topRevenue = [...userStats].sort((a, b) => b.totalSales - a.totalSales)[0];
    const topProfit = [...userStats].sort((a, b) => b.totalProfit - a.totalProfit)[0];
    const topOrders = [...userStats].sort((a, b) => b.orderCount - a.orderCount)[0];
    const topAvgTicket = [...userStats].sort((a, b) => b.averageTicket - a.averageTicket)[0];

    const cards = [
        {
            title: 'Ciro Lideri',
            value: escapeHtml(topRevenue.userName),
            detail: `${formatCurrency(topRevenue.totalSales)} - %${topRevenue.salesShare.toFixed(1)} pay`
        },
        {
            title: 'Kar Lideri',
            value: escapeHtml(topProfit.userName),
            detail: `${formatCurrency(topProfit.totalProfit)} net kar`
        },
        {
            title: 'Siparis Lideri',
            value: escapeHtml(topOrders.userName),
            detail: `${topOrders.orderCount} siparis - Ort. ${formatCurrency(topOrders.averageTicket)}`
        },
        {
            title: 'En Yuksek Ortalama Sepet',
            value: escapeHtml(topAvgTicket.userName),
            detail: `${formatCurrency(topAvgTicket.averageTicket)} - Maks ${formatCurrency(topAvgTicket.maxOrder)}`
        },
        {
            title: 'Takim Ozeti',
            value: `${userStats.length} aktif kullanici`,
            detail: `${formatCurrency(totalSales)} toplam ciro - ${totalOrders} siparis`
        }
    ];

    container.innerHTML = cards.map(card => `
        <div class="user-insight-card">
            <div class="user-insight-title">${card.title}</div>
            <div class="user-insight-value">${card.value}</div>
            <div class="user-insight-detail">${card.detail}</div>
        </div>
    `).join('');
}

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

/**
 * Yardımcı Fonksiyonlar
 */
function formatDate(date) {
    // Date objesi veya string'i Date'e çevir
    const d = date instanceof Date ? date : new Date(date);
    
    // Geçersiz tarih kontrolü
    if (isNaN(d.getTime())) {
        console.warn('⚠️ formatDate geçersiz tarih:', date);
        // Bugünün tarihini kullan
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

function formatDateDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function formatTime(date) {
    return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

async function getSalesByDate(date) {
    // Sales modülündeki fonksiyonu kullan (Supabase entegre)
    if (typeof window.Sales !== 'undefined' && window.Sales.getSalesByDate) {
        return await window.Sales.getSalesByDate(date);
    }
    // Fallback: doğrudan global fonksiyon
    if (typeof window.getSalesByDate === 'function') {
        return await window.getSalesByDate(date);
    }
    return [];
}

async function getSalesByDateRange(startDate, endDate) {
    // Sales modülündeki fonksiyonu kullan (Supabase entegre)
    if (typeof window.Sales !== 'undefined' && window.Sales.getSalesByDateRange) {
        return await window.Sales.getSalesByDateRange(startDate, endDate);
    }
    // Fallback: doğrudan global fonksiyon
    if (typeof window.getSalesByDateRange === 'function') {
        return await window.getSalesByDateRange(startDate, endDate);
    }
    return [];
}

async function getLastNDaysSales(days) {
    // Sales modülündeki fonksiyonu kullan (Supabase entegre)
    if (typeof window.Sales !== 'undefined' && window.Sales.getLastNDaysSales) {
        return await window.Sales.getLastNDaysSales(days);
    }
    // Fallback: doğrudan global fonksiyon
    if (typeof window.getLastNDaysSales === 'function') {
        return await window.getLastNDaysSales(days);
    }
    return [];
}

async function loadTop10Products(date, salesData) {
    // Sales modülündeki fonksiyonu kullan (Supabase entegre)
    if (typeof window.Sales !== 'undefined' && window.Sales.calculateProductSales) {
        const productSales = window.Sales.calculateProductSales(salesData || []);
        const top10 = productSales.slice(0, 10);
        
        const top10Container = document.getElementById('top10-list');
        if (!top10Container) return;
        
        if (top10.length === 0) {
            top10Container.innerHTML = '<p style="color: var(--color-text-light);">Henüz satış verisi yok</p>';
            return;
        }
        
        top10Container.innerHTML = top10.map((item, index) => `
            <div class="top-product-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--color-bg-hover); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                <span class="rank" style="font-weight: bold; color: var(--color-primary); min-width: 24px;">${index + 1}</span>
                <span class="icon" style="font-size: 1.5rem;">${item.productIcon}</span>
                <div class="details" style="flex: 1; min-width: 0;">
                    <div class="name" style="font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.productName)}</div>
                    <div class="stats" style="font-size: 0.85rem; color: var(--color-text-light);">${item.quantity} adet • ${item.totalSales.toFixed(2)} ₺</div>
                </div>
            </div>
        `).join('');
    } else if (typeof window.calculateProductSales === 'function') {
        // Fallback: doğrudan global fonksiyon
        const productSales = window.calculateProductSales(salesData || []);
        // ... aynı render işlemi
    } else {
        // Final fallback: local calculateProductSales
        const productSales = calculateProductSales(salesData || []);
        const top10 = productSales.slice(0, 10);
        
        const top10Container = document.getElementById('top10-list');
        if (!top10Container) return;
        
        if (top10.length === 0) {
            top10Container.innerHTML = '<p style="color: var(--color-text-light);">Henüz satış verisi yok</p>';
            return;
        }
        
        top10Container.innerHTML = top10.map((item, index) => `
            <div class="top-product-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--color-bg-hover); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                <span class="rank" style="font-weight: bold; color: var(--color-primary); min-width: 24px;">${index + 1}</span>
                <span class="icon" style="font-size: 1.5rem;">${item.productIcon}</span>
                <div class="details" style="flex: 1; min-width: 0;">
                    <div class="name" style="font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.productName)}</div>
                    <div class="stats" style="font-size: 0.85rem; color: var(--color-text-light);">${item.quantity} adet • ${item.totalSales.toFixed(2)} ₺</div>
                </div>
            </div>
        `).join('');
    }
}

function calculateDailySummary(sales) {
    return {
        totalSales: sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0),
        totalCost: sales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0),
        totalProfit: sales.reduce((sum, sale) => sum + (sale.profit || 0), 0),
        orderCount: sales.length
    };
}

function calculateProductSales(sales) {
    const productMap = {};
    
    sales.forEach(sale => {
        if (sale.items) {
            sale.items.forEach(item => {
                const key = item.productId || item.productName;
                if (!productMap[key]) {
                    productMap[key] = {
                        productName: item.productName,
                        productIcon: item.productIcon || '📦',
                        quantity: 0,
                        totalSales: 0,
                        totalCost: 0,
                        profit: 0
                    };
                }
                productMap[key].quantity += item.quantity || 0;
                const unitPrice = item.unitPrice ?? item.price ?? 0;
                const costPrice = item.costPrice ?? item.cost ?? 0;
                productMap[key].totalSales += unitPrice * (item.quantity || 0);
                productMap[key].totalCost += costPrice * (item.quantity || 0);
                productMap[key].profit += (unitPrice - costPrice) * (item.quantity || 0);
            });
        }
    });
    
    return Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
}

/**
 * Gün Sonu Özeti (Ödeme Metodları) Gösterimi
 */
function renderDailyPaymentSummary(sales) {
    const container = document.getElementById('daily-payment-summary');
    if (!container) return;

    const paymentSummary = calculatePaymentMethodSummary(sales);
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

    const totalCash = paymentSummary.find(p => p.methodId === 'cash')?.totalAmount || 0;
    const totalCreditCard = paymentSummary.find(p => p.methodId === 'credit_card')?.totalAmount || 0;
    const totalTransfer = paymentSummary.find(p => p.methodId === 'transfer')?.totalAmount || 0;
    const totalCredit = paymentSummary.find(p => p.methodId === 'credit')?.totalAmount || 0;

    container.innerHTML = `
        <div class="summary-cards-grid">
            <div class="summary-card cash">
                <div class="summary-icon">💵</div>
                <div class="summary-label">Toplam Nakit</div>
                <div class="summary-value">${totalCash.toFixed(2)} ₺</div>
            </div>
            <div class="summary-card credit-card">
                <div class="summary-icon">💳</div>
                <div class="summary-label">Toplam Kredi Kartı</div>
                <div class="summary-value">${totalCreditCard.toFixed(2)} ₺</div>
            </div>
            <div class="summary-card transfer">
                <div class="summary-icon">🏦</div>
                <div class="summary-label">Toplam Havale/EFT</div>
                <div class="summary-value">${totalTransfer.toFixed(2)} ₺</div>
            </div>
            <div class="summary-card credit">
                <div class="summary-icon">🎁</div>
                <div class="summary-label">Toplam İkram</div>
                <div class="summary-value">${totalCredit.toFixed(2)} ₺</div>
            </div>
            <div class="summary-card total">
                <div class="summary-icon">💰</div>
                <div class="summary-label">Genel Toplam</div>
                <div class="summary-value">${totalRevenue.toFixed(2)} ₺</div>
            </div>
        </div>
    `;
}

/**
 * Kullanıcı × Ödeme Metodu Matrix Gösterimi
 */
function renderPaymentUserMatrix(sales) {
    const tableBody = document.getElementById('payment-user-matrix-table');
    const userFilter = document.getElementById('payment-user-filter');
    if (!tableBody || !userFilter) return;

    // Kullanıcı listesini oluştur ve filtre güncelle
    const uniqueUsers = [...new Set(sales.map(sale => sale.createdBy || 'Bilinmeyen'))];
    userFilter.innerHTML = '<option value="">Tüm Kullanıcılar</option>' +
        uniqueUsers.map(user => `<option value="${escapeHtml(user)}">${escapeHtml(user)}</option>`).join('');

    const paymentMethods = {
        'cash': { name: 'Nakit', icon: '💵', color: '#4CAF50' },
        'credit_card': { name: 'Kredi Kartı', icon: '💳', color: '#2196F3' },
        'debit_card': { name: 'Banka Kartı', icon: '💳', color: '#FF9800' },
        'transfer': { name: 'Havale/EFT', icon: '🏦', color: '#9C27B0' },
        'mobile': { name: 'Mobil Ödeme', icon: '📱', color: '#E91E63' },
        'credit': { name: 'İkram', icon: '🎁', color: '#F44336' }
    };

    // Kullanıcıların ödeme metodları toplamlarını hesapla
    const userPaymentData = {};
    sales.forEach(sale => {
        const userName = sale.createdBy || 'Bilinmeyen';
        if (!userPaymentData[userName]) {
            userPaymentData[userName] = {
                totalAmount: 0,
                paymentMethods: {}
            };
        }

        if (sale.paymentData?.payments?.length) {
            sale.paymentData.payments.forEach(payment => {
                const method = payment.method || 'cash';
                const amount = payment.amount || 0;
                if (!userPaymentData[userName].paymentMethods[method]) {
                    userPaymentData[userName].paymentMethods[method] = 0;
                }
                userPaymentData[userName].paymentMethods[method] += amount;
                userPaymentData[userName].totalAmount += amount;
            });
        } else if (sale.paymentMethod) {
            const method = sale.paymentMethod.toLowerCase();
            const amount = sale.totalAmount || 0;
            if (!userPaymentData[userName].paymentMethods[method]) {
                userPaymentData[userName].paymentMethods[method] = 0;
            }
            userPaymentData[userName].paymentMethods[method] += amount;
            userPaymentData[userName].totalAmount += amount;
        } else {
            // Varsayılan olarak nakit
            if (!userPaymentData[userName].paymentMethods['cash']) {
                userPaymentData[userName].paymentMethods['cash'] = 0;
            }
            userPaymentData[userName].paymentMethods['cash'] += sale.totalAmount || 0;
            userPaymentData[userName].totalAmount += sale.totalAmount || 0;
        }
    });

    const selectedUser = userFilter.value;
    const filteredUsers = selectedUser ? [selectedUser] : uniqueUsers;

    tableBody.innerHTML = filteredUsers.map(userName => {
        const userData = userPaymentData[userName];
        const paymentRows = Object.entries(paymentMethods).map(([methodId, methodInfo]) => {
            const amount = userData?.paymentMethods[methodId] || 0;
            return `<td class="numeric">${amount.toFixed(2)} ₺</td>`;
        });
        const total = userData?.totalAmount || 0;

        return `
            <tr>
                <td><strong>${escapeHtml(userName)}</strong></td>
                ${paymentRows.join('')}
                <td class="numeric total"><strong>${total.toFixed(2)} ₺</strong></td>
            </tr>
        `;
    }).join('');
}

/**
 * Detaylı İşlem Listesi (Filtrelenebilir)
 */
function renderTransactionDetails(sales) {
    const tableBody = document.getElementById('transaction-details-table');
    const userFilter = document.getElementById('transaction-user-filter');
    const methodFilter = document.getElementById('transaction-method-filter');
    const searchInput = document.getElementById('transaction-search');
    const countInfo = document.getElementById('transaction-count-info');
    
    if (!tableBody) return;

    // Kullanıcı listesini oluştur
    const uniqueUsers = [...new Set(sales.map(sale => sale.createdBy || 'Bilinmeyen'))];
    if (userFilter) {
        userFilter.innerHTML = '<option value="">Tümü</option>' +
            uniqueUsers.map(user => `<option value="${escapeHtml(user)}">${escapeHtml(user)}</option>`).join('');
    }

    // Filtrele
    let filteredSales = [...sales];
    
    const selectedUser = userFilter?.value;
    if (selectedUser) {
        filteredSales = filteredSales.filter(sale => sale.createdBy === selectedUser);
    }

    const selectedMethod = methodFilter?.value;
    if (selectedMethod) {
        filteredSales = filteredSales.filter(sale => {
            if (sale.paymentData?.payments?.length) {
                return sale.paymentData.payments.some(p => p.method === selectedMethod);
            }
            return sale.paymentMethod === selectedMethod;
        });
    }

    const searchTerm = searchInput?.value?.toLowerCase();
    if (searchTerm) {
        filteredSales = filteredSales.filter(sale => {
            const itemsStr = sale.items?.map(item =>
                item.productName?.toLowerCase() + ' ' + item.productIcon
            ).join(' ') || '';
            return sale.createdBy?.toLowerCase().includes(searchTerm) ||
                   itemsStr.toLowerCase().includes(searchTerm) ||
                   (sale.totalAmount?.toString().includes(searchTerm));
        });
    }

    // Zamanına göre sırala (yeniden eskiye)
    filteredSales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    tableBody.innerHTML = filteredSales.map(sale => {
        // Ödeme metodlarını göster
        const paymentDisplay = sale.paymentData?.payments?.length
            ? sale.paymentData.payments.map(payment => {
                const methodIcons = {
                    'cash': '💵', 'credit_card': '💳', 'debit_card': '💳',
                    'transfer': '🏦', 'mobile': '📱', 'credit': '🎁'
                };
                const methodNames = {
                    'cash': 'Nakit', 'credit_card': 'Kredi Kartı', 'debit_card': 'Banka Kartı',
                    'transfer': 'Havale/EFT', 'mobile': 'Mobil Ödeme', 'credit': 'İkram'
                };
                return `${methodIcons[payment.method || 'cash']} ${methodNames[payment.method || 'cash']}: ${(payment.amount || 0).toFixed(2)} ₺`;
            }).join(', ')
            : `${sale.paymentMethod || 'Nakit'} ${(sale.totalAmount || 0).toFixed(2)} ₺`;

        const itemsStr = sale.items.map(item =>
            `${item.productIcon} ${item.productName} ×${item.quantity}`
        ).join(', ');

        return `
            <tr>
                <td>${formatTime(new Date(sale.createdAt))}</td>
                <td>${sale.createdBy || 'Bilinmeyen'}</td>
                <td class="numeric">${(sale.totalAmount || 0).toFixed(2)} ₺</td>
                <td>${paymentDisplay}</td>
                <td>${itemsStr}</td>
            </tr>
        `;
    }).join('');

    // Filtre bilgisi göster
    if (countInfo) {
        countInfo.textContent = `Toplam ${filteredSales.length} işlem gösteriliyor`;
    }
}

/**
 * Ödeme metodlarına göre filtrele
 */
function filterTransactions() {
    const dateInput = document.getElementById('report-date');
    const selectedDate = dateInput ? dateInput.value : new Date();
    
    getSalesByDate(selectedDate).then(sales => {
        renderTransactionDetails(sales);
    });
}

/**
 * Kullanıcıya göre ödeme metodları matrix filtrele
 */
function filterPaymentByUser() {
    const dateInput = document.getElementById('report-date');
    const selectedDate = dateInput ? dateInput.value : new Date();
    
    getSalesByDate(selectedDate).then(sales => {
        renderPaymentUserMatrix(sales);
    });
}

