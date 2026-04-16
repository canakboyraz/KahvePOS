-- Add extra_options column to products table
-- Migration: 010_add_extra_options_to_products.sql

-- Add extra_options column (JSONB type for flexible data)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS extra_options JSONB DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN products.extra_options IS 'Ekstra seçenek fiyatları (Shot Espresso, Shot Şurup vb.)';

-- Example data structure:
-- {
--   "shotEspresso": 5,
--   "shotSyrup": 3
-- }
