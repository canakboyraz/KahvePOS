/**
 * Backup.js
 * Yedekleme ve geri yükleme modülü
 */

// Son yedekleme tarihini kaydet
function saveLastBackupDate() {
    const now = new Date().toISOString();
    localStorage.setItem('kahvepos_last_backup', now);
    updateLastBackupDisplay();
}

// Son yedekleme tarihini göster
function updateLastBackupDisplay() {
    const lastBackupEl = document.getElementById('last-backup-date');
    if (!lastBackupEl) return;
    
    const lastBackup = localStorage.getItem('kahvepos_last_backup');
    if (lastBackup) {
        const date = new Date(lastBackup);
        lastBackupEl.textContent = date.toLocaleString('tr-TR');
    }
}

// ===== YEDEKLEME MODALI =====

// Yedekleme modalını aç
function openBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (!modal) return;
    
    // İstatistikleri güncelle
    document.getElementById('backup-product-count').textContent = allProducts.length;
    document.getElementById('backup-sale-count').textContent = getAllSales().length;
    document.getElementById('backup-user-count').textContent = getAllUsers().length;
    
    modal.classList.add('active');
}

// Yedekleme modalını kapat
function closeBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ===== YEDEK OLUŞTURMA =====

// Yedek oluştur (ayarlardan)
function createBackup() {
    downloadBackup();
    closeSettingsModal();
}

