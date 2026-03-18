-- KahvePOS - Products Tablosuna Boy Fiyatları Kolonu
-- Her ürün için farklı boy fiyat farkları

-- products tablosuna size_prices JSONB kolonu ekle
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS size_prices JSONB DEFAULT '{"small": {"name": "Küçük", "priceModifier": 0}, "regular": {"name": "Büyük Boy", "priceModifier": 5}, "large": {"name": "Ekstra Büyük", "priceModifier": 10}, "almond": {"name": "Badem Sütü", "priceModifier": 3}}'::jsonb;

-- Mevcut ürünler için varsayılan değerleri güncelle
UPDATE products 
SET size_prices = '{"small": {"name": "Küçük", "priceModifier": 0}, "regular": {"name": "Büyük Boy", "priceModifier": 5}, "large": {"name": "Ekstra Büyük", "priceModifier": 10}, "almond": {"name": "Badem Sütü", "priceModifier": 3}}'::jsonb
WHERE size_prices IS NULL;

-- Index ekleyerek performansı artır
CREATE INDEX IF NOT EXISTS idx_products_size_prices ON products USING GIN (size_prices);

-- Tamamlandı
SELECT 'Products tablosuna size_prices kolonu eklendi!' as sonuc;
