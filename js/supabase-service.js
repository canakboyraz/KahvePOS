/**
 * SupabaseService.js
 * Supabase CRUD işlemleri - KahvePOS
 * v1.0
 */

const SupabaseService = {
    client: null,
    currentUser: null,
    userProfile: null,
    
    /**
     * Supabase'i başlat
     */
    async init() {
        try {
            // Session kontrolü
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
            }
            
            // Auth değişikliklerini dinle
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.currentUser = session.user;
                    await this.loadUserProfile();
                    console.log('👤 Kullanıcı giriş yaptı:', this.currentUser.email);
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.userProfile = null;
                    console.log('👤 Kullanıcı çıkış yaptı');
                }
            });
            
            console.log('🗄️ Supabase service initialized');
        } catch (error) {
            console.error('❌ Supabase init hatası:', error);
        }
    },
    
    /**
     * Kullanıcı girişi
     * @param {string} emailOrUsername - E-posta adresi veya kullanıcı adı
     * @param {string} password - Şifre
     */
    async login(emailOrUsername, password) {
        try {
            let email = emailOrUsername;
            
            // Eğer username formatında değilse (içinde @ yoksa), profiles tablosunda ara
            if (!emailOrUsername.includes('@')) {
                console.log('🔍 SupabaseService: Kullanıcı adı ile giriş:', emailOrUsername);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', emailOrUsername.trim())
                    .single();
                
                if (profile?.email) {
                    email = profile.email;
                    console.log('📧 Bulunan email:', email);
                } else {
                    // Fallback - varsayılan format
                    email = `${emailOrUsername}@kahvepos.local`;
                    console.log('⚠️ Profile bulunamadı, fallback email:', email);
                }
            }
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            this.currentUser = data?.user || null;
            await this.loadUserProfile();
            return { success: true, user: this.userProfile };
        } catch (error) {
            console.error('❌ Giriş hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Kullanıcı çıkışı
     */
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.userProfile = null;
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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
            
            if (error) throw error;
            
            this.userProfile = data;
            return data;
        } catch (error) {
            console.error('❌ Profil yükleme hatası:', error);
            return null;
        }
    },
    
    // ==================== ÜRÜN İŞLEMLERİ ====================
    
    /**
     * Tüm ürünleri getir
     */
    async getProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('active', true)
                .order('name');
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('❌ Ürün yükleme hatası:', error);
            return [];
        }
    },
    
    /**
     * Ürün ekle
     */
    async addProduct(product) {
        try {
            const { data, error } = await supabase
                .from('products')
                .insert({
                    ...product,
                    is_active: true,
                    created_by: this.currentUser?.id
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Ürün ekleme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Ürün güncelle
     */
    async updateProduct(productId, updates) {
        try {
            const { error } = await supabase
                .from('products')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);
            
            if (error) throw error;
            
            return { success: true };
        } catch (error) {
            console.error('❌ Ürün güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Ürün sil (soft delete)
     */
    async deleteProduct(productId) {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: false })
                .eq('id', productId);
            
            if (error) throw error;
            
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
        const subscription = supabase
            .channel('products-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'products',
                filter: 'is_active=eq.true'
            }, (payload) => {
                this.getProducts().then(products => callback(products));
            })
            .subscribe();
        
        return subscription;
    },
    
    // ==================== SATIŞ İŞLEMLERİ ====================
    
    /**
     * Satış ekle
     */
    async addSale(saleData) {
        try {
            const sale = {
                ...saleData,
                user_id: this.currentUser?.id,
                sale_date: this.getTodayDateString()
            };
            
            const { data, error } = await supabase
                .from('sales')
                .insert(sale)
                .select()
                .single();
            
            if (error) throw error;
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Satış kaydetme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Günlük satışları getir
     */
    async getSalesByDate(date) {
        const dateString = typeof date === 'string' ? date : this.formatDate(date);
        
        try {
            const { data, error } = await supabase
                .from('sales')
                .select('*')
                .eq('sale_date', dateString)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
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
            const { data, error } = await supabase
                .from('sales')
                .select('*')
                .gte('sale_date', this.formatDate(startDate))
                .lte('sale_date', this.formatDate(endDate))
                .order('sale_date', { ascending: false })
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
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
    
    // ==================== KULLANICI İŞLEMLERİ ====================
    
    /**
     * Tüm kullanıcıları getir (Admin için)
     */
    async getUsers() {
        if (this.userProfile?.role !== 'admin') {
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('❌ Kullanıcı listesi hatası:', error);
            return [];
        }
    },
    
    /**
     * Kullanıcı performansını getir
     */
    async getUserPerformance() {
        try {
            const { data, error } = await supabase
                .from('user_performance')
                .select('*')
                .order('total_sales', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('❌ Performans yükleme hatası:', error);
            return [];
        }
    },
    
    // ==================== MÜŞTERİ İŞLEMLERİ (CRM) ====================
    
    /**
     * Tüm müşterileri getir
     */
    async getCustomers() {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('❌ Müşteri yükleme hatası:', error);
            return [];
        }
    },
    
    /**
     * Müşteri ekle
     */
    async addCustomer(customer) {
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert(customer)
                .select()
                .single();
            
            if (error) throw error;
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Müşteri ekleme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Müşteri güncelle
     */
    async updateCustomer(customerId, updates) {
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', customerId);
            
            if (error) throw error;
            
            return { success: true };
        } catch (error) {
            console.error('❌ Müşteri güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ==================== BİLDİRİM İŞLEMLERİ ====================
    
    /**
     * Okunmamış bildirimleri getir
     */
    async getUnreadNotifications() {
        if (!this.currentUser) return [];
        
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .or(`user_id.eq.${this.currentUser.id},user_id.is.null`)
                .eq('is_read', false)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('❌ Bildirim yükleme hatası:', error);
            return [];
        }
    },
    
    /**
     * Bildirimi okundu işaretle
     */
    async markNotificationRead(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);
            
            if (error) throw error;
            
            return { success: true };
        } catch (error) {
            console.error('❌ Bildirim güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Bildirimleri dinle
     */
    subscribeToNotifications(callback) {
        if (!this.currentUser) return null;
        
        const subscription = supabase
            .channel('notifications-changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
        
        return subscription;
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
        if (typeof DateUtils !== 'undefined') {
            return DateUtils.formatDate(date);
        }
        // Fallback
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    /**
     * Real-time kanalları temizle
     */
    cleanupChannels() {
        supabase.removeAllChannels();
    },
    
    /**
     * localStorage verilerini Supabase'e aktar (migration)
     */
    // migrateFromLocalStorage kaldırıldı - Supabase Only mode
};

// Global erişim için
window.SupabaseService = SupabaseService;