// Yedeği indir
function downloadBackup() {
    const backupData = {
        version: '3.0',
        backupDate: new Date().toISOString(),
        data: {
            products: allProducts,
            sales: Storage.getSales(),
            users: Storage.get('kahvepos_users'),
            settings: {
                theme: localStorage.getItem('kahvepos_theme'),
                darkMode: localStorage.getItem('kahvepos_dark_mode'),
                autoLogout: localStorage.getItem('kahvepos_auto_logout')
            }
        }
    };
    
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `kahvepos_yedek_${formatDateForBackup(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    saveLastBackupDate();
    showToast('Yedek başarıyla indirildi', 'success');
    
    closeBackupModal();
}

// Tarih formatla (dosya adı için)
function formatDateForBackup(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

// ===== GERİ YÜKLEME =====

// Geri yükle (ayarlardan)
function restoreBackup() {
    const input = document.getElementById('restore-file-input');
    if (input) {
        input.click();
    }
}

// Dosya seçildiğinde
function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            restoreFromBackupData(backupData);
        } catch (error) {
            showToast('Geçersiz yedek dosyası', 'error');
            console.error('Restore error:', error);
        }
    };
    reader.readAsText(file);
    
    // Input'u temizle
    event.target.value = '';
}

// Yedekten geri yükle
function restoreFromBackupData(backupData) {
    // Versiyon kontrolü
    if (!backupData.version) {
        showToast('Geçersiz yedek formatı', 'error');
        return;
    }
    
    // Onay al
    const backupDate = backupData.backupDate ? new Date(backupData.backupDate).toLocaleString('tr-TR') : 'Bilinmeyen tarih';
    if (!confirm(`Bu yedek ${backupDate} tarihinde oluşturulmuş.\n\nMevcut verileriniz bu yedekle değiştirilecek.\n\nDevam etmek istiyor musunuz?`)) {
        return;
    }
    
    if (!confirm('Son onay: Mevcut verileriniz kaybolacak. Emin misiniz?')) {
        return;
    }
    
    try {
        // Verileri geri yükle
        if (backupData.data.products) {
            allProducts = backupData.data.products;
            Storage.saveProducts(backupData.data.products);
        }
        
        if (backupData.data.sales) {
            Storage.saveSales(backupData.data.sales);
        }
        
        if (backupData.data.users) {
            Storage.set('kahvepos_users', backupData.data.users);
        }
        
        // Ayarları geri yükle
        if (backupData.data.settings) {
            if (backupData.data.settings.theme) {
                localStorage.setItem('kahvepos_theme', backupData.data.settings.theme);
            }
            if (backupData.data.settings.darkMode) {
                localStorage.setItem('kahvepos_dark_mode', backupData.data.settings.darkMode);
            }
            if (backupData.data.settings.autoLogout) {
                localStorage.setItem('kahvepos_auto_logout', backupData.data.settings.autoLogout);
            }
        }
        
        showToast('Yedek başarıyla geri yüklendi! Sayfa yenileniyor...', 'success');
        
        // Sayfayı yenile
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        showToast('Geri yükleme başarısız: ' + error.message, 'error');
        console.error('Restore error:', error);
    }
}

// ===== İMPORT/EXPORT =====

// Import modalını aç
function openImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.classList.add('active');
        // Formu temizle
        document.getElementById('import-file-input').value = '';
    }
}

// Import modalını kapat
function closeImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Veri içe aktar
function importData() {
    const format = document.getElementById('import-format').value;
    const fileInput = document.getElementById('import-file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Lütfen bir dosya seçin', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            if (format === 'csv') {
                importFromCSV(e.target.result);
            } else {
                importFromJSON(e.target.result);
            }
        } catch (error) {
            showToast('Dosya okuma hatası: ' + error.message, 'error');
        }
    };
    
    if (format === 'csv') {
        reader.readAsText(file);
    } else {
        reader.readAsText(file);
    }
}

// CSV'den ürün içe aktar
function importFromCSV(csvText) {
    const lines = csvText.split('\n');
    const imported = [];
    let errors = 0;
    
    // Başlık satırını atla
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // CSV parse
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length < 4) continue;
        
        const [name, category, cost, price, icon = '☕'] = parts;
        
        if (!name || !price) continue;
        
        // Kategori eşleştirme
        const categoryMap = {
            'sicak': 'sicak',
            'sıcak': 'sicak',
            'soguk': 'soguk',
            'soğuk': 'soguk',
            'tatli': 'tatli',
            'tatlı': 'tatli',
            'diger': 'diger',
            'diğer': 'diger'
        };
        
        const mappedCategory = categoryMap[category.toLowerCase()] || 'diger';
        
        const product = {
            id: generateUUID(),
            name: name,
            category: mappedCategory,
            costPrice: parseFloat(cost) || 0,
            salePrice: parseFloat(price) || 0,
            icon: icon,
            active: true,
            createdAt: new Date().toISOString()
        };
        
        allProducts.push(product);
        imported.push(product);
    }
    
    if (imported.length > 0) {
        Storage.saveProducts(allProducts);
        renderProductsList();
        renderProductsGrid();
        showToast(`${imported.length} ürün içe aktarıldı`, 'success');
        closeImportModal();
    } else {
        showToast('İçe aktarılacak ürün bulunamadı', 'warning');
    }
}

// JSON'dan ürün içe aktar
function importFromJSON(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        
        if (!Array.isArray(data.products)) {
            // Tek ürün olabilir
            const products = Array.isArray(data) ? data : [data];
            products.forEach(product => {
                if (product.name && product.price) {
                    allProducts.push({
                        id: generateUUID(),
                        name: product.name,
                        category: product.category || 'diger',
                        costPrice: product.cost || product.costPrice || 0,
                        salePrice: product.price || product.salePrice || 0,
                        icon: product.icon || '☕',
                        active: true,
                        createdAt: new Date().toISOString()
                    });
                }
            });
        } else {
            data.products.forEach(product => {
                allProducts.push({
                    id: generateUUID(),
                    name: product.name,
                    category: product.category || 'diger',
                    costPrice: product.cost || product.costPrice || 0,
                    salePrice: product.price || product.salePrice || 0,
                    icon: product.icon || '☕',
                    active: true,
                    createdAt: new Date().toISOString()
                });
            });
        }
        
        Storage.saveProducts(allProducts);
        renderProductsList();
        renderProductsGrid();
        showToast('Ürünler başarıyla içe aktarıldı', 'success');
        closeImportModal();
        
    } catch (error) {
        showToast('JSON format hatası: ' + error.message, 'error');
    }
}

// Ürünleri CSV olarak dışa aktar
function exportProducts() {
    const headers = ['isim', 'kategori', 'maliyet', 'fiyat', 'simge'];
    const rows = allProducts.map(p => 
        `"${p.name}","${p.category}",${p.costPrice},${p.salePrice},"${p.icon}"`
    );
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kahvepos_urunler_${formatDateForBackup(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Ürünler CSV olarak indirildi', 'success');
}

// Raporu CSV olarak dışa aktar
function exportReportToCSV() {
    const dateInput = document.getElementById('report-date');
    const selectedDate = dateInput.value || new Date();
    const sales = getSalesByDate(selectedDate);
    
    if (sales.length === 0) {
        showToast('Bu tarihte dışa aktarılacak veri yok', 'warning');
        return;
    }
    
    downloadSalesCSV(sales, `kahvepos_rapor_${selectedDate.replace(/-/g, '')}.csv`);
    showToast('Rapor CSV olarak indirildi', 'success');
}

// ===== BAŞLATMA =====

// Yedekleme modülünü başlat
function initBackup() {
    updateLastBackupDisplay();
}

document.addEventListener('DOMContentLoaded', () => {
    initBackup();
});

