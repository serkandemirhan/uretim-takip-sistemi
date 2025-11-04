-- Migration: Add avatar columns to users table
-- Created: 2025-11-03
-- Description: Add avatar_url and avatar_file_id columns to users table for profile pictures

-- Add avatar_url column (legacy support for URL-based avatars)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Add avatar_file_id column (for S3-based file storage)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_file_id UUID;

-- Add foreign key constraint to files table
ALTER TABLE users
ADD CONSTRAINT users_avatar_file_id_fkey
FOREIGN KEY (avatar_file_id)
REFERENCES files(id)
ON DELETE SET NULL;

-- Add index for avatar_file_id lookups
CREATE INDEX IF NOT EXISTS idx_users_avatar_file_id ON users(avatar_file_id);

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_url IS 'Legacy: URL to user avatar image';
COMMENT ON COLUMN users.avatar_file_id IS 'Reference to file in files table for user avatar';
