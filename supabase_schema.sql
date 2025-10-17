-- ReklamPRO Database Schema
-- Generated for Supabase import


-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (id uuid NOT NULL DEFAULT uuid_generate_v4(), user_id uuid, action character varying(100) NOT NULL, entity_type character varying(100), entity_id uuid, changes jsonb, ip_address inet, created_at timestamp without time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS customers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying(255) NOT NULL,
    code character varying(50),
    contact_person character varying(255),
    phone character varying(50),
    phone_secondary character varying(50),
    gsm character varying(50),
    email character varying(255),
    address text,
    city character varying(255),
    tax_office character varying(255),
    tax_number character varying(50),
    notes text,
    short_code character varying(50),
    postal_code character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: customer_dealers
CREATE TABLE IF NOT EXISTS customer_dealers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    customer_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    district character varying(255),
    city character varying(255),
    contact_person character varying(255),
    contact_phone character varying(50),
    tax_office character varying(255),
    tax_number character varying(50),
    phone1 character varying(50),
    phone2 character varying(50),
    email character varying(255),
    website character varying(255),
    postal_code character varying(20),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_dealers_customer_id ON customer_dealers (customer_id);

-- Table: files
CREATE TABLE IF NOT EXISTS files (id uuid NOT NULL DEFAULT uuid_generate_v4(), bucket character varying(255) NOT NULL DEFAULT 'reklampro-files'::character varying, object_key character varying(500) NOT NULL, filename character varying(255) NOT NULL, file_type character varying(100), file_size bigint, ref_type character varying(50), ref_id uuid, uploaded_by uuid, checksum character varying(64), version integer DEFAULT 1, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), folder_path character varying(500), content_type character varying(255), url text);

