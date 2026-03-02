-- KahvePOS - Sales Tablosu Eksik Kolonları Ekle
-- Supabase SQL Editor'da çalıştırın
-- Migration 008

-- ======================================
-- SALES TABLOSU - Eksik Kolonlar
-- Kod: profit, discount_amount kullanıyor
-- DB: profit hesaplanıyor, sadece discount var
-- ======================================

-- profit kolonunu ekle (calculated column, default total_amount - total_cost)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) 
GENERATED ALWAYS AS (total_amount - total_cost) STORED;

-- discount_amount kolonunu ekle (discount'ın takma adı)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Mevcut discount verilerini discount_amount'a kopyala (varsa)
UPDATE sales 
SET discount_amount = discount 
WHERE discount_amount = 0 AND discount IS NOT NULL AND discount != 0;

-- created_by kolonunu ekle (string username için)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'unknown';

-- Mevcut verileri created_by ile doldur (user_id'den profile username getir)
UPDATE sales s
SET created_by = COALESCE(
    (SELECT p.username FROM profiles p WHERE p.id = s.user_id),
    'unknown'
)
WHERE created_by = 'unknown' OR created_by IS NULL;

-- synced_at kolonunu ekle (senkronizasyon takibi)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- ======================================
-- VARSAYILAN KOLONLAR EKLendi: profit, discount_amount, created_by, synced_at
-- ======================================
SELECT 'Sales tablosuna eksik kolonlar eklendi!' as sonuc;

-- Mevcut kayıt sayılarını göster
SELECT 
    'sales' as table_name,
    COUNT(*) as record_count,
    'profit, discount_amount, created_by, synced_at eklendi' as message
FROM sales;
