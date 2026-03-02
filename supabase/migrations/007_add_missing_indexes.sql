-- KahvePOS - Eksik Performans İndeksleri
-- Supabase SQL Editor'da çalıştırın
-- Migration 007

-- ======================================
-- SALES TABLOSU - Eksik Performans İndeksleri
-- ======================================

-- Raporlama için kritik indexler
CREATE INDEX IF NOT EXISTS idx_sales_created_at_sale_date ON sales(created_at DESC, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date_created_at ON sales(sale_date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_id_sale_date ON sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales USING GIN ((payment_method));

-- ======================================
-- PRODUCTS TABLOSU - Kategori ve aktif ürün indexleri
-- ======================================
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active) WHERE is_active = true;

-- ======================================
-- PROFILES TABLOSU - Rol bazlı aramalar
-- ======================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';

-- ======================================
-- TAMAMLANDI
-- ======================================
SELECT 'Performans indexleri eklendi!' as sonuc;
