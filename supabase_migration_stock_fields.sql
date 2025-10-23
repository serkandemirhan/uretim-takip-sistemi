-- =============================================================================
-- SUPABASE MIGRATION: Stock Custom Fields & Settings
-- =============================================================================
-- Date: 2025-10-23
-- Description:
--   1. Adds 41 custom fields to stocks table (reservation system + categorization)
--   2. Creates stock_field_settings table for user-defined field labels
--   3. Creates indexes and views for better performance
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1: Add Custom Fields to Stocks Table
-- -----------------------------------------------------------------------------

-- Add reserved_quantity for reservation system
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(15,3) DEFAULT 0;

-- Add available_quantity as a generated column (automatically calculated)
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS available_quantity NUMERIC(15,3)
    GENERATED ALWAYS AS (current_quantity - COALESCE(reserved_quantity, 0)) STORED;

-- Add group fields (group1 to group10)
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS group1 TEXT,
  ADD COLUMN IF NOT EXISTS group2 TEXT,
  ADD COLUMN IF NOT EXISTS group3 TEXT,
  ADD COLUMN IF NOT EXISTS group4 TEXT,
  ADD COLUMN IF NOT EXISTS group5 TEXT,
  ADD COLUMN IF NOT EXISTS group6 TEXT,
  ADD COLUMN IF NOT EXISTS group7 TEXT,
  ADD COLUMN IF NOT EXISTS group8 TEXT,
  ADD COLUMN IF NOT EXISTS group9 TEXT,
  ADD COLUMN IF NOT EXISTS group10 TEXT;

-- Add category fields (category1 to category10)
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS category1 TEXT,
  ADD COLUMN IF NOT EXISTS category2 TEXT,
  ADD COLUMN IF NOT EXISTS category3 TEXT,
  ADD COLUMN IF NOT EXISTS category4 TEXT,
  ADD COLUMN IF NOT EXISTS category5 TEXT,
  ADD COLUMN IF NOT EXISTS category6 TEXT,
  ADD COLUMN IF NOT EXISTS category7 TEXT,
  ADD COLUMN IF NOT EXISTS category8 TEXT,
  ADD COLUMN IF NOT EXISTS category9 TEXT,
  ADD COLUMN IF NOT EXISTS category10 TEXT;

-- Add string fields (string1 to string10)
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS string1 TEXT,
  ADD COLUMN IF NOT EXISTS string2 TEXT,
  ADD COLUMN IF NOT EXISTS string3 TEXT,
  ADD COLUMN IF NOT EXISTS string4 TEXT,
  ADD COLUMN IF NOT EXISTS string5 TEXT,
  ADD COLUMN IF NOT EXISTS string6 TEXT,
  ADD COLUMN IF NOT EXISTS string7 TEXT,
  ADD COLUMN IF NOT EXISTS string8 TEXT,
  ADD COLUMN IF NOT EXISTS string9 TEXT,
  ADD COLUMN IF NOT EXISTS string10 TEXT;

-- Add properties fields (properties1 to properties10)
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS properties1 TEXT,
  ADD COLUMN IF NOT EXISTS properties2 TEXT,
  ADD COLUMN IF NOT EXISTS properties3 TEXT,
  ADD COLUMN IF NOT EXISTS properties4 TEXT,
  ADD COLUMN IF NOT EXISTS properties5 TEXT,
  ADD COLUMN IF NOT EXISTS properties6 TEXT,
  ADD COLUMN IF NOT EXISTS properties7 TEXT,
  ADD COLUMN IF NOT EXISTS properties8 TEXT,
  ADD COLUMN IF NOT EXISTS properties9 TEXT,
  ADD COLUMN IF NOT EXISTS properties10 TEXT;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_stocks_available_quantity ON stocks(available_quantity);
CREATE INDEX IF NOT EXISTS idx_stocks_reserved_quantity ON stocks(reserved_quantity);

-- Add indexes for group fields (for filtering/grouping)
CREATE INDEX IF NOT EXISTS idx_stocks_group1 ON stocks(group1) WHERE group1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_group2 ON stocks(group2) WHERE group2 IS NOT NULL;

-- Add indexes for category fields (for filtering/grouping)
CREATE INDEX IF NOT EXISTS idx_stocks_category1 ON stocks(category1) WHERE category1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_category2 ON stocks(category2) WHERE category2 IS NOT NULL;

-- Update existing stocks to have reserved_quantity = 0
UPDATE stocks SET reserved_quantity = COALESCE(reserved_quantity, 0) WHERE reserved_quantity IS NULL;

-- Create a view for stock availability summary
CREATE OR REPLACE VIEW stock_availability_view AS
SELECT
  id,
  product_code,
  product_name,
  category,
  unit,
  current_quantity,
  reserved_quantity,
  available_quantity,
  min_quantity,
  CASE
    WHEN available_quantity <= 0 THEN 'out_of_stock'
    WHEN available_quantity <= min_quantity THEN 'critical'
    WHEN available_quantity <= (min_quantity * 2) THEN 'low'
    ELSE 'available'
  END as availability_status,
  CASE
    WHEN reserved_quantity > 0 THEN true
    ELSE false
  END as has_reservations
