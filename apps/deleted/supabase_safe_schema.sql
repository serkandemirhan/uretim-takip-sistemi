-- ============================================
-- ReklamPRO Supabase Safe Schema
-- Foreign key'ler en sonda eklenir - daha güvenli
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- STEP 1: TABLOLAR (Foreign Key'siz)
-- ============================================

-- USERS
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

-- ROLES
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USER_ROLES
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID,
    UNIQUE(user_id, role_id)
);

-- ROLE_PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    resource VARCHAR(100) NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CUSTOMERS
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

-- CUSTOMER_DEALERS
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

-- PROCESS_GROUPS
CREATE TABLE IF NOT EXISTS process_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PROCESSES
CREATE TABLE IF NOT EXISTS processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_machine_based BOOLEAN DEFAULT false,
    is_production BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    group_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- MACHINES
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

-- MACHINE_PROCESSES
CREATE TABLE IF NOT EXISTS machine_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL,
    process_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(machine_id, process_id)
);

-- JOBS
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold', 'in_progress', 'completed', 'canceled')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date DATE,
    revision_no INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add dealer_id if not exists (from migration 007)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'dealer_id'
    ) THEN
        ALTER TABLE jobs ADD COLUMN dealer_id UUID;
    END IF;
END $$;

-- JOB_STEPS (requirements dahil!)
CREATE TABLE IF NOT EXISTS job_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    process_id UUID NOT NULL,
    order_index INTEGER NOT NULL,
    assigned_to UUID,
    machine_id UUID,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'blocked', 'completed', 'canceled')),
    is_parallel BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    production_quantity DECIMAL(10,2),
    production_unit VARCHAR(50),
    production_notes TEXT,
    block_reason TEXT,
    blocked_at TIMESTAMP,
    status_before_block VARCHAR(50),
    revision_no INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add due_date, due_time, requirements if not exists (from migrations 008 & 009)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'job_steps' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE job_steps ADD COLUMN due_date DATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'job_steps' AND column_name = 'due_time'
    ) THEN
        ALTER TABLE job_steps ADD COLUMN due_time TIME;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'job_steps' AND column_name = 'requirements'
    ) THEN
        ALTER TABLE job_steps ADD COLUMN requirements TEXT;
    END IF;
END $$;

-- JOB_STEP_NOTES
CREATE TABLE IF NOT EXISTS job_step_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_step_id UUID NOT NULL,
    user_id UUID,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- FILES
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket VARCHAR(255) NOT NULL DEFAULT 'reklampro-files',
    object_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    ref_type VARCHAR(50),
    ref_id UUID,
    uploaded_by UUID,
    checksum VARCHAR(64),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    folder_path VARCHAR(500),
    content_type VARCHAR(255),
    url TEXT
);

-- AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    ref_type VARCHAR(50),
    ref_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- UNITS
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- STOCKS
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

-- STOCK_MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('in', 'out')),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    currency VARCHAR(10),
    job_id UUID,
    purchase_order_id UUID,
    purpose TEXT,
    document_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- PURCHASE_REQUESTS
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requester_id UUID NOT NULL,
    department VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'completed', 'canceled')),
    required_date DATE,
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    total_amount DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PURCHASE_REQUEST_ITEMS
CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID NOT NULL,
    stock_id UUID,
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

-- PURCHASE_ORDERS
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
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add approved_by and approved_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN approved_by UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN approved_at TIMESTAMP;
    END IF;
END $$;

-- PURCHASE_ORDER_ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL,
    pr_item_id UUID,
    stock_id UUID,
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

-- PURCHASE_REQUEST_PURCHASE_ORDERS
CREATE TABLE IF NOT EXISTS purchase_request_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID NOT NULL,
    po_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pr_id, po_id)
);

-- GOODS_RECEIPTS
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gr_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID NOT NULL,
    receipt_date DATE DEFAULT CURRENT_DATE,
    received_by UUID,
    supplier_delivery_note VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending_inspection' CHECK (status IN ('pending_inspection', 'approved', 'partially_approved', 'rejected')),
    inspection_notes TEXT,
    inspected_by UUID,
    inspected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- GOODS_RECEIPT_LINES
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gr_id UUID NOT NULL,
    po_item_id UUID NOT NULL,
    ordered_quantity DECIMAL(10,2) NOT NULL,
    received_quantity DECIMAL(10,2) NOT NULL,
    accepted_quantity DECIMAL(10,2),
    rejected_quantity DECIMAL(10,2),
    rejection_reason TEXT,
    quality_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- JOB_MATERIALS
CREATE TABLE IF NOT EXISTS job_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    stock_id UUID NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'consumed', 'returned')),
    allocated_at TIMESTAMP,
    consumed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- QUOTATIONS
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID,
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
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add dealer_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quotations' AND column_name = 'dealer_id'
    ) THEN
        ALTER TABLE quotations ADD COLUMN dealer_id UUID;
    END IF;
END $$;

-- QUOTATION_ITEMS
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL,
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

-- ROLE_PROCESS_PERMISSIONS
CREATE TABLE IF NOT EXISTS role_process_permissions (
    role_id UUID NOT NULL,
    process_id UUID NOT NULL,
    can_view BOOLEAN DEFAULT true,
    PRIMARY KEY (role_id, process_id)
);

-- CURRENCY_SETTINGS
CREATE TABLE IF NOT EXISTS currency_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usd_to_try DECIMAL(10,4) DEFAULT 1.0,
    eur_to_try DECIMAL(10,4) DEFAULT 1.0,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID
);

-- ============================================
-- STEP 2: FOREIGN KEY CONSTRAINTS (Güvenli)
-- ============================================

