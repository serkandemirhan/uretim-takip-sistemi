-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS (Kullanıcılar)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_file_id UUID REFERENCES files(id),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('yonetici', 'musteri_temsilcisi', 'tasarimci', 'kesifci', 'operator', 'depocu', 'satinalma')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS (Müşteriler)
-- ============================================
CREATE TABLE customers (
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

CREATE TABLE customer_dealers (
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

CREATE INDEX idx_customer_dealers_customer_id ON customer_dealers(customer_id);

-- ============================================
-- PROCESSES (Süreçler: Ölçü, Keşif, Tasarım, Baskı, Kesim, vb.)
-- ============================================
CREATE TABLE process_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_process_groups_name ON process_groups(lower(name));

CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_machine_based BOOLEAN DEFAULT false,
    is_production BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    group_id UUID REFERENCES process_groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================
-- MACHINES (Makineler: HP Latex, CNC Router, vb.)
-- ============================================
CREATE TABLE machines (
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
CREATE TABLE machine_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(machine_id, process_id)
);

-- ============================================
-- JOBS (İş Talepleri)
-- ============================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
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
CREATE TABLE job_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id),
    order_index INTEGER NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'blocked', 'completed', 'canceled')),
    is_parallel BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration INTEGER, -- dakika cinsinden
    actual_duration INTEGER, -- dakika cinsinden
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

CREATE TABLE job_step_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_step_id UUID NOT NULL REFERENCES job_steps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_step_notes_step_id ON job_step_notes(job_step_id);

-- ============================================
-- FILES (Dosyalar: MinIO'da tutulan dosyaların metadata'sı)
-- ============================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket VARCHAR(255) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    ref_type VARCHAR(50), -- 'job', 'job_step', 'customer'
    ref_id UUID,
    uploaded_by UUID REFERENCES users(id),
    checksum VARCHAR(64),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AUDIT_LOGS (Denetim Kayıtları)
-- ============================================
CREATE TABLE audit_logs (
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
CREATE TABLE notifications (
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
-- INDEXES
-- ============================================
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_job_steps_job ON job_steps(job_id);
CREATE INDEX idx_job_steps_assigned ON job_steps(assigned_to);
CREATE INDEX idx_job_steps_machine ON job_steps(machine_id);
CREATE INDEX idx_job_steps_status ON job_steps(status);
CREATE INDEX idx_files_ref ON files(ref_type, ref_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================
-- INITIAL DATA (Demo Verileri)
-- ============================================

-- Admin kullanıcı (şifre: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@demo.com', crypt('admin123', gen_salt('bf')), 'Admin Kullanıcı', 'yonetici');

-- Örnek operatör (şifre: operator123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('akaya', 'akaya@demo.com', crypt('operator123', gen_salt('bf')), 'Ali Kaya', 'operator');

-- Örnek süreçler
INSERT INTO processes (name, code, is_machine_based, is_production, order_index) VALUES
('Ölçü', 'OLCU', false, false, 1),
('Keşif', 'KESIF', false, false, 2),
('Tasarım', 'TASARIM', false, false, 3),
('Baskı', 'BASKI', true, true, 4),
('Kesim', 'KESIM', true, true, 5),
('Montaj', 'MONTAJ', false, false, 6);

-- Örnek makineler
INSERT INTO machines (name, code, type, status) VALUES
('HP Latex 360', 'HP-360', 'Baskı Makinesi', 'active'),
('CNC Router A', 'CNC-A', 'Kesim Makinesi', 'active'),
('Epson S80600', 'EPSON-S80', 'Baskı Makinesi', 'active');

-- Makine-süreç ilişkileri
INSERT INTO machine_processes (machine_id, process_id)
SELECT m.id, p.id FROM machines m, processes p 
WHERE m.code = 'HP-360' AND p.code = 'BASKI';

INSERT INTO machine_processes (machine_id, process_id)
SELECT m.id, p.id FROM machines m, processes p 
WHERE m.code = 'EPSON-S80' AND p.code = 'BASKI';

INSERT INTO machine_processes (machine_id, process_id)
SELECT m.id, p.id FROM machines m, processes p 
WHERE m.code = 'CNC-A' AND p.code = 'KESIM';

-- Rol süreç yetkileri tablosu
CREATE TABLE IF NOT EXISTS role_process_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (role_id, process_id)
);

-- Örnek müşteri
INSERT INTO customers (name, contact_person, phone, email, address) VALUES
('ABC Reklam Ajansı', 'Mehmet Karaca', '+90 532 000 1122', 'info@abcreklam.com', 'İstiklal Cad. No:12, Beyoğlu, İstanbul');
