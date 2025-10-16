-- ============================================
-- Migration: Add job step pause columns and notes table
-- ============================================

ALTER TABLE job_steps
    ADD COLUMN IF NOT EXISTS block_reason TEXT,
    ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS status_before_block VARCHAR(50);

CREATE TABLE IF NOT EXISTS job_step_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_step_id UUID NOT NULL REFERENCES job_steps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_step_notes_step_id ON job_step_notes(job_step_id);
