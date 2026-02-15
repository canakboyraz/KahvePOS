-- KahvePOS - Sales Tablosu Schema Düzeltmeleri
-- payment_method ve user_id için hybrid desteği
-- Supabase SQL Editor'da çalıştırın

-- ======================================
-- SALES TABLOSU: payment_method için text destezi ekle
-- Kod bazen string, bazen JSONB gönderiyor
-- Trigger ile ikisini de senkronize tut
-- ======================================

-- payment_method_text kolonu zaten 003_schema_code_alignment.sql'de eklendi
-- Şimdi trigger ekleyelim

-- Trigger: payment_method ve payment_method_text'i senkronize et
CREATE OR REPLACE FUNCTION sync_sales_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    -- payment_method_text varsa ve payment_method boşsa, JSONB'ye çevir
    IF NEW.payment_method_text IS NOT NULL AND (NEW.payment_method IS NULL OR NEW.payment_method = '[]'::jsonb) THEN
        -- Basit string ise JSONB array'e çevir
        NEW.payment_method = jsonb_build_array(jsonb_build_object('method', NEW.payment_method_text));
    ELSIF NEW.payment_method IS NOT NULL AND NEW.payment_method != '[]'::jsonb AND NEW.payment_method_text IS NULL THEN
        -- JSONB varsa, ilk method'u text'e çevir
        IF jsonb_typeof(NEW.payment_method) = 'array' AND jsonb_array_length(NEW.payment_method) > 0 THEN
            NEW.payment_method_text = NEW.payment_method->0->>'method';
        ELSIF jsonb_typeof(NEW.payment_method) = 'object' THEN
            NEW.payment_method_text = NEW.payment_method->>'method';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_sales_payment_method_trigger ON sales;
CREATE TRIGGER sync_sales_payment_method_trigger 
    BEFORE INSERT OR UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION sync_sales_payment_method();

-- ======================================
-- TAMAMLANDI
-- ======================================
SELECT 'Sales schema düzeltmeleri uygulandı!' as sonuc;
