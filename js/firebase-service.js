/**
 * FirebaseService.js
 * Firebase CRUD işlemleri - KahvePOS
 * v1.0
 */

const FirebaseService = {
    // Kullanıcı durumu
    currentUser: null,
    userProfile: null,
    isOnline: navigator.onLine,
    
    // Listeners
    unsubscribeListeners: [],
    
    /**
     * Firebase'i başlat
     */
    async init() {
        // Online/Offline durumunu dinle
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🟢 Online modda');
            this.syncLocalChanges();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('🔴 Offline modda');
        });
        
        // Auth state değişikliklerini dinle
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserProfile();
                console.log('👤 Kullanıcı giriş yaptı:', user.email);
            } else {
                this.currentUser = null;
                this.userProfile = null;
                console.log('👤 Kullanıcı çıkış yaptı');
            }
        });
    },
    
    /**
     * Kullanıcı girişi
     */
    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            await this.loadUserProfile();
            return { success: true, user: this.userProfile };
        } catch (error) {
            console.error('❌ Giriş hatası:', error);
            return { success: false, error: this.getAuthErrorMessage(error.code) };
        }
    },
    
    /**
     * Kullanıcı çıkışı
     */
    async logout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.userProfile = null;
            this.cleanupListeners();
            return { success: true };
        } catch (error) {
            console.error('❌ Çıkış hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Kullanıcı profilini yükle
     */
    async loadUserProfile() {
        if (!this.currentUser) return null;
        
        try {
            const doc = await db.collection('users').doc(this.currentUser.uid).get();
            if (doc.exists) {
                this.userProfile = { id: doc.id, ...doc.data() };
            } else {
                // Profil yoksa oluştur (ilk giriş)
                this.userProfile = {
                    id: this.currentUser.uid,
                    username: this.currentUser.email.split('@')[0],
                    role: 'barista',
                    permissions: { products: false, reports: true, users: false },
                    createdAt: serverTimestamp()
                };
                await db.collection('users').doc(this.currentUser.uid).set(this.userProfile);
            }
            return this.userProfile;
        } catch (error) {
            console.error('❌ Profil yükleme hatası:', error);
            return null;
        }
    },
    
    /**
     * Hata mesajlarını Türkçe'ye çevir
     */
    getAuthErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'Kullanıcı bulunamadı',
            'auth/wrong-password': 'Şifre hatalı',
            'auth/invalid-email': 'Geçersiz e-posta adresi',
            'auth/user-disabled': 'Hesap devre dışı bırakılmış',
            'auth/too-many-requests': 'Çok fazla hatalı deneme. Lütfen bekleyin.',
            'auth/network-request-failed': 'İnternet bağlantısı yok',
            'auth/email-already-in-use': 'Bu e-posta zaten kullanılıyor'
        };
        return messages[code] || 'Giriş başarısız';
    },
    
    // ==================== ÜRÜN İŞLEMLERİ ====================
    
    /**
     * Tüm ürünleri getir
     */
    async getProducts() {
        try {
            const snapshot = await db.collection('products')
                .where('isActive', '==', true)
                .orderBy('name')
                .get();
            
            const products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            
            // Local cache'e kaydet
            localStorage.setItem('kahvepos_products', JSON.stringify(products));
            
            return products;
        } catch (error) {
            console.error('❌ Ürün yükleme hatası:', error);
            // Offline ise localStorage'dan yükle
            return JSON.parse(localStorage.getItem('kahvepos_products') || '[]');
        }
    },
    
    /**
     * Ürün ekle
     */
    async addProduct(product) {
        try {
            const docRef = await db.collection('products').add({
                ...product,
                isActive: true,
                createdBy: this.currentUser?.uid,
                createdAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('❌ Ürün ekleme hatası:', error);
            // Offline ise queue'ya ekle
            this.addToOfflineQueue('addProduct', product);
            return { success: false, error: error.message, queued: true };
        }
    },
    
    /**
     * Ürün güncelle
     */
    async updateProduct(productId, updates) {
        try {
            await db.collection('products').doc(productId).update({
                ...updates,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('❌ Ürün güncelleme hatası:', error);
            this.addToOfflineQueue('updateProduct', { productId, updates });
            return { success: false, error: error.message, queued: true };
        }
    },
    
    /**
     * Ürün sil (soft delete)
     */
    async deleteProduct(productId) {
        try {
            await db.collection('products').doc(productId).update({
                isActive: false,
                deletedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('❌ Ürün silme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Ürünleri real-time dinle
     */
    subscribeToProducts(callback) {
        const unsubscribe = db.collection('products')
            .where('isActive', '==', true)
            .onSnapshot(snapshot => {
                const products = [];
                snapshot.forEach(doc => {
                    products.push({ id: doc.id, ...doc.data() });
                });
                callback(products);
            }, error => {
                console.error('❌ Ürün dinleme hatası:', error);
            });
        
        this.unsubscribeListeners.push(unsubscribe);
        return unsubscribe;
    },
    
    // ==================== SATIŞ İŞLEMLERİ ====================
    
    /**
     * Satış ekle
     */
    async addSale(saleData) {
        try {
            const sale = {
                ...saleData,
                userId: this.currentUser?.uid,
                userName: this.userProfile?.username,
                saleDate: this.getTodayDateString(),
                createdAt: serverTimestamp()
            };
            
            const docRef = await db.collection('sales').add(sale);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('❌ Satış kaydetme hatası:', error);
            // Offline ise localStorage'a kaydet
            this.addToOfflineQueue('addSale', saleData);
            return { success: false, error: error.message, queued: true };
        }
    },
    
    /**
     * Günlük satışları getir
     */
    async getSalesByDate(date) {
        const dateString = typeof date === 'string' ? date : this.formatDate(date);
        
        try {
            const snapshot = await db.collection('sales')
                .where('saleDate', '==', dateString)
                .orderBy('createdAt', 'desc')
                .get();
            
            const sales = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                sales.push({ 
                    id: doc.id, 
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date()
                });
            });
            
            return sales;
        } catch (error) {
            console.error('❌ Satış yükleme hatası:', error);
            return [];
        }
    },
    
    /**
     * Tarih aralığındaki satışları getir
     */
    async getSalesByDateRange(startDate, endDate) {
        try {
            const snapshot = await db.collection('sales')
                .where('saleDate', '>=', this.formatDate(startDate))
                .where('saleDate', '<=', this.formatDate(endDate))
                .orderBy('saleDate', 'desc')
                .orderBy('createdAt', 'desc')
                .get();
            
            const sales = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                sales.push({ 
                    id: doc.id, 
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date()
                });
            });
            
            return sales;
        } catch (error) {
            console.error('❌ Satış aralığı yükleme hatası:', error);
            return [];
        }
    },
    
    /**
     * Son N günün satışları
     */
    async getLastNDaysSales(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return this.getSalesByDateRange(startDate, endDate);
    },
    
    /**
     * Satışları real-time dinle (bugünkü)
     */
    subscribeToTodaySales(callback) {
        const today = this.getTodayDateString();
        
        const unsubscribe = db.collection('sales')
            .where('saleDate', '==', today)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const sales = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    sales.push({ 
                        id: doc.id, 
                        ...data,
                        createdAt: data.createdAt?.toDate?.() || new Date()
                    });
                });
                callback(sales);
            }, error => {
                console.error('❌ Satış dinleme hatası:', error);
            });
        
        this.unsubscribeListeners.push(unsubscribe);
        return unsubscribe;
    },
    
    // ==================== KULLANICI İŞLEMLERİ ====================
    
    /**
     * Tüm kullanıcıları getir (Admin için)
     */
    async getUsers() {
        if (this.userProfile?.role !== 'admin') {
            return [];
        }
        
        try {
            const snapshot = await db.collection('users').get();
            const users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error('❌ Kullanıcı listesi hatası:', error);
            return [];
        }
    },
    
    /**
     * Yeni kullanıcı oluştur (Admin için)
     */
    async createUser(email, password, userData) {
        if (this.userProfile?.role !== 'admin') {
            return { success: false, error: 'Yetkiniz yok' };
        }
        
        try {
            // Not: Firebase Admin SDK gerektirir, alternatif olarak Cloud Functions kullanılabilir
            // Burada sadece Firestore'a kullanıcı profilini ekleyebiliyoruz
            // Gerçek authentication için Firebase Console veya Cloud Functions kullanılmalı
            
            const docRef = await db.collection('users').add({
                ...userData,
                email: email,
                createdAt: serverTimestamp(),
                createdBy: this.currentUser?.uid
            });
            
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('❌ Kullanıcı oluşturma hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ==================== YARDIMCI METODLAR ====================
    
    /**
     * Bugünün tarihini YYYY-MM-DD formatında al
     */
    getTodayDateString() {
        const today = new Date();
        return this.formatDate(today);
    },
    
    /**
     * Tarihi YYYY-MM-DD formatına çevir
     */
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    /**
     * Offline queue'ya işlem ekle
     */
    addToOfflineQueue(operation, data) {
        const queue = JSON.parse(localStorage.getItem('kahvepos_offline_queue') || '[]');
        queue.push({
            operation,
            data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('kahvepos_offline_queue', JSON.stringify(queue));
        console.log('📥 Offline queue\'ya eklendi:', operation);
    },
    
    /**
     * Offline değişiklikleri senkronize et
     */
    async syncLocalChanges() {
        const queue = JSON.parse(localStorage.getItem('kahvepos_offline_queue') || '[]');
        if (queue.length === 0) return;
        
        console.log('🔄 Offline değişiklikler senkronize ediliyor...');
        
        for (const item of queue) {
            try {
                switch (item.operation) {
                    case 'addSale':
                        await this.addSale(item.data);
                        break;
                    case 'addProduct':
                        await this.addProduct(item.data);
                        break;
                    case 'updateProduct':
                        await this.updateProduct(item.data.productId, item.data.updates);
                        break;
                }
            } catch (error) {
                console.error('❌ Senkronizasyon hatası:', item.operation, error);
            }
        }
        
        localStorage.setItem('kahvepos_offline_queue', '[]');
        console.log('✅ Offline senkronizasyon tamamlandı');
    },
    
    /**
     * Tüm listener'ları temizle
     */
    cleanupListeners() {
        this.unsubscribeListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.unsubscribeListeners = [];
    },
    
    /**
     * localStorage verilerini Firebase'e aktar (migration)
     */
    async migrateFromLocalStorage() {
        console.log('🔄 localStorage verileri Firebase\'e aktarılıyor...');
        
        try {
            // Ürünleri aktar
            const products = JSON.parse(localStorage.getItem('kahvepos_products') || '[]');
            for (const product of products) {
                const exists = await db.collection('products')
                    .where('name', '==', product.name)
                    .get();
                
                if (exists.empty) {
                    await db.collection('products').add({
                        ...product,
                        isActive: true,
                        createdAt: serverTimestamp(),
                        migratedAt: serverTimestamp()
                    });
                }
            }
            
            // Satışları aktar
            const sales = JSON.parse(localStorage.getItem('kahvepos_sales') || '[]');
            for (const sale of sales) {
                await db.collection('sales').add({
                    ...sale,
                    userId: this.currentUser?.uid,
                    saleDate: sale.saleDate || this.formatDate(new Date(sale.createdAt)),
                    migratedAt: serverTimestamp()
                });
            }
            
            console.log('✅ Veri aktarımı tamamlandı!');
            return { success: true, products: products.length, sales: sales.length };
        } catch (error) {
            console.error('❌ Veri aktarım hatası:', error);
            return { success: false, error: error.message };
        }
    }
};

// Global erişim için
window.FirebaseService = FirebaseService;

