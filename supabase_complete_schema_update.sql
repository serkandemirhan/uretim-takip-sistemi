-- ============================================
-- SUPABASE COMPLETE SCHEMA UPDATE
-- ============================================
-- Description: Comprehensive migration script to sync Supabase with local database
-- This script includes all table updates, new modules, and enhancements
-- Run this script on your Supabase SQL Editor
-- Author: Claude Code
-- Date: 2025-10-29
-- ============================================

BEGIN;

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USER ENHANCEMENTS
-- ============================================
-- Add avatar support
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_file_id UUID REFERENCES files(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update role enum to include new roles
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

    -- Add new constraint with updated roles
    ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('yonetici', 'musteri_temsilcisi', 'tasarimci', 'kesifci', 'operator', 'depocu', 'satinalma'));
END $$;

-- ============================================
-- 2. CUSTOMER DEALERS
-- ============================================
CREATE TABLE IF NOT EXISTS customer_dealers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_customer_dealers_customer_id ON customer_dealers(customer_id);

-- ============================================
-- 3. PROCESS GROUPS
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_groups_name ON process_groups(lower(name));

-- Add group_id to processes table
ALTER TABLE processes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES process_groups(id) ON DELETE SET NULL;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255);

-- ============================================
-- 4. JOB ENHANCEMENTS
-- ============================================
-- Add dealer_id to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dealer_id UUID REFERENCES customer_dealers(id) ON DELETE SET NULL;

-- ============================================
-- 5. JOB STEP ENHANCEMENTS
-- ============================================
-- Add due date/time fields
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS due_time TIME;

-- Add pause/block fields
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS status_before_block VARCHAR(50);

-- Add production tracking
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS production_quantity DECIMAL(10,2);
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS production_unit VARCHAR(50);
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS production_notes TEXT;

-- Add revision number
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS revision_no INTEGER DEFAULT 1;

-- Create job_step_notes table
CREATE TABLE IF NOT EXISTS job_step_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_step_id UUID NOT NULL REFERENCES job_steps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_step_notes_step_id ON job_step_notes(job_step_id);

-- ============================================
-- 6. UNITS TABLE
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

CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active);
CREATE INDEX IF NOT EXISTS idx_units_name ON units(name);

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
-- 7. QUOTATIONS MODULE
-- ============================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    version_major INTEGER DEFAULT 1,
    version_minor INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'approved', 'rejected', 'archived')),
    total_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TRY',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_job ON quotations(job_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);

CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    stock_id UUID,
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TRY',
    unit_cost_try DECIMAL(15,2) DEFAULT 0,
    total_cost_try DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_stock ON quotation_items(stock_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_order ON quotation_items(quotation_id, order_index);

-- ============================================
-- 8. STOCK MANAGEMENT SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'ADET',
    current_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (current_quantity >= 0),
    reserved_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (reserved_quantity >= 0),
    on_order_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (on_order_quantity >= 0),
    available_quantity DECIMAL(15, 3) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
    min_quantity DECIMAL(15, 3) DEFAULT 0,
    min_stock_level DECIMAL(15, 3) DEFAULT 0,
    reorder_point DECIMAL(15, 3) DEFAULT 0,
    max_stock_level DECIMAL(15, 3),
    unit_price DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'TRY',
    supplier_name VARCHAR(255),
    supplier_code VARCHAR(100),
    location VARCHAR(100),
    barcode VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stocks_product_code ON stocks(product_code);
CREATE INDEX IF NOT EXISTS idx_stocks_category ON stocks(category);
CREATE INDEX IF NOT EXISTS idx_stocks_active ON stocks(is_active);
CREATE INDEX IF NOT EXISTS idx_stocks_low_stock ON stocks(current_quantity)
    WHERE current_quantity <= min_stock_level AND min_stock_level > 0;

-- Stock movements/transactions table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
    quantity DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2),
    reference_type VARCHAR(50),
    reference_id UUID,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    reservation_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_job_id ON stock_movements(job_id);

