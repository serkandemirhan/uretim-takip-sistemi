-- Migration: Fix purchase_request_items column name from stock_id to product_id
-- Description: Rename stock_id to product_id to match application code expectations
-- Author: Claude Code
-- Date: 2025-11-02

-- 1. Rename the column in purchase_request_items table
ALTER TABLE purchase_request_items
RENAME COLUMN stock_id TO product_id;

-- 2. Update the trigger function to use product_id and correct column names
CREATE OR REPLACE FUNCTION update_stock_on_order_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate total on-order quantity for the affected stock
    UPDATE stocks
    SET on_order_quantity = COALESCE((
        SELECT SUM(pri.ordered_quantity - pri.received_quantity)
        FROM purchase_request_items pri
        JOIN purchase_requests pr ON pri.purchase_request_id = pr.id
        WHERE pri.product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND pr.status IN ('approved', 'ordered', 'partially_delivered')
        AND pri.ordered_quantity > pri.received_quantity
    ), 0)
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Update index name to match new column name
DROP INDEX IF EXISTS idx_purchase_request_items_stock_id;
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_product_id ON purchase_request_items(product_id);

COMMIT;
