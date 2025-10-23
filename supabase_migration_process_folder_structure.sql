-- =============================================================================
-- SUPABASE MIGRATION: Process Folder Structure
-- =============================================================================
-- Date: 2025-10-23
-- Description:
--   Adds folder_name column to processes table for hierarchical folder structure
--   New structure: CUSTOMER/JOB_NUMBER_TITLE/PROCESS_GROUP/PROCESS_FOLDER/
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Add folder_name column to processes table
-- -----------------------------------------------------------------------------

-- Add folder_name column
ALTER TABLE processes
    ADD COLUMN IF NOT EXISTS folder_name VARCHAR(100);

-- Set default folder names based on existing process codes
UPDATE processes
SET folder_name = UPPER(code)
WHERE folder_name IS NULL;

-- Make folder_name required for new processes
ALTER TABLE processes
    ALTER COLUMN folder_name SET NOT NULL;

-- -----------------------------------------------------------------------------
-- Create indexes for folder name uniqueness
-- -----------------------------------------------------------------------------

-- Ensure no duplicate folder names within the same group
CREATE UNIQUE INDEX IF NOT EXISTS idx_processes_group_folder_unique
ON processes(group_id, LOWER(folder_name))
WHERE deleted_at IS NULL AND group_id IS NOT NULL;

-- For processes without a group, ensure folder_name is unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_processes_no_group_folder_unique
ON processes(LOWER(folder_name))
WHERE deleted_at IS NULL AND group_id IS NULL;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Summary:
--   ✅ Added folder_name column to processes table
--   ✅ Populated folder_name for existing processes
--   ✅ Created unique indexes for folder names
--
-- New folder structure example:
--   abc-avm/TLP-2025-0025_test/montaj/baski/
--
-- Old structure (fallback):
--   abc-avm/TLP-2025-0025_test/BASKI_ad6ed89d/
-- =============================================================================
