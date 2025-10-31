-- ============================================
-- SUPABASE SCHEMA UPDATE FROM LOCAL DATABASE
-- ============================================
-- Generated from actual local PostgreSQL database
-- Date: 2025-10-29
-- ============================================

BEGIN;

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- STOCKS TABLE - Complete Structure
-- ============================================
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'adet',
    currency VARCHAR(10) DEFAULT 'TRY',
    supplier_name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    properties JSONB,
    warehouse_location VARCHAR(100),
    reserved_quantity NUMERIC(15,3) DEFAULT 0,
    available_quantity NUMERIC(15,3),
    on_order_quantity NUMERIC(10,2) DEFAULT 0,
    min_stock_level NUMERIC(15,3) DEFAULT 0,
    reorder_point NUMERIC(15,3) DEFAULT 0,
    max_stock_level NUMERIC(15,3),
    -- Custom fields (group1-10, category1-10, string1-10, properties1-10)
    group1 TEXT, group2 TEXT, group3 TEXT, group4 TEXT, group5 TEXT,
    group6 TEXT, group7 TEXT, group8 TEXT, group9 TEXT, group10 TEXT,
    category1 TEXT, category2 TEXT, category3 TEXT, category4 TEXT, category5 TEXT,
    category6 TEXT, category7 TEXT, category8 TEXT, category9 TEXT, category10 TEXT,
    string1 TEXT, string2 TEXT, string3 TEXT, string4 TEXT, string5 TEXT,
    string6 TEXT, string7 TEXT, string8 TEXT, string9 TEXT, string10 TEXT,
    properties1 TEXT, properties2 TEXT, properties3 TEXT, properties4 TEXT, properties5 TEXT,
    properties6 TEXT, properties7 TEXT, properties8 TEXT, properties9 TEXT, properties10 TEXT
);

-- ============================================
-- PURCHASE_ORDERS TABLE - Complete Structure
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL,
    order_code VARCHAR(100) UNIQUE NOT NULL,
    currency VARCHAR(10) DEFAULT 'TRY',
    supplier_name VARCHAR(255) NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP,
    rfq_id UUID,
    supplier_quotation_id UUID,
    supplier_id UUID,
    payment_terms VARCHAR(100),
    delivery_address TEXT
);

-- ============================================
-- GOODS_RECEIPTS TABLE - Complete Structure
-- ============================================
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_inspection',
    received_date TIMESTAMP DEFAULT NOW(),
    received_by UUID,
    quality_check_by UUID,
    quality_check_date TIMESTAMP,
    quality_status VARCHAR(50),
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    total_quantity NUMERIC(15,3)
);

-- ============================================
-- QUOTATIONS TABLE - Complete Structure
-- ============================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_id UUID,
    description TEXT,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    total_cost NUMERIC(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TRY',
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    version_major INTEGER DEFAULT 1,
    version_minor INTEGER DEFAULT 0,
    job_id UUID
);

-- ============================================
-- QUOTATION_ITEMS TABLE - Complete Structure
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL,
    stock_id UUID,
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    unit_cost NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    currency VARCHAR(10) DEFAULT 'TRY',
    unit_cost_try NUMERIC(15,2) DEFAULT 0,
    total_cost_try NUMERIC(15,2) DEFAULT 0
);

-- ============================================
-- USERS TABLE UPDATES
-- ============================================
-- Note: avatar columns don't exist in local DB, so not adding them

-- ============================================
-- CUSTOMER_DEALERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_dealers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    district VARCHAR(255),
    city VARCHAR(255),
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    tax_office VARCHAR(255),
    tax_number VARCHAR(50),
    phone1 VARCHAR(50),
    phone2 VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    postal_code VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PROCESS_GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS process_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- JOB_STEP_NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS job_step_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_step_id UUID NOT NULL,
    user_id UUID,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- UNITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default units
