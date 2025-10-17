-- ============================================
-- QUOTATIONS (Teklifler/Malzeme Listeleri)
-- ============================================

-- Teklif Ana Tablosu
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'approved', 'rejected', 'archived')),
    total_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TRY',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_created_by ON quotations(created_by);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC);

-- Teklif Kalemleri Tablosu
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    stock_id UUID,

    -- Stok bilgileri (snapshot - stok silinse bile kayıt korunsun)
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),

    -- Miktar ve maliyet
    quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,

    -- Notlar
    notes TEXT,

    -- Sıralama
    order_index INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_stock ON quotation_items(stock_id);
CREATE INDEX idx_quotation_items_order ON quotation_items(quotation_id, order_index);

-- Teklif numarası otomatik üretimi için sequence
CREATE SEQUENCE quotation_number_seq START 1;

-- Teklif numarası üretme fonksiyonu
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

-- Trigger: Teklif oluşturulduğunda otomatik numara ata
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
        NEW.quotation_number := generate_quotation_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quotation_number
    BEFORE INSERT ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION set_quotation_number();

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_quotation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quotation_timestamp
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_timestamp();

CREATE TRIGGER trigger_update_quotation_item_timestamp
    BEFORE UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_timestamp();

-- Trigger: Teklif toplam maliyetini otomatik güncelle
CREATE OR REPLACE FUNCTION update_quotation_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quotations
    SET total_cost = (
        SELECT COALESCE(SUM(total_cost), 0)
        FROM quotation_items
        WHERE quotation_id = NEW.quotation_id
    )
    WHERE id = NEW.quotation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Trigger: Kalem toplam maliyetini otomatik hesapla
CREATE OR REPLACE FUNCTION calculate_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost = NEW.quantity * NEW.unit_cost;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_item_total
    BEFORE INSERT OR UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_item_total();

-- İlk test verisi (opsiyonel)
-- INSERT INTO quotations (name, description, created_by)
-- VALUES ('Örnek Teklif', 'Test teklifi', (SELECT id FROM users WHERE role = 'yonetici' LIMIT 1));
