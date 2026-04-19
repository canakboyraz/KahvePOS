/**
 * App.js
 * Ana uygulama yönetimi - v4.0
 * Klavye kısayolları, PWA, gelişmiş özellikler
 */

let currentPage = 'pos';
let deferredPrompt = null;

// ===== GİRİŞ SİSTEMİ =====

// Giriş modalını göster
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('active');
    
    setTimeout(() => {
        const usernameInput = document.getElementById('login-username');
        if (usernameInput) usernameInput.focus();
    }, 100);
}

// Giriş modalını kapat
function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('active');
}

// Giriş yap
async function performLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showToast('Kullanıcı adı ve şifre gerekli', 'warning');
        return;
    }
    
    const result = await login(username, password);
    
    if (result.success) {
        closeLoginModal();
        
        // Header ve main-container'ı göster
        document.getElementById('main-header').style.display = 'block';
        document.getElementById('main-container').style.display = 'block';
        
        updateHeaderUserInfo();
        showToast(`Hoş geldin, ${result.user.username}!`, 'success');
        
        // Kullanıcılar sekmesini admin ise göster
        if (isAdmin()) {
            document.getElementById('users-tab').style.display = 'block';
        }
        
        // Otomatik çıkış timer'ını başlat
        if (typeof startAutoLogoutTimer === 'function') {
            startAutoLogoutTimer();
        }
        
        // Session health check'i başlat (Safari token expire koruması)
        if (typeof startSessionHealthCheck === 'function') {
            startSessionHealthCheck();
        }
        
        // Dashboard sayfasına başla
        performPageSwitch('dashboard');
    } else {
        showToast(result.message, 'error');
        document.getElementById('login-password').value = '';
        document.getElementById('login-password').focus();
    }
}

// Çıkış yap
function logout() {
    const user = getCurrentUser();
    if (!user) return;
    
    if (confirm(`${user.username} olarak çıkış yapmak istediğinize emin misiniz?`)) {
        // Timer'ı temizle
        if (typeof autoLogoutTimer !== 'undefined' && autoLogoutTimer) {
            clearTimeout(autoLogoutTimer);
        }
        if (typeof sessionWarningTimeout !== 'undefined' && sessionWarningTimeout) {
            clearTimeout(sessionWarningTimeout);
        }
        
        // Session health check'i durdur
        if (typeof stopSessionHealthCheck === 'function') {
            stopSessionHealthCheck();
        }
        
        logoutUser();
        
        // UI güncelle - header ve main-container'ı gizle
        document.getElementById('main-header').style.display = 'none';
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('users-tab').style.display = 'none';
        document.getElementById('user-info').style.display = 'none';
        
        // Login modalını tekrar göster
        showLoginModal();
        showToast('Çıkış yapıldı', 'success');
    }
}

// ===== MENÜ TOGGLE =====

// Hamburger menüyü aç/kapat
function toggleMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navTabs = document.getElementById('nav-tabs');
    
    if (menuToggle) menuToggle.classList.toggle('active');
    if (navTabs) navTabs.classList.toggle('show');
}

// Menüyü kapat (sayfa seçilince)
function closeMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navTabs = document.getElementById('nav-tabs');
    
    if (menuToggle) menuToggle.classList.remove('active');
    if (navTabs) navTabs.classList.remove('show');
}

// Header'da kullanıcı bilgisini göster
function updateHeaderUserInfo() {
    const user = getCurrentUser();
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('current-user-name');
    
    if (user) {
        if (userName) userName.textContent = `${ROLES[user.role].icon} ${user.username}`;
        if (userInfo) userInfo.style.display = 'flex';
    } else {
        if (userInfo) userInfo.style.display = 'none';
    }
}

// ===== SAYFA GEÇİŞİ =====

