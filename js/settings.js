/**
 * Settings.js
 * Ayarlar modülü - tema, oturum, klavye kısayolları
 */

// Tema ve görünüm ayarları
let currentTheme = 'default';
let isDarkMode = false;

// Oturum yönetimi
let autoLogoutTimer = null;
let autoLogoutDuration = 0; // dakika - 0 = otomatik çıkış kapalı
let activityCheckInterval = null;
let lastActivityTime = Date.now();
let sessionWarningTimeout = null;

// ===== TEMA YÖNETİMİ =====

// Karanlık modu aç/kapat
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : currentTheme);
    
    // Tema butonunu güncelle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        themeToggle.title = isDarkMode ? 'Aydınlık Mod (Ctrl+D)' : 'Karanlık Mod (Ctrl+D)';
    }
    
    // Tercihi kaydet
    localStorage.setItem('kahvepos_dark_mode', isDarkMode);
    
    showToast(isDarkMode ? 'Karanlık mod aktif' : 'Aydınlık mod aktif', 'success');
}

// Ayarlar modalından karanlık mod toggle
function toggleDarkModeFromSettings() {
    const checkbox = document.getElementById('dark-mode-toggle');
    isDarkMode = checkbox.checked;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : currentTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    }
    
    localStorage.setItem('kahvepos_dark_mode', isDarkMode);
}

// Renk teması değiştir
function setTheme(theme) {
    currentTheme = theme;
    if (!isDarkMode) {
        document.body.setAttribute('data-theme', theme);
    }
    
    // Tema butonlarını güncelle
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
    
    // Tercihi kaydet
    localStorage.setItem('kahvepos_theme', theme);
    
    const themeNames = {
        'default': 'Kahve',
        'blue': 'Mavi',
        'green': 'Yeşil',
        'purple': 'Mor',
        'red': 'Kırmızı'
    };
    
    showToast(`${themeNames[theme]} teması uygulandı`, 'success');
}

// Tema tercihlerini yükle
function loadThemePreferences() {
    const savedTheme = localStorage.getItem('kahvepos_theme') || 'default';
    const savedDarkMode = localStorage.getItem('kahvepos_dark_mode') === 'true';
    
    currentTheme = savedTheme;
    isDarkMode = savedDarkMode;
    
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : savedTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        themeToggle.title = isDarkMode ? 'Aydınlık Mod (Ctrl+D)' : 'Karanlık Mod (Ctrl+D)';
    }
}

// ===== OTURUM YÖNETİMİ =====

// Otomatik çıkış süresini ayarla
function setAutoLogoutTime() {
    const select = document.getElementById('auto-logout-time');
    autoLogoutDuration = parseInt(select.value);
    
    localStorage.setItem('kahvepos_auto_logout', autoLogoutDuration);
    
    // Timer'ı yeniden başlat
    if (getCurrentUser()) {
        startAutoLogoutTimer();
    }
    
    if (autoLogoutDuration > 0) {
        showToast(`Otomatik çıkış ${autoLogoutDuration} dakikaya ayarlandı`, 'success');
    } else {
        showToast('Otomatik çıkış kapatıldı', 'info');
    }
}

// Otomatik çıkış timer'ını başlat
function startAutoLogoutTimer() {
    // Mevcut timer'ı temizle
    if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
    }
    if (sessionWarningTimeout) {
        clearTimeout(sessionWarningTimeout);
        hideSessionWarning();
    }
    
    lastActivityTime = Date.now();
    
    if (autoLogoutDuration <= 0) return;
    
    const timeoutMs = autoLogoutDuration * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 60000, timeoutMs * 0.9); // 1 dakika önce veya %90'ında uyar
    
    // Uyarı timer'ı
    sessionWarningTimeout = setTimeout(() => {
        showSessionWarning();
    }, warningMs);
    
    // Çıkış timer'ı
    autoLogoutTimer = setTimeout(() => {
        showToast('Oturum süreniz doldu, çıkış yapılıyor...', 'warning');
        setTimeout(() => {
            logout();
        }, 2000);
    }, timeoutMs);
}