INSERT INTO units (code, name, description)
VALUES
    ('ADET', 'Adet', 'Adet bazlı sayım birimi'),
    ('PAKET', 'Paket', 'Paket bazlı sayım birimi'),
    ('KUTU', 'Kutu', 'Kutu bazlı sayım birimi'),
    ('KG', 'Kilogram', 'Ağırlık birimi'),
    ('M', 'Metre', 'Uzunluk birimi'),
    ('M2', 'Metrekare', 'Alan birimi'),
    ('CM', 'Santimetre', 'Uzunluk birimi'),
    ('L', 'Litre', 'Hacim birimi')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- STOCK_MOVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
    quantity NUMERIC(15, 3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2),
    reference_type VARCHAR(50),
    reference_id UUID,
    job_id UUID,
    reservation_id UUID,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STOCK_RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    quotation_id UUID,
    stock_id UUID NOT NULL,
    reserved_quantity NUMERIC(15, 3) NOT NULL CHECK (reserved_quantity > 0),
    used_quantity NUMERIC(15, 3) DEFAULT 0 CHECK (used_quantity >= 0),
    planned_usage_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'partially_used', 'fully_used', 'cancelled')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by UUID,
    cancellation_reason TEXT
);

-- ============================================
-- SUPPLIERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Türkiye',
    tax_number VARCHAR(50),
    tax_office VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_limit NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'TRY',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- ============================================
-- RFQ SYSTEM TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responded', 'closed', 'cancelled')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE TABLE IF NOT EXISTS rfq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL,
    stock_id UUID,
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit VARCHAR(50),
    required_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    quotation_number VARCHAR(50),
    quotation_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'selected', 'rejected', 'expired')),
    currency VARCHAR(10) DEFAULT 'TRY',
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE TABLE IF NOT EXISTS supplier_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL,
    rfq_item_id UUID NOT NULL,
    stock_id UUID,
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit VARCHAR(50),
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'TRY',
    lead_time_days INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PURCHASE_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'normal',
    required_by_date DATE,
    requested_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL,
    stock_id UUID NOT NULL,
    requested_quantity NUMERIC(15, 3) NOT NULL CHECK (requested_quantity > 0),
    approved_quantity NUMERIC(15, 3) CHECK (approved_quantity >= 0),
    received_quantity NUMERIC(15, 3) DEFAULT 0 CHECK (received_quantity >= 0),
    unit_price NUMERIC(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PURCHASE ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL,
    stock_id UUID NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    line_total NUMERIC(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GOODS_RECEIPT_LINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goods_receipt_id UUID NOT NULL,
    purchase_order_item_id UUID NOT NULL,
    stock_id UUID NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    quality_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PURCHASE_REQUEST_PURCHASE_ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_request_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL,
    purchase_order_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- JOB_MATERIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS job_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    stock_id UUID NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    reserved_quantity NUMERIC(15, 3) DEFAULT 0,
    used_quantity NUMERIC(15, 3) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STOCK_FIELD_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_field_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('group', 'category', 'string', 'properties')),
    field_number INTEGER NOT NULL CHECK (field_number BETWEEN 1 AND 10),
    field_label VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(field_type, field_number)
);

