-- Migration: 024_minimum_stock_levels.sql
-- Description: Add minimum stock level fields to stocks table

-- Add minimum stock level and reorder point columns
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(15, 3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(15, 3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level NUMERIC(15, 3);

-- Add index for querying low stock items
CREATE INDEX IF NOT EXISTS idx_stocks_low_stock
ON stocks(current_quantity)
WHERE current_quantity <= min_stock_level AND min_stock_level > 0;

-- Add comments
COMMENT ON COLUMN stocks.min_stock_level IS 'Minimum stok seviyesi - bu seviyenin altına düştüğünde uyarı verilir';
COMMENT ON COLUMN stocks.reorder_point IS 'Yeniden sipariş noktası - bu seviyeye ulaşıldığında otomatik sipariş önerilir';
COMMENT ON COLUMN stocks.max_stock_level IS 'Maximum stok seviyesi - fazla stok kontrolü için';

-- Create a view for critical stock levels
CREATE OR REPLACE VIEW v_critical_stocks AS
SELECT
    s.id,
    s.product_code,
    s.product_name,
    s.category,
    s.unit,
    s.current_quantity,
    s.reserved_quantity,
    s.available_quantity,
    s.min_stock_level,
    s.reorder_point,
    s.max_stock_level,
    CASE
        WHEN s.current_quantity <= 0 THEN 'out_of_stock'
        WHEN s.current_quantity <= s.min_stock_level THEN 'critical'
        WHEN s.current_quantity <= s.reorder_point THEN 'low'
        WHEN s.max_stock_level IS NOT NULL AND s.current_quantity >= s.max_stock_level THEN 'overstock'
        ELSE 'normal'
    END as stock_status,
    CASE
        WHEN s.reorder_point > 0 AND s.current_quantity <= s.reorder_point
        THEN s.reorder_point - s.current_quantity
        ELSE 0
    END as suggested_order_quantity
FROM stocks s
WHERE s.min_stock_level > 0 OR s.reorder_point > 0;

COMMENT ON VIEW v_critical_stocks IS 'Kritik stok seviyeleri görünümü - minimum stok altındaki veya sipariş noktasına ulaşan ürünler';
