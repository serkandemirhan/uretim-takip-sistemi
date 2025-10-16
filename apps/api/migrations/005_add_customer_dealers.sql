-- ============================================
-- Migration: Extend customers and add customer dealers
-- ============================================

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS city VARCHAR(255),
    ADD COLUMN IF NOT EXISTS gsm VARCHAR(50),
    ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(50),
    ADD COLUMN IF NOT EXISTS short_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

CREATE TABLE IF NOT EXISTS customer_dealers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    district VARCHAR(255),
    city VARCHAR(255),
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    tax_office VARCHAR(255),
    tax_number VARCHAR(50),
    phone1 VARCHAR(50),
    phone2 VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    postal_code VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_dealers_customer_id ON customer_dealers(customer_id);
