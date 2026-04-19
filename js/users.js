/**
 * Users.js - Supabase Only Mode v5.0
 * Kullanıcı yönetimi modülü - Sadece Supabase kullanır
 * LocalStorage kullanılmaz - tüm veriler Supabase'den gelir
 */

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

// ===== SUPABASE BAĞLANTI KONTROLÜ =====

function checkSupabaseConnection() {
    return typeof window.supabase !== 'undefined' && window.supabase;
}

function isValidUuid(value) {
    return typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// ===== KULLANICI GİRİŞİ (Supabase Only) =====

async function login(username, password) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return { success: false, message: 'İnternet bağlantısı gerekli' };
    }

    try {
        let email = username;
        
        // Eğer username email formatında değilse, profiles tablosunda ara
        if (!username.includes('@')) {
            console.log('🔍 Kullanıcı adı ile giriş deneniyor:', username);
            const { data: profile, error: profileQueryError } = await window.supabase
                .from('profiles')
                .select('email')
                .eq('username', username.trim())
                .single();
            
            console.log('🔍 Profiles sorgu sonucu:', { profile, profileQueryError });
            
            if (profile?.email) {
                email = profile.email;
                console.log('📧 Bulunan email:', email);
            } else {
                // profiles'da bulunamadıysa varsayılan formatı dene
                email = `${username}@kahvepos.local`;
                console.log('⚠️ Profile bulunamadı, fallback email:', email);
            }
        }
        
        console.log('🔐 Giriş deneniyor:', { email, usernameProvided: username });
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (!data.user) {
            return { success: false, message: 'Giriş başarısız' };
        }

        // Profil bilgilerini al
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn('Profil yüklenemedi, varsayılan yetkiler kullanılıyor');
        }

        // Kullanıcı objesi oluştur
        const user = {
            id: data.user.id,
            username: profile?.username || username,
            email: data.user.email,
            role: profile?.role || 'barista',
            canManageUsers: profile?.permissions?.users || false,
            canManageProducts: profile?.permissions?.products || false,
            canViewReports: profile?.permissions?.reports !== false,
            createdAt: profile?.created_at || data.user.created_at
        };

        currentUser = user;
        sessionStorage.setItem('kahvepos_current_user', JSON.stringify(user));
        sessionStorage.setItem('kahvepos_login_time', Date.now().toString());

        console.log('✅ Giriş başarılı:', user.username);
        return { success: true, message: 'Giriş başarılı', user };
    } catch (error) {
        console.error('❌ Giriş hatası:', error);
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
    }
}

// ===== ÇIKIŞ =====

async function logout() {
    try {
        await window.supabase.auth.signOut();
    } catch (error) {
        console.error('Çıkış hatası:', error);
    }
    
    currentUser = null;
    sessionStorage.removeItem('kahvepos_current_user');
    sessionStorage.removeItem('kahvepos_login_time');
    sessionStorage.removeItem('kahvepos_auth_products');
    sessionStorage.removeItem('kahvepos_auth_reports');
    
    console.log('👤 Çıkış yapıldı');
    return { success: true };
}

// ===== OTURUM KONTROLÜ =====

function checkSession() {
    const sessionUser = sessionStorage.getItem('kahvepos_current_user');
    if (!sessionUser) {
        currentUser = null;
        return null;
    }
    
    currentUser = JSON.parse(sessionUser);
    return currentUser;
}

function getCurrentUser() {
    if (!currentUser) {
        checkSession();
    }
    return currentUser;
}

// ===== TÜM KULLANICILARI GETİR (Supabase Only) =====

