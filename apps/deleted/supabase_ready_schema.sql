-- ============================================
-- ReklamPRO Supabase Complete Schema
-- Bu dosyayı Supabase SQL Editor'de çalıştırabilirsiniz
-- Otomatik olarak eksikleri tamamlar
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- DROP EXISTING TABLES (İsteğe bağlı - temiz başlamak için)
-- ============================================
-- Aşağıdaki satırları uncomment ederseniz tüm tablolar silinir!
/*
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS goods_receipt_lines CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS purchase_request_purchase_orders CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_request_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS job_materials CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS job_step_notes CASCADE;
DROP TABLE IF EXISTS job_steps CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS machine_processes CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS processes CASCADE;
DROP TABLE IF EXISTS process_groups CASCADE;
DROP TABLE IF EXISTS customer_dealers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS role_process_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS currency_settings CASCADE;
*/

-- ============================================
-- USERS (Kullanıcılar)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_file_id UUID,
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('yonetici', 'musteri_temsilcisi', 'tasarimci', 'kesifci', 'operator', 'depocu', 'satinalma')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ROLES (Roller)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER_ROLES (Kullanıcı-Rol İlişkisi)
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID,
    UNIQUE(user_id, role_id)
);

-- ============================================
-- ROLE_PERMISSIONS (Rol İzinleri)
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CUSTOMERS (Müşteriler)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    phone_secondary VARCHAR(50),
    gsm VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(255),
    tax_office VARCHAR(255),
    tax_number VARCHAR(50),
    notes TEXT,
    short_code VARCHAR(50),
    postal_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CUSTOMER_DEALERS (Müşteri Bayileri)
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

-- ============================================
-- PROCESS_GROUPS (Süreç Grupları)
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
-- PROCESSES (Süreçler)
-- ============================================
CREATE TABLE IF NOT EXISTS processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_machine_based BOOLEAN DEFAULT false,
    is_production BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    group_id UUID REFERENCES process_groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- ============================================
-- MACHINES (Makineler)
-- ============================================
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    location VARCHAR(255),
    capacity_per_hour DECIMAL(10,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MACHINE_PROCESSES (Makine-Süreç İlişkisi)
-- ============================================
CREATE TABLE IF NOT EXISTS machine_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(machine_id, process_id)
);

-- ============================================
-- JOBS (İş Talepleri)
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    dealer_id UUID REFERENCES customer_dealers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold', 'in_progress', 'completed', 'canceled')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date DATE,
    revision_no INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- JOB_STEPS (İş Adımları)
-- ============================================
CREATE TABLE IF NOT EXISTS job_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id),
    order_index INTEGER NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
    due_date DATE,
    due_time TIME,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'blocked', 'completed', 'canceled')),
    is_parallel BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    production_quantity DECIMAL(10,2),
    production_unit VARCHAR(50),
    production_notes TEXT,
    requirements TEXT,
    block_reason TEXT,
    blocked_at TIMESTAMP,
    status_before_block VARCHAR(50),
    revision_no INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- JOB_STEP_NOTES (İş Adımı Notları)
-- ============================================
CREATE TABLE IF NOT EXISTS job_step_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_step_id UUID NOT NULL REFERENCES job_steps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FILES (Dosyalar)
-- ============================================
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket VARCHAR(255) NOT NULL DEFAULT 'reklampro-files',
    object_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    ref_type VARCHAR(50),
    ref_id UUID,
    uploaded_by UUID REFERENCES users(id),
    checksum VARCHAR(64),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    folder_path VARCHAR(500),
    content_type VARCHAR(255),
    url TEXT
);

-- ============================================
-- AUDIT_LOGS (Denetim Kayıtları)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS (Bildirimler)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    ref_type VARCHAR(50),
    ref_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- UNITS (Birimler)
