-- =============================================================
-- Supabase Migration: Procurement System & Stock Enhancements
-- Mirrors apps/api/migrations/009_procurement_system.sql so that
-- the hosted database stays in sync with the application code.
-- The statements are written to be idempotent so they can be
-- executed safely multiple times.
-- =============================================================

-- Ensure required extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 1. PURCHASE REQUESTS
-- =============================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    request_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'partially_completed',
        'completed'
    )),

    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    requested_date TIMESTAMP DEFAULT NOW(),
    required_by_date DATE,

    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    notes TEXT,
    rejection_reason TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_quotation ON purchase_requests(quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_job ON purchase_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requested_by ON purchase_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at DESC);

-- =============================================================
-- 2. PURCHASE REQUEST ITEMS
-- =============================================================
CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    product_id UUID REFERENCES stocks(id) ON DELETE SET NULL,

    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    category VARCHAR(100),

    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50) DEFAULT 'adet',

    estimated_unit_price DECIMAL(15,2),
    estimated_total_price DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'TRY',

    current_stock_quantity DECIMAL(15,3) DEFAULT 0,

    suggested_supplier VARCHAR(255),

    ordered_quantity DECIMAL(15,3) DEFAULT 0,
    received_quantity DECIMAL(15,3) DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_request ON purchase_request_items(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_product ON purchase_request_items(product_id);

-- =============================================================
-- 3. PURCHASE ORDER ITEMS (multi-line PO support)
-- =============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    purchase_request_item_id UUID REFERENCES purchase_request_items(id) ON DELETE SET NULL,
    product_id UUID REFERENCES stocks(id) ON DELETE SET NULL,

    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),

    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50) DEFAULT 'adet',
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TRY',

    received_quantity DECIMAL(15,3) DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_request_item ON purchase_order_items(purchase_request_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);

-- =============================================================
-- 4. PURCHASE REQUEST ↔ PURCHASE ORDER junction
-- =============================================================
CREATE TABLE IF NOT EXISTS purchase_request_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(purchase_request_id, purchase_order_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_po_request ON purchase_request_purchase_orders(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_po_order ON purchase_request_purchase_orders(purchase_order_id);

-- =============================================================
-- 5. GOODS RECEIPTS
-- =============================================================
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,

    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_inspection' CHECK (status IN (
        'pending_inspection',
        'approved',
        'partially_approved',
        'rejected'
    )),

    received_date TIMESTAMP DEFAULT NOW(),
    received_by UUID REFERENCES users(id),

    quality_check_by UUID REFERENCES users(id),
    quality_check_date TIMESTAMP,
    quality_status VARCHAR(50),

    notes TEXT,
    rejection_reason TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON goods_receipts(status);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_received_by ON goods_receipts(received_by);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_received_date ON goods_receipts(received_date DESC);