async function getAllUsers() {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return [];
    }

    try {
        const { data, error } = await window.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedUsers = (data || []).map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role || 'barista',
            canManageUsers: u.permissions?.users || false,
            canManageProducts: u.permissions?.products || false,
            canViewReports: u.permissions?.reports !== false,
            createdAt: u.created_at
        }));

        console.log(`✅ ${formattedUsers.length} kullanıcı yüklendi (Supabase)`);
        return formattedUsers;
    } catch (error) {
        console.error('❌ Kullanıcı yükleme hatası:', error);
        showToast('Kullanıcılar yüklenirken hata oluştu', 'error');
        return [];
    }
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

    try {
        // Edge function ile admin API üzerinden kullanıcı oluştur
        // Bu şekilde email confirmation bypass edilir
        const { data: { session } } = await window.supabase.auth.getSession();
        
        const { data, error } = await window.supabase.functions.invoke('admin-create-user', {
            body: {
                email: authEmail,
                password: userData.password,
                username: normalizedUsername,
                role: userData.role || 'barista',
                permissions: buildPermissions(userData)
            },
            headers: {
                Authorization: `Bearer ${session?.access_token || ''}`
            }
        });

        if (error) {
            throw new Error(error.message || 'Kullanıcı oluşturulamadı');
        }

        if (!data?.user) {
            throw new Error('Kullanıcı oluşturulamadı - sunucu yanıtı boş');
        }

        console.log('✅ Kullanıcı oluşturuldu:', data.user.email);
        return data.user;
    } catch (error) {
        console.error('❌ Kullanıcı oluşturma hatası:', error);
        throw error;
    }
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

// ===== KULLANICI EKLE (Supabase Only) =====

async function addUser(userData) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return { success: false, message: 'İnternet bağlantısı gerekli' };
    }

    // Kullanıcı adı kontrolü
    const users = await getAllUsers();
    const normalizedUsername = (userData.username || '').trim();
    if (users.find(u => (u.username || '').toLowerCase() === normalizedUsername.toLowerCase())) {
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
    }

    try {
        const createdUser = await createUserInSupabase(userData);

        const newUser = {
            id: createdUser.id,
            username: normalizedUsername,
            email: createdUser.email,
            role: userData.role || 'barista',
            canManageUsers: userData.canManageUsers || false,
            canManageProducts: userData.canManageProducts || false,
            canViewReports: userData.canViewReports !== false,
            createdAt: createdUser.created_at || new Date().toISOString()
        };

        console.log('✅ Kullanıcı oluşturuldu:', newUser.username);
        return { success: true, message: 'Kullanıcı eklendi', user: newUser };
    } catch (error) {
        console.error('❌ Kullanıcı ekleme hatası:', error);
        showToast('Kullanıcı eklenirken hata oluştu', 'error');
        return { success: false, message: error.message || 'Kullanıcı eklenemedi' };
    }
}

// ===== KULLANICI GÜNCELLE (Supabase Only) =====

async function updateUser(userId, userData) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return { success: false, message: 'İnternet bağlantısı gerekli' };
    }

    const users = await getAllUsers();
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }

    // Admin rolü değiştirilemez
    if (users[index].role === 'admin' && userData.role && userData.role !== 'admin') {
        return { success: false, message: 'Admin kullanıcısının rolü değiştirilemez' };
    }

    const updatedUser = {
        ...users[index],
        ...userData,
        id: users[index].id // ID değiştirilemez
    };

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

        console.log('✅ Kullanıcı güncellendi:', updatedUser.username);
        return { success: true, message: 'Kullanıcı güncellendi', user: updatedUser };
    } catch (error) {
        console.error('❌ Kullanıcı güncelleme hatası:', error);
        showToast('Kullanıcı güncellenirken hata oluştu', 'error');
        return { success: false, message: error.message || 'Kullanıcı güncellenemedi' };
    }
}

// ===== KULLANICI SİL (Supabase Only) =====

async function deleteUser(userId) {
    if (!checkSupabaseConnection()) {
        showToast('İnternet bağlantısı gerekli', 'error');
        return { success: false, message: 'İnternet bağlantısı gerekli' };
    }

    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }

    // Admin silinemez
    if (user.role === 'admin') {
        return { success: false, message: 'Admin kullanıcısı silinemez' };
    }

    try {
        await disableUserInSupabase(userId);
        console.log('✅ Kullanıcı devre dışı bırakıldı:', user.username);
        return { success: true, message: 'Kullanıcı silindi' };
    } catch (error) {
        console.error('❌ Kullanıcı silme hatası:', error);
        showToast('Kullanıcı silinirken hata oluştu', 'error');
        return { success: false, message: error.message || 'Kullanıcı silinemedi' };
    }
}

async function getUserByUsername(username) {
    const users = await getAllUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

async function getUserById(userId) {
    const users = await getAllUsers();
    return users.find(u => u.id === userId);
}

// ===== YETKİ KONTROLLERİ =====

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

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// ===== GLOBAL EXPORTS =====

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