// Oturum uyarısını göster
function showSessionWarning() {
    const warning = document.getElementById('session-warning');
    if (!warning) return;
    
    let countdown = 60;
    warning.style.display = 'flex';
    
    const countdownInterval = setInterval(() => {
        countdown--;
        const countdownEl = document.getElementById('session-countdown');
        if (countdownEl) {
            countdownEl.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
    
    // Uyarıyı 60 saniye sonra gizle (timer zaten çıkış yapacak)
    setTimeout(() => {
        hideSessionWarning();
        clearInterval(countdownInterval);
    }, 60000);
}

// Oturum uyarısını gizle
function hideSessionWarning() {
    const warning = document.getElementById('session-warning');
    if (warning) {
        warning.style.display = 'none';
    }
}

// Oturum süresini uzat
function extendSession() {
    startAutoLogoutTimer();
    hideSessionWarning();
    showToast('Oturum süresi uzatıldı', 'success');
}

// Aktivite takibi
function trackActivity() {
    lastActivityTime = Date.now();
    
    // Timer'ı yeniden başlat
    if (getCurrentUser() && autoLogoutDuration > 0) {
        startAutoLogoutTimer();
    }
    
    // Aktivite göstergesini güncelle
    updateActivityIndicator();
}

// Aktivite göstergesi güncelle
function updateActivityIndicator() {
    const indicator = document.querySelector('.activity-indicator');
    if (!indicator) return;
    
    const timeSinceActivity = Date.now() - lastActivityTime;
    
    if (timeSinceActivity < 30000) { // 30 saniye
        indicator.className = 'activity-indicator';
        indicator.title = 'Aktif';
    } else if (timeSinceActivity < 300000) { // 5 dakika
        indicator.className = 'activity-indicator away';
        indicator.title = 'Uzakta';
    } else {
        indicator.className = 'activity-indicator offline';
        indicator.title = 'İnaktif';
    }
}

// Aktivite olaylarını dinle
function initActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, () => {
            trackActivity();
        }, { passive: true });
    });
    
    // Her 10 saniyede bir aktivite göstergesini güncelle
    activityCheckInterval = setInterval(() => {
        updateActivityIndicator();
    }, 10000);
}

// ===== AYARLAR MODALI =====

// Ayarlar modalını aç
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    
    // Mevcut ayarları yükle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;
    }
    
    // Tema butonlarını güncelle
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === currentTheme);
    });
    
    // Otomatik çıkış süresini yükle
    const autoLogoutSelect = document.getElementById('auto-logout-time');
    if (autoLogoutSelect) {
        autoLogoutSelect.value = autoLogoutDuration;
    }
    
    // Oturum bilgilerini göster
    updateSessionInfo();
    
    // Veri boyutunu hesapla
    updateDataSize();
    
    modal.classList.add('active');
}

// Ayarlar modalını kapat
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Oturum bilgilerini güncelle
function updateSessionInfo() {
    const loginTime = sessionStorage.getItem('kahvepos_login_time');
    const loginTimeDisplay = document.getElementById('login-time-display');
    const sessionDurationDisplay = document.getElementById('session-duration-display');
    
    if (loginTime && loginTimeDisplay) {
        const loginDate = new Date(parseInt(loginTime));
        loginTimeDisplay.textContent = loginDate.toLocaleString('tr-TR');
        
        // Oturum süresi
        if (sessionDurationDisplay) {
            const duration = Date.now() - parseInt(loginTime);
            const hours = Math.floor(duration / 3600000);
            const minutes = Math.floor((duration % 3600000) / 60000);
            sessionDurationDisplay.textContent = `${hours} saat ${minutes} dakika`;
        }
    }
}

// Veri boyutunu hesapla
function updateDataSize() {
    const dataSizeEl = document.getElementById('data-size');
    if (!dataSizeEl) return;
    
    let totalSize = 0;
    
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('kahvepos_')) {
            totalSize += localStorage[key].length + key.length;
        }
    }
    
    for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key) && key.startsWith('kahvepos_')) {
            totalSize += sessionStorage[key].length + key.length;
        }
    }
    
    const sizeInKB = (totalSize / 1024).toFixed(2);
    dataSizeEl.textContent = sizeInKB + ' KB';
}

// ===== ŞİFRE DEĞİŞTİRME =====

// Şifre değiştirme modalını aç
function openChangePasswordModal() {
    closeSettingsModal();
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.classList.add('active');
        // Formu temizle
        document.getElementById('change-password-form').reset();
    }
}

