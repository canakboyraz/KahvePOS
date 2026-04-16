-- Add size_prices and extra_options columns to products table
-- Migration: 010_add_extra_options_to_products.sql

-- Add size_prices column (JSONB type for flexible data)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS size_prices JSONB DEFAULT '{}';

-- Add extra_options column (JSONB type for flexible data)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS extra_options JSONB DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN products.size_prices IS 'Boy fiyat farkları (Küçük, Büyük, Badem Sütü vb.)';
COMMENT ON COLUMN products.extra_options IS 'Ekstra seçenek fiyatları (Shot Espresso, Shot Şurup vb.)';

-- Example size_prices data structure:
-- {
--   "small": { "name": "Küçük", "priceModifier": 0 },
--   "regular": { "name": "Büyük", "priceModifier": 5 },
--   "almond": { "name": "Badem Sütü", "priceModifier": 3 }
-- }

-- Example extra_options data structure:
-- {
--   "shotEspresso": 5,
--   "shotSyrup": 3
-- }