// Sayfa geçişi
function switchPage(pageName) {
    const user = getCurrentUser();
    
    // Dashboard ve POS sayfası herkese açık
    if (pageName === 'dashboard' || pageName === 'pos') {
        performPageSwitch(pageName);
        return;
    }
    
    // Kullanıcı giriş yapmamışsa giriş modalını göster
    if (!user) {
        showLoginModal();
        pendingPage = pageName;
        return;
    }
    
    // Yetki kontrolü
    if (pageName === 'products' && !hasPermission('manageProducts')) {
        showToast('Bu sayfaya erişim yetkiniz yok', 'error');
        return;
    }
    
    if (pageName === 'reports' && !hasPermission('viewReports')) {
        showToast('Bu sayfaya erişim yetkiniz yok', 'error');
        return;
    }
    
    if (pageName === 'users' && !hasPermission('manageUsers')) {
        showToast('Bu sayfaya erişim yetkiniz yok', 'error');
        return;
    }
    
    performPageSwitch(pageName);
}

// Sayfa geçişini gerçekleştir
function performPageSwitch(pageName) {
    // Menüyü kapat (mobilde)
    closeMenu();
    
    // Tüm sayfaları gizle
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Seçili sayfayı göster
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Tab stillerini güncelle
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('data-page') === pageName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    currentPage = pageName;
    
    // Sayfa yüklendiğinde ilgili verileri güncelle
    if (pageName === 'dashboard') {
        if (typeof loadDashboard === 'function') loadDashboard();
    } else if (pageName === 'products') {
        renderProductsList();
    } else if (pageName === 'reports') {
        setTodayDate();
        loadReport();
    } else if (pageName === 'users') {
        renderUsersList();
    } else if (pageName === 'pos') {
        renderCategoryTabs();
        renderProductsGrid();
    }
}

// ===== KULLANICI YÖNETİMİ =====