// Şifre değiştirme modalını kapat
function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Şifre değiştir
function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    const user = getCurrentUser();
    if (!user) {
        showToast('Oturum açılmamış', 'error');
        return;
    }
    
    // Mevcut şifreyi kontrol et
    if (user.password !== currentPassword) {
        showToast('Mevcut şifre yanlış', 'error');
        return;
    }
    
    // Yeni şifreleri karşılaştır
    if (newPassword !== confirmPassword) {
        showToast('Yeni şifreler eşleşmiyor', 'error');
        return;
    }
    
    // Şifre uzunluğu kontrolü
    if (newPassword.length < 4) {
        showToast('Şifre en az 4 karakter olmalıdır', 'error');
        return;
    }
    
    // Şifreyi güncelle
    const result = updateUser(user.id, { password: newPassword });
    
    if (result.success) {
        // Oturumdaki kullanıcıyı da güncelle
        user.password = newPassword;
        sessionStorage.setItem('kahvepos_current_user', JSON.stringify(user));
        
        showToast('Şifre başarıyla değiştirildi', 'success');
        closeChangePasswordModal();
    } else {
        showToast('Şifre değiştirilemedi: ' + result.message, 'error');
    }
}

// ===== VERİ YÖNETİMİ =====

// Tüm veriyi sil
function clearAllData() {
    if (!confirm('⚠️ TÜM VERİLER SİLİNECEK!\n\nÜrünler, satışlar, kullanıcılar ve ayarlar kalıcı olarak silinecek. Bu işlem geri alınamaz!\n\nDevam etmek istiyor musunuz?')) {
        return;
    }
    
    if (!confirm('Son uyarı! Tüm verilerinizi kaybedeceksiniz. Emin misiniz?')) {
        return;
    }
    
    // LocalStorage'ı temizle
    for (let key in localStorage) {
        if (key.startsWith('kahvepos_')) {
            localStorage.removeItem(key);
        }
    }
    
    // SessionStorage'ı temizle
    for (let key in sessionStorage) {
        if (key.startsWith('kahvepos_')) {
            sessionStorage.removeItem(key);
        }
    }
    
    showToast('Tüm veriler silindi', 'success');
    
    // 2 saniye sonra sayfayı yenile
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}

// ===== ÖKC (YAZAR KASA) AYARLARI =====

/**
 * ÖKC (Yazar Kasa) ayarlarını yükle
 */
function loadOKCSettings() {
    const settings = OKC.loadSettings();
    
    // Checkbox ve select öğelerini güncelle
    const enabledCheckbox = document.getElementById('okc-enabled');
    const autoPrintCheckbox = document.getElementById('okc-auto-print');
    const portSelect = document.getElementById('okc-port');
    const okcSettingsDiv = document.getElementById('okc-settings');
    
    if (enabledCheckbox) {
        enabledCheckbox.checked = settings ? settings.enabled : false;
    }
    if (autoPrintCheckbox) {
        autoPrintCheckbox.checked = settings ? settings.autoPrint : true;
    }
    if (portSelect && settings) {
        portSelect.value = settings.port || 'auto';
    }
    
    // Ayarlar bölümünü göster/gizle
    if (okcSettingsDiv && settings && settings.enabled) {
        okcSettingsDiv.style.display = 'block';
    }
    
    // Durumu güncelle
    if (settings && settings.enabled) {
        updateOKCStatus();
    }
}

/**
 * ÖKC'yi aç/kapat
 */
function toggleOKC() {
    const checkbox = document.getElementById('okc-enabled');
    const okcSettingsDiv = document.getElementById('okc-settings');
    
    const enabled = checkbox.checked;
    OKC.toggle(enabled);
    
    // Ayarlar bölümünü göster/gizle
    if (okcSettingsDiv) {
        okcSettingsDiv.style.display = enabled ? 'block' : 'none';
    }
    
    if (enabled) {
        // Aktif edildiğinde durum kontrolü yap
        updateOKCStatus();
        showToast('Yazar Kasa aktif edildi', 'success');
    } else {
        showToast('Yazar Kasa devre dışı bırakıldı', 'info');
    }
}

/**
 * ÖKC ayarlarını kaydet
 */
function saveOKCSettings() {
    const autoPrintCheckbox = document.getElementById('okc-auto-print');
    const portSelect = document.getElementById('okc-port');
    
    OKC.autoPrint = autoPrintCheckbox ? autoPrintCheckbox.checked : true;
    OKC.port = portSelect ? portSelect.value : 'auto';
    
    OKC.saveSettings();
}

