-- Add avatar columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_file_id UUID REFERENCES files(id),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

