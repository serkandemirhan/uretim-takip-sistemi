-- Migration 012: Stock Field Settings - Kullanıcı tanımlı alan isimleri ve aktiflik durumu
-- Date: 2025-10-23
-- Description: Kullanıcıların stock tablolarındaki generic alanları (group1-10, category1-10, vb.)
--              kendi istedikleri isimlerle etiketleyip aktif/pasif yapabilmelerini sağlar

-- Ayarlar tablosu oluştur
CREATE TABLE IF NOT EXISTS stock_field_settings (
    field_key VARCHAR(50) PRIMARY KEY,     -- 'group1', 'group2', 'category1', vb.
    custom_label VARCHAR(100) NOT NULL,    -- Kullanıcının verdiği özel isim
    is_active BOOLEAN DEFAULT FALSE,       -- Alan aktif mi?
    display_order INTEGER DEFAULT 0,       -- Gösterim sırası (küçük değer önce)
    field_type VARCHAR(20) NOT NULL,       -- 'group', 'category', 'string', 'properties'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Default değerler ekle (tüm alanlar için)
INSERT INTO stock_field_settings (field_key, custom_label, is_active, display_order, field_type) VALUES
-- Group alanları
('group1', 'Grup 1', false, 1, 'group'),
('group2', 'Grup 2', false, 2, 'group'),
('group3', 'Grup 3', false, 3, 'group'),
('group4', 'Grup 4', false, 4, 'group'),
('group5', 'Grup 5', false, 5, 'group'),
('group6', 'Grup 6', false, 6, 'group'),
('group7', 'Grup 7', false, 7, 'group'),
('group8', 'Grup 8', false, 8, 'group'),
('group9', 'Grup 9', false, 9, 'group'),
('group10', 'Grup 10', false, 10, 'group'),

-- Category alanları
('category1', 'Kategori 1', false, 11, 'category'),
('category2', 'Kategori 2', false, 12, 'category'),
('category3', 'Kategori 3', false, 13, 'category'),
('category4', 'Kategori 4', false, 14, 'category'),
('category5', 'Kategori 5', false, 15, 'category'),
('category6', 'Kategori 6', false, 16, 'category'),
('category7', 'Kategori 7', false, 17, 'category'),
('category8', 'Kategori 8', false, 18, 'category'),
('category9', 'Kategori 9', false, 19, 'category'),
('category10', 'Kategori 10', false, 20, 'category'),

-- String alanları
('string1', 'Özel Alan 1', false, 21, 'string'),
('string2', 'Özel Alan 2', false, 22, 'string'),
('string3', 'Özel Alan 3', false, 23, 'string'),
('string4', 'Özel Alan 4', false, 24, 'string'),
('string5', 'Özel Alan 5', false, 25, 'string'),
('string6', 'Özel Alan 6', false, 26, 'string'),
('string7', 'Özel Alan 7', false, 27, 'string'),
('string8', 'Özel Alan 8', false, 28, 'string'),
('string9', 'Özel Alan 9', false, 29, 'string'),
('string10', 'Özel Alan 10', false, 30, 'string'),

-- Properties alanları
('properties1', 'Özellik 1', false, 31, 'properties'),
('properties2', 'Özellik 2', false, 32, 'properties'),
('properties3', 'Özellik 3', false, 33, 'properties'),
('properties4', 'Özellik 4', false, 34, 'properties'),
('properties5', 'Özellik 5', false, 35, 'properties'),
('properties6', 'Özellik 6', false, 36, 'properties'),
('properties7', 'Özellik 7', false, 37, 'properties'),
('properties8', 'Özellik 8', false, 38, 'properties'),
('properties9', 'Özellik 9', false, 39, 'properties'),
('properties10', 'Özellik 10', false, 40, 'properties')
ON CONFLICT (field_key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_field_settings_active ON stock_field_settings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stock_field_settings_order ON stock_field_settings(display_order);
CREATE INDEX IF NOT EXISTS idx_stock_field_settings_type ON stock_field_settings(field_type);

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_stock_field_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_field_settings_timestamp
    BEFORE UPDATE ON stock_field_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_field_settings_timestamp();

-- Comments
COMMENT ON TABLE stock_field_settings IS 'Stok alanları için kullanıcı tanımlı etiketler ve aktiflik durumu';
COMMENT ON COLUMN stock_field_settings.field_key IS 'Alan anahtarı (group1, category1, vb.)';
COMMENT ON COLUMN stock_field_settings.custom_label IS 'Kullanıcının verdiği özel isim';
COMMENT ON COLUMN stock_field_settings.is_active IS 'Alan aktif mi? (Sadece aktif alanlar UI''da görünür)';
COMMENT ON COLUMN stock_field_settings.display_order IS 'Gösterim sırası (ASC)';
COMMENT ON COLUMN stock_field_settings.field_type IS 'Alan tipi: group, category, string, properties';