-- =============================================================
-- 6. GOODS RECEIPT LINES
-- =============================================================
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,

    ordered_quantity DECIMAL(15,3) NOT NULL,
    received_quantity DECIMAL(15,3) NOT NULL,
    accepted_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'adet',

    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'partial')),

    notes TEXT,
    rejection_reason TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_receipt ON goods_receipt_lines(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_po_item ON goods_receipt_lines(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_product ON goods_receipt_lines(product_id);

-- =============================================================
-- 7. JOB MATERIALS (job ↔ stock usage)
-- =============================================================
CREATE TABLE IF NOT EXISTS job_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,

    required_quantity DECIMAL(15,3) NOT NULL,
    allocated_quantity DECIMAL(15,3) DEFAULT 0,
    consumed_quantity DECIMAL(15,3) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'adet',

    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'consumed', 'returned')),

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(job_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_product ON job_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_status ON job_materials(status);

-- =============================================================
-- 8. Existing table enhancements
-- =============================================================
ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_job_id ON quotations(job_id);

ALTER TABLE stocks
    ADD COLUMN IF NOT EXISTS properties JSONB,
    ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(100);

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- =============================================================
-- 9. Sequences & helper generators
-- =============================================================
CREATE SEQUENCE IF NOT EXISTS purchase_request_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS goods_receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_purchase_request_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    year_part TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    next_num := nextval('purchase_request_number_seq');
    RETURN 'PR-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_goods_receipt_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    year_part TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    next_num := nextval('goods_receipt_number_seq');
    RETURN 'GR-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 10. Trigger helpers & business logic
-- =============================================================
CREATE OR REPLACE FUNCTION update_purchase_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_purchase_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := generate_purchase_request_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_purchase_request_number ON purchase_requests;
CREATE TRIGGER trigger_set_purchase_request_number
    BEFORE INSERT ON purchase_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_purchase_request_number();

DROP TRIGGER IF EXISTS trigger_update_purchase_request_timestamp ON purchase_requests;
CREATE TRIGGER trigger_update_purchase_request_timestamp
    BEFORE UPDATE ON purchase_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_request_timestamp();

CREATE OR REPLACE FUNCTION calculate_pr_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.estimated_total_price = NEW.quantity * COALESCE(NEW.estimated_unit_price, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_pr_item_total ON purchase_request_items;
CREATE TRIGGER trigger_calculate_pr_item_total
    BEFORE INSERT OR UPDATE ON purchase_request_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_pr_item_total();

CREATE OR REPLACE FUNCTION set_goods_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := generate_goods_receipt_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_goods_receipt_number ON goods_receipts;
CREATE TRIGGER trigger_set_goods_receipt_number
    BEFORE INSERT ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION set_goods_receipt_number();

DROP TRIGGER IF EXISTS trigger_update_goods_receipt_timestamp ON goods_receipts;
CREATE TRIGGER trigger_update_goods_receipt_timestamp
    BEFORE UPDATE ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_request_timestamp();

CREATE OR REPLACE FUNCTION calculate_po_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_po_item_total ON purchase_order_items;
CREATE TRIGGER trigger_calculate_po_item_total
    BEFORE INSERT OR UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_po_item_total();

CREATE OR REPLACE FUNCTION update_stock_on_goods_receipt_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
        INSERT INTO stock_movements (
            stock_id,
            movement_type,
            quantity,
            unit_price,
            currency,
            purchase_order_id,
            notes,
            created_by,
            document_no
        )
        SELECT
            grl.product_id,
            'IN',
            grl.accepted_quantity,
            poi.unit_price,
            poi.currency,
            gr.purchase_order_id,
            'Mal kabul: ' || gr.receipt_number,
            gr.received_by,
            gr.receipt_number
        FROM goods_receipt_lines grl
        JOIN goods_receipts gr ON gr.id = grl.goods_receipt_id
        LEFT JOIN purchase_order_items poi ON poi.id = grl.purchase_order_item_id
        WHERE grl.goods_receipt_id = NEW.id
          AND grl.status = 'accepted'
          AND grl.accepted_quantity > 0;

        UPDATE stocks s
        SET current_quantity = current_quantity + grl.accepted_quantity
        FROM goods_receipt_lines grl
        WHERE grl.goods_receipt_id = NEW.id
          AND grl.product_id = s.id
          AND grl.status = 'accepted';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_goods_receipt_approval ON goods_receipts;
CREATE TRIGGER trigger_update_stock_on_goods_receipt_approval
    AFTER UPDATE ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_goods_receipt_approval();

-- =============================================================
-- 11. Helper views for dashboards
-- =============================================================
CREATE OR REPLACE VIEW purchase_request_status_view AS
SELECT
    pr.id,
    pr.request_number,
    pr.status,
    COUNT(pri.id) AS total_items,
    SUM(pri.quantity) AS total_quantity,
    SUM(pri.ordered_quantity) AS ordered_quantity,
    SUM(pri.received_quantity) AS received_quantity,
    CASE
        WHEN SUM(pri.quantity) = 0 THEN 0
        ELSE ROUND((SUM(pri.received_quantity) / SUM(pri.quantity) * 100)::numeric, 2)
    END AS completion_percentage
FROM purchase_requests pr
LEFT JOIN purchase_request_items pri ON pri.purchase_request_id = pr.id
GROUP BY pr.id, pr.request_number, pr.status;

CREATE OR REPLACE VIEW stock_status_view AS
SELECT
    s.id,
    s.product_code,
    s.product_name,
    s.category,
    s.current_quantity,
    s.min_quantity,
    s.unit,
    COALESCE(SUM(CASE WHEN po.status = 'PENDING' THEN poi.quantity - poi.received_quantity ELSE 0 END), 0) AS incoming_quantity,
    CASE
        WHEN s.current_quantity <= s.min_quantity THEN 'critical'
        WHEN s.current_quantity <= s.min_quantity * 1.5 THEN 'low'
        ELSE 'ok'
    END AS stock_status
FROM stocks s
LEFT JOIN purchase_order_items poi ON poi.product_id = s.id
LEFT JOIN purchase_orders po ON po.id = poi.purchase_order_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.product_code, s.product_name, s.category, s.current_quantity, s.min_quantity, s.unit;
