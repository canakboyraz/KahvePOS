/**
 * Users.js - Supabase Entegrasyonlu
 * Kullanıcı yönetimi modülü - Hybrid Mode
 *
 * WORKFLOW:
 * - Online: Supabase Auth ile giriş yapar, profil Supabase'den gelir
 * - Offline: localStorage'tan çalışır, queue'ya ekler
 * - Sync: Online olunca değişiklikleri Supabase'e gönderir
 */

// Varsayılan kullanıcılar (localStorage fallback ve ilk kurulum için)
const DEFAULT_USERS = [
    {
        id: 'admin_001',
        username: 'canakboyraz',
        password: '09081993',
        role: 'admin',
        canManageUsers: true,
        canManageProducts: true,
        canViewReports: true,
        createdAt: new Date().toISOString()
    }
];

// Rol tanımları
const ROLES = {
    admin: {
        name: 'Yönetici',
        icon: '👑',
        color: '#6F4E37'
    },
    barista: {
        name: 'Barista',
        icon: '☕',
        color: '#C4A484'
    }
};

// Şu anki oturum
let currentUser = null;
let usersIsOnline = navigator.onLine;

// Online/Offline durumunu izle
window.addEventListener('online', () => {
    usersIsOnline = true;
    console.log('🟢 Online mod - Supabase aktif');
    syncOfflineChanges();
});

window.addEventListener('offline', () => {
    usersIsOnline = false;
    console.log('🔴 Offline mod - localStorage aktif');
});

// ==================== SUPABASE ENTEGRASYONLU FONKSİYONLAR ====================

/**
 * Kullanıcı girişi (Supabase Auth)
 */
async function login(username, password) {
    // Varsayılan kullanıcıları kontrol et ve localStorage'a ekle
    let localUsers = Storage.get('kahvepos_users');
    if (!localUsers || localUsers.length === 0) {
        // Varsayılan kullanıcıları localStorage'a yükle
        localUsers = DEFAULT_USERS;
        Storage.set('kahvepos_users', localUsers);
        console.log('📦 Varsayılan kullanıcılar localStorage\'a yüklendi');
    }
    
    // STRATEJÝ 1: Önce Supabase Auth'u dene (online ise)
    if (usersIsOnline && window.SupabaseService) {
        try {
            // Gerçek Supabase kullanıcıları email ile giriş yapar
            // Eğer '@' yoksa username@kahvepos.com formatına çevir
            const email = username.includes('@') ? username : `${username}@kahvepos.com`;
            const result = await SupabaseService.login(email, password);
            
            if (result.success && result.user) {
                currentUser = result.user;
                sessionStorage.setItem('kahvepos_current_user', JSON.stringify(result.user));
                sessionStorage.setItem('kahvepos_login_time', Date.now().toString());
                
                // Local cache'e güncelle
                updateLocalUserCache(result.user);
                
                console.log('✅ Supabase Auth ile giriş başarılı');
                return { success: true, message: 'Giriş başarılı', user: result.user };
            }
        } catch (error) {
            console.log('⚠️ Supabase Auth denemesi başarısız, localStorage deneniyor...', error.message);
        }
    }
    
    // STRATEJÝ 2: Supabase başarısız veya offline ise localStorage'ı kullan
    const localUser = localUsers.find(u => {
        // Şifre base64 encoded ise decode et
        const decodedPassword = u.password.length > 20 ? atob(u.password) : u.password;
        return u.username === username && (u.password === password || decodedPassword === password);
    });
    
    if (localUser) {
        currentUser = localUser;
        sessionStorage.setItem('kahvepos_current_user', JSON.stringify(localUser));
        sessionStorage.setItem('kahvepos_login_time', Date.now().toString());
        
        console.log('✅ LocalStorage ile giriş başarılı (Offline mod)');
        return { success: true, message: 'Giriş başarılı (Offline)', user: localUser };
    }
    
    return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
}

/**
 * Çıkış yap
 */
async function logout() {
    // Supabase'den çıkış
    if (usersIsOnline && window.SupabaseService) {
        await SupabaseService.logout();
    }
    
    // Local session temizle
    currentUser = null;
    sessionStorage.removeItem('kahvepos_current_user');
    sessionStorage.removeItem('kahvepos_login_time');
    sessionStorage.removeItem('kahvepos_auth_products');
    sessionStorage.removeItem('kahvepos_auth_reports');
    
    console.log('👤 Çıkış yapıldı');
    return { success: true };
}

/**
 * Oturumu kontrol et
 */
function checkSession() {
    const sessionUser = sessionStorage.getItem('kahvepos_current_user');
    if (!sessionUser) {
        currentUser = null;
        return null;
    }
    
    currentUser = JSON.parse(sessionUser);
    
    // Online ise Supabase'den güncel veriyi al
    if (usersIsOnline && window.SupabaseService && window.SupabaseService.userProfile) {
        currentUser = window.SupabaseService.userProfile;
        sessionStorage.setItem('kahvepos_current_user', JSON.stringify(currentUser));
    }
    
    return currentUser;
}

