-- ============================================
-- SUPABASE PREP: ADD MISSING COLUMNS
-- ============================================
-- Run this FIRST before the main migration
-- This adds columns to existing tables
-- ============================================

BEGIN;

-- ============================================
-- USERS TABLE
-- ============================================
-- No avatar columns in local DB, so skip

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS short_code VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- ============================================
-- JOBS TABLE
-- ============================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dealer_id UUID;

-- ============================================
-- JOB_STEPS TABLE
-- ============================================
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS due_time TIME;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS status_before_block VARCHAR(50);
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS production_quantity DECIMAL(10,2);
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS production_unit VARCHAR(50);
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS production_notes TEXT;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS revision_no INTEGER DEFAULT 1;

-- ============================================
-- PROCESSES TABLE
-- ============================================
ALTER TABLE processes ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255);

-- ============================================
-- STOCKS TABLE
-- ============================================
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'adet';
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties JSONB;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(100);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(15,3) DEFAULT 0;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS available_quantity NUMERIC(15,3);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS on_order_quantity NUMERIC(10,2) DEFAULT 0;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(15,3) DEFAULT 0;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(15,3) DEFAULT 0;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS max_stock_level NUMERIC(15,3);

-- Add custom fields
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group1 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group2 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group3 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group4 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group5 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group6 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group7 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group8 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group9 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group10 TEXT;

ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category1 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category2 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category3 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category4 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category5 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category6 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category7 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category8 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category9 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category10 TEXT;

ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string1 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string2 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string3 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string4 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string5 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string6 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string7 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string8 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string9 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS string10 TEXT;

ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties1 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties2 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties3 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties4 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties5 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties6 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties7 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties8 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties9 TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS properties10 TEXT;

-- Make product_code unique if it isn't already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stocks_product_code_key'
    ) THEN
        ALTER TABLE stocks ADD CONSTRAINT stocks_product_code_key UNIQUE (product_code);
    END IF;
END $$;

-- ============================================
-- STOCK_MOVEMENTS TABLE
-- ============================================
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS job_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reservation_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15, 2);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- PURCHASE_ORDERS TABLE
-- ============================================
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS stock_id UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_code VARCHAR(100);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rfq_id UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_quotation_id UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Make order_code unique if it isn't already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'purchase_orders_order_code_key'
    ) THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_order_code_key UNIQUE (order_code);
    END IF;
END $$;

-- ============================================
-- GOODS_RECEIPTS TABLE
-- ============================================
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS purchase_order_id UUID;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_inspection';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS received_date TIMESTAMP DEFAULT NOW();
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS received_by UUID;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS quality_check_by UUID;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS quality_check_date TIMESTAMP;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS quality_status VARCHAR(50);
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS total_quantity NUMERIC(15,3);

-- Make receipt_number unique if it isn't already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'goods_receipts_receipt_number_key'
    ) THEN
        ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_receipt_number_key UNIQUE (receipt_number);
    END IF;
END $$;

-- ============================================
-- QUOTATIONS TABLE
-- ============================================
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(50);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version_major INTEGER DEFAULT 1;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version_minor INTEGER DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS job_id UUID;

-- Make quotation_number unique if it isn't already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'quotations_quotation_number_key'
    ) THEN
        ALTER TABLE quotations ADD CONSTRAINT quotations_quotation_number_key UNIQUE (quotation_number);
    END IF;
END $$;

-- ============================================
-- QUOTATION_ITEMS TABLE
-- ============================================
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS quotation_id UUID;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS stock_id UUID;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,3) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(15,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit_cost_try NUMERIC(15,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS total_cost_try NUMERIC(15,2) DEFAULT 0;

-- ============================================
-- PURCHASE_REQUESTS TABLE
-- ============================================
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS request_number VARCHAR(50);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft';
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS required_by_date DATE;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Make request_number unique if it isn't already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'purchase_requests_request_number_key'
    ) THEN
        ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_request_number_key UNIQUE (request_number);
    END IF;
END $$;

-- ============================================
-- PURCHASE_REQUEST_ITEMS TABLE
-- ============================================
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_request_id UUID;
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS stock_id UUID;
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS requested_quantity NUMERIC(15, 3);
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS approved_quantity NUMERIC(15, 3);
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS received_quantity NUMERIC(15, 3) DEFAULT 0;
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2);
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- SUPPLIERS TABLE
-- ============================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Türkiye';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15, 2);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by UUID;

-- ============================================
-- RFQS TABLE
-- ============================================
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS rfq_number VARCHAR(50);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS created_by UUID;

-- Make rfq_number unique if it isn't already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'rfqs_rfq_number_key'
    ) THEN
        ALTER TABLE rfqs ADD CONSTRAINT rfqs_rfq_number_key UNIQUE (rfq_number);
    END IF;
END $$;

-- ============================================
-- RFQ_ITEMS TABLE
-- ============================================
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS rfq_id UUID;
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS stock_id UUID;
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(15, 3);
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS required_date DATE;
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- SUPPLIER_QUOTATIONS TABLE
-- ============================================
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS rfq_id UUID;
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(50);
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS quotation_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS delivery_terms VARCHAR(100);
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE supplier_quotations ADD COLUMN IF NOT EXISTS created_by UUID;

-- ============================================
-- SUPPLIER_QUOTATION_ITEMS TABLE
-- ============================================
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS quotation_id UUID;
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS rfq_item_id UUID;
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS stock_id UUID;
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(15, 3);
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2);
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(15, 2);
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE supplier_quotation_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMIT;

-- ============================================
-- SCRIPT COMPLETE
-- ============================================
-- All missing columns have been added to existing tables
-- Now you can run the schema creation and constraints scripts
-- ============================================