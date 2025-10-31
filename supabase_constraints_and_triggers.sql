-- ============================================
-- SUPABASE FOREIGN KEYS, TRIGGERS & FUNCTIONS
-- ============================================
-- Run this AFTER running supabase_schema_from_local.sql
-- Date: 2025-10-29
-- ============================================

BEGIN;

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Customer dealers
ALTER TABLE customer_dealers DROP CONSTRAINT IF EXISTS customer_dealers_customer_id_fkey;
ALTER TABLE customer_dealers ADD CONSTRAINT customer_dealers_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Job step notes
ALTER TABLE job_step_notes DROP CONSTRAINT IF EXISTS job_step_notes_job_step_id_fkey;
ALTER TABLE job_step_notes ADD CONSTRAINT job_step_notes_job_step_id_fkey
    FOREIGN KEY (job_step_id) REFERENCES job_steps(id) ON DELETE CASCADE;

ALTER TABLE job_step_notes DROP CONSTRAINT IF EXISTS job_step_notes_user_id_fkey;
ALTER TABLE job_step_notes ADD CONSTRAINT job_step_notes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Quotations
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_customer_id_fkey;
ALTER TABLE quotations ADD CONSTRAINT quotations_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_job_id_fkey;
ALTER TABLE quotations ADD CONSTRAINT quotations_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_created_by_fkey;
ALTER TABLE quotations ADD CONSTRAINT quotations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id);

-- Quotation items
ALTER TABLE quotation_items DROP CONSTRAINT IF EXISTS quotation_items_quotation_id_fkey;
ALTER TABLE quotation_items ADD CONSTRAINT quotation_items_quotation_id_fkey
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;

ALTER TABLE quotation_items DROP CONSTRAINT IF EXISTS quotation_items_stock_id_fkey;
ALTER TABLE quotation_items ADD CONSTRAINT quotation_items_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE SET NULL;

-- Stock movements
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_stock_id_fkey;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE RESTRICT;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_job_id_fkey;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reservation_id_fkey;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reservation_id_fkey
    FOREIGN KEY (reservation_id) REFERENCES stock_reservations(id) ON DELETE SET NULL;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Stock reservations
ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS stock_reservations_job_id_fkey;
ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS stock_reservations_quotation_id_fkey;
ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_quotation_id_fkey
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL;

ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS stock_reservations_stock_id_fkey;
ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE RESTRICT;

ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS stock_reservations_created_by_fkey;
ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS stock_reservations_cancelled_by_fkey;
ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_cancelled_by_fkey
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

-- Suppliers
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_created_by_fkey;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id);

-- RFQs
ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS rfqs_created_by_fkey;
ALTER TABLE rfqs ADD CONSTRAINT rfqs_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE rfq_items DROP CONSTRAINT IF EXISTS rfq_items_rfq_id_fkey;
ALTER TABLE rfq_items ADD CONSTRAINT rfq_items_rfq_id_fkey
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE;

ALTER TABLE rfq_items DROP CONSTRAINT IF EXISTS rfq_items_stock_id_fkey;
ALTER TABLE rfq_items ADD CONSTRAINT rfq_items_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

-- Supplier quotations
ALTER TABLE supplier_quotations DROP CONSTRAINT IF EXISTS supplier_quotations_rfq_id_fkey;
ALTER TABLE supplier_quotations ADD CONSTRAINT supplier_quotations_rfq_id_fkey
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE;

ALTER TABLE supplier_quotations DROP CONSTRAINT IF EXISTS supplier_quotations_supplier_id_fkey;
ALTER TABLE supplier_quotations ADD CONSTRAINT supplier_quotations_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

ALTER TABLE supplier_quotations DROP CONSTRAINT IF EXISTS supplier_quotations_created_by_fkey;
ALTER TABLE supplier_quotations ADD CONSTRAINT supplier_quotations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE supplier_quotation_items DROP CONSTRAINT IF EXISTS supplier_quotation_items_quotation_id_fkey;
ALTER TABLE supplier_quotation_items ADD CONSTRAINT supplier_quotation_items_quotation_id_fkey
    FOREIGN KEY (quotation_id) REFERENCES supplier_quotations(id) ON DELETE CASCADE;

