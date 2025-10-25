-- =====================================================
-- SUPABASE MIGRATION: Stock Reservations System
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This creates the stock reservations system for job material planning

BEGIN;

-- =====================================================
-- 1. STOCK RESERVATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    job_material_id UUID REFERENCES job_materials(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    reserved_quantity DECIMAL(15, 3) NOT NULL CHECK (reserved_quantity > 0),
    used_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (used_quantity >= 0),
    planned_usage_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'partially_used', 'fully_used', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT
);

CREATE INDEX idx_stock_reservations_job_id ON stock_reservations(job_id);
CREATE INDEX idx_stock_reservations_stock_id ON stock_reservations(stock_id);
CREATE INDEX idx_stock_reservations_quotation_id ON stock_reservations(quotation_id);
CREATE INDEX idx_stock_reservations_job_material_id ON stock_reservations(job_material_id);
CREATE INDEX idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX idx_stock_reservations_planned_usage_date ON stock_reservations(planned_usage_date);

COMMENT ON TABLE stock_reservations IS 'Material reservations for jobs with planned usage dates';
COMMENT ON COLUMN stock_reservations.reserved_quantity IS 'Total quantity reserved for this job';
COMMENT ON COLUMN stock_reservations.used_quantity IS 'Quantity already consumed from warehouse';
COMMENT ON COLUMN stock_reservations.planned_usage_date IS 'When project manager plans to use this material';
COMMENT ON COLUMN stock_reservations.status IS 'active: not used yet, partially_used: some used, fully_used: all used, cancelled: reservation cancelled';