-- ============================================
-- 9. STOCK RESERVATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    reserved_quantity DECIMAL(15, 3) NOT NULL CHECK (reserved_quantity > 0),
    used_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (used_quantity >= 0),
    planned_usage_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'partially_used', 'fully_used', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_job_id ON stock_reservations(job_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_stock_id ON stock_reservations(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_quotation_id ON stock_reservations(quotation_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_planned_usage_date ON stock_reservations(planned_usage_date);

-- Add reservation_id to stock_movements
ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_reservation
    FOREIGN KEY (reservation_id) REFERENCES stock_reservations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_reservation_id ON stock_movements(reservation_id);

-- ============================================
-- 10. SUPPLIERS TABLE
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
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- ============================================
-- 11. RFQ SYSTEM
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
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_created_at ON rfqs(created_at DESC);

CREATE TABLE IF NOT EXISTS rfq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id),
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit VARCHAR(50),
    required_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_stock_id ON rfq_items(stock_id);

CREATE TABLE IF NOT EXISTS supplier_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
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
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_quotations_rfq_id ON supplier_quotations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_supplier_id ON supplier_quotations(supplier_id);

CREATE TABLE IF NOT EXISTS supplier_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES supplier_quotations(id) ON DELETE CASCADE,
    rfq_item_id UUID NOT NULL REFERENCES rfq_items(id),
    stock_id UUID REFERENCES stocks(id),
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

CREATE INDEX IF NOT EXISTS idx_supplier_quotation_items_quotation_id ON supplier_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotation_items_rfq_item_id ON supplier_quotation_items(rfq_item_id);

-- ============================================
-- 12. PURCHASE ORDERS & GOODS RECEIPTS
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    rfq_id UUID REFERENCES rfqs(id),
    supplier_quotation_id UUID REFERENCES supplier_quotations(id),
    supplier_id UUID REFERENCES suppliers(id),
    stock_id UUID REFERENCES stocks(id),
    supplier_name VARCHAR(255),
    quantity DECIMAL(15, 3) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'TRY',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'ordered', 'confirmed', 'in_transit', 'partial_received', 'completed', 'cancelled')),
    order_date DATE,
    expected_delivery_date DATE,
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_rfq_id ON purchase_orders(rfq_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    stock_id UUID REFERENCES stocks(id),
    received_date DATE DEFAULT CURRENT_DATE,
    total_quantity DECIMAL(15, 3),
    unit VARCHAR(50),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
    notes TEXT,
    received_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_purchase_order_id ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_stock_id ON goods_receipts(stock_id);

-- ============================================
-- 13. PURCHASE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_quotations', 'quotations_received', 'approved', 'ordered', 'partially_delivered', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    required_by_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_by ON purchase_requests(created_by);

CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    requested_quantity DECIMAL(15, 3) NOT NULL CHECK (requested_quantity > 0),
    approved_quantity DECIMAL(15, 3) CHECK (approved_quantity >= 0),
    received_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (received_quantity >= 0),
    unit_price DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_purchase_request_id ON purchase_request_items(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_stock_id ON purchase_request_items(stock_id);

-- ============================================
-- 14. HR DOCUMENTS MODULE
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
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_types_active ON hr_document_types(is_active);

CREATE TABLE IF NOT EXISTS hr_document_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type_id UUID NOT NULL REFERENCES hr_document_types(id) ON DELETE CASCADE,
    role_id UUID,
    department_code VARCHAR(100),
    employment_type VARCHAR(50),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    validity_days_override INTEGER,
    renew_before_days_override INTEGER,
    applies_from DATE,
    applies_until DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_requirements_doc_type ON hr_document_requirements(document_type_id);

CREATE TABLE IF NOT EXISTS hr_employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES hr_document_types(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES hr_document_requirements(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'missing' CHECK (
        status IN ('missing', 'pending_approval', 'active', 'expired', 'rejected', 'archived')
    ),
    valid_from DATE,
    valid_until DATE,
    current_version_id UUID,
    last_status_check_at TIMESTAMP,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_employee_documents_user ON hr_employee_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_documents_status ON hr_employee_documents(status);

CREATE TABLE IF NOT EXISTS hr_document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_document_id UUID NOT NULL REFERENCES hr_employee_documents(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        approval_status IN ('pending', 'approved', 'rejected')
    ),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approval_note TEXT,
    checksum VARCHAR(128),
    file_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_versions_status ON hr_document_versions(approval_status);

-- Add foreign key for current_version_id
ALTER TABLE hr_employee_documents DROP CONSTRAINT IF EXISTS fk_hr_employee_documents_current_version;
ALTER TABLE hr_employee_documents
    ADD CONSTRAINT fk_hr_employee_documents_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES hr_document_versions(id)
    ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS hr_document_share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    employee_document_id UUID NOT NULL REFERENCES hr_employee_documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES hr_document_versions(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    max_views INTEGER,
    views_count INTEGER NOT NULL DEFAULT 0,
    allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    allowed_departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_share_links_doc ON hr_document_share_links(employee_document_id);

CREATE TABLE IF NOT EXISTS hr_document_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_link_id UUID NOT NULL REFERENCES hr_document_share_links(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES hr_document_versions(id) ON DELETE SET NULL,
    viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN ('view', 'download')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_access_logs_link ON hr_document_access_logs(share_link_id);

CREATE TABLE IF NOT EXISTS hr_document_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
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
    import_job_id UUID NOT NULL REFERENCES hr_document_import_jobs(id) ON DELETE CASCADE,
    line_number INTEGER,
    employee_identifier VARCHAR(255) NOT NULL,
    document_type_code VARCHAR(100) NOT NULL,
    requirement_id UUID REFERENCES hr_document_requirements(id) ON DELETE SET NULL,
    matched_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'imported', 'failed', 'skipped')
    ),
    error_message TEXT,
    generated_document_id UUID REFERENCES hr_employee_documents(id) ON DELETE SET NULL,
    generated_version_id UUID REFERENCES hr_document_versions(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- 15. FUNCTIONS & TRIGGERS
-- ============================================

-- Quotation number generator
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    year_part TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    next_num := nextval('quotation_number_seq');
    RETURN 'TKL-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
        NEW.quotation_number := generate_quotation_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_quotation_number ON quotations;
CREATE TRIGGER trigger_set_quotation_number
    BEFORE INSERT ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION set_quotation_number();

-- Quotation item total calculation
CREATE OR REPLACE FUNCTION calculate_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost = NEW.quantity * NEW.unit_cost;
    NEW.unit_cost_try = COALESCE(NEW.unit_cost_try, NEW.unit_cost);
    NEW.total_cost_try = COALESCE(NEW.total_cost_try, NEW.total_cost);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_item_total ON quotation_items;
CREATE TRIGGER trigger_calculate_item_total
    BEFORE INSERT OR UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_item_total();

-- Quotation total update
CREATE OR REPLACE FUNCTION update_quotation_total()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID;
BEGIN
    target_id := COALESCE(NEW.quotation_id, OLD.quotation_id);

    UPDATE quotations
    SET total_cost = (
        SELECT COALESCE(SUM(total_cost_try), 0)
        FROM quotation_items
        WHERE quotation_id = target_id
    )
    WHERE id = target_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quotation_total_insert ON quotation_items;
DROP TRIGGER IF EXISTS trigger_update_quotation_total_update ON quotation_items;
DROP TRIGGER IF EXISTS trigger_update_quotation_total_delete ON quotation_items;

CREATE TRIGGER trigger_update_quotation_total_insert
    AFTER INSERT ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_total();

CREATE TRIGGER trigger_update_quotation_total_update
    AFTER UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_total();

CREATE TRIGGER trigger_update_quotation_total_delete
    AFTER DELETE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_total();

-- Stock reserved quantity update
CREATE OR REPLACE FUNCTION update_stock_reserved_quantity()
RETURNS TRIGGER AS $$
DECLARE
    affected_stock_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_stock_id := OLD.stock_id;
    ELSE
        affected_stock_id := NEW.stock_id;
    END IF;

    UPDATE stocks
    SET reserved_quantity = COALESCE((
        SELECT SUM(reserved_quantity - used_quantity)
        FROM stock_reservations
        WHERE stock_id = affected_stock_id
        AND status IN ('active', 'partially_used')
    ), 0)
    WHERE id = affected_stock_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_reserved_quantity ON stock_reservations;
CREATE TRIGGER trigger_update_stock_reserved_quantity
    AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_reserved_quantity();

-- Reservation used quantity update
CREATE OR REPLACE FUNCTION update_reservation_used_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'out' AND NEW.reservation_id IS NOT NULL THEN
        UPDATE stock_reservations
        SET
            used_quantity = used_quantity + NEW.quantity,
            status = CASE
                WHEN (used_quantity + NEW.quantity) >= reserved_quantity THEN 'fully_used'
                WHEN (used_quantity + NEW.quantity) > 0 THEN 'partially_used'
                ELSE 'active'
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.reservation_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reservation_used_quantity ON stock_movements;
CREATE TRIGGER trigger_update_reservation_used_quantity
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_used_quantity();

-- Purchase request number generator
CREATE OR REPLACE FUNCTION generate_purchase_request_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str VARCHAR(4);
    next_num INTEGER;
    new_number VARCHAR(50);
BEGIN
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM purchase_requests
    WHERE request_number LIKE 'PR-' || year_str || '-%';

    new_number := 'PR-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
    NEW.request_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_pr_number ON purchase_requests;
CREATE TRIGGER trigger_generate_pr_number
    BEFORE INSERT ON purchase_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
    EXECUTE FUNCTION generate_purchase_request_number();

-- Supplier quotation item total calculation
CREATE OR REPLACE FUNCTION calculate_supplier_quotation_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_supplier_quotation_item_total ON supplier_quotation_items;
CREATE TRIGGER trigger_calculate_supplier_quotation_item_total
    BEFORE INSERT OR UPDATE ON supplier_quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_supplier_quotation_item_total();

-- Purchase order status update on goods receipt
CREATE OR REPLACE FUNCTION update_purchase_order_status_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
    po_id UUID;
    po_quantity NUMERIC;
    total_received NUMERIC;
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        po_id := NEW.purchase_order_id;

        IF po_id IS NOT NULL THEN
            SELECT quantity INTO po_quantity
            FROM purchase_orders
            WHERE id = po_id;

            SELECT COALESCE(SUM(total_quantity), 0)
            INTO total_received
            FROM goods_receipts
            WHERE purchase_order_id = po_id
            AND status = 'approved';

            IF total_received >= po_quantity THEN
                UPDATE purchase_orders
                SET status = 'completed'
                WHERE id = po_id AND status NOT IN ('completed', 'cancelled');
            ELSIF total_received > 0 THEN
                UPDATE purchase_orders
                SET status = 'partial_received'
                WHERE id = po_id AND status NOT IN ('completed', 'cancelled');
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_status_on_receipt ON goods_receipts;
CREATE TRIGGER trigger_update_po_status_on_receipt
    AFTER INSERT OR UPDATE ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_status_on_receipt();

-- Updated_at triggers for various tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_suppliers_timestamp ON suppliers;
CREATE TRIGGER trigger_update_suppliers_timestamp
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_units_timestamp ON units;
CREATE TRIGGER trigger_update_units_timestamp
    BEFORE UPDATE ON units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quotation_timestamp ON quotations;
CREATE TRIGGER trigger_update_quotation_timestamp
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quotation_item_timestamp ON quotation_items;
CREATE TRIGGER trigger_update_quotation_item_timestamp
    BEFORE UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_rfqs_timestamp ON rfqs;
CREATE TRIGGER trigger_update_rfqs_timestamp
    BEFORE UPDATE ON rfqs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_supplier_quotations_timestamp ON supplier_quotations;
CREATE TRIGGER trigger_update_supplier_quotations_timestamp
    BEFORE UPDATE ON supplier_quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 16. VIEWS FOR REPORTING
-- ============================================

-- Stock availability summary
CREATE OR REPLACE VIEW stock_availability_summary AS
SELECT
    s.id,
    s.product_name as name,
    s.product_code as code,
    s.category,
    s.unit,
    s.current_quantity as physical_stock,
    COALESCE(s.reserved_quantity, 0) as reserved_quantity,
    COALESCE(s.on_order_quantity, 0) as on_order_quantity,
    s.available_quantity as truly_available,
    s.min_quantity as min_stock_level,
    CASE
        WHEN s.available_quantity < s.min_quantity THEN 'critical'
        WHEN s.available_quantity < s.min_quantity * 1.5 THEN 'low'
        ELSE 'ok'
    END as stock_status,
    s.supplier_name,
    s.unit_price,
    s.currency
FROM stocks s
WHERE s.is_active = true;

-- Upcoming material needs
CREATE OR REPLACE VIEW upcoming_material_needs AS
SELECT
    sr.planned_usage_date,
    sr.job_id,
    j.job_number,
    j.title as job_title,
    j.status as job_status,
    sr.stock_id,
    s.product_name as stock_name,
    s.product_code as stock_code,
    s.category,
    sr.reserved_quantity,
    sr.used_quantity,
    (sr.reserved_quantity - sr.used_quantity) as remaining_need,
    s.current_quantity as current_physical_stock,
    s.reserved_quantity as total_reserved,
    s.on_order_quantity as total_on_order,
    s.available_quantity as truly_available,
    s.unit,
    sr.status as reservation_status,
    sr.created_at as reserved_at
FROM stock_reservations sr
JOIN jobs j ON sr.job_id = j.id
JOIN stocks s ON sr.stock_id = s.id
WHERE sr.status IN ('active', 'partially_used')
ORDER BY sr.planned_usage_date, s.product_name;

-- Critical stock alerts
CREATE OR REPLACE VIEW critical_stock_alerts AS
SELECT
    s.id as stock_id,
    s.product_code,
    s.product_name,
    s.category,
    s.current_quantity as physical_stock,
    s.reserved_quantity,
    s.on_order_quantity,
    s.available_quantity as truly_available,
    s.min_quantity as min_stock_level,
    (s.min_quantity - s.available_quantity) as shortage_quantity,
    s.unit,
    s.supplier_name,
    MIN(sr.planned_usage_date) as earliest_need_date,
    COUNT(DISTINCT sr.job_id) as jobs_affected
FROM stocks s
LEFT JOIN stock_reservations sr ON s.id = sr.stock_id
    AND sr.status IN ('active', 'partially_used')
WHERE s.is_active = true
    AND s.available_quantity < s.min_quantity
GROUP BY s.id, s.product_code, s.product_name, s.category,
         s.current_quantity, s.reserved_quantity, s.on_order_quantity,
         s.available_quantity, s.min_quantity, s.unit, s.supplier_name
ORDER BY (s.min_quantity - s.available_quantity) DESC;

-- Critical stocks view
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

-- ============================================
-- COMPLETION
-- ============================================

COMMIT;

-- ============================================
-- SCRIPT COMPLETE
-- ============================================
-- This script has successfully created/updated:
-- - User enhancements (avatars, roles)
-- - Customer dealers
-- - Process groups
-- - Job & job step enhancements
-- - Units table
-- - Quotations module
-- - Stock management system
-- - Stock reservations
-- - Suppliers
-- - RFQ system
-- - Purchase orders & goods receipts
-- - Purchase requests
-- - HR documents module
-- - All necessary triggers and functions
-- - Reporting views
-- ============================================