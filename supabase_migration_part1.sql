-- =====================================================
-- SUPABASE MIGRATION PART 1: Tables and Columns
-- =====================================================
-- Run this FIRST, then run part 2

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

CREATE INDEX IF NOT EXISTS idx_stock_reservations_job_id ON stock_reservations(job_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_stock_id ON stock_reservations(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_quotation_id ON stock_reservations(quotation_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_job_material_id ON stock_reservations(job_material_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_planned_usage_date ON stock_reservations(planned_usage_date);

COMMENT ON TABLE stock_reservations IS 'Material reservations for jobs with planned usage dates';
COMMENT ON COLUMN stock_reservations.reserved_quantity IS 'Total quantity reserved for this job';
COMMENT ON COLUMN stock_reservations.used_quantity IS 'Quantity already consumed from warehouse';
COMMENT ON COLUMN stock_reservations.planned_usage_date IS 'When project manager plans to use this material';
COMMENT ON COLUMN stock_reservations.status IS 'active: not used yet, partially_used: some used, fully_used: all used, cancelled: reservation cancelled';

-- =====================================================
-- 2. UPDATE STOCK_MOVEMENTS TABLE
-- =====================================================
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES stock_reservations(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reservation_id ON stock_movements(reservation_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_job_id ON stock_movements(job_id);

COMMENT ON COLUMN stock_movements.reservation_id IS 'Links withdrawal to job reservation (when material is used for a job)';
COMMENT ON COLUMN stock_movements.job_id IS 'Links movement to a specific job';

-- =====================================================
-- 3. ADD COLUMNS TO STOCKS TABLE
-- =====================================================
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS reserved_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (reserved_quantity >= 0);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS on_order_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (on_order_quantity >= 0);

COMMENT ON COLUMN stocks.reserved_quantity IS 'Total quantity reserved for jobs (auto-calculated)';
COMMENT ON COLUMN stocks.on_order_quantity IS 'Total quantity in approved purchase orders (auto-calculated)';

-- =====================================================
-- 4. UPDATE PURCHASE_REQUESTS TABLE
-- =====================================================
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN purchase_requests.title IS 'Short descriptive title for the purchase request';
COMMENT ON COLUMN purchase_requests.description IS 'Detailed description or notes';

-- =====================================================
-- 5. ENABLE RLS ON STOCK_RESERVATIONS
-- =====================================================
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stocks'
AND column_name IN ('reserved_quantity', 'on_order_quantity');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stock_reservations';