ALTER TABLE supplier_quotation_items DROP CONSTRAINT IF EXISTS supplier_quotation_items_rfq_item_id_fkey;
ALTER TABLE supplier_quotation_items ADD CONSTRAINT supplier_quotation_items_rfq_item_id_fkey
    FOREIGN KEY (rfq_item_id) REFERENCES rfq_items(id);

ALTER TABLE supplier_quotation_items DROP CONSTRAINT IF EXISTS supplier_quotation_items_stock_id_fkey;
ALTER TABLE supplier_quotation_items ADD CONSTRAINT supplier_quotation_items_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

-- Purchase orders
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_stock_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_rfq_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_rfq_id_fkey
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id);

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_quotation_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_quotation_id_fkey
    FOREIGN KEY (supplier_quotation_id) REFERENCES supplier_quotations(id);

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_approved_by_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES users(id);

-- Purchase order items
ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_purchase_order_id_fkey;
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_stock_id_fkey;
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

-- Goods receipts
ALTER TABLE goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_purchase_order_id_fkey;
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_purchase_order_id_fkey
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);

ALTER TABLE goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_received_by_fkey;
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_received_by_fkey
    FOREIGN KEY (received_by) REFERENCES users(id);

ALTER TABLE goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_quality_check_by_fkey;
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_quality_check_by_fkey
    FOREIGN KEY (quality_check_by) REFERENCES users(id);

-- Goods receipt lines
ALTER TABLE goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_goods_receipt_id_fkey;
ALTER TABLE goods_receipt_lines ADD CONSTRAINT goods_receipt_lines_goods_receipt_id_fkey
    FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE;

ALTER TABLE goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_purchase_order_item_id_fkey;
ALTER TABLE goods_receipt_lines ADD CONSTRAINT goods_receipt_lines_purchase_order_item_id_fkey
    FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id);

ALTER TABLE goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_stock_id_fkey;
ALTER TABLE goods_receipt_lines ADD CONSTRAINT goods_receipt_lines_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

-- Purchase requests
ALTER TABLE purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_requested_by_fkey;
ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES users(id);

ALTER TABLE purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_approved_by_fkey;
ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES users(id);

ALTER TABLE purchase_request_items DROP CONSTRAINT IF EXISTS purchase_request_items_purchase_request_id_fkey;
ALTER TABLE purchase_request_items ADD CONSTRAINT purchase_request_items_purchase_request_id_fkey
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;

ALTER TABLE purchase_request_items DROP CONSTRAINT IF EXISTS purchase_request_items_stock_id_fkey;
ALTER TABLE purchase_request_items ADD CONSTRAINT purchase_request_items_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

-- Purchase request purchase orders
ALTER TABLE purchase_request_purchase_orders DROP CONSTRAINT IF EXISTS purchase_request_purchase_orders_purchase_request_id_fkey;
ALTER TABLE purchase_request_purchase_orders ADD CONSTRAINT purchase_request_purchase_orders_purchase_request_id_fkey
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;

ALTER TABLE purchase_request_purchase_orders DROP CONSTRAINT IF EXISTS purchase_request_purchase_orders_purchase_order_id_fkey;
ALTER TABLE purchase_request_purchase_orders ADD CONSTRAINT purchase_request_purchase_orders_purchase_order_id_fkey
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;

-- Job materials
ALTER TABLE job_materials DROP CONSTRAINT IF EXISTS job_materials_job_id_fkey;
ALTER TABLE job_materials ADD CONSTRAINT job_materials_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE job_materials DROP CONSTRAINT IF EXISTS job_materials_stock_id_fkey;
ALTER TABLE job_materials ADD CONSTRAINT job_materials_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

-- RFQ quotations (old structure)
ALTER TABLE rfq_quotations DROP CONSTRAINT IF EXISTS rfq_quotations_purchase_request_id_fkey;
ALTER TABLE rfq_quotations ADD CONSTRAINT rfq_quotations_purchase_request_id_fkey
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;

