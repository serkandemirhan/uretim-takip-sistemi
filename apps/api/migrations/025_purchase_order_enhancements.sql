-- Migration: 025_purchase_order_enhancements.sql
-- Description: Add RFQ relation and status tracking to purchase orders

-- Add new columns to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS rfq_id UUID REFERENCES rfqs(id),
ADD COLUMN IF NOT EXISTS supplier_quotation_id UUID REFERENCES supplier_quotations(id),
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'ordered', 'confirmed', 'in_transit', 'partial_received', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_rfq_id ON purchase_orders(rfq_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_quotation_id ON purchase_orders(supplier_quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_by ON purchase_orders(approved_by);

-- Add comments
COMMENT ON COLUMN purchase_orders.rfq_id IS 'İlgili RFQ (Request for Quotation)';
COMMENT ON COLUMN purchase_orders.supplier_quotation_id IS 'Seçilen tedarikçi teklifi';
COMMENT ON COLUMN purchase_orders.supplier_id IS 'Tedarikçi';
COMMENT ON COLUMN purchase_orders.status IS 'Sipariş durumu';
COMMENT ON COLUMN purchase_orders.approved_by IS 'Siparişi onaylayan kullanıcı';
COMMENT ON COLUMN purchase_orders.approved_at IS 'Onay tarihi';
COMMENT ON COLUMN purchase_orders.order_date IS 'Sipariş tarihi';
COMMENT ON COLUMN purchase_orders.expected_delivery_date IS 'Tahmini teslim tarihi';

-- Create a role for purchase order approval
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles WHERE code = 'satinalma_onaycisi') THEN
        INSERT INTO roles (id, name, code, description)
        VALUES (
            uuid_generate_v4(),
            'Satın Alma Onayıcısı',
            'satinalma_onaycisi',
            'Satın alma siparişlerini onaylama yetkisi olan kullanıcı'
        );
    END IF;
END $$;

-- Grant permissions for the new role
DO $$
DECLARE
    role_id UUID;
BEGIN
    SELECT id INTO role_id FROM roles WHERE name = 'satinalma_onaycisi';

    IF role_id IS NOT NULL THEN
        -- Purchase orders permissions
        INSERT INTO role_permissions (role_id, resource, action)
        SELECT role_id, 'purchase_orders', 'approve'
        WHERE NOT EXISTS (
            SELECT 1 FROM role_permissions
            WHERE role_id = role_id AND resource = 'purchase_orders' AND action = 'approve'
        );

        INSERT INTO role_permissions (role_id, resource, action)
        SELECT role_id, 'purchase_orders', 'view'
        WHERE NOT EXISTS (
            SELECT 1 FROM role_permissions
            WHERE role_id = role_id AND resource = 'purchase_orders' AND action = 'view'
        );
    END IF;
END $$;

-- Create a view for purchase order tracking
CREATE OR REPLACE VIEW v_purchase_order_tracking AS
SELECT
    po.id,
    po.order_code,
    po.status,
    (po.quantity * po.unit_price) as total_amount,
    po.currency,
    po.order_date,
    po.expected_delivery_date,
    po.approved_at,
    po.created_at,
    COALESCE(s.name, po.supplier_name) as supplier_name,
    s.contact_person as supplier_contact,
    rfq.rfq_number,
    rfq.title as rfq_title,
    u_created.full_name as created_by_name,
    u_approved.full_name as approved_by_name,
    COUNT(DISTINCT gr.id) as receipt_count,
    po.quantity as total_ordered
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN rfqs rfq ON po.rfq_id = rfq.id
LEFT JOIN users u_created ON po.created_by = u_created.id
LEFT JOIN users u_approved ON po.approved_by = u_approved.id
LEFT JOIN goods_receipts gr ON po.id = gr.purchase_order_id
GROUP BY po.id, s.name, s.contact_person, rfq.rfq_number, rfq.title, u_created.full_name, u_approved.full_name;

COMMENT ON VIEW v_purchase_order_tracking IS 'Satın alma siparişi takip görünümü';
