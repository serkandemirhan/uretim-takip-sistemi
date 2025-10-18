-- ============================================
-- QUOTATIONS VERSION & CURRENCY ENHANCEMENTS
-- ============================================

-- Versiyon yapısını major/minor olarak genişlet
ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS version_major INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS version_minor INTEGER DEFAULT 0;

UPDATE quotations
SET
    version_major = COALESCE(version_major, COALESCE(version, 1)),
    version_minor = COALESCE(version_minor, 0);

-- Varsayılan integer versiyon değerini yeni yapıya göre güncelle
UPDATE quotations
SET version = (version_major * 1000) + version_minor;

-- Kalemlere para birimi ve TRY karşılığı ekle
ALTER TABLE quotation_items
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY',
    ADD COLUMN IF NOT EXISTS unit_cost_try DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost_try DECIMAL(15,2) DEFAULT 0;

UPDATE quotation_items
SET
    currency = COALESCE(currency, 'TRY'),
    unit_cost_try = CASE
        WHEN currency IS NULL OR currency = 'TRY' THEN unit_cost
        ELSE COALESCE(unit_cost_try, unit_cost)
    END,
    total_cost_try = CASE
        WHEN currency IS NULL OR currency = 'TRY' THEN total_cost
        ELSE COALESCE(total_cost_try, total_cost)
    END;

-- total_cost_try değişkenini kullanan trigger ve fonksiyonları güncelle
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

-- Mevcut teklif toplamları TRY karşılığına göre güncelle
UPDATE quotations
SET total_cost = (
    SELECT COALESCE(SUM(total_cost_try), 0)
    FROM quotation_items
    WHERE quotation_id = quotations.id
);
