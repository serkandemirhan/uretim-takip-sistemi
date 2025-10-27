-- Migration: 026_goods_receipt_po_relation.sql
-- Description: Add purchase order relation to goods receipts and improve tracking
-- Note: goods_receipts table already has purchase_order_id and total_quantity from previous migrations

-- Ensure purchase_order_id column exists (already exists, this is just a safety check)
-- ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id);
-- ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS total_quantity NUMERIC(15, 3);

-- Update comments
COMMENT ON COLUMN goods_receipts.purchase_order_id IS 'İlgili satın alma siparişi';
COMMENT ON COLUMN goods_receipts.total_quantity IS 'Toplam teslim alınan miktar';

-- Create trigger to update purchase order status when goods are received
CREATE OR REPLACE FUNCTION update_purchase_order_status_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
    po_id UUID;
    po_quantity NUMERIC;
    total_received NUMERIC;
BEGIN
    -- Only proceed if receipt is approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        po_id := NEW.purchase_order_id;

        IF po_id IS NOT NULL THEN
            -- Get the ordered quantity
            SELECT quantity INTO po_quantity
            FROM purchase_orders
            WHERE id = po_id;

            -- Calculate total received for this PO
            SELECT COALESCE(SUM(total_quantity), 0)
            INTO total_received
            FROM goods_receipts
            WHERE purchase_order_id = po_id
            AND status = 'approved';

            -- Update purchase order status
            IF total_received >= po_quantity THEN
                -- Fully received
                UPDATE purchase_orders
                SET status = 'completed'
                WHERE id = po_id AND status NOT IN ('completed', 'cancelled');
            ELSIF total_received > 0 THEN
                -- Partially received
                UPDATE purchase_orders
                SET status = 'partial_received'
                WHERE id = po_id AND status NOT IN ('completed', 'cancelled');
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_status_on_receipt ON goods_receipts;
CREATE TRIGGER trigger_update_po_status_on_receipt
    AFTER INSERT OR UPDATE ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_status_on_receipt();

-- Create a simplified view for goods receipt tracking
CREATE OR REPLACE VIEW v_goods_receipt_tracking AS
SELECT
    gr.id as receipt_id,
    gr.receipt_number,
    gr.received_date,
    gr.total_quantity,
    gr.status as receipt_status,
    gr.notes as receipt_notes,
    po.id as purchase_order_id,
    po.order_code as po_number,
    po.status as po_status,
    po.quantity as ordered_quantity,
    COALESCE(s.name, po.supplier_name) as supplier_name,
    st.product_code,
    st.product_name,
    st.unit,
    u.full_name as received_by_name
FROM goods_receipts gr
LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN stocks st ON po.stock_id = st.id
LEFT JOIN users u ON gr.received_by = u.id;

COMMENT ON VIEW v_goods_receipt_tracking IS 'Mal kabul takip görünümü - sipariş ve teslimat karşılaştırması';
