-- Migration: Stock Management System (Reservations, Purchase Requests, RFQ)
-- Description: Add comprehensive stock management with reservations, purchase requests, and quotations
-- Author: Claude Code
-- Date: 2025-10-25

-- =====================================================
-- 1. STOCK RESERVATIONS TABLE
-- =====================================================
-- Tracks material reservations for jobs
-- Each quotation line item gets a reservation with planned usage date
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    quotation_line_item_id UUID REFERENCES quotation_line_items(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    reserved_quantity DECIMAL(10, 2) NOT NULL CHECK (reserved_quantity > 0),
    used_quantity DECIMAL(10, 2) DEFAULT 0 CHECK (used_quantity >= 0),
    planned_usage_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'partially_used', 'fully_used', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT
);

CREATE INDEX idx_stock_reservations_job_id ON stock_reservations(job_id);
CREATE INDEX idx_stock_reservations_stock_id ON stock_reservations(stock_id);
CREATE INDEX idx_stock_reservations_quotation_id ON stock_reservations(quotation_id);
CREATE INDEX idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX idx_stock_reservations_planned_usage_date ON stock_reservations(planned_usage_date);

COMMENT ON TABLE stock_reservations IS 'Material reservations for jobs with planned usage dates';
COMMENT ON COLUMN stock_reservations.reserved_quantity IS 'Total quantity reserved for this job';
COMMENT ON COLUMN stock_reservations.used_quantity IS 'Quantity already consumed from warehouse';
COMMENT ON COLUMN stock_reservations.planned_usage_date IS 'When project manager plans to use this material';
COMMENT ON COLUMN stock_reservations.status IS 'active: not used yet, partially_used: some used, fully_used: all used, cancelled: reservation cancelled';

-- =====================================================
-- 2. PURCHASE REQUESTS TABLE
-- =====================================================
-- Purchase requests created by purchasing manager
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_quotations', 'quotations_received', 'approved', 'ordered', 'partially_delivered', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    required_by_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX idx_purchase_requests_created_by ON purchase_requests(created_by);
CREATE INDEX idx_purchase_requests_required_by_date ON purchase_requests(required_by_date);

COMMENT ON TABLE purchase_requests IS 'Purchase requests for materials needed based on reservations';
COMMENT ON COLUMN purchase_requests.request_number IS 'Auto-generated unique request number (e.g., PR-2024-001)';
COMMENT ON COLUMN purchase_requests.required_by_date IS 'Latest date materials are needed (based on earliest reservation)';

-- =====================================================
-- 3. PURCHASE REQUEST ITEMS TABLE
-- =====================================================
-- Line items for each purchase request
CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    requested_quantity DECIMAL(10, 2) NOT NULL CHECK (requested_quantity > 0),
    approved_quantity DECIMAL(10, 2) CHECK (approved_quantity >= 0),
    received_quantity DECIMAL(10, 2) DEFAULT 0 CHECK (received_quantity >= 0),
    unit_price DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_request_items_purchase_request_id ON purchase_request_items(purchase_request_id);
CREATE INDEX idx_purchase_request_items_product_id ON purchase_request_items(product_id);

COMMENT ON TABLE purchase_request_items IS 'Individual materials requested in each purchase request';
COMMENT ON COLUMN purchase_request_items.requested_quantity IS 'Quantity purchasing manager wants to order';
COMMENT ON COLUMN purchase_request_items.approved_quantity IS 'Quantity approved by admin (can be different)';
COMMENT ON COLUMN purchase_request_items.received_quantity IS 'Quantity actually received from supplier';

-- =====================================================
-- 4. RFQ QUOTATIONS TABLE
-- =====================================================
-- Supplier quotations for purchase requests
CREATE TABLE IF NOT EXISTS rfq_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact VARCHAR(255),
    supplier_email VARCHAR(255),
    supplier_phone VARCHAR(50),
    total_amount DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'TRY',
    delivery_days INTEGER,
    expected_delivery_date DATE,
    payment_terms TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'rejected')),
    is_selected BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_at TIMESTAMP,
    selected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rfq_quotations_purchase_request_id ON rfq_quotations(purchase_request_id);
CREATE INDEX idx_rfq_quotations_status ON rfq_quotations(status);
CREATE INDEX idx_rfq_quotations_is_selected ON rfq_quotations(is_selected);

