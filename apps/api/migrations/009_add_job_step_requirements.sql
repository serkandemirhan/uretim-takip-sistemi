-- Add requirements field to job_steps table
-- This field will store work instructions/requirements for each job step

ALTER TABLE job_steps
    ADD COLUMN IF NOT EXISTS requirements TEXT;

COMMENT ON COLUMN job_steps.requirements IS 'İş gereksinimlerini ve talimatları içerir - operatörlerin işi nasıl yapması gerektiğini anlatır';
