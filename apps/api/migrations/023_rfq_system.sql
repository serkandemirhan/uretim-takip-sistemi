-- Migration: 023_rfq_system.sql
-- Description: Create RFQ (Request for Quotation) system tables

-- 1. RFQs table
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responded', 'closed', 'cancelled')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 2. RFQ Items table
CREATE TABLE IF NOT EXISTS rfq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id),
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit VARCHAR(50),
    required_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Supplier Quotations table (Tedarikçilerden gelen teklifler)
CREATE TABLE IF NOT EXISTS supplier_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    quotation_number VARCHAR(50),
    quotation_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'selected', 'rejected', 'expired')),
    currency VARCHAR(10) DEFAULT 'TRY',
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 4. Supplier Quotation Items table
CREATE TABLE IF NOT EXISTS supplier_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES supplier_quotations(id) ON DELETE CASCADE,
    rfq_item_id UUID NOT NULL REFERENCES rfq_items(id),
    stock_id UUID REFERENCES stocks(id),
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit VARCHAR(50),
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'TRY',
    lead_time_days INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_created_at ON rfqs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_stock_id ON rfq_items(stock_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_rfq_id ON supplier_quotations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_supplier_id ON supplier_quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotation_items_quotation_id ON supplier_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotation_items_rfq_item_id ON supplier_quotation_items(rfq_item_id);

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_rfqs_timestamp
    BEFORE UPDATE ON rfqs
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

CREATE TRIGGER trigger_update_supplier_quotations_timestamp
    BEFORE UPDATE ON supplier_quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

-- Trigger to calculate total_price in supplier_quotation_items
CREATE OR REPLACE FUNCTION calculate_supplier_quotation_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_supplier_quotation_item_total
    BEFORE INSERT OR UPDATE ON supplier_quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_supplier_quotation_item_total();

-- Add comments
COMMENT ON TABLE rfqs IS 'Fiyat teklifi talepleri (Request for Quotation)';
COMMENT ON TABLE rfq_items IS 'RFQ talep kalemleri';
COMMENT ON TABLE supplier_quotations IS 'Tedarikçilerden gelen fiyat teklifleri';
COMMENT ON TABLE supplier_quotation_items IS 'Tedarikçi teklif kalemleri';
COMMENT ON COLUMN supplier_quotation_items.lead_time_days IS 'Teslimat süresi (gün)';
