-- ReklamPRO Database Migration Script
-- This script updates the Supabase schema to match the current local database
-- Safe to run multiple times (idempotent)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- MISSING COLUMNS IN ROLES TABLE
-- ==============================================

-- Add missing columns to roles table
DO $$
BEGIN
    -- Remove permissions column if it exists (not in local schema)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'permissions'
    ) THEN
        ALTER TABLE roles DROP COLUMN permissions;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE roles ADD COLUMN updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- ==============================================
-- MISSING COLUMNS IN USER_ROLES TABLE
-- ==============================================

DO $$
BEGIN
    -- Reorder columns to match local schema order
    -- Note: PostgreSQL doesn't support column reordering, so we ensure all columns exist

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_roles' AND column_name = 'assigned_at'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN assigned_at timestamp without time zone DEFAULT now();
    END IF;
END $$;

-- ==============================================
-- MISSING COLUMNS IN USERS TABLE
-- ==============================================

DO $$
BEGIN
    -- Add avatar_file_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'avatar_file_id'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_file_id uuid;
    END IF;

    -- Add avatar_url if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url text;
    END IF;
END $$;

-- ==============================================
-- ADD FOREIGN KEY CONSTRAINTS IF MISSING
-- ==============================================

DO $$
BEGIN
    -- Add users.avatar_file_id foreign key if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_avatar_file_id_fkey'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_avatar_file_id_fkey
        FOREIGN KEY (avatar_file_id) REFERENCES files (id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==============================================
-- VERIFY CRITICAL INDEXES
-- ==============================================

-- Ensure critical indexes exist
DO $$
BEGIN
    -- Stock indexes
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

    -- Customer dealers index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_dealers_customer_id') THEN
        CREATE INDEX idx_customer_dealers_customer_id ON customer_dealers (customer_id);
    END IF;

    -- Job step notes index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_job_step_notes_step_id') THEN
        CREATE INDEX idx_job_step_notes_step_id ON job_step_notes (job_step_id);
    END IF;

    -- Process groups indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_process_groups_name') THEN
        CREATE UNIQUE INDEX idx_process_groups_name ON process_groups (lower(name));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_processes_group_id') THEN
        CREATE INDEX idx_processes_group_id ON processes (group_id);
    END IF;
END $$;

-- ==============================================
-- SUMMARY
-- ==============================================

-- This migration script:
-- 1. Adds missing avatar_file_id and avatar_url columns to users table
-- 2. Ensures updated_at column exists in roles table
-- 3. Removes the 'permissions' jsonb column from roles (not in local schema)
-- 4. Adds all necessary foreign key constraints
-- 5. Creates all required indexes
-- 6. All operations are idempotent and safe to run multiple times

SELECT 'Migration completed successfully!' AS status;