-- ============================================
-- UNITS (Ölçü Birimleri)
-- ============================================

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_units_active ON units(is_active);
CREATE INDEX idx_units_name ON units(name);

CREATE OR REPLACE FUNCTION update_units_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_units_timestamp
    BEFORE UPDATE ON units
    FOR EACH ROW
    EXECUTE FUNCTION update_units_timestamp();

-- Varsayılan ölçü birimleri
INSERT INTO units (code, name, description)
VALUES
    ('ADET', 'Adet', 'Adet bazlı sayım birimi'),
    ('PAKET', 'Paket', 'Paket bazlı sayım birimi'),
    ('KUTU', 'Kutu', 'Kutu bazlı sayım birimi'),
    ('KG', 'Kilogram', 'Ağırlık birimi'),
    ('M', 'Metre', 'Uzunluk birimi'),
    ('M2', 'Metrekare', 'Alan birimi'),
    ('CM', 'Santimetre', 'Uzunluk birimi'),
    ('L', 'Litre', 'Hacim birimi')
ON CONFLICT (code) DO NOTHING;
