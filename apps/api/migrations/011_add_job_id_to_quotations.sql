-- ============================================
-- ADD JOB RELATION TO QUOTATIONS
-- ============================================

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_job_id ON quotations(job_id);
CREATE INDEX IF NOT EXISTS idx_quotations_job_status ON quotations(job_id, status);