// Kullanıcı listesini oluştur
async function renderUsersList() {
    const listContainer = document.getElementById('users-list');
    const emptyState = document.getElementById('empty-users');
    
    if (!listContainer) return;
    
    const users = await getAllUsers();
    const safeUsers = Array.isArray(users) ? users : [];
    
    if (safeUsers.length === 0) {
        listContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    listContainer.innerHTML = safeUsers.map(user => {
        const role = ROLES[user.role] || ROLES.barista;
        const isOwnAccount = getCurrentUser() && getCurrentUser().id === user.id;
        
        return `
            <div class="user-item">
                <div class="user-item-info">
                    <span class="user-item-icon">${role.icon}</span>
                    <div class="user-item-details">
                        <h3>${user.username} ${isOwnAccount ? '(Siz)' : ''}</h3>
                        <div class="user-role-badge" style="background: ${role.color}20; color: ${role.color};">
                            ${role.icon} ${role.name}
                        </div>
                        <div class="user-permissions">
                            ${user.canManageProducts ? '<span class="perm-badge">📦 Ürün</span>' : ''}
                            ${user.canViewReports ? '<span class="perm-badge">📊 Rapor</span>' : ''}
                            ${user.canManageUsers ? '<span class="perm-badge">👥 Kullanıcı</span>' : ''}
                        </div>
                    </div>
                </div>
                ${!isOwnAccount && user.role !== 'admin' ? `
                    <div class="user-item-actions">
                        <button class="btn-edit" onclick="editUser('${user.id}')">✏️ Düzenle</button>
                        <button class="btn-delete" onclick="deleteUser('${user.id}')">🗑️ Sil</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Kullanıcı modal açma
async function openUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    
    // Formu temizle
    form.reset();
    const userIdInput = document.getElementById('user-id');
    if (userIdInput) userIdInput.value = '';
    
    const permProducts = document.getElementById('user-perm-products');
    const permReports = document.getElementById('user-perm-reports');
    const permUsers = document.getElementById('user-perm-users');
    
    if (permProducts) permProducts.checked = false;
    if (permReports) permReports.checked = true;
    if (permUsers) permUsers.checked = false;
    
    if (userId) {
        // Düzenleme modu
        const user = await getUserById(userId);
        if (user) {
            if (modalTitle) modalTitle.textContent = 'Kullanıcı Düzenle';
            if (userIdInput) userIdInput.value = user.id;
            
            const usernameInput = document.getElementById('user-username');
            const roleInput = document.getElementById('user-role');
            if (usernameInput) usernameInput.value = user.username;
            if (roleInput) roleInput.value = user.role;
            
            if (permProducts) permProducts.checked = user.canManageProducts;
            if (permReports) permReports.checked = user.canViewReports;
            if (permUsers) permUsers.checked = user.canManageUsers;
        }
    } else {
        // Yeni kullanıcı modu
        if (modalTitle) modalTitle.textContent = 'Yeni Kullanıcı Ekle';
    }
    
    if (modal) modal.classList.add('active');
}

// Kullanıcı modal kapatma
function closeUserModal() {
    const modal = document.getElementById('user-modal');
    if (modal) modal.classList.remove('active');
}

// Kullanıcı kaydetme
async function saveUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('user-id').value;
    const userData = {
        username: document.getElementById('user-username').value.trim(),
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value,
        canManageProducts: document.getElementById('user-perm-products').checked,
        canViewReports: document.getElementById('user-perm-reports').checked,
        canManageUsers: document.getElementById('user-perm-users').checked
    };
    
    if (!userData.username) {
        showToast('Kullanıcı adı gerekli', 'warning');
        return;
    }
    
    if (!userId && !userData.password) {
        showToast('Yeni kullanıcı için şifre gerekli', 'warning');
        return;
    }
    
    let result;
    if (userId) {
        // Güncelleme
        const existingUser = await getUserById(userId);
        if (!userData.password) {
            userData.password = existingUser?.password || ''; // Şifre boşsa değiştirme
        }
        result = await updateUser(userId, userData);
    } else {
        // Yeni kullanıcı
        result = await addUser(userData);
    }
    
    if (result.success) {
        showToast(result.message, 'success');
        await renderUsersList();
        closeUserModal();
    } else {
        showToast(result.message, 'error');
    }
}

// Kullanıcı düzenleme
async function editUser(userId) {
    await openUserModal(userId);
}

// Kullanıcı silme
async function deleteUser(userId) {
    const user = await getUserById(userId);
    if (!user) return;
    
    if (confirm(`"${user.username}" kullanıcısını silmek istediğinize emin misiniz?`)) {
        const result = await window.Users.deleteUser(userId);
        if (result.success) {
            showToast(result.message, 'success');
            await renderUsersList();
        } else {
            showToast(result.message, 'error');
        }
    }
}

// ===== TOAST BİLDİRİMLERİ =====

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ===== KLAVYE KISAYOLLARI =====

// Klavye kısayollarını başlat
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Modal açık mı kontrol et
        const modalActive = document.querySelector('.modal-overlay.active');
        
        // Input'ta mı kontrol et
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        
        // ===== F FONKSİYON TUŞLARI =====
        if (e.key === 'F1') {
            e.preventDefault();
            switchPage('dashboard');
            return;
        }
        
        if (e.key === 'F2') {
            e.preventDefault();
            if (modalActive) {
                // Modal açıksa kapat
                closeAllModals();
            } else {
                switchPage('pos');
                // POS sayfasına odaklan
                setTimeout(() => {
                    if (typeof focusSearchInput === 'function') {
                        focusSearchInput();
                    }
                }, 100);
            }
            return;
        }
        
        if (e.key === 'F3') {
            e.preventDefault();
            switchPage('products');
            return;
        }
        
        if (e.key === 'F4') {
            e.preventDefault();
            switchPage('reports');
            return;
        }
        
        if (e.key === 'F5') {
            e.preventDefault();
            if (hasPermission('manageUsers')) {
                switchPage('users');
            }
            return;
        }
        
        // ===== CTRL KISAYOLLARI =====
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'd':
                case 'D':
                    e.preventDefault();
                    toggleDarkMode();
                    return;
                    
                case 's':
                case 'S':
                    e.preventDefault();
                    downloadBackup();
                    showToast('Yedek alınıyor...', 'info');
                    return;
                    
                case ',':
                    e.preventDefault();
                    openSettingsModal();
                    return;
                    
                case '1':
                    e.preventDefault();
                    switchPage('dashboard');
                    return;
                    
                case '2':
                    e.preventDefault();
                    switchPage('pos');
                    return;
                    
                case '3':
                    e.preventDefault();
                    if (hasPermission('manageProducts')) {
                        switchPage('products');
                    }
                    return;
                    
                case '4':
                    e.preventDefault();
                    if (hasPermission('viewReports')) {
                        switchPage('reports');
                    }
                    return;
            }
        }
        
        // ===== ENTER TUŞU =====
        if (e.key === 'Enter') {
            // Login modalında
            const loginModal = document.getElementById('login-modal');
            if (loginModal && loginModal.classList.contains('active')) {
                e.preventDefault();
                performLogin();
                return;
            }
            
            // Sepette ürün varsa ve modal yoksa
            if (cart.length > 0 && !modalActive && currentPage === 'pos') {
                e.preventDefault();
                checkout();
                return;
            }
        }
        
        // ===== ESCAPE TUŞU =====
        if (e.key === 'Escape') {
            closeAllModals();
            return;
        }
        
        // ===== DELETE TUŞU =====
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Modal yoksa ve POS sayfasındaysak sepeti temizle
            if (!modalActive && !isInputFocused && currentPage === 'pos' && cart.length > 0) {
                quickClearCart();
                return;
            }
        }
    });
}

