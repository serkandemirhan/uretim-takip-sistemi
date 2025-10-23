-- ============================================
-- Migration: Add folder_name to processes table
-- ============================================

-- Add folder_name column to processes table
-- This will be used to determine the folder structure in file storage
ALTER TABLE processes
    ADD COLUMN IF NOT EXISTS folder_name VARCHAR(100);

-- Set default folder names based on existing process codes
UPDATE processes
SET folder_name = UPPER(code)
WHERE folder_name IS NULL;

-- Make folder_name required for new processes
ALTER TABLE processes
    ALTER COLUMN folder_name SET NOT NULL;

-- Create unique index to ensure no duplicate folder names within the same group
CREATE UNIQUE INDEX IF NOT EXISTS idx_processes_group_folder_unique
ON processes(group_id, LOWER(folder_name))
WHERE deleted_at IS NULL AND group_id IS NOT NULL;

-- For processes without a group, ensure folder_name is unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_processes_no_group_folder_unique
ON processes(LOWER(folder_name))
WHERE deleted_at IS NULL AND group_id IS NULL;
