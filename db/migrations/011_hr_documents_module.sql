-- ============================================
-- HR DOCUMENT COMPLIANCE MODULE
-- ============================================

-- ============================================
-- DOCUMENT TYPES (Tanımlar ve varsayılan kurallar)
-- ============================================
CREATE TABLE IF NOT EXISTS hr_document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    default_validity_days INTEGER,
    default_renew_before_days INTEGER,
    default_share_expiry_hours INTEGER DEFAULT 72,
    metadata_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_types_active ON hr_document_types(is_active);

-- ============================================
-- DOCUMENT REQUIREMENTS (Rol/Bölüm bazlı zorunluluklar)
-- ============================================
CREATE TABLE IF NOT EXISTS hr_document_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type_id UUID NOT NULL REFERENCES hr_document_types(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    department_code VARCHAR(100),
    employment_type VARCHAR(50),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    validity_days_override INTEGER,
    renew_before_days_override INTEGER,
    applies_from DATE,
    applies_until DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_requirements_doc_type ON hr_document_requirements(document_type_id);
CREATE INDEX IF NOT EXISTS idx_hr_document_requirements_role ON hr_document_requirements(role_id);
CREATE INDEX IF NOT EXISTS idx_hr_document_requirements_department ON hr_document_requirements(department_code);

-- Aynı rol/departman için bir doküman tipini sadece bir kez tanımlayabilmek adına unique index
CREATE UNIQUE INDEX IF NOT EXISTS uidx_hr_document_requirements_scope
    ON hr_document_requirements(document_type_id, role_id, COALESCE(department_code, ''), COALESCE(employment_type, ''));

-- ============================================
-- EMPLOYEE DOCUMENTS (Çalışan bazlı durum kayıtları)
-- ============================================
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
    last_status_check_at TIMESTAMP WITHOUT TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_employee_documents_user ON hr_employee_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_documents_status ON hr_employee_documents(status);
CREATE INDEX IF NOT EXISTS idx_hr_employee_documents_valid_until ON hr_employee_documents(valid_until);

-- Aynı çalışan + doküman tipi + requirement kombinasyonunun tek kaydı olması için unique index
CREATE UNIQUE INDEX IF NOT EXISTS uidx_hr_employee_documents_unique
    ON hr_employee_documents(user_id, document_type_id, COALESCE(requirement_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================
-- DOCUMENT VERSIONS (Yüklenen dosya geçmişi)
-- ============================================
CREATE TABLE IF NOT EXISTS hr_document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_document_id UUID NOT NULL REFERENCES hr_employee_documents(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        approval_status IN ('pending', 'approved', 'rejected')
    ),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    approval_note TEXT,
    checksum VARCHAR(128),
    file_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_hr_document_versions_order
    ON hr_document_versions(employee_document_id, version_no);

CREATE INDEX IF NOT EXISTS idx_hr_document_versions_status ON hr_document_versions(approval_status);

-- current_version_id foreign key bağı sonradan eklenir (tablo oluşumu tamamlandıktan sonra)
ALTER TABLE hr_employee_documents
    ADD CONSTRAINT fk_hr_employee_documents_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES hr_document_versions(id)
    ON DELETE SET NULL;

-- ============================================
-- SHARE LINKS (Denetçi veya harici erişim)
-- ============================================
CREATE TABLE IF NOT EXISTS hr_document_share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    employee_document_id UUID NOT NULL REFERENCES hr_employee_documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES hr_document_versions(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    max_views INTEGER,
    views_count INTEGER NOT NULL DEFAULT 0,
    allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    allowed_departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_share_links_doc ON hr_document_share_links(employee_document_id);
CREATE INDEX IF NOT EXISTS idx_hr_document_share_links_expiry ON hr_document_share_links(expires_at);

-- ============================================
-- ACCESS LOGS (Paylaşılan linklerin denetimi)
-- ============================================
CREATE TABLE IF NOT EXISTS hr_document_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_link_id UUID NOT NULL REFERENCES hr_document_share_links(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES hr_document_versions(id) ON DELETE SET NULL,
    viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN ('view', 'download')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_access_logs_link ON hr_document_access_logs(share_link_id);

-- ============================================
-- IMPORT JOBS (CSV + ZIP toplu yükleme süreçleri)
-- ============================================
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
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_import_jobs_status ON hr_document_import_jobs(status);

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
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_import_items_job ON hr_document_import_items(import_job_id);
CREATE INDEX IF NOT EXISTS idx_hr_document_import_items_status ON hr_document_import_items(status);
