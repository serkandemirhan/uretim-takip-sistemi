-- ============================================
-- Migration: Add process groups support
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

ALTER TABLE processes
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES process_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processes_group_id ON processes(group_id);