/**
 * ÖKC ve Bridge durumunu güncelle
 */
async function updateOKCStatus() {
    const bridgeStatusEl = document.getElementById('okc-bridge-status');
    const deviceStatusEl = document.getElementById('okc-device-status');
    
    if (!bridgeStatusEl || !deviceStatusEl) return;
    
    // Yükleniyor durumu
    bridgeStatusEl.innerHTML = '⏳ Kontrol ediliyor...';
    deviceStatusEl.innerHTML = '⏳ Kontrol ediliyor...';
    
    const status = await OKC.checkStatus();
    
    // Bridge durumu
    if (status.bridge && status.bridge.running) {
        bridgeStatusEl.innerHTML = '<span style="color: #22c55e;">✓ Çalışıyor</span>';
    } else {
        bridgeStatusEl.innerHTML = '<span style="color: #ef4444;">❌ Çalışmıyor</span>';
    }
    
    // Cihaz durumu
    if (status.device && status.device.connected) {
        deviceStatusEl.innerHTML = '<span style="color: #22c55e;">✓ Bağlı</span>';
    } else {
        deviceStatusEl.innerHTML = '<span style="color: #ef4444;">❌ Bağlı Değil</span>';
    }
}

/**
 * ÖKC durumunu manuel kontrol et
 */
function checkOKCStatus() {
    updateOKCStatus();
    showToast('ÖKC durumu kontrol ediliyor...', 'info');
}

/**
 * COM portlarını tespit et ve listeyi güncelle
 */
async function detectOKCPorts() {
    const portSelect = document.getElementById('okc-port');
    if (!portSelect) return;
    
    // Yükleniyor durumu
    const currentValue = portSelect.value;
    portSelect.innerHTML = '<option value="">⏳ Taranıyor...</option>';
    
    try {
        const ports = await OKC.listPorts();
        
        portSelect.innerHTML = '<option value="auto">🔍 Otomatik Algıla</option>';
        
        if (ports.length === 0) {
            portSelect.innerHTML += '<option value="" disabled>Hiçbir COM port bulunamadı</option>';
            showToast('COM portu bulunamadı. Cihazın bağlı olduğunu kontrol edin.', 'warning');
        } else {
            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = `${port.path} - ${port.manufacturer || 'Bilinmeyen'}`;
                portSelect.appendChild(option);
            });
            showToast(`${ports.length} adet COM port bulundu`, 'success');
        }
        
        // Önceki seçimi koru
        portSelect.value = currentValue;
        
    } catch (error) {
        portSelect.innerHTML = '<option value="auto">🔍 Otomatik Algıla</option>';
        portSelect.value = currentValue;
        showToast('Port tarama hatası: ' + error.message, 'error');
    }
}

/**
 * Test fişi yazdır
 */
function printOKCTestReceipt() {
    OKC.printTestReceipt();
}

/**
 * X Raporu yazdır
 */
function printOKCXReport() {
    OKC.printXReport();
}

/**
 * Z Raporu yazdır
 */
function printOKCZReport() {
    OKC.printZReport();
}

// ===== BAŞLATMA =====

// Ayarları başlat
function initSettings() {
    loadThemePreferences();
    
    // Otomatik çıkış süresini yükle
    const savedAutoLogout = localStorage.getItem('kahvepos_auto_logout');
    if (savedAutoLogout) {
        autoLogoutDuration = parseInt(savedAutoLogout);
        const autoLogoutSelect = document.getElementById('auto-logout-time');
        if (autoLogoutSelect) {
            autoLogoutSelect.value = autoLogoutDuration;
        }
    }
    
    // Aktivite takibini başlat
    initActivityTracking();
    
    // Kullanıcı giriş yaptıysa otomatik çıkış timer'ını başlat
    if (getCurrentUser() && autoLogoutDuration > 0) {
        startAutoLogoutTimer();
    }
    
    // ÖKC ayarlarını yükle
    loadOKCSettings();
}

// Ayarlar modalını açarken ÖKC ayarlarını da yükle
const originalOpenSettingsModal = openSettingsModal;
openSettingsModal = function() {
    originalOpenSettingsModal();
    loadOKCSettings();
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