/**
 * Şu anki kullanıcıyı getir
 */
function getCurrentUser() {
    if (!currentUser) {
        checkSession();
    }
    return currentUser;
}

/**
 * Tüm kullanıcıları getir (Hybrid)
 */
async function getAllUsers() {
    // Önce localStorage'tan getir (hızlı erişim)
    let localUsers = Storage.get('kahvepos_users');
    if (!localUsers) {
        Storage.set('kahvepos_users', DEFAULT_USERS);
        localUsers = DEFAULT_USERS;
    }
    
    // Online ise Supabase'den güncelle
    if (usersIsOnline && window.SupabaseService) {
        try {
            const supabaseUsers = await SupabaseService.getUsers();
            if (supabaseUsers.length > 0) {
                // Supabase kullanıcılarını localStorage formatına çevir
                const formattedUsers = supabaseUsers.map(u => ({
                    id: u.id,
                    username: u.username,
                    password: '***', // Şifre Supabase'de saklanıyor
                    role: u.role,
                    canManageUsers: u.permissions?.users || false,
                    canManageProducts: u.permissions?.products || false,
                    canViewReports: u.permissions?.reports !== false,
                    createdAt: u.created_at
                }));
                
                // Local cache güncelle
                Storage.set('kahvepos_users', formattedUsers);
                return formattedUsers;
            }
        } catch (error) {
            console.log('⚠️ Supabase kullanıcı yükleme hatası, localStorage kullanılıyor');
        }
    }
    
    return localUsers;
}

/**
 * Yeni kullanıcı ekle (Hybrid)
 */
async function addUser(userData) {
    // Kullanıcı adı kontrolü
    const users = await getAllUsers();
    if (users.find(u => u.username === userData.username)) {
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
    }
    
    const newUser = {
        id: 'user_' + Date.now(),
        username: userData.username,
        password: userData.password,
        role: userData.role || 'barista',
        canManageUsers: false,
        canManageProducts: false,
        canViewReports: true,
        createdAt: new Date().toISOString()
    };
    
    // Local storage'a ekle (hızlı erişim için)
    users.push(newUser);
    Storage.set('kahvepos_users', users);
    
    // Online ise Supabase'e de ekle
    if (usersIsOnline && window.SupabaseService) {
        try {
            // Supabase Auth'da kullanıcı oluştur
            const { data, error } = await window.supabase.auth.signUp({
                email: `${userData.username}@kahvepos.local`,
                password: userData.password,
                options: {
                    data: {
                        username: userData.username,
                        role: userData.role || 'barista'
                    }
                }
            });
            
            if (!error && data.user) {
                // Profil oluştur
                const { error: profileError } = await window.supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        username: userData.username,
                        role: userData.role || 'barista',
                        permissions: {
                            products: false,
                            reports: true,
                            users: false
                        }
                    });
                
                if (!profileError) {
                    // Local ID'yi Supabase ID ile güncelle
                    newUser.id = data.user.id;
                    Storage.set('kahvepos_users', users);
                    console.log('✅ Kullanıcı Supabase\'e eklendi');
                }
            }
        } catch (error) {
            console.log('⚠️ Supabase\'e eklenemedi, sadece locale kaydedildi:', error.message);
            // Offline queue'ya ekle
            addToOfflineQueue('addUser', newUser);
        }
    } else {
        // Offline ise queue'ya ekle
        addToOfflineQueue('addUser', newUser);
    }
    
    return { success: true, message: 'Kullanıcı eklendi', user: newUser };
}

/**
 * Kullanıcı güncelle (Hybrid)
 */
async function updateUser(userId, userData) {
    const users = await getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }
    
    // Admin rolü değiştirilemez
    if (users[index].role === 'admin' && userData.role && userData.role !== 'admin') {
        return { success: false, message: 'Admin kullanıcısının rolü değiştirilemez' };
    }
    
    // Local storage'da güncelle
    users[index] = {
        ...users[index],
        ...userData,
        id: users[index].id // ID değiştirilemez
    };
    Storage.set('kahvepos_users', users);
    
    // Online ise Supabase'de güncelle
    if (usersIsOnline && window.SupabaseService) {
        try {
            const { error } = await window.supabase
                .from('profiles')
                .update({
                    username: userData.username,
                    role: userData.role || users[index].role,
                    permissions: {
                        products: userData.canManageProducts || false,
                        reports: userData.canViewReports !== false,
                        users: userData.canManageUsers || false
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
            
            if (!error) {
                console.log('✅ Kullanıcı Supabase\'de güncellendi');
            }
        } catch (error) {
            console.log('⚠️ Supabase güncelleme hatası:', error.message);
            addToOfflineQueue('updateUser', { userId, userData });
        }
    } else {
        addToOfflineQueue('updateUser', { userId, userData });
    }
    
    return { success: true, message: 'Kullanıcı güncellendi', user: users[index] };
}

/**
 * Kullanıcı sil (Hybrid)
 */
async function deleteUser(userId) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }
    
    // Admin silinemez
    if (user.role === 'admin') {
        return { success: false, message: 'Admin kullanıcısı silinemez' };
    }
    
    // Local storage'dan sil
    const filteredUsers = users.filter(u => u.id !== userId);
    Storage.set('kahvepos_users', filteredUsers);
    
    // Online ise Supabase'den sil
    if (usersIsOnline && window.SupabaseService) {
        try {
            // Supabase Auth'dan sil
            await window.supabase.auth.admin.deleteUser(userId);
            
            // Profil sil (soft delete - isActive = false)
            await window.supabase
                .from('profiles')
                .update({ is_active: false })
                .eq('id', userId);
            
            console.log('✅ Kullanıcı Supabase\'den silindi');
        } catch (error) {
            console.log('⚠️ Supabase silme hatası:', error.message);
            addToOfflineQueue('deleteUser', { userId });
        }
    } else {
        addToOfflineQueue('deleteUser', { userId });
    }
    
    return { success: true, message: 'Kullanıcı silindi' };
}

