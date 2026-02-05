/**
 * Users.js
 * Kullanıcı yönetimi modülü
 */

// Varsayılan kullanıcılar (ilk kurulum)
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
    },
    {
        id: 'barista_001',
        username: 'Barista1',
        password: '1234',
        role: 'barista',
        canManageUsers: false,
        canManageProducts: false,
        canViewReports: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'barista_002',
        username: 'Barista2',
        password: '1234',
        role: 'barista',
        canManageUsers: false,
        canManageProducts: false,
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

// Kullanıcıları yükle
function loadUsers() {
    const users = Storage.get('kahvepos_users');
    if (!users) {
        // İlk kurulum - varsayılan kullanıcıları kaydet
        Storage.set('kahvepos_users', DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    
    // Admin kullanıcısının username'ini kontrol et - eğer eski ise güncelle
    const adminUser = users.find(u => u.id === 'admin_001');
    if (adminUser && adminUser.username !== 'canakboyraz') {
        // Eski kullanıcı yapısı tespit edildi - varsayılanlara sıfırla
        console.log('🔄 Kullanıcı veritabanı güncelleniyor...');
        Storage.set('kahvepos_users', DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    
    return users;
}

// Kullanıcıları kaydet
function saveUsers(users) {
    Storage.set('kahvepos_users', users);
}

// Tüm kullanıcıları getir
function getAllUsers() {
    return loadUsers();
}

// Kullanıcı adına göre kullanıcı bul
function getUserByUsername(username) {
    const users = getAllUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

// ID'ye göre kullanıcı bul
function getUserById(userId) {
    const users = getAllUsers();
    return users.find(u => u.id === userId);
}

// Yeni kullanıcı ekle
function addUser(userData) {
    const users = getAllUsers();
    
    // Kullanıcı adı kontrolü
    if (getUserByUsername(userData.username)) {
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
    
    users.push(newUser);
    saveUsers(users);
    
    return { success: true, message: 'Kullanıcı eklendi', user: newUser };
}

// Kullanıcı güncelle
function updateUser(userId, userData) {
    const users = getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }
    
    // Kullanıcı adı değişiyorsa, yeni adın kullanılabilirliğini kontrol et
    if (userData.username && userData.username !== users[index].username) {
        if (getUserByUsername(userData.username)) {
            return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
        }
    }
    
    // Admin kullanıcısının rolü değiştirilemez
    if (users[index].role === 'admin' && userData.role && userData.role !== 'admin') {
        return { success: false, message: 'Admin kullanıcısının rolü değiştirilemez' };
    }
    
    users[index] = {
        ...users[index],
        ...userData,
        id: users[index].id // ID değiştirilemez
    };
    
    saveUsers(users);
    
    return { success: true, message: 'Kullanıcı güncellendi', user: users[index] };
}

// Kullanıcı sil
function deleteUser(userId) {
    const users = getAllUsers();
    const user = getUserById(userId);
    
    if (!user) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }
    
    // Admin kullanıcısı silinemez
    if (user.role === 'admin') {
        return { success: false, message: 'Admin kullanıcısı silinemez' };
    }
    
    const filteredUsers = users.filter(u => u.id !== userId);
    saveUsers(filteredUsers);
    
    return { success: true, message: 'Kullanıcı silindi' };
}

// Giriş yap
function login(username, password) {
    const user = getUserByUsername(username);
    
    if (!user) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }
    
    if (user.password !== password) {
        return { success: false, message: 'Şifre hatalı' };
    }
    
    // Oturumu aç
    currentUser = user;
    sessionStorage.setItem('kahvepos_current_user', JSON.stringify(user));
    sessionStorage.setItem('kahvepos_login_time', Date.now().toString());
    
    return { success: true, message: 'Giriş başarılı', user: user };
}

// Çıkış yap
function logoutUser() {
    currentUser = null;
    sessionStorage.removeItem('kahvepos_current_user');
    sessionStorage.removeItem('kahvepos_login_time');
    sessionStorage.removeItem('kahvepos_auth_products');
    sessionStorage.removeItem('kahvepos_auth_reports');
}

// Oturumu kontrol et
function checkSession() {
    const sessionUser = sessionStorage.getItem('kahvepos_current_user');
    if (!sessionUser) {
        currentUser = null;
        return null;
    }
    
    currentUser = JSON.parse(sessionUser);
    return currentUser;
}

// Şu anki kullanıcıyı getir
function getCurrentUser() {
    if (!currentUser) {
        checkSession();
    }
    return currentUser;
}

// Yetki kontrolü
function hasPermission(permission) {
    const user = getCurrentUser();
    if (!user) return false;
    
    switch (permission) {
        case 'manageUsers':
            return user.canManageUsers;
        case 'manageProducts':
            return user.canManageProducts;
        case 'viewReports':
            return user.canViewReports;
        default:
            return false;
    }
}

// Kullanıcı giriş yapmış mı?
function isLoggedIn() {
    return getCurrentUser() !== null;
}

// Kullanıcının admin mi?
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// UUID oluştur
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