-- ============================================
-- RFQ_QUOTATIONS TABLE (old structure)
-- ============================================
CREATE TABLE IF NOT EXISTS rfq_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact VARCHAR(255),
    supplier_email VARCHAR(255),
    supplier_phone VARCHAR(50),
    total_amount NUMERIC(12, 2),
    currency VARCHAR(3) DEFAULT 'TRY',
    delivery_days INTEGER,
    expected_delivery_date DATE,
    payment_terms TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'rejected')),
    is_selected BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_at TIMESTAMP,
    selected_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rfq_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_quotation_id UUID NOT NULL,
    purchase_request_item_id UUID NOT NULL,
    stock_id UUID NOT NULL,
    quoted_quantity NUMERIC(10, 2) NOT NULL CHECK (quoted_quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- HR DOCUMENTS MODULE
-- ============================================
CREATE TABLE IF NOT EXISTS hr_document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL CHECK (category IN ('ONBOARDING','OPERATIONS','HR_LIFECYCLE','OFFBOARDING')),
    sequence_no INTEGER NOT NULL,
    folder_code VARCHAR(20) NOT NULL UNIQUE,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    default_validity_days INTEGER,
    default_renew_before_days INTEGER,
    default_share_expiry_hours INTEGER DEFAULT 72,
    metadata_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_document_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type_id UUID NOT NULL,
    role_id UUID,
    department_code VARCHAR(100),
    employment_type VARCHAR(50),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    validity_days_override INTEGER,
    renew_before_days_override INTEGER,
    applies_from DATE,
    applies_until DATE,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    document_type_id UUID NOT NULL,
    requirement_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'missing' CHECK (
        status IN ('missing', 'pending_approval', 'active', 'expired', 'rejected', 'archived')
    ),
    valid_from DATE,
    valid_until DATE,
    current_version_id UUID,
    last_status_check_at TIMESTAMP,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_document_id UUID NOT NULL,
    file_id UUID NOT NULL,
    version_no INTEGER NOT NULL,
    uploaded_by UUID,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        approval_status IN ('pending', 'approved', 'rejected')
    ),
    approved_by UUID,
    approved_at TIMESTAMP,
    approval_note TEXT,
    checksum VARCHAR(128),
    file_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_document_share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    employee_document_id UUID NOT NULL,
    document_version_id UUID,
    expires_at TIMESTAMP NOT NULL,
    max_views INTEGER,
    views_count INTEGER NOT NULL DEFAULT 0,
    allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    allowed_departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_document_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_link_id UUID NOT NULL,
    document_version_id UUID,
    viewer_user_id UUID,
    action VARCHAR(30) NOT NULL CHECK (action IN ('view', 'download')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_document_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'uploaded' CHECK (
        status IN ('uploaded', 'processing', 'completed', 'failed')
    ),
    source_filename TEXT,
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_log TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_document_import_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_job_id UUID NOT NULL,
    line_number INTEGER,
    employee_identifier VARCHAR(255) NOT NULL,
    document_type_code VARCHAR(100) NOT NULL,
    requirement_id UUID,
    matched_user_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'imported', 'failed', 'skipped')
    ),
    error_message TEXT,
    generated_document_id UUID,
    generated_version_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROLES AND PERMISSIONS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, resource, action)
);

CREATE TABLE IF NOT EXISTS role_process_permissions (
    role_id UUID NOT NULL,
    process_id UUID NOT NULL,
    can_view BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (role_id, process_id)
);

-- ============================================
-- CURRENCY_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS currency_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_code VARCHAR(10) NOT NULL UNIQUE,
    currency_name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    exchange_rate NUMERIC(15, 6) NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- (Only create indexes that don't already exist)

-- Stocks indexes
CREATE INDEX IF NOT EXISTS idx_stocks_product_code ON stocks(product_code);
CREATE INDEX IF NOT EXISTS idx_stocks_category ON stocks(category);
CREATE INDEX IF NOT EXISTS idx_stocks_active ON stocks(is_active);

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_job_id ON stock_movements(job_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reservation_id ON stock_movements(reservation_id);

-- Stock reservations indexes
CREATE INDEX IF NOT EXISTS idx_stock_reservations_job_id ON stock_reservations(job_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_stock_id ON stock_reservations(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);

-- Customer dealers indexes
CREATE INDEX IF NOT EXISTS idx_customer_dealers_customer_id ON customer_dealers(customer_id);

-- Job step notes indexes
CREATE INDEX IF NOT EXISTS idx_job_step_notes_step_id ON job_step_notes(job_step_id);

-- Quotation indexes
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_job ON quotations(job_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_stock_id ON purchase_orders(stock_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_rfq_id ON purchase_orders(rfq_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

-- Goods receipts indexes
CREATE INDEX IF NOT EXISTS idx_goods_receipts_purchase_order_id ON goods_receipts(purchase_order_id);

-- RFQ indexes
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_rfq_id ON supplier_quotations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_supplier_id ON supplier_quotations(supplier_id);

-- ============================================
-- SEQUENCES
-- ============================================
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS purchase_request_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS goods_receipt_number_seq START 1;

COMMIT;

-- ============================================
-- NOTES
-- ============================================
-- This script creates all tables as they exist in the local database
-- Run this on Supabase to sync the schema
-- After running this, you may need to:
-- 1. Add foreign key constraints
-- 2. Add triggers and functions
-- 3. Set up RLS policies
-- 4. Grant appropriate permissions
-- ============================================