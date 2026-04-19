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

                // Supabase'e henüz yazılamayan local kullanıcıları kaybetme
                const mergedUsers = [...formattedUsers];
                const knownUsernames = new Set(
                    formattedUsers.map(u => (u.username || '').toLowerCase())
                );

                localUsers.forEach((localUser) => {
                    const username = (localUser.username || '').toLowerCase();
                    if (!knownUsernames.has(username)) {
                        mergedUsers.push(localUser);
                    }
                });
                
                // Local cache güncelle
                Storage.set('kahvepos_users', mergedUsers);
                return mergedUsers;
            }
        } catch (error) {
            console.log('⚠️ Supabase kullanıcı yükleme hatası, localStorage kullanılıyor');
        }
    }
    
    return localUsers;
}

function buildPermissions(userData) {
    return {
        products: userData.canManageProducts || false,
        reports: userData.canViewReports !== false,
        users: userData.canManageUsers || false
    };
}

async function restorePreviousSession(previousSession) {
    if (!previousSession?.access_token || !previousSession?.refresh_token) {
        return;
    }

    const { data: { session: currentSession } } = await window.supabase.auth.getSession();
    if (currentSession?.user?.id === previousSession?.user?.id) {
        return;
    }

    const { error } = await window.supabase.auth.setSession({
        access_token: previousSession.access_token,
        refresh_token: previousSession.refresh_token
    });

    if (error) {
        console.warn('Session restore failed:', error.message);
        return;
    }

    if (window.SupabaseService?.loadUserProfile) {
        await window.SupabaseService.loadUserProfile();
    }
}

