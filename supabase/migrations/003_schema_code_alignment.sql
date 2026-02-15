-- KahvePOS - Schema ve Kod Uyum Migration'ı
-- Bu script veritabanı şemasını JavaScript kodu ile uyumlu hale getirir
-- Supabase SQL Editor'da çalıştırın

-- ======================================
-- PRODUCTS TABLOSU: Kolon eklemeleri
-- Kod cost_price ve sale_price kullanıyor ama DB'de cost ve price var
-- Her ikisini de desteklemek için alias kolonları ekliyoruz
-- ======================================

-- cost_price kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2);
    END IF;
END $$;

-- sale_price kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_price') THEN
        ALTER TABLE products ADD COLUMN sale_price DECIMAL(10,2);
    END IF;
END $$;

-- active kolonu ekle (eğer yoksa) - kod "active" kullanıyor, DB "is_active"
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'active') THEN
        ALTER TABLE products ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Mevcut verileri senkronize et (cost -> cost_price, price -> sale_price, is_active -> active)
UPDATE products SET cost_price = cost WHERE cost_price IS NULL AND cost IS NOT NULL;
UPDATE products SET sale_price = price WHERE sale_price IS NULL AND price IS NOT NULL;
UPDATE products SET active = is_active WHERE active IS NULL AND is_active IS NOT NULL;

-- cost_price ve sale_price varsayılan değerlerini ayarla
ALTER TABLE products ALTER COLUMN cost_price SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN sale_price SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN active SET DEFAULT true;

-- Trigger: cost_price/sale_price değişince cost/price'ı da güncelle (ve tersi)
CREATE OR REPLACE FUNCTION sync_product_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- cost_price değiştiyse cost'u güncelle
    IF NEW.cost_price IS DISTINCT FROM OLD.cost_price THEN
        NEW.cost = NEW.cost_price;
    ELSIF NEW.cost IS DISTINCT FROM OLD.cost THEN
        NEW.cost_price = NEW.cost;
    END IF;
    
    -- sale_price değiştiyse price'ı güncelle
    IF NEW.sale_price IS DISTINCT FROM OLD.sale_price THEN
        NEW.price = NEW.sale_price;
    ELSIF NEW.price IS DISTINCT FROM OLD.price THEN
        NEW.sale_price = NEW.price;
    END IF;
    
    -- active değiştiyse is_active güncelle (ve tersi)
    IF NEW.active IS DISTINCT FROM OLD.active THEN
        NEW.is_active = NEW.active;
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        NEW.active = NEW.is_active;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_product_prices_trigger ON products;
CREATE TRIGGER sync_product_prices_trigger 
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION sync_product_prices();

-- INSERT trigger: yeni ürün eklenirken de senkronize et
CREATE OR REPLACE FUNCTION sync_product_prices_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- cost_price varsa cost'a kopyala, yoksa tersi
    IF NEW.cost_price IS NOT NULL AND NEW.cost IS NULL THEN
        NEW.cost = NEW.cost_price;
    ELSIF NEW.cost IS NOT NULL AND NEW.cost_price IS NULL THEN
        NEW.cost_price = NEW.cost;
    END IF;
    
    -- sale_price varsa price'a kopyala, yoksa tersi
    IF NEW.sale_price IS NOT NULL AND NEW.price IS NULL THEN
        NEW.price = NEW.sale_price;
    ELSIF NEW.price IS NOT NULL AND NEW.sale_price IS NULL THEN
        NEW.sale_price = NEW.price;
    END IF;
    
    -- active varsa is_active'e kopyala, yoksa tersi
    IF NEW.active IS NOT NULL AND NEW.is_active IS NULL THEN
        NEW.is_active = NEW.active;
    ELSIF NEW.is_active IS NOT NULL AND NEW.active IS NULL THEN
        NEW.active = NEW.is_active;
    END IF;
    
    -- Varsayılanlar
    NEW.cost_price = COALESCE(NEW.cost_price, 0);
    NEW.sale_price = COALESCE(NEW.sale_price, 0);
    NEW.cost = COALESCE(NEW.cost, 0);
    NEW.price = COALESCE(NEW.price, 0);
    NEW.active = COALESCE(NEW.active, true);
    NEW.is_active = COALESCE(NEW.is_active, true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_product_prices_on_insert_trigger ON products;
CREATE TRIGGER sync_product_prices_on_insert_trigger 
    BEFORE INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION sync_product_prices_on_insert();

-- ======================================
-- SALES TABLOSU: Eksik kolonları ekle
-- Kod profit, discount_amount, created_by kullanıyor
-- ======================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'profit') THEN
        ALTER TABLE sales ADD COLUMN profit DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'discount_amount') THEN
        ALTER TABLE sales ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'created_by') THEN
        ALTER TABLE sales ADD COLUMN created_by TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'updated_at') THEN
        ALTER TABLE sales ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'synced_at') THEN
        ALTER TABLE sales ADD COLUMN synced_at TIMESTAMPTZ;
    END IF;
END $$;

-- payment_method kolonunu TEXT olarak da destekle (kod bazen string gönderebilir)
-- Mevcut JSONB kolonu kalacak, ek olarak payment_method_text ekle
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'payment_method_text') THEN
        ALTER TABLE sales ADD COLUMN payment_method_text TEXT;
    END IF;
END $$;

-- Mevcut satışlarda profit hesapla
UPDATE sales SET profit = total_amount - total_cost WHERE profit IS NULL OR profit = 0;

-- ======================================
-- VIEWS GÜNCELLE (yeni kolonlarla)
-- ======================================

CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    sale_date,
    COUNT(*) as order_count,
    SUM(total_amount) as total_sales,
    SUM(total_cost) as total_cost,
    SUM(COALESCE(profit, total_amount - total_cost)) as total_profit,
    SUM(COALESCE(discount_amount, discount, 0)) as total_discount
FROM sales
GROUP BY sale_date
ORDER BY sale_date DESC;

CREATE OR REPLACE VIEW user_performance AS
SELECT 
    p.username,
    p.role,
    COUNT(s.id) as total_orders,
    COALESCE(SUM(s.total_amount), 0) as total_sales,
    COALESCE(SUM(COALESCE(s.profit, s.total_amount - s.total_cost)), 0) as total_profit,
    COALESCE(AVG(s.total_amount), 0) as avg_order_value
FROM profiles p
LEFT JOIN sales s ON p.id = s.user_id
GROUP BY p.id, p.username, p.role
ORDER BY total_sales DESC;

-- ======================================
-- TAMAMLANDI
-- ======================================
SELECT 'Schema-Kod uyumu başarıyla sağlandı!' as sonuc;
