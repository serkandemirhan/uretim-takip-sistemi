ALTER TABLE job_steps
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS due_time TIME;

CREATE INDEX IF NOT EXISTS idx_job_steps_due_date
    ON job_steps(due_date);