-- ============================================
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STOCKS (Stok Kartları)
-- ============================================
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'adet',
    current_quantity DECIMAL(10,2) DEFAULT 0,
    min_quantity DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    supplier_name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STOCK_MOVEMENTS (Stok Hareketleri)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('in', 'out')),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    currency VARCHAR(10),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    purchase_order_id UUID,
    purpose TEXT,
    document_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- PURCHASE_REQUESTS (Satın Alma Talepleri)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requester_id UUID NOT NULL REFERENCES users(id),
    department VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'completed', 'canceled')),
    required_date DATE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    total_amount DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PURCHASE_REQUEST_ITEMS (Satın Alma Talep Kalemleri)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    estimated_unit_price DECIMAL(10,2),
    estimated_total_price DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    specifications TEXT,
    preferred_supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PURCHASE_ORDERS (Satın Alma Siparişleri)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact VARCHAR(255),
    supplier_phone VARCHAR(50),
    supplier_email VARCHAR(255),
    supplier_address TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partial_received', 'completed', 'canceled')),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    payment_terms TEXT,
    delivery_address TEXT,
    total_amount DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(12,2),
    grand_total DECIMAL(12,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PURCHASE_ORDER_ITEMS (Satın Alma Sipariş Kalemleri)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    pr_item_id UUID REFERENCES purchase_request_items(id),
    stock_id UUID REFERENCES stocks(id),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    received_quantity DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TRY',
    specifications TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PURCHASE_REQUEST_PURCHASE_ORDERS (PR-PO İlişkisi)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_request_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pr_id, po_id)
);

-- ============================================
-- GOODS_RECEIPTS (Mal Kabul)
-- ============================================
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gr_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID NOT NULL REFERENCES purchase_orders(id),
    receipt_date DATE DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES users(id),
    supplier_delivery_note VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending_inspection' CHECK (status IN ('pending_inspection', 'approved', 'partially_approved', 'rejected')),
    inspection_notes TEXT,
    inspected_by UUID REFERENCES users(id),
    inspected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- GOODS_RECEIPT_LINES (Mal Kabul Satırları)
-- ============================================
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gr_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES purchase_order_items(id),
    ordered_quantity DECIMAL(10,2) NOT NULL,
    received_quantity DECIMAL(10,2) NOT NULL,
    accepted_quantity DECIMAL(10,2),
    rejected_quantity DECIMAL(10,2),
    rejection_reason TEXT,
    quality_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- JOB_MATERIALS (İş-Malzeme İlişkisi)
-- ============================================
CREATE TABLE IF NOT EXISTS job_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'consumed', 'returned')),
    allocated_at TIMESTAMP,
    consumed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- QUOTATIONS (Teklifler)
-- ============================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    dealer_id UUID REFERENCES customer_dealers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
    valid_until DATE,
    total_amount DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(12,2),
    grand_total DECIMAL(12,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- QUOTATION_ITEMS (Teklif Kalemleri)
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ROLE_PROCESS_PERMISSIONS (Rol Süreç İzinleri)
-- ============================================
CREATE TABLE IF NOT EXISTS role_process_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    PRIMARY KEY (role_id, process_id)
);

-- ============================================
-- CURRENCY_SETTINGS (Döviz Kuru Ayarları)
-- ============================================
CREATE TABLE IF NOT EXISTS currency_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usd_to_try DECIMAL(10,4) DEFAULT 1.0,
    eur_to_try DECIMAL(10,4) DEFAULT 1.0,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customer_dealers_customer_id ON customer_dealers(customer_id);
CREATE INDEX IF NOT EXISTS idx_process_groups_name ON process_groups(lower(name));
CREATE INDEX IF NOT EXISTS idx_processes_group_id ON processes(group_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_job_steps_job ON job_steps(job_id);
CREATE INDEX IF NOT EXISTS idx_job_steps_assigned ON job_steps(assigned_to);
CREATE INDEX IF NOT EXISTS idx_job_steps_machine ON job_steps(machine_id);
CREATE INDEX IF NOT EXISTS idx_job_steps_status ON job_steps(status);
CREATE INDEX IF NOT EXISTS idx_job_steps_due_date ON job_steps(due_date);
CREATE INDEX IF NOT EXISTS idx_job_step_notes_step_id ON job_step_notes(job_step_id);
CREATE INDEX IF NOT EXISTS idx_files_ref ON files(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_stocks_product_code ON stocks(product_code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_job_id ON stock_movements(job_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requester ON purchase_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_pr ON purchase_request_items(pr_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_gr ON goods_receipt_lines(gr_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_stock ON job_materials(stock_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE job_steps IS 'İş süreç adımları';
COMMENT ON COLUMN job_steps.requirements IS 'İş gereksinimlerini ve talimatları içerir - operatörlerin işi nasıl yapması gerektiğini anlatır';
COMMENT ON COLUMN job_steps.production_notes IS 'Operatörlerin üretim sırasında ekledikleri notlar';

-- ============================================
-- TAMAMLANDI!
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırabilirsiniz.
-- Tüm tablolar ve kolonlar otomatik olarak oluşturulacaktır.
-- "IF NOT EXISTS" sayesinde mevcut tablolara zarar vermez.