CREATE TABLE IF NOT EXISTS job_steps (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    job_id uuid NOT NULL,
    process_id uuid NOT NULL,
    order_index integer NOT NULL,
    assigned_to uuid,
    machine_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying,
    is_parallel boolean DEFAULT false,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    estimated_duration integer,
    actual_duration integer,
    production_quantity numeric,
    production_unit character varying(50),
    production_notes text,
    block_reason text,
    blocked_at timestamp without time zone,
    status_before_block character varying(50),
    revision_no integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: job_step_notes
CREATE TABLE IF NOT EXISTS job_step_notes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    job_step_id uuid NOT NULL,
    user_id uuid,
    note text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_step_notes_step_id ON job_step_notes (job_step_id);

-- Table: jobs
CREATE TABLE IF NOT EXISTS jobs (id uuid NOT NULL DEFAULT uuid_generate_v4(), job_number character varying(50) NOT NULL, customer_id uuid, title character varying(255) NOT NULL, description text, status character varying(50) DEFAULT 'draft'::character varying, priority character varying(50) DEFAULT 'normal'::character varying, due_date date, revision_no integer DEFAULT 1, created_by uuid, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS machine_processes (id uuid NOT NULL DEFAULT uuid_generate_v4(), machine_id uuid NOT NULL, process_id uuid NOT NULL, created_at timestamp without time zone DEFAULT now());

-- Table: process_groups
CREATE TABLE IF NOT EXISTS process_groups (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying(150) NOT NULL,
    description text,
    color character varying(20),
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_groups_name ON process_groups (lower(name));
CREATE INDEX IF NOT EXISTS idx_processes_group_id ON processes (group_id);

-- Table: machines
CREATE TABLE IF NOT EXISTS machines (id uuid NOT NULL DEFAULT uuid_generate_v4(), name character varying(255) NOT NULL, code character varying(50) NOT NULL, type character varying(100), status character varying(50) DEFAULT 'active'::character varying, location character varying(255), capacity_per_hour numeric, notes text, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (id uuid NOT NULL DEFAULT uuid_generate_v4(), user_id uuid NOT NULL, title character varying(255) NOT NULL, message text, type character varying(50) DEFAULT 'info'::character varying, is_read boolean DEFAULT false, ref_type character varying(50), ref_id uuid, created_at timestamp without time zone DEFAULT now());

-- Table: processes
CREATE TABLE IF NOT EXISTS processes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    is_machine_based boolean DEFAULT false,
    is_production boolean DEFAULT false,
    order_index integer DEFAULT 0,
    group_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Table: role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (id uuid NOT NULL DEFAULT gen_random_uuid(), role_id uuid NOT NULL, resource character varying(100) NOT NULL, can_view boolean DEFAULT false, can_create boolean DEFAULT false, can_update boolean DEFAULT false, can_delete boolean DEFAULT false, created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS role_process_permissions (role_id uuid NOT NULL, process_id uuid NOT NULL, can_view boolean DEFAULT true);

-- Table: roles
CREATE TABLE IF NOT EXISTS roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_roles
CREATE TABLE IF NOT EXISTS user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_primary boolean DEFAULT false,
    assigned_at timestamp without time zone DEFAULT now(),
    assigned_by uuid
);

CREATE TABLE IF NOT EXISTS users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255),
    avatar_file_id uuid,
    avatar_url text,
    role character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: stocks (Stok Kartları)
CREATE TABLE IF NOT EXISTS stocks (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_code character varying(100) NOT NULL,
    product_name character varying(255) NOT NULL,
    category character varying(100),
    unit character varying(50) DEFAULT 'adet'::character varying,
    current_quantity numeric DEFAULT 0,
    min_quantity numeric DEFAULT 0,
    unit_price numeric,
    currency character varying(10) DEFAULT 'TRY'::character varying,
    supplier_name character varying(255),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: stock_movements (Stok Hareketleri)
CREATE TABLE IF NOT EXISTS stock_movements (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    stock_id uuid NOT NULL,
    movement_type character varying(10) NOT NULL,
    quantity numeric NOT NULL,
    unit_price numeric,
    currency character varying(10),
    job_id uuid,
    purchase_order_id uuid,
    purpose text,
    document_no character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    created_by uuid
);

-- Table: purchase_orders (Satın Alma Emirleri)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    stock_id uuid NOT NULL,
    order_code character varying(100) NOT NULL,
    quantity numeric NOT NULL,
    unit_price numeric NOT NULL,
    currency character varying(10) DEFAULT 'TRY'::character varying,
    supplier_name character varying(255) NOT NULL,
    order_date date DEFAULT CURRENT_DATE,
    expected_delivery_date date,
    actual_delivery_date date,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid
);

-- Table: currency_settings (Döviz Kuru Ayarları)
CREATE TABLE IF NOT EXISTS currency_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    usd_to_try numeric DEFAULT 1.0,
    eur_to_try numeric DEFAULT 1.0,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by uuid
);


-- Indexes and Constraints (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_pkey') THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_pkey') THEN
        ALTER TABLE customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_pkey') THEN
        ALTER TABLE files ADD CONSTRAINT files_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_pkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_pkey') THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_processes_pkey') THEN
        ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machines_pkey') THEN
        ALTER TABLE machines ADD CONSTRAINT machines_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_pkey') THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'processes_pkey') THEN
        ALTER TABLE processes ADD CONSTRAINT processes_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'process_groups_pkey') THEN
        ALTER TABLE process_groups ADD CONSTRAINT process_groups_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_pkey') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_process_permissions_pkey') THEN
        ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_pkey PRIMARY KEY (process_id, role_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_pkey') THEN
        ALTER TABLE roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_pkey') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
        ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_dealers_pkey') THEN
        ALTER TABLE customer_dealers ADD CONSTRAINT customer_dealers_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_step_notes_pkey') THEN
        ALTER TABLE job_step_notes ADD CONSTRAINT job_step_notes_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_code_key') THEN
        ALTER TABLE roles ADD CONSTRAINT roles_code_key UNIQUE (code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_id_key') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_processes_machine_id_fkey') THEN
        ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_processes_process_id_fkey') THEN
        ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_customer_id_fkey') THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_created_by_fkey') THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_job_id_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_process_id_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_assigned_to_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_steps_machine_id_fkey') THEN
        ALTER TABLE job_steps ADD CONSTRAINT job_steps_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'processes_group_id_fkey') THEN
        ALTER TABLE processes ADD CONSTRAINT processes_group_id_fkey FOREIGN KEY (group_id) REFERENCES process_groups (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_dealers_customer_id_fkey') THEN
        ALTER TABLE customer_dealers ADD CONSTRAINT customer_dealers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_step_notes_job_step_id_fkey') THEN
        ALTER TABLE job_step_notes ADD CONSTRAINT job_step_notes_job_step_id_fkey FOREIGN KEY (job_step_id) REFERENCES job_steps (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_step_notes_user_id_fkey') THEN
        ALTER TABLE job_step_notes ADD CONSTRAINT job_step_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_uploaded_by_fkey') THEN
        ALTER TABLE files ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey') THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_id_fkey') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_id_fkey') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_assigned_by_fkey') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_avatar_file_id_fkey') THEN
        ALTER TABLE users ADD CONSTRAINT users_avatar_file_id_fkey FOREIGN KEY (avatar_file_id) REFERENCES files (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_process_permissions_role_id_fkey') THEN
        ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_process_permissions_process_id_fkey') THEN
        ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes (id) ON DELETE CASCADE;
    END IF;

    -- Stock Management Constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stocks_pkey') THEN
        ALTER TABLE stocks ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_pkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_pkey') THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'currency_settings_pkey') THEN
        ALTER TABLE currency_settings ADD CONSTRAINT currency_settings_pkey PRIMARY KEY (id);
    END IF;

    -- Stock Foreign Keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_stock_id_fkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_job_id_fkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_purchase_order_id_fkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_created_by_fkey') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_stock_id_fkey') THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_created_by_fkey') THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'currency_settings_updated_by_fkey') THEN
        ALTER TABLE currency_settings ADD CONSTRAINT currency_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
    END IF;

    -- Stock Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stocks_product_code') THEN
        CREATE INDEX idx_stocks_product_code ON stocks (product_code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_movements_stock_id') THEN
        CREATE INDEX idx_stock_movements_stock_id ON stock_movements (stock_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_movements_job_id') THEN
        CREATE INDEX idx_stock_movements_job_id ON stock_movements (job_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_purchase_orders_stock_id') THEN
        CREATE INDEX idx_purchase_orders_stock_id ON purchase_orders (stock_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_purchase_orders_status') THEN
        CREATE INDEX idx_purchase_orders_status ON purchase_orders (status);
    END IF;
END
$$;
