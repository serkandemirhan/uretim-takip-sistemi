-- ============================================
-- DIAGNOSTIC & FIX SCRIPT
-- ============================================
-- Run this to check what's missing and add it
-- ============================================

-- First, let's see what columns goods_receipts currently has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'goods_receipts'
ORDER BY ordinal_position;

-- Check purchase_orders columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- Check quotations columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quotations'
ORDER BY ordinal_position;

-- Check stocks columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stocks'
ORDER BY ordinal_position;

-- ============================================
-- Now add the missing columns
-- ============================================

BEGIN;

-- Add ALL missing columns to goods_receipts
DO $$
BEGIN
    -- purchase_order_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN purchase_order_id UUID;
    END IF;

    -- receipt_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'receipt_number'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN receipt_number VARCHAR(50);
    END IF;

    -- status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'status'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN status VARCHAR(50) DEFAULT 'pending_inspection';
    END IF;

    -- received_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'received_date'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN received_date TIMESTAMP DEFAULT NOW();
    END IF;

    -- received_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'received_by'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN received_by UUID;
    END IF;

    -- quality_check_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'quality_check_by'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN quality_check_by UUID;
    END IF;

    -- quality_check_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'quality_check_date'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN quality_check_date TIMESTAMP;
    END IF;

    -- quality_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'quality_status'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN quality_status VARCHAR(50);
    END IF;

    -- notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'notes'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN notes TEXT;
    END IF;

    -- rejection_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN rejection_reason TEXT;
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;

    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;

    -- total_quantity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goods_receipts' AND column_name = 'total_quantity'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN total_quantity NUMERIC(15,3);
    END IF;
END $$;

-- Add ALL missing columns to purchase_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'stock_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN stock_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'order_code'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN order_code VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'supplier_name'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN supplier_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN created_by UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN approved_by UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'rfq_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN rfq_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'supplier_quotation_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN supplier_quotation_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'supplier_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN supplier_id UUID;
    END IF;
END $$;

COMMIT;

-- ============================================
-- Verify the columns were added
-- ============================================
SELECT 'goods_receipts columns:' as info;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'goods_receipts'
ORDER BY ordinal_position;

SELECT 'purchase_orders columns:' as info;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
ORDER BY ordinal_position;