FROM stocks
WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- PART 2: Create Stock Field Settings Table
-- -----------------------------------------------------------------------------

-- Create settings table
CREATE TABLE IF NOT EXISTS stock_field_settings (
    field_key VARCHAR(50) PRIMARY KEY,
    custom_label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    field_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default values for all 40 custom fields
INSERT INTO stock_field_settings (field_key, custom_label, is_active, display_order, field_type) VALUES
-- Group fields
('group1', 'Grup 1', false, 1, 'group'),
('group2', 'Grup 2', false, 2, 'group'),
('group3', 'Grup 3', false, 3, 'group'),
('group4', 'Grup 4', false, 4, 'group'),
('group5', 'Grup 5', false, 5, 'group'),
('group6', 'Grup 6', false, 6, 'group'),
('group7', 'Grup 7', false, 7, 'group'),
('group8', 'Grup 8', false, 8, 'group'),
('group9', 'Grup 9', false, 9, 'group'),
('group10', 'Grup 10', false, 10, 'group'),

-- Category fields
('category1', 'Kategori 1', false, 11, 'category'),
('category2', 'Kategori 2', false, 12, 'category'),
('category3', 'Kategori 3', false, 13, 'category'),
('category4', 'Kategori 4', false, 14, 'category'),
('category5', 'Kategori 5', false, 15, 'category'),
('category6', 'Kategori 6', false, 16, 'category'),
('category7', 'Kategori 7', false, 17, 'category'),
('category8', 'Kategori 8', false, 18, 'category'),
('category9', 'Kategori 9', false, 19, 'category'),
('category10', 'Kategori 10', false, 20, 'category'),

-- String fields
('string1', 'Özel Alan 1', false, 21, 'string'),
('string2', 'Özel Alan 2', false, 22, 'string'),
('string3', 'Özel Alan 3', false, 23, 'string'),
('string4', 'Özel Alan 4', false, 24, 'string'),
('string5', 'Özel Alan 5', false, 25, 'string'),
('string6', 'Özel Alan 6', false, 26, 'string'),
('string7', 'Özel Alan 7', false, 27, 'string'),
('string8', 'Özel Alan 8', false, 28, 'string'),
('string9', 'Özel Alan 9', false, 29, 'string'),
('string10', 'Özel Alan 10', false, 30, 'string'),

-- Properties fields
('properties1', 'Özellik 1', false, 31, 'properties'),
('properties2', 'Özellik 2', false, 32, 'properties'),
('properties3', 'Özellik 3', false, 33, 'properties'),
('properties4', 'Özellik 4', false, 34, 'properties'),
('properties5', 'Özellik 5', false, 35, 'properties'),
('properties6', 'Özellik 6', false, 36, 'properties'),
('properties7', 'Özellik 7', false, 37, 'properties'),
('properties8', 'Özellik 8', false, 38, 'properties'),
('properties9', 'Özellik 9', false, 39, 'properties'),
('properties10', 'Özellik 10', false, 40, 'properties')
ON CONFLICT (field_key) DO NOTHING;

-- Create indexes for stock_field_settings
CREATE INDEX IF NOT EXISTS idx_stock_field_settings_active ON stock_field_settings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stock_field_settings_order ON stock_field_settings(display_order);
CREATE INDEX IF NOT EXISTS idx_stock_field_settings_type ON stock_field_settings(field_type);

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_stock_field_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_stock_field_settings_timestamp ON stock_field_settings;
CREATE TRIGGER trigger_update_stock_field_settings_timestamp
    BEFORE UPDATE ON stock_field_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_field_settings_timestamp();

-- -----------------------------------------------------------------------------
-- PART 3: Enable Row Level Security (RLS) for Supabase
-- -----------------------------------------------------------------------------

-- Enable RLS on stock_field_settings table
ALTER TABLE stock_field_settings ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone authenticated can read
CREATE POLICY "Allow authenticated users to read stock_field_settings"
ON stock_field_settings FOR SELECT
TO authenticated
USING (true);

-- Create policy: Only admins can update
CREATE POLICY "Allow admins to update stock_field_settings"
ON stock_field_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'yonetici'
  )
);

-- Grant permissions
GRANT SELECT ON stock_field_settings TO authenticated;
GRANT UPDATE ON stock_field_settings TO authenticated;
GRANT SELECT ON stock_availability_view TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Summary:
--   ✅ Added 41 custom fields to stocks table
--   ✅ Created stock_field_settings table
--   ✅ Created stock_availability_view
--   ✅ Created indexes for performance
--   ✅ Enabled RLS policies
--   ✅ Created auto-update trigger
-- =============================================================================