DO $$
BEGIN
    -- user_roles
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_id_fkey') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
    END IF;

    -- role_permissions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_id_fkey') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
    END IF;

    -- customer_dealers
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_dealers_customer_id_fkey') THEN
        ALTER TABLE customer_dealers ADD CONSTRAINT customer_dealers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;

    -- processes
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'processes_group_id_fkey') THEN
        ALTER TABLE processes ADD CONSTRAINT processes_group_id_fkey FOREIGN KEY (group_id) REFERENCES process_groups(id) ON DELETE SET NULL;
    END IF;

    -- machine_processes
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_processes_machine_id_fkey') THEN
        ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_processes_process_id_fkey') THEN
        ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE;
    END IF;

    -- jobs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_customer_id_fkey') THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_dealer_id_fkey') THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES customer_dealers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_created_by_fkey') THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;

    -- job_steps
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_job_id_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_process_id_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_assigned_to_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_machine_id_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;
    END IF;

    -- job_step_notes
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_step_notes_job_step_id_fkey') THEN
        ALTER TABLE job_step_notes ADD CONSTRAINT job_step_notes_job_step_id_fkey FOREIGN KEY (job_step_id) REFERENCES job_steps(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_step_notes_user_id_fkey') THEN
        ALTER TABLE job_step_notes ADD CONSTRAINT job_step_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- files
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_uploaded_by_fkey') THEN
        ALTER TABLE files ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id);
    END IF;

    -- audit_logs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey') THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- notifications
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- stock_movements
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_stock_id_fkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_job_id_fkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_created_by_fkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- purchase_requests
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_requests_requester_id_fkey') THEN
        ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_requests_approved_by_fkey') THEN
        ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id);
    END IF;

    -- purchase_request_items
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_request_items_pr_id_fkey') THEN
        ALTER TABLE purchase_request_items ADD CONSTRAINT purchase_request_items_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_request_items_stock_id_fkey') THEN
        ALTER TABLE purchase_request_items ADD CONSTRAINT purchase_request_items_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES stocks(id);
    END IF;

    -- purchase_orders
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_created_by_fkey') THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_approved_by_fkey') THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id);
    END IF;

    -- purchase_order_items
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_po_id_fkey') THEN
        ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_pr_item_id_fkey') THEN
        ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_pr_item_id_fkey FOREIGN KEY (pr_item_id) REFERENCES purchase_request_items(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_stock_id_fkey') THEN
        ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES stocks(id);
    END IF;

    -- purchase_request_purchase_orders
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_request_purchase_orders_pr_id_fkey') THEN
        ALTER TABLE purchase_request_purchase_orders ADD CONSTRAINT purchase_request_purchase_orders_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_request_purchase_orders_po_id_fkey') THEN
        ALTER TABLE purchase_request_purchase_orders ADD CONSTRAINT purchase_request_purchase_orders_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
    END IF;

    -- goods_receipts
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipts_po_id_fkey') THEN
        ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipts_received_by_fkey') THEN
        ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipts_inspected_by_fkey') THEN
        ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_inspected_by_fkey FOREIGN KEY (inspected_by) REFERENCES users(id);
    END IF;

    -- goods_receipt_lines
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_lines_gr_id_fkey') THEN
        ALTER TABLE goods_receipt_lines ADD CONSTRAINT goods_receipt_lines_gr_id_fkey FOREIGN KEY (gr_id) REFERENCES goods_receipts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_lines_po_item_id_fkey') THEN
        ALTER TABLE goods_receipt_lines ADD CONSTRAINT goods_receipt_lines_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id);
    END IF;

    -- job_materials
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_materials_job_id_fkey') THEN
        ALTER TABLE job_materials ADD CONSTRAINT job_materials_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_materials_stock_id_fkey') THEN
        ALTER TABLE job_materials ADD CONSTRAINT job_materials_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES stocks(id);
    END IF;

    -- quotations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotations_customer_id_fkey') THEN
        ALTER TABLE quotations ADD CONSTRAINT quotations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotations_dealer_id_fkey') THEN
        ALTER TABLE quotations ADD CONSTRAINT quotations_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES customer_dealers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotations_created_by_fkey') THEN
        ALTER TABLE quotations ADD CONSTRAINT quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;

    -- quotation_items
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotation_items_quotation_id_fkey') THEN
        ALTER TABLE quotation_items ADD CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
    END IF;

    -- role_process_permissions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_process_permissions_role_id_fkey') THEN
        ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_process_permissions_process_id_fkey') THEN
        ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE;
    END IF;

    -- currency_settings
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'currency_settings_updated_by_fkey') THEN
        ALTER TABLE currency_settings ADD CONSTRAINT currency_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;
END $$;

-- ============================================
-- STEP 3: INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customer_dealers_customer_id ON customer_dealers(customer_id);
CREATE INDEX IF NOT EXISTS idx_process_groups_name ON process_groups(lower(name));
CREATE INDEX IF NOT EXISTS idx_processes_group_id ON processes(group_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_dealer_id ON jobs(dealer_id);
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
-- STEP 4: COMMENTS
-- ============================================
COMMENT ON TABLE job_steps IS 'İş süreç adımları';
COMMENT ON COLUMN job_steps.requirements IS 'İş gereksinimlerini ve talimatları içerir - operatörlerin işi nasıl yapması gerektiğini anlatır';
COMMENT ON COLUMN job_steps.production_notes IS 'Operatörlerin üretim sırasında ekledikleri notlar';

-- ============================================
-- BAŞARILI! ✅
-- ============================================
-- Tüm tablolar, foreign key'ler ve indexler oluşturuldu.
-- job_steps.requirements kolonu dahil!
