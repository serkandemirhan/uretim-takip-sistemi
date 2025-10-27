-- Migration: 022_suppliers_table.sql
-- Description: Create suppliers table similar to customers structure

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Türkiye',
    tax_number VARCHAR(50),
    tax_office VARCHAR(100),
    payment_terms VARCHAR(100), -- Ödeme vadesi: 30 gün, 60 gün, vs.
    credit_limit NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'TRY',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Create index on supplier name for faster searches
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_suppliers_timestamp
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

-- Add some comments
COMMENT ON TABLE suppliers IS 'Tedarikçi bilgileri';
COMMENT ON COLUMN suppliers.payment_terms IS 'Ödeme vadesi (örn: 30 gün, 60 gün)';
COMMENT ON COLUMN suppliers.credit_limit IS 'Kredi limiti';