// Tüm modalları kapat
function closeAllModals() {
    closeLoginModal();
    closeUserModal();
    closeProductModal();
    closeSettingsModal();
    closeChangePasswordModal();
    closeBackupModal();
    closeImportModal();
}

// ===== PWA YÜKLEME =====

// PWA kurulum prompt'unu göster
function showPWAInstallPrompt() {
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt && deferredPrompt) {
        prompt.style.display = 'flex';
    }
}

// PWA kurulum prompt'unu gizle
function dismissPWAPrompt() {
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt) {
        prompt.style.display = 'none';
        localStorage.setItem('kahvepos_pwa_dismissed', 'true');
    }
}

// PWA'yı yükle
function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast('KahvePOS kuruluyor...', 'success');
            }
            deferredPrompt = null;
            
            const prompt = document.getElementById('pwa-install-prompt');
            if (prompt) prompt.style.display = 'none';
        });
    }
}

// PWA event listener'ları
function initPWA() {
    // İndirme prompt'unu yakala
    window.addEventListener('beforeinstallprompt', (e) => {
        // Daha önce reddedilmediyse göster
        if (!localStorage.getItem('kahvepos_pwa_dismissed')) {
            e.preventDefault();
            deferredPrompt = e;
            setTimeout(() => showPWAInstallPrompt(), 30000); // 30 saniye sonra göster
        }
    });
    
    // Kurulum tamamlandı
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        showToast('KahvePOS başarıyla kuruldu!', 'success');
    });
    
    // Online/Offline durumu
    window.addEventListener('online', () => {
        showToast('İnternet bağlantısı sağlandı', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('İnternet bağlantısı kesildi. Çevrimdışı moddasınız.', 'warning');
    });
}

// ===== PERİYODİK SESSION REFRESH =====
// Session'ı sürekli canlı tutmak için token refresh

let sessionRefreshInterval = null;

function startSessionHealthCheck() {
    // Her 5 dakikada bir session'ı refresh et
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
    }
    
    sessionRefreshInterval = setInterval(async () => {
        if (typeof window.supabase !== 'undefined') {
            try {
                // Session'ı refresh et - bu token'ı yeniler
                const { data: { session }, error } = await window.supabase.auth.getSession();
                
                if (session && !error) {
                    // Token'ı yenile
                    const { data: { session: refreshedSession }, error: refreshError } =
                        await window.supabase.auth.refreshSession();
                    
                    if (refreshError) {
                        console.warn('⚠️ Session refresh hatası:', refreshError);
                    } else {
                        console.log('🔄 Session refresh edildi');
                    }
                }
            } catch (e) {
                console.error('Session refresh hatası:', e);
            }
        }
    }, 5 * 60 * 1000); // 5 dakika
}

