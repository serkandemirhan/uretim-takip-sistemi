-- Add production tracking fields to job_steps
-- has_production: Boolean flag to indicate if this step tracks production
-- required_quantity: The required production quantity for this step

ALTER TABLE job_steps
ADD COLUMN IF NOT EXISTS has_production BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS required_quantity NUMERIC(10, 2);

-- Create index for filtering steps with production tracking
CREATE INDEX IF NOT EXISTS idx_job_steps_has_production ON job_steps(has_production) WHERE has_production = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN job_steps.has_production IS 'Indicates whether this step requires production quantity tracking';
COMMENT ON COLUMN job_steps.required_quantity IS 'Required production quantity for this step (e.g., 100 pieces)';