/**
 * Kullanıcı adına göre kullanıcı bul
 */
async function getUserByUsername(username) {
    const users = await getAllUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

/**
 * ID'ye göre kullanıcı bul
 */
async function getUserById(userId) {
    const users = await getAllUsers();
    return users.find(u => u.id === userId);
}

// ==================== YARDIMCI FONKSİYONLAR ====================

/**
 * Local user cache güncelle
 */
function updateLocalUserCache(supabaseUser) {
    const localUsers = Storage.get('kahvepos_users') || [];
    const index = localUsers.findIndex(u => u.id === supabaseUser.id);
    
    const formattedUser = {
        id: supabaseUser.id,
        username: supabaseUser.username,
        password: '***',
        role: supabaseUser.role,
        canManageUsers: supabaseUser.permissions?.users || false,
        canManageProducts: supabaseUser.permissions?.products || false,
        canViewReports: supabaseUser.permissions?.reports !== false,
        createdAt: supabaseUser.created_at
    };
    
    if (index >= 0) {
        localUsers[index] = formattedUser;
    } else {
        localUsers.push(formattedUser);
    }
    
    Storage.set('kahvepos_users', localUsers);
}

/**
 * Offline queue'ya işlem ekle
 */
function addToOfflineQueue(operation, data) {
    const queue = JSON.parse(localStorage.getItem('kahvepos_offline_queue') || '[]');
    queue.push({
        operation,
        data,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('kahvepos_offline_queue', JSON.stringify(queue));
    console.log('📥 Offline queue\'ya eklendi:', operation);
}

/**
 * Offline değişiklikleri senkronize et
 */
async function syncOfflineChanges() {
    const queue = JSON.parse(localStorage.getItem('kahvepos_offline_queue') || '[]');
    if (queue.length === 0) return;
    
    console.log('🔄 Offline değişiklikler senkronize ediliyor...');
    
    for (const item of queue) {
        try {
            switch (item.operation) {
                case 'addUser':
                    await addUser(item.data);
                    break;
                case 'updateUser':
                    await updateUser(item.data.userId, item.data.userData);
                    break;
                case 'deleteUser':
                    await deleteUser(item.data.userId);
                    break;
            }
        } catch (error) {
            console.error('❌ Senkronizasyon hatası:', item.operation, error);
        }
    }
    
    localStorage.setItem('kahvepos_offline_queue', '[]');
    console.log('✅ Offline senkronizasyon tamamlandı');
}

// ==================== LEGACY FONKSİYONLAR (Gerile uyumluluk) ====================

/**
 * Kullanıcıları yükle (Legacy)
 */
function loadUsers() {
    return Storage.get('kahvepos_users') || DEFAULT_USERS;
}

/**
 * Kullanıcıları kaydet (Legacy)
 */
function saveUsers(users) {
    Storage.set('kahvepos_users', users);
}

// ==================== YETKİ KONTROLLERİ ====================

/**
 * Yetki kontrolü
 */
function hasPermission(permission) {
    const user = getCurrentUser();
    if (!user) return false;
    
    switch (permission) {
        case 'manageUsers':
            return user.canManageUsers || user.role === 'admin';
        case 'manageProducts':
            return user.canManageProducts || user.role === 'admin';
        case 'viewReports':
            return user.canViewReports !== false;
        default:
            return false;
    }
}

/**
 * Kullanıcı giriş yapmış mı?
 */
function isLoggedIn() {
    return getCurrentUser() !== null;
}

/**
 * Kullanıcının admin mi?
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

/**
 * UUID oluştur
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==================== INIT ====================

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Varsayılan kullanıcıları kontrol et
    const users = Storage.get('kahvepos_users');
    if (!users) {
        Storage.set('kahvepos_users', DEFAULT_USERS);
    }
    
    // Supabase servisini başlat
    if (window.SupabaseService) {
        SupabaseService.init().catch(error => {
            console.log('⚠️ Supabase başlatılamadı, localStorage kullanılıyor');
        });
    }
});

// Export for global access
window.Users = {
    login,
    logout,
    getAllUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserByUsername,
    getUserById,
    getCurrentUser,
    hasPermission,
    isLoggedIn,
    isAdmin
};
