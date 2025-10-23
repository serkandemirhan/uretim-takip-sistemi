-- Migration 011: Add custom fields to stocks table for advanced inventory management
-- Date: 2025-10-23
-- Description: Adds reservation system fields and custom categorization fields

-- Add reserved_quantity for reservation system
-- available_quantity will be a computed column (current_quantity - reserved_quantity)
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(15,3) DEFAULT 0;

-- Add available_quantity as a generated column (automatically calculated)
-- This ensures available_quantity is always accurate
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
-- Note: 'category' field already exists, these are additional categorization fields
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
-- These can store JSON or structured text data
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

-- Add comment to table explaining new fields
COMMENT ON COLUMN stocks.reserved_quantity IS 'Quantity reserved for jobs/orders';
COMMENT ON COLUMN stocks.available_quantity IS 'Auto-calculated: current_quantity - reserved_quantity';
COMMENT ON COLUMN stocks.group1 IS 'Custom grouping field 1';
COMMENT ON COLUMN stocks.category1 IS 'Custom category field 1 (in addition to main category)';
COMMENT ON COLUMN stocks.string1 IS 'Custom string field 1 for additional text data';
COMMENT ON COLUMN stocks.properties1 IS 'Custom properties field 1 (can store JSON or structured text)';

-- Update existing stocks to have reserved_quantity = 0 and trigger available_quantity calculation
-- The GENERATED column will automatically calculate available_quantity
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

COMMENT ON VIEW stock_availability_view IS 'Summary view showing stock availability with status indicators';