ALTER TABLE rfq_quotations DROP CONSTRAINT IF EXISTS rfq_quotations_selected_by_fkey;
ALTER TABLE rfq_quotations ADD CONSTRAINT rfq_quotations_selected_by_fkey
    FOREIGN KEY (selected_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE rfq_quotation_items DROP CONSTRAINT IF EXISTS rfq_quotation_items_rfq_quotation_id_fkey;
ALTER TABLE rfq_quotation_items ADD CONSTRAINT rfq_quotation_items_rfq_quotation_id_fkey
    FOREIGN KEY (rfq_quotation_id) REFERENCES rfq_quotations(id) ON DELETE CASCADE;

ALTER TABLE rfq_quotation_items DROP CONSTRAINT IF EXISTS rfq_quotation_items_purchase_request_item_id_fkey;
ALTER TABLE rfq_quotation_items ADD CONSTRAINT rfq_quotation_items_purchase_request_item_id_fkey
    FOREIGN KEY (purchase_request_item_id) REFERENCES purchase_request_items(id);

ALTER TABLE rfq_quotation_items DROP CONSTRAINT IF EXISTS rfq_quotation_items_stock_id_fkey;
ALTER TABLE rfq_quotation_items ADD CONSTRAINT rfq_quotation_items_stock_id_fkey
    FOREIGN KEY (stock_id) REFERENCES stocks(id);

-- HR Documents
ALTER TABLE hr_document_requirements DROP CONSTRAINT IF EXISTS hr_document_requirements_document_type_id_fkey;
ALTER TABLE hr_document_requirements ADD CONSTRAINT hr_document_requirements_document_type_id_fkey
    FOREIGN KEY (document_type_id) REFERENCES hr_document_types(id) ON DELETE CASCADE;

ALTER TABLE hr_document_requirements DROP CONSTRAINT IF EXISTS hr_document_requirements_role_id_fkey;
ALTER TABLE hr_document_requirements ADD CONSTRAINT hr_document_requirements_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

ALTER TABLE hr_employee_documents DROP CONSTRAINT IF EXISTS hr_employee_documents_user_id_fkey;
ALTER TABLE hr_employee_documents ADD CONSTRAINT hr_employee_documents_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE hr_employee_documents DROP CONSTRAINT IF EXISTS hr_employee_documents_document_type_id_fkey;
ALTER TABLE hr_employee_documents ADD CONSTRAINT hr_employee_documents_document_type_id_fkey
    FOREIGN KEY (document_type_id) REFERENCES hr_document_types(id) ON DELETE CASCADE;

ALTER TABLE hr_employee_documents DROP CONSTRAINT IF EXISTS hr_employee_documents_requirement_id_fkey;
ALTER TABLE hr_employee_documents ADD CONSTRAINT hr_employee_documents_requirement_id_fkey
    FOREIGN KEY (requirement_id) REFERENCES hr_document_requirements(id) ON DELETE SET NULL;

ALTER TABLE hr_document_versions DROP CONSTRAINT IF EXISTS hr_document_versions_employee_document_id_fkey;
ALTER TABLE hr_document_versions ADD CONSTRAINT hr_document_versions_employee_document_id_fkey
    FOREIGN KEY (employee_document_id) REFERENCES hr_employee_documents(id) ON DELETE CASCADE;

ALTER TABLE hr_document_versions DROP CONSTRAINT IF EXISTS hr_document_versions_file_id_fkey;
ALTER TABLE hr_document_versions ADD CONSTRAINT hr_document_versions_file_id_fkey
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;

ALTER TABLE hr_employee_documents DROP CONSTRAINT IF EXISTS hr_employee_documents_current_version_id_fkey;
ALTER TABLE hr_employee_documents ADD CONSTRAINT hr_employee_documents_current_version_id_fkey
    FOREIGN KEY (current_version_id) REFERENCES hr_document_versions(id) ON DELETE SET NULL;

ALTER TABLE hr_document_share_links DROP CONSTRAINT IF EXISTS hr_document_share_links_employee_document_id_fkey;
ALTER TABLE hr_document_share_links ADD CONSTRAINT hr_document_share_links_employee_document_id_fkey
    FOREIGN KEY (employee_document_id) REFERENCES hr_employee_documents(id) ON DELETE CASCADE;

ALTER TABLE hr_document_share_links DROP CONSTRAINT IF EXISTS hr_document_share_links_document_version_id_fkey;
ALTER TABLE hr_document_share_links ADD CONSTRAINT hr_document_share_links_document_version_id_fkey
    FOREIGN KEY (document_version_id) REFERENCES hr_document_versions(id) ON DELETE SET NULL;

ALTER TABLE hr_document_access_logs DROP CONSTRAINT IF EXISTS hr_document_access_logs_share_link_id_fkey;
ALTER TABLE hr_document_access_logs ADD CONSTRAINT hr_document_access_logs_share_link_id_fkey
    FOREIGN KEY (share_link_id) REFERENCES hr_document_share_links(id) ON DELETE CASCADE;

ALTER TABLE hr_document_import_items DROP CONSTRAINT IF EXISTS hr_document_import_items_import_job_id_fkey;
ALTER TABLE hr_document_import_items ADD CONSTRAINT hr_document_import_items_import_job_id_fkey
    FOREIGN KEY (import_job_id) REFERENCES hr_document_import_jobs(id) ON DELETE CASCADE;

-- Roles and permissions
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE role_process_permissions DROP CONSTRAINT IF EXISTS role_process_permissions_role_id_fkey;
ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE role_process_permissions DROP CONSTRAINT IF EXISTS role_process_permissions_process_id_fkey;
ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_process_id_fkey
    FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE;

-- Process groups
ALTER TABLE processes DROP CONSTRAINT IF EXISTS processes_group_id_fkey;
ALTER TABLE processes ADD CONSTRAINT processes_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES process_groups(id) ON DELETE SET NULL;

-- Jobs
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_dealer_id_fkey;
ALTER TABLE jobs ADD CONSTRAINT jobs_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES customer_dealers(id) ON DELETE SET NULL;

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Quotation number generator
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    year_part TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    next_num := nextval('quotation_number_seq');
    RETURN 'TKL-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
        NEW.quotation_number := generate_quotation_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_quotation_number ON quotations;
CREATE TRIGGER trigger_set_quotation_number
    BEFORE INSERT ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION set_quotation_number();

-- Quotation item total calculation
CREATE OR REPLACE FUNCTION calculate_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost = NEW.quantity * NEW.unit_cost;
    NEW.unit_cost_try = COALESCE(NEW.unit_cost_try, NEW.unit_cost);
    NEW.total_cost_try = COALESCE(NEW.total_cost_try, NEW.total_cost);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_item_total ON quotation_items;
CREATE TRIGGER trigger_calculate_item_total
    BEFORE INSERT OR UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_item_total();

-- Quotation total update
CREATE OR REPLACE FUNCTION update_quotation_total()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID;
BEGIN
    target_id := COALESCE(NEW.quotation_id, OLD.quotation_id);

    UPDATE quotations
    SET total_cost = (
        SELECT COALESCE(SUM(total_cost_try), 0)
        FROM quotation_items
        WHERE quotation_id = target_id
    )
    WHERE id = target_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quotation_total_insert ON quotation_items;
DROP TRIGGER IF EXISTS trigger_update_quotation_total_update ON quotation_items;
DROP TRIGGER IF EXISTS trigger_update_quotation_total_delete ON quotation_items;

CREATE TRIGGER trigger_update_quotation_total_insert
    AFTER INSERT ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_total();

CREATE TRIGGER trigger_update_quotation_total_update
    AFTER UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_total();

CREATE TRIGGER trigger_update_quotation_total_delete
    AFTER DELETE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_total();

-- Stock reserved quantity update
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_reserved_quantity ON stock_reservations;
CREATE TRIGGER trigger_update_stock_reserved_quantity
    AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_reserved_quantity();

-- Reservation used quantity update
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reservation_used_quantity ON stock_movements;
CREATE TRIGGER trigger_update_reservation_used_quantity
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_used_quantity();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS trigger_update_suppliers_timestamp ON suppliers;
CREATE TRIGGER trigger_update_suppliers_timestamp
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_units_timestamp ON units;
CREATE TRIGGER trigger_update_units_timestamp
    BEFORE UPDATE ON units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quotations_timestamp ON quotations;
CREATE TRIGGER trigger_update_quotations_timestamp
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_stocks_timestamp ON stocks;
CREATE TRIGGER trigger_update_stocks_timestamp
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- SCRIPT COMPLETE
-- ============================================
-- All foreign keys, triggers, and functions have been added
-- ============================================