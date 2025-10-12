-- ============================================
-- Migration: Add Multi-Role Support
-- ============================================
-- This migration adds support for users to have multiple roles
-- by creating a roles table and user_roles junction table

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER_ROLES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, role_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(user_id, is_primary) WHERE is_primary = true;

-- ============================================
-- INSERT DEFAULT ROLES
-- ============================================
INSERT INTO roles (code, name, description) VALUES
    ('yonetici', 'Yönetici', 'Tam yetki - sistem yönetimi ve tüm işlemler'),
    ('musteri_temsilcisi', 'Müşteri Temsilcisi', 'Müşteri yönetimi, teklif ve iş oluşturma'),
    ('tasarimci', 'Tasarımcı', 'Tasarım süreçleri ve dosya yönetimi'),
    ('kesifci', 'Keşifçi', 'Keşif ve ölçüm işlemleri'),
    ('operator', 'Operatör', 'Üretim makinesi operasyonları'),
    ('depocu', 'Depocu', 'Malzeme ve stok yönetimi'),
    ('satinalma', 'Satın Alma', 'Tedarik ve satın alma işlemleri')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- MIGRATE EXISTING USER ROLES
-- ============================================
-- Her kullanıcının mevcut role'ünü user_roles tablosuna taşı
INSERT INTO user_roles (user_id, role_id, is_primary)
SELECT
    u.id as user_id,
    r.id as role_id,
    true as is_primary
FROM users u
JOIN roles r ON r.code = u.role
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);

-- ============================================
-- ADD HELPER FUNCTION
-- ============================================
-- Kullanıcının rollerini döndüren fonksiyon
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE(
    role_code VARCHAR,
    role_name VARCHAR,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.code,
        r.name,
        ur.is_primary
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND r.is_active = true
    ORDER BY ur.is_primary DESC, r.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD HELPER FUNCTION: Check if user has role
-- ============================================
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role_code VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
        AND r.code = p_role_code
        AND r.is_active = true
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- NOTES
-- ============================================
-- The old 'role' column in users table is kept for backward compatibility
-- but new code should use user_roles table instead.
--
-- To drop the old column in the future (after full migration):
-- ALTER TABLE users DROP COLUMN role;