async function createUserInSupabase(userData) {
    const normalizedUsername = (userData.username || '').trim();
    const authEmail = normalizedUsername.includes('@')
        ? normalizedUsername
        : `${normalizedUsername}@kahvepos.local`;
    const previousSession = (await window.supabase.auth.getSession()).data?.session || null;

    const { data, error } = await window.supabase.auth.signUp({
        email: authEmail,
        password: userData.password,
        options: {
            data: {
                username: normalizedUsername,
                role: userData.role || 'barista'
            }
        }
    });

    if (error) {
        throw error;
    }

    if (!data?.user) {
        throw new Error('Supabase user could not be created');
    }

    const { error: profileError } = await window.supabase
        .from('profiles')
        .upsert({
            id: data.user.id,
            username: normalizedUsername,
            role: userData.role || 'barista',
            permissions: buildPermissions(userData),
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (profileError) {
        throw profileError;
    }

    await restorePreviousSession(previousSession);
    return data.user;
}

async function disableUserInSupabase(userId) {
    try {
        if (window.supabase.functions?.invoke) {
            const { error: fnError } = await window.supabase.functions.invoke('admin-delete-user', {
                body: { userId }
            });
            if (!fnError) {
                return;
            }
        }
    } catch (error) {
        // Edge function yoksa profile soft-delete fallback'i kullan
    }

    const archivedUsername = `deleted_${Date.now()}_${String(userId).slice(0, 8)}`;
    const { error } = await window.supabase
        .from('profiles')
        .update({
            username: archivedUsername,
            role: 'barista',
            permissions: {
                products: false,
                reports: false,
                users: false
            },
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) {
        throw error;
    }
}

/**
 * Yeni kullanıcı ekle (Hybrid)
 */
async function addUser(userData) {
    // Kullanici adi kontrolu
    const users = await getAllUsers();
    const normalizedUsername = (userData.username || '').trim();
    if (users.find(u => (u.username || '').toLowerCase() === normalizedUsername.toLowerCase())) {
        return { success: false, message: 'Bu kullanici adi zaten kullaniliyor' };
    }

    const newUser = {
        id: 'user_' + Date.now(),
        username: normalizedUsername,
        password: userData.password,
        role: userData.role || 'barista',
        canManageUsers: userData.canManageUsers || false,
        canManageProducts: userData.canManageProducts || false,
        canViewReports: userData.canViewReports !== false,
        createdAt: new Date().toISOString()
    };

    // Local storage'a ekle (hizli erisim icin)
    users.push(newUser);
    Storage.set('kahvepos_users', users);

    // Online ise Supabase'e de ekle (Opsiyonel - hata olursa localStorage'da çalışmaya devam et)
    if (usersIsOnline && window.SupabaseService) {
        try {
            // 5 saniye timeout - Supabase yavaş yanıt verirse bekleme
            const supabasePromise = createUserInSupabase({
                ...userData,
                username: normalizedUsername
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Supabase bağlantı timeout')), 5000)
            );
            
            const createdUser = await Promise.race([supabasePromise, timeoutPromise]);

            newUser.id = createdUser.id;
            newUser.supabaseId = createdUser.id;
            Storage.set('kahvepos_users', users);
            console.log('✅ User synced to Supabase:', createdUser.id);
        } catch (error) {
            console.warn('⚠️ Supabase sync error, using local-only mode:', error.message);
            // Local storage'da zaten kayıtlı, kullanıcıya hata gösterme
            // Sadece console'a logla
        }
    } else {
        addToOfflineQueue('addUser', newUser);
    }

    return { success: true, message: 'Kullanici eklendi', user: newUser };
}

async function updateUser(userId, userData) {
    const users = await getAllUsers();
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) {
        return { success: false, message: 'Kullanici bulunamadi' };
    }

    // Admin rolu degistirilemez
    if (users[index].role === 'admin' && userData.role && userData.role !== 'admin') {
        return { success: false, message: 'Admin kullanicisinin rolu degistirilemez' };
    }

    // Local storage'da guncelle
    users[index] = {
        ...users[index],
        ...userData,
        id: users[index].id // ID degistirilemez
    };
    Storage.set('kahvepos_users', users);
    const updatedUser = users[index];

    // Online ise Supabase'de guncelle
    if (usersIsOnline && window.SupabaseService) {
        try {
            const { error } = await window.supabase
                .from('profiles')
                .update({
                    username: updatedUser.username,
                    role: updatedUser.role || 'barista',
                    permissions: buildPermissions(updatedUser),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;
            console.log('User updated in Supabase');
        } catch (error) {
            console.log('Supabase update error:', error.message);
            addToOfflineQueue('updateUser', { userId, userData });
        }
    } else {
        addToOfflineQueue('updateUser', { userId, userData });
    }

    return { success: true, message: 'Kullanici guncellendi', user: users[index] };
}

async function deleteUser(userId) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
        return { success: false, message: 'Kullanici bulunamadi' };
    }

    // Admin silinemez
    if (user.role === 'admin') {
        return { success: false, message: 'Admin kullanicisi silinemez' };
    }

    // Local storage'dan sil
    const filteredUsers = users.filter(u => u.id !== userId);
    Storage.set('kahvepos_users', filteredUsers);

    // Online ise Supabase'de devre disi birak
    if (usersIsOnline && window.SupabaseService) {
        try {
            await disableUserInSupabase(userId);
            console.log('User disabled in Supabase');
        } catch (error) {
            console.log('Supabase user disable error:', error.message);
            addToOfflineQueue('deleteUser', { userId });
        }
    } else {
        addToOfflineQueue('deleteUser', { userId });
    }

    return { success: true, message: 'Kullanici silindi' };
}

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
async function syncQueuedAddUser(queuedUser) {
    let createdUser = null;
    try {
        createdUser = await createUserInSupabase(queuedUser);
    } catch (error) {
        const message = (error?.message || '').toLowerCase();
        const duplicateUser = message.includes('already') || message.includes('duplicate');
        if (!duplicateUser) {
            throw error;
        }

        const { data, error: profileError } = await window.supabase
            .from('profiles')
            .select('id')
            .eq('username', queuedUser.username)
            .maybeSingle();

        if (profileError || !data?.id) {
            throw error;
        }
        createdUser = { id: data.id };
    }

    const localUsers = Storage.get('kahvepos_users') || [];
    const username = (queuedUser.username || '').toLowerCase();
    const index = localUsers.findIndex(u =>
        u.id === queuedUser.id || (u.username || '').toLowerCase() === username
    );

    if (index >= 0) {
        localUsers[index].id = createdUser.id;
        localUsers[index].password = '***';
        Storage.set('kahvepos_users', localUsers);
    }
}

async function syncQueuedUpdateUser(payload) {
    if (!payload?.userId || !payload?.userData) {
        throw new Error('Gecersiz updateUser offline verisi');
    }

    const { userId, userData } = payload;
    const localUsers = Storage.get('kahvepos_users') || [];
    const localUser = localUsers.find(u => u.id === userId) || {};
    const mergedUser = { ...localUser, ...userData };
    const { error } = await window.supabase
        .from('profiles')
        .update({
            username: mergedUser.username,
            role: mergedUser.role || 'barista',
            permissions: buildPermissions(mergedUser),
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) throw error;
}

async function syncQueuedDeleteUser(payload) {
    const userId = payload?.userId || payload?.id;
    if (!userId) {
        throw new Error('Gecersiz deleteUser offline verisi');
    }

    await disableUserInSupabase(userId);
}

/**
 * Offline degisiklikleri senkronize et
 */
async function syncOfflineChanges() {
    if (!usersIsOnline || !window.supabase) return;

    const queue = JSON.parse(localStorage.getItem('kahvepos_offline_queue') || '[]');
    if (queue.length === 0) return;

    const failedItems = [];
    console.log('Offline degisiklikler senkronize ediliyor...');

    for (const item of queue) {
        try {
            switch (item.operation) {
                case 'addUser':
                    await syncQueuedAddUser(item.data);
                    break;
                case 'updateUser':
                    await syncQueuedUpdateUser(item.data);
                    break;
                case 'deleteUser':
                    await syncQueuedDeleteUser(item.data);
                    break;
                default:
                    failedItems.push(item);
                    break;
            }
        } catch (error) {
            console.error('Senkronizasyon hatasi:', item.operation, error);
            failedItems.push(item);
        }
    }

    localStorage.setItem('kahvepos_offline_queue', JSON.stringify(failedItems));
    if (failedItems.length === 0) {
        console.log('Offline senkronizasyon tamamlandi');
    }
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