-- =====================================================
-- 2. UPDATE STOCK_MOVEMENTS TABLE
-- =====================================================
-- Add link to reservation when warehouse makes a withdrawal for a job
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES stock_reservations(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reservation_id ON stock_movements(reservation_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_job_id ON stock_movements(job_id);

COMMENT ON COLUMN stock_movements.reservation_id IS 'Links withdrawal to job reservation (when material is used for a job)';
COMMENT ON COLUMN stock_movements.job_id IS 'Links movement to a specific job';

-- =====================================================
-- 3. ADD RESERVED_QUANTITY COLUMN TO STOCKS
-- =====================================================
-- Add column if it doesn't exist
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS reserved_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (reserved_quantity >= 0);

-- Update available_quantity calculation if it exists as generated column
-- Note: You may need to drop and recreate this depending on your current schema
-- If available_quantity is a regular column, just update it manually or via triggers

COMMENT ON COLUMN stocks.reserved_quantity IS 'Total quantity reserved for jobs (auto-calculated)';

-- =====================================================
-- 4. FUNCTION TO AUTO-UPDATE RESERVED QUANTITY
-- =====================================================
CREATE OR REPLACE FUNCTION update_stock_reserved_quantity()
RETURNS TRIGGER AS $$
DECLARE
    affected_stock_id UUID;
BEGIN
    -- Get the affected stock_id
    IF TG_OP = 'DELETE' THEN
        affected_stock_id := OLD.stock_id;
    ELSE
        affected_stock_id := NEW.stock_id;
    END IF;

    -- Recalculate total reserved quantity for the affected stock
    UPDATE stocks
    SET reserved_quantity = COALESCE((
        SELECT SUM(reserved_quantity - used_quantity)
        FROM stock_reservations
        WHERE stock_id = affected_stock_id
        AND status IN ('active', 'partially_used')
    ), 0)
    WHERE id = affected_stock_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_stock_reserved_quantity ON stock_reservations;

-- Create trigger to update reserved quantity on reservation changes
CREATE TRIGGER trigger_update_stock_reserved_quantity
AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
FOR EACH ROW
EXECUTE FUNCTION update_stock_reserved_quantity();

-- =====================================================
-- 5. FUNCTION TO AUTO-UPDATE USED QUANTITY IN RESERVATION
-- =====================================================
CREATE OR REPLACE FUNCTION update_reservation_used_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for withdrawals (movement_type = 'out') with a reservation_id
    IF NEW.movement_type = 'out' AND NEW.reservation_id IS NOT NULL THEN
        -- Update the reservation's used_quantity
        UPDATE stock_reservations
        SET
            used_quantity = used_quantity + NEW.quantity,
            status = CASE
                WHEN (used_quantity + NEW.quantity) >= reserved_quantity THEN 'fully_used'
                WHEN (used_quantity + NEW.quantity) > 0 THEN 'partially_used'
                ELSE 'active'
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.reservation_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_reservation_used_quantity ON stock_movements;

-- Create trigger
CREATE TRIGGER trigger_update_reservation_used_quantity
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_reservation_used_quantity();

-- =====================================================
-- 6. UPDATE PURCHASE_REQUESTS TABLE (if needed)
-- =====================================================
-- Add title and description columns if they don't exist
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records to have a title (only if title is null)
-- Note: Skipping auto-population as request_number column may not exist in all schemas
-- UPDATE purchase_requests
-- SET title = 'Satın Alma Talebi'
-- WHERE title IS NULL OR title = '';

COMMENT ON COLUMN purchase_requests.title IS 'Short descriptive title for the purchase request';
COMMENT ON COLUMN purchase_requests.description IS 'Detailed description or notes';

-- =====================================================
-- 7. VIEWS FOR REPORTING
-- =====================================================

-- View: Stock availability summary with physical, reserved, on-order quantities
CREATE OR REPLACE VIEW stock_availability_summary AS
SELECT
    s.id,
    s.product_name as name,
    s.product_code as code,
    s.category,
    s.unit,
    s.current_quantity as physical_stock,
    COALESCE(s.reserved_quantity, 0) as reserved_quantity,
    COALESCE(s.on_order_quantity, 0) as on_order_quantity,
    -- Calculate truly available (may need adjustment based on your schema)
    (s.current_quantity - COALESCE(s.reserved_quantity, 0)) as truly_available,
    s.min_quantity as min_stock_level,
    CASE
        WHEN (s.current_quantity - COALESCE(s.reserved_quantity, 0)) < s.min_quantity THEN 'critical'
        WHEN (s.current_quantity - COALESCE(s.reserved_quantity, 0)) < s.min_quantity * 1.5 THEN 'low'
        ELSE 'ok'
    END as stock_status,
    s.supplier_name,
    s.unit_price,
    s.currency
FROM stocks s
WHERE s.is_active = true;

COMMENT ON VIEW stock_availability_summary IS 'Summary of stock with physical, reserved, on-order, and truly available quantities';

-- View: Upcoming material needs (by date)
CREATE OR REPLACE VIEW upcoming_material_needs AS
SELECT
    sr.planned_usage_date,
    sr.job_id,
    j.job_number,
    j.title as job_title,
    j.status as job_status,
    sr.stock_id,
    s.product_name as stock_name,
    s.product_code as stock_code,
    s.category,
    sr.reserved_quantity,
    sr.used_quantity,
    (sr.reserved_quantity - sr.used_quantity) as remaining_need,
    s.current_quantity as current_physical_stock,
    s.reserved_quantity as total_reserved,
    s.on_order_quantity as total_on_order,
    (s.current_quantity - COALESCE(s.reserved_quantity, 0)) as truly_available,
    s.unit,
    sr.status as reservation_status,
    sr.created_at as reserved_at
FROM stock_reservations sr
JOIN jobs j ON sr.job_id = j.id
JOIN stocks s ON sr.stock_id = s.id
WHERE sr.status IN ('active', 'partially_used')
ORDER BY sr.planned_usage_date, s.product_name;

COMMENT ON VIEW upcoming_material_needs IS 'Shows upcoming material needs by date for planning';

-- View: Job material usage vs plan
CREATE OR REPLACE VIEW job_material_usage_summary AS
SELECT
    j.id as job_id,
    j.job_number,
    j.title as job_title,
    j.status as job_status,
    sr.stock_id,
    s.product_name as stock_name,
    s.product_code as stock_code,
    sr.reserved_quantity as planned_quantity,
    sr.used_quantity as actual_used_quantity,
    (sr.reserved_quantity - sr.used_quantity) as remaining_quantity,
    sr.planned_usage_date,
    sr.status as reservation_status,
    s.unit,
    s.unit_price,
    s.currency,
    (sr.reserved_quantity * COALESCE(s.unit_price, 0)) as planned_cost,
    (sr.used_quantity * COALESCE(s.unit_price, 0)) as actual_cost
FROM stock_reservations sr
JOIN jobs j ON sr.job_id = j.id
JOIN stocks s ON sr.stock_id = s.id
ORDER BY j.job_number, sr.planned_usage_date;

COMMENT ON VIEW job_material_usage_summary IS 'Compares planned vs actual material usage for each job';

-- View: Critical stock alerts
CREATE OR REPLACE VIEW critical_stock_alerts AS
SELECT
    s.id as stock_id,
    s.product_code,
    s.product_name,
    s.category,
    s.current_quantity as physical_stock,
    s.reserved_quantity,
    s.on_order_quantity,
    (s.current_quantity - COALESCE(s.reserved_quantity, 0)) as truly_available,
    s.min_quantity as min_stock_level,
    (s.min_quantity - (s.current_quantity - COALESCE(s.reserved_quantity, 0))) as shortage_quantity,
    s.unit,
    s.supplier_name,
    MIN(sr.planned_usage_date) as earliest_need_date,
    COUNT(DISTINCT sr.job_id) as jobs_affected
FROM stocks s
LEFT JOIN stock_reservations sr ON s.id = sr.stock_id
    AND sr.status IN ('active', 'partially_used')
WHERE s.is_active = true
    AND (s.current_quantity - COALESCE(s.reserved_quantity, 0)) < s.min_quantity
GROUP BY s.id, s.product_code, s.product_name, s.category,
         s.current_quantity, s.reserved_quantity, s.on_order_quantity,
         s.min_quantity, s.unit, s.supplier_name
ORDER BY (s.min_quantity - (s.current_quantity - COALESCE(s.reserved_quantity, 0))) DESC;

COMMENT ON VIEW critical_stock_alerts IS 'Shows stocks below minimum level with affected jobs';

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) - IMPORTANT FOR SUPABASE
-- =====================================================

-- Enable RLS on stock_reservations table
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all reservations
CREATE POLICY "Allow authenticated users to read reservations"
ON stock_reservations
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to create reservations
CREATE POLICY "Allow authenticated users to create reservations"
ON stock_reservations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to update their own or all reservations (depending on role)
CREATE POLICY "Allow authenticated users to update reservations"
ON stock_reservations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to delete/cancel reservations
CREATE POLICY "Allow authenticated users to delete reservations"
ON stock_reservations
FOR DELETE
TO authenticated
USING (true);

-- Note: Adjust these policies based on your security requirements
-- You may want to add role-based checks using auth.jwt() claims

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful:

-- 1. Check if table exists
-- SELECT * FROM stock_reservations LIMIT 1;

-- 2. Check if views exist
-- SELECT * FROM stock_availability_summary LIMIT 5;
-- SELECT * FROM upcoming_material_needs LIMIT 5;

-- 3. Check if triggers exist
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'stock_reservations'::regclass;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- Uncomment and run this if you need to rollback:

-- BEGIN;
-- DROP VIEW IF EXISTS critical_stock_alerts CASCADE;
-- DROP VIEW IF EXISTS job_material_usage_summary CASCADE;
-- DROP VIEW IF EXISTS upcoming_material_needs CASCADE;
-- DROP VIEW IF EXISTS stock_availability_summary CASCADE;
-- DROP TRIGGER IF EXISTS trigger_update_reservation_used_quantity ON stock_movements;
-- DROP TRIGGER IF EXISTS trigger_update_stock_reserved_quantity ON stock_reservations;
-- DROP FUNCTION IF EXISTS update_reservation_used_quantity();
-- DROP FUNCTION IF EXISTS update_stock_reserved_quantity();
-- ALTER TABLE stock_movements DROP COLUMN IF EXISTS reservation_id;
-- ALTER TABLE stock_movements DROP COLUMN IF EXISTS job_id;
-- ALTER TABLE stocks DROP COLUMN IF EXISTS reserved_quantity;
-- DROP TABLE IF EXISTS stock_reservations CASCADE;
-- COMMIT;
