-- KahvePOS Supabase - Güvenli Policy Migration
-- Bu script mevcut policy'leri silip yeniden oluşturur
-- Hata almadan tekrar tekrar çalıştırılabilir

-- ======================================
-- TABLOLARI OLUŞTUR (IF NOT EXISTS)
-- ======================================

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'barista' CHECK (role IN ('barista', 'admin')),
    permissions JSONB DEFAULT '{"products": false, "reports": true, "users": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ürünler tablosu
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('sicak', 'soguk', 'tatli', 'diger')),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    icon TEXT DEFAULT '☕',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Satışlar tablosu
CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    total_amount DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    payment_method JSONB DEFAULT '[]'::jsonb,
    customer_note TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sale_date DATE DEFAULT CURRENT_DATE
);

-- Kasa hareketleri tablosu
CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening', 'closing', 'cash_in', 'cash_out')),
    amount DECIMAL(10,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Müşteriler tablosu
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birth_date DATE,
    loyalty_points INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bildirimler tablosu
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL CHECK (type IN ('low_stock', 'daily_summary', 'alert', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- İNDEKSLER
-- ======================================

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ======================================
-- RLS AKTİFLEŞTİR
-- ======================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ======================================
-- MEVCUT POLİCY'LERİ SİL
-- ======================================

-- Profil policy'leri
DROP POLICY IF EXISTS "Kendi profilini görebilir" ON profiles;
DROP POLICY IF EXISTS "Admin tüm profilleri görebilir" ON profiles;
DROP POLICY IF EXISTS "Admin profil güncelleyebilir" ON profiles;

-- Ürün policy'leri
DROP POLICY IF EXISTS "Tüm authenticated kullanıcılar ürünleri görebilir" ON products;
DROP POLICY IF EXISTS "Admin ürünleri yönetebilir" ON products;
DROP POLICY IF EXISTS "Authenticated kullanıcılar ürünleri görebilir" ON products;

-- Satış policy'leri
DROP POLICY IF EXISTS "Kendi satışlarını görebilir" ON sales;
DROP POLICY IF EXISTS "Admin tüm satışları görebilir" ON sales;
DROP POLICY IF EXISTS "Satış ekleyebilir" ON sales;

-- Kasa hareketleri policy'leri
DROP POLICY IF EXISTS "Kendi kasasını görebilir" ON cash_transactions;
DROP POLICY IF EXISTS "Admin tüm kasa hareketlerini görebilir" ON cash_transactions;
DROP POLICY IF EXISTS "Kasa hareketi ekleyebilir" ON cash_transactions;

-- Müşteri policy'leri
DROP POLICY IF EXISTS "Authenticated kullanıcılar müşterileri görebilir" ON customers;
DROP POLICY IF EXISTS "Admin müşterileri yönetebilir" ON customers;

-- Bildirim policy'leri
DROP POLICY IF EXISTS "Kendi bildirimlerini görebilir" ON notifications;
DROP POLICY IF EXISTS "Kendi bildirimlerini güncelleyebilir" ON notifications;

-- ======================================
-- YENİ POLİCY'LER OLUŞTUR
-- ======================================

-- Profil RLS politikaları
CREATE POLICY "Kendi profilini görebilir" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin tüm profilleri görebilir" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin profil güncelleyebilir" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Ürün RLS politikaları
CREATE POLICY "Authenticated kullanıcılar ürünleri görebilir" ON products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin ürünleri yönetebilir" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Satış RLS politikaları
CREATE POLICY "Kendi satışlarını görebilir" ON sales
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin tüm satışları görebilir" ON sales
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Satış ekleyebilir" ON sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kasa hareketleri RLS
CREATE POLICY "Kendi kasasını görebilir" ON cash_transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin tüm kasa hareketlerini görebilir" ON cash_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Kasa hareketi ekleyebilir" ON cash_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Müşteri RLS
CREATE POLICY "Authenticated kullanıcılar müşterileri görebilir" ON customers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin müşterileri yönetebilir" ON customers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Bildirim RLS
CREATE POLICY "Kendi bildirimlerini görebilir" ON notifications
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Kendi bildirimlerini güncelleyebilir" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- ======================================
-- FONKSİYONLAR
-- ======================================

-- updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Yeni kullanıcı oluşturulduğunda profil oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::text, 'barista')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- TRIGGER'LAR (DROP + CREATE)
-- ======================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================
-- GÖRÜNÜMLER (Views)
-- ======================================

CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    sale_date,
    COUNT(*) as order_count,
    SUM(total_amount) as total_sales,
    SUM(total_cost) as total_cost,
    SUM(total_amount - total_cost) as total_profit
FROM sales
GROUP BY sale_date
ORDER BY sale_date DESC;

CREATE OR REPLACE VIEW user_performance AS
SELECT 
    p.username,
    p.role,
    COUNT(s.id) as total_orders,
    SUM(s.total_amount) as total_sales,
    SUM(s.total_amount - s.total_cost) as total_profit,
    AVG(s.total_amount) as avg_order_value
FROM profiles p
LEFT JOIN sales s ON p.id = s.user_id
GROUP BY p.id, p.username, p.role
ORDER BY total_sales DESC;

-- ======================================
-- TAMAMLANDI
-- ======================================
SELECT 'KahvePOS veritabanı kurulumu başarıyla tamamlandı!' as sonuc;
