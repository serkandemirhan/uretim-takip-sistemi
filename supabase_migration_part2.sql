-- =====================================================
-- SUPABASE MIGRATION PART 2: Functions, Triggers, Views, Policies
-- =====================================================
-- Run this AFTER part 1 is successful

BEGIN;

-- =====================================================
-- 1. FUNCTION TO AUTO-UPDATE RESERVED QUANTITY
-- =====================================================
CREATE OR REPLACE FUNCTION update_stock_reserved_quantity()
RETURNS TRIGGER AS $$
DECLARE
    affected_stock_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_stock_id := OLD.stock_id;
    ELSE
        affected_stock_id := NEW.stock_id;
    END IF;

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

DROP TRIGGER IF EXISTS trigger_update_stock_reserved_quantity ON stock_reservations;

CREATE TRIGGER trigger_update_stock_reserved_quantity
AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
FOR EACH ROW
EXECUTE FUNCTION update_stock_reserved_quantity();

-- =====================================================
-- 2. FUNCTION TO AUTO-UPDATE USED QUANTITY IN RESERVATION
-- =====================================================
CREATE OR REPLACE FUNCTION update_reservation_used_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'out' AND NEW.reservation_id IS NOT NULL THEN
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

DROP TRIGGER IF EXISTS trigger_update_reservation_used_quantity ON stock_movements;

CREATE TRIGGER trigger_update_reservation_used_quantity
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_reservation_used_quantity();

-- =====================================================
-- 3. VIEWS FOR REPORTING
-- =====================================================

-- View: Stock availability summary
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

-- View: Upcoming material needs
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
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Policy: Allow authenticated users to read all reservations
DROP POLICY IF EXISTS "Allow authenticated users to read reservations" ON stock_reservations;
CREATE POLICY "Allow authenticated users to read reservations"
ON stock_reservations
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to create reservations
DROP POLICY IF EXISTS "Allow authenticated users to create reservations" ON stock_reservations;
CREATE POLICY "Allow authenticated users to create reservations"
ON stock_reservations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to update reservations
DROP POLICY IF EXISTS "Allow authenticated users to update reservations" ON stock_reservations;
CREATE POLICY "Allow authenticated users to update reservations"
ON stock_reservations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to delete/cancel reservations
DROP POLICY IF EXISTS "Allow authenticated users to delete reservations" ON stock_reservations;
CREATE POLICY "Allow authenticated users to delete reservations"
ON stock_reservations
FOR DELETE
TO authenticated
USING (true);

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check if everything is created

SELECT 'Tables' as object_type, count(*) as count
FROM information_schema.tables
WHERE table_name = 'stock_reservations'
UNION ALL
SELECT 'Views', count(*)
FROM information_schema.views
WHERE table_name IN ('stock_availability_summary', 'upcoming_material_needs', 'job_material_usage_summary', 'critical_stock_alerts')
UNION ALL
SELECT 'Functions', count(*)
FROM pg_proc
WHERE proname IN ('update_stock_reserved_quantity', 'update_reservation_used_quantity')
UNION ALL
SELECT 'Triggers', count(*)
FROM pg_trigger
WHERE tgname IN ('trigger_update_stock_reserved_quantity', 'trigger_update_reservation_used_quantity');