COMMENT ON TABLE rfq_quotations IS 'Supplier quotations received for purchase requests';
COMMENT ON COLUMN rfq_quotations.delivery_days IS 'Number of days for delivery after order';
COMMENT ON COLUMN rfq_quotations.expected_delivery_date IS 'Calculated or provided delivery date';
COMMENT ON COLUMN rfq_quotations.is_selected IS 'TRUE if this quotation was selected for ordering';

-- =====================================================
-- 5. RFQ QUOTATION ITEMS TABLE
-- =====================================================
-- Line items for each supplier quotation
CREATE TABLE IF NOT EXISTS rfq_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_quotation_id UUID NOT NULL REFERENCES rfq_quotations(id) ON DELETE CASCADE,
    purchase_request_item_id UUID NOT NULL REFERENCES purchase_request_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    quoted_quantity DECIMAL(10, 2) NOT NULL CHECK (quoted_quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(12, 2) GENERATED ALWAYS AS (quoted_quantity * unit_price) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rfq_quotation_items_rfq_quotation_id ON rfq_quotation_items(rfq_quotation_id);
CREATE INDEX idx_rfq_quotation_items_purchase_request_item_id ON rfq_quotation_items(purchase_request_item_id);
CREATE INDEX idx_rfq_quotation_items_product_id ON rfq_quotation_items(product_id);

COMMENT ON TABLE rfq_quotation_items IS 'Individual line items in supplier quotations';
COMMENT ON COLUMN rfq_quotation_items.quoted_quantity IS 'Quantity supplier can provide';
COMMENT ON COLUMN rfq_quotation_items.line_total IS 'Auto-calculated: quantity × unit_price';

-- =====================================================
-- 6. ADD COMPUTED COLUMNS TO STOCKS TABLE
-- =====================================================
-- Add columns to track reserved and on-order quantities
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS reserved_quantity DECIMAL(10, 2) DEFAULT 0 CHECK (reserved_quantity >= 0);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS on_order_quantity DECIMAL(10, 2) DEFAULT 0 CHECK (on_order_quantity >= 0);

COMMENT ON COLUMN stocks.reserved_quantity IS 'Total quantity reserved for jobs (auto-calculated)';
COMMENT ON COLUMN stocks.on_order_quantity IS 'Total quantity in approved purchase orders (auto-calculated)';

-- =====================================================
-- 7. FUNCTIONS TO AUTO-UPDATE STOCK QUANTITIES
-- =====================================================

-- Function to recalculate reserved_quantity for a stock
CREATE OR REPLACE FUNCTION update_stock_reserved_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate total reserved quantity for the affected stock
    UPDATE stocks
    SET reserved_quantity = COALESCE((
        SELECT SUM(reserved_quantity - used_quantity)
        FROM stock_reservations
        WHERE stock_id = COALESCE(NEW.stock_id, OLD.stock_id)
        AND status IN ('active', 'partially_used')
    ), 0)
    WHERE id = COALESCE(NEW.stock_id, OLD.stock_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reserved quantity on reservation changes
DROP TRIGGER IF EXISTS trigger_update_reserved_quantity ON stock_reservations;
CREATE TRIGGER trigger_update_reserved_quantity
AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
FOR EACH ROW
EXECUTE FUNCTION update_stock_reserved_quantity();

-- Function to recalculate on_order_quantity for a stock
CREATE OR REPLACE FUNCTION update_stock_on_order_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate total on-order quantity for the affected stock
    UPDATE stocks
    SET on_order_quantity = COALESCE((
        SELECT SUM(pri.ordered_quantity - pri.received_quantity)
        FROM purchase_request_items pri
        JOIN purchase_requests pr ON pri.purchase_request_id = pr.id
        WHERE pri.product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND pr.status IN ('approved', 'ordered', 'partially_delivered')
        AND pri.ordered_quantity > pri.received_quantity
    ), 0)
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update on-order quantity on purchase request item changes
DROP TRIGGER IF EXISTS trigger_update_on_order_quantity ON purchase_request_items;
CREATE TRIGGER trigger_update_on_order_quantity
AFTER INSERT OR UPDATE OR DELETE ON purchase_request_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_order_quantity();

-- =====================================================
-- 8. FUNCTION TO GENERATE PURCHASE REQUEST NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_purchase_request_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str VARCHAR(4);
    next_num INTEGER;
    new_number VARCHAR(50);
BEGIN
    -- Get current year
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- Get next number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM purchase_requests
    WHERE request_number LIKE 'PR-' || year_str || '-%';

    -- Generate new number: PR-YYYY-NNN
    new_number := 'PR-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');

    NEW.request_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate purchase request number
DROP TRIGGER IF EXISTS trigger_generate_pr_number ON purchase_requests;
CREATE TRIGGER trigger_generate_pr_number
BEFORE INSERT ON purchase_requests
FOR EACH ROW
WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
EXECUTE FUNCTION generate_purchase_request_number();

-- =====================================================
-- 9. UPDATE stock_transactions TO LINK WITH RESERVATIONS
-- =====================================================
-- Add optional link to reservation when warehouse makes a withdrawal
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES stock_reservations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_stock_transactions_reservation_id ON stock_transactions(reservation_id);

COMMENT ON COLUMN stock_transactions.reservation_id IS 'Links withdrawal to job reservation (when material is used for a job)';

-- =====================================================
-- 10. VIEWS FOR REPORTING
-- =====================================================

-- View: Stock availability summary
CREATE OR REPLACE VIEW stock_availability_summary AS
SELECT
    s.id,
    s.name,
    s.code,
    s.category,
    s.unit,
    s.available_quantity as physical_stock,
    s.reserved_quantity,
    s.on_order_quantity,
    (s.available_quantity - s.reserved_quantity) as truly_available,
    s.min_stock_level,
    CASE
        WHEN (s.available_quantity - s.reserved_quantity) < s.min_stock_level THEN 'critical'
        WHEN (s.available_quantity - s.reserved_quantity) < s.min_stock_level * 1.5 THEN 'low'
        ELSE 'ok'
    END as stock_status
FROM stocks s;

COMMENT ON VIEW stock_availability_summary IS 'Summary of stock with physical, reserved, on-order, and truly available quantities';

-- View: Upcoming material needs (by date)
CREATE OR REPLACE VIEW upcoming_material_needs AS
SELECT
    sr.planned_usage_date,
    sr.job_id,
    j.job_number,
    j.title as job_title,
    sr.stock_id,
    s.name as stock_name,
    s.code as stock_code,
    sr.reserved_quantity,
    sr.used_quantity,
    (sr.reserved_quantity - sr.used_quantity) as remaining_need,
    s.available_quantity as current_physical_stock,
    s.reserved_quantity as total_reserved,
    s.on_order_quantity as total_on_order,
    (s.available_quantity - s.reserved_quantity) as truly_available
FROM stock_reservations sr
JOIN jobs j ON sr.job_id = j.id
JOIN stocks s ON sr.stock_id = s.id
WHERE sr.status IN ('active', 'partially_used')
ORDER BY sr.planned_usage_date, s.name;

COMMENT ON VIEW upcoming_material_needs IS 'Shows upcoming material needs by date for planning';

-- View: Purchase request summary
CREATE OR REPLACE VIEW purchase_request_summary AS
SELECT
    pr.id,
    pr.request_number,
    pr.title,
    pr.status,
    pr.priority,
    pr.required_by_date,
    COUNT(DISTINCT pri.id) as item_count,
    COUNT(DISTINCT rfq.id) as quotation_count,
    SUM(pri.requested_quantity) as total_items_requested,
    pr.created_at,
    u.full_name as created_by_name
FROM purchase_requests pr
LEFT JOIN purchase_request_items pri ON pr.id = pri.purchase_request_id
LEFT JOIN rfq_quotations rfq ON pr.id = rfq.purchase_request_id
LEFT JOIN users u ON pr.created_by = u.id
GROUP BY pr.id, pr.request_number, pr.title, pr.status, pr.priority, pr.required_by_date, pr.created_at, u.full_name;

COMMENT ON VIEW purchase_request_summary IS 'Summary of purchase requests with item and quotation counts';

-- =====================================================
-- 11. SAMPLE DATA (Optional - for testing)
-- =====================================================
-- You can uncomment these for testing purposes

-- INSERT INTO purchase_requests (title, description, status, priority, required_by_date, created_by)
-- VALUES
-- ('Acil Malzeme Talebi - Proje A', 'Proje A için eksik malzemeler', 'draft', 'high', CURRENT_DATE + INTERVAL '7 days', (SELECT id FROM users WHERE email = 'admin@reklampro.com' LIMIT 1));

COMMIT;
