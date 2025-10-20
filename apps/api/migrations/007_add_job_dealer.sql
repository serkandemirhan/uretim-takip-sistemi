-- Migration: add dealer reference to jobs

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS dealer_id UUID REFERENCES customer_dealers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_dealer_id
ON jobs(dealer_id);
