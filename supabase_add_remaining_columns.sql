-- ============================================
-- ADD MISSING COLUMNS FOR JUNCTION/LINE TABLES
-- ============================================
-- Run this before the constraints script
-- ============================================

BEGIN;

-- ============================================
-- PURCHASE_ORDER_ITEMS TABLE
-- ============================================
DO $$
BEGIN
    -- purchase_order_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_items' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN purchase_order_id UUID NOT NULL;
        RAISE NOTICE 'Added purchase_order_id to purchase_order_items';
    END IF;

    -- stock_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_items' AND column_name = 'stock_id'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN stock_id UUID NOT NULL;
        RAISE NOTICE 'Added stock_id to purchase_order_items';
    END IF;

    -- quantity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_items' AND column_name = 'quantity'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN quantity NUMERIC(15, 3) NOT NULL;
        RAISE NOTICE 'Added quantity to purchase_order_items';
    END IF;

    -- unit_price
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_items' AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN unit_price NUMERIC(15, 2) NOT NULL;
        RAISE NOTICE 'Added unit_price to purchase_order_items';
    END IF;

    -- line_total
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_items' AND column_name = 'line_total'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN line_total NUMERIC(15, 2);
        RAISE NOTICE 'Added line_total to purchase_order_items';
    END IF;

    -- notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_items' AND column_name = 'notes'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes to purchase_order_items';
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_items' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at to purchase_order_items';
    END IF;
END $$;

-- ============================================
-- GOODS_RECEIPT_LINES TABLE
-- ============================================
DO $$
BEGIN
    -- goods_receipt_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipt_lines' AND column_name = 'goods_receipt_id'
    ) THEN
        ALTER TABLE goods_receipt_lines ADD COLUMN goods_receipt_id UUID NOT NULL;
        RAISE NOTICE 'Added goods_receipt_id to goods_receipt_lines';
    END IF;

    -- purchase_order_item_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipt_lines' AND column_name = 'purchase_order_item_id'
    ) THEN
        ALTER TABLE goods_receipt_lines ADD COLUMN purchase_order_item_id UUID NOT NULL;
        RAISE NOTICE 'Added purchase_order_item_id to goods_receipt_lines';
    END IF;

    -- stock_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipt_lines' AND column_name = 'stock_id'
    ) THEN
        ALTER TABLE goods_receipt_lines ADD COLUMN stock_id UUID NOT NULL;
        RAISE NOTICE 'Added stock_id to goods_receipt_lines';
    END IF;

    -- quantity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipt_lines' AND column_name = 'quantity'
    ) THEN
        ALTER TABLE goods_receipt_lines ADD COLUMN quantity NUMERIC(15, 3) NOT NULL;
        RAISE NOTICE 'Added quantity to goods_receipt_lines';
    END IF;

    -- quality_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipt_lines' AND column_name = 'quality_status'
    ) THEN
        ALTER TABLE goods_receipt_lines ADD COLUMN quality_status VARCHAR(50);
        RAISE NOTICE 'Added quality_status to goods_receipt_lines';
    END IF;

    -- notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipt_lines' AND column_name = 'notes'
    ) THEN
        ALTER TABLE goods_receipt_lines ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes to goods_receipt_lines';
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipt_lines' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE goods_receipt_lines ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at to goods_receipt_lines';
    END IF;
END $$;

-- ============================================
-- PURCHASE_REQUEST_PURCHASE_ORDERS TABLE
-- ============================================
DO $$
BEGIN
    -- purchase_request_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_request_purchase_orders' AND column_name = 'purchase_request_id'
    ) THEN
        ALTER TABLE purchase_request_purchase_orders ADD COLUMN purchase_request_id UUID NOT NULL;
        RAISE NOTICE 'Added purchase_request_id to purchase_request_purchase_orders';
    END IF;

    -- purchase_order_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_request_purchase_orders' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE purchase_request_purchase_orders ADD COLUMN purchase_order_id UUID NOT NULL;
        RAISE NOTICE 'Added purchase_order_id to purchase_request_purchase_orders';
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_request_purchase_orders' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE purchase_request_purchase_orders ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at to purchase_request_purchase_orders';
    END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'purchase_order_items columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_items'
ORDER BY ordinal_position;

SELECT 'goods_receipt_lines columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'goods_receipt_lines'
ORDER BY ordinal_position;

SELECT 'purchase_request_purchase_orders columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_request_purchase_orders'
ORDER BY ordinal_position;

-- ============================================
-- SCRIPT COMPLETE
-- ============================================
-- All missing columns have been added
-- Now you can run the constraints script successfully
-- ============================================