function stopSessionHealthCheck() {
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
        sessionRefreshInterval = null;
    }
}

// Safari/PWA: Tab görünür olduğunda session'ı refresh et
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        if (typeof window.supabase !== 'undefined') {
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session) {
                    // Session'ı refresh et
                    await window.supabase.auth.refreshSession();
                    console.log('🔄 Tab aktif - session refresh edildi');
                }
            } catch (e) {
                console.error('Tab visibility refresh hatası:', e);
            }
        }
    }
});

// ===== BAŞLANGIÇ =====

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 KahvePOS v4.0 Başlatılıyor...');
    
    // Ürünleri yükle
    loadProducts();
    
    // Oturumu kontrol et
    const user = checkSession();
    if (user) {
        updateHeaderUserInfo();
        if (isAdmin()) {
            document.getElementById('users-tab').style.display = 'block';
        }
        
        // Header'ı göster
        document.getElementById('main-header').style.display = 'block';
        document.getElementById('main-container').style.display = 'block';
        
        // Dashboard'a git
        performPageSwitch('dashboard');
        
        // Session health check'i başlat
        startSessionHealthCheck();
    }
    
    // İlk ekranı hazırla
    renderCategoryTabs();
    renderProductsGrid();
    renderCart();
    
    // Navigation tab olayları
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const pageName = tab.getAttribute('data-page');
            switchPage(pageName);
        });
    });
    
    // Icon selector için
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(option => {
        option.addEventListener('click', () => {
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            const iconInput = document.getElementById('product-icon');
            if (iconInput) iconInput.value = option.getAttribute('data-icon');
        });
    });
    
    // Klavye kısayollarını başlat
    initKeyboardShortcuts();
    
    // PWA'yı başlat
    initPWA();
    
    // Tema tercihlerini yükle
    if (typeof loadThemePreferences === 'function') {
        loadThemePreferences();
    }
    
    // Oturum bilgilerini güncelle
    if (typeof updateSessionInfo === 'function') {
        updateSessionInfo();
    }
    
    console.log('✅ KahvePOS v4.0 Hazır!');
});

// ===== GLOBAL DEĞİŞKENLER =====

let pendingPage = null;

// ===== GLOBAL FONKSİYONLAR =====

// Geriye uyumluluk için eski fonksiyonlar
function showPasswordModal(pageName) {
    showLoginModal();
}

function cancelPassword() {
    closeLoginModal();
    pendingPage = null;
}

function checkPassword() {
    performLogin();
}

// ===== CSS ANIMASYON =====

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);

// ===== GELİŞTİRİCİ ARACI =====

window.KahvePOS = {
    version: '3.0.0',
    users: () => getAllUsers(),
    currentUser: () => getCurrentUser(),
    products: () => allProducts,
    cart: () => cart,
    sales: () => getAllSales(),
    storage: Storage,
    login: performLogin,
    logout: logout,
    shortcuts: () => {
        console.log('Klavye Kısayolları:');
        console.log('F1 - Dashboard');
        console.log('F2 - Satış Ekranı / Arama');
        console.log('F3 - Ürünler');
        console.log('F4 - Raporlar');
        console.log('F5 - Kullanıcılar');
        console.log('Enter - Sipariş Tamamla');
        console.log('Escape - Modal Kapat / Sepet Temizle');
        console.log('Ctrl+D - Karanlık Mod');
        console.log('Ctrl+S - Yedek Al');
        console.log('Ctrl+, - Ayarlar');
    }
};

console.log('%c🎯 KahvePOS v4.0 - Gelişmiş Özellikler', 'font-size: 16px; font-weight: bold; color: #6F4E37;');
console.log('%cKısayolları görmek için: KahvePOS.shortcuts()', 'font-size: 12px; color: #757575;');

