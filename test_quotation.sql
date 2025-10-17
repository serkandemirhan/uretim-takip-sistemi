-- Test: Teklif oluşturma
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- 1. Trigger'ı kontrol et
SELECT proname FROM pg_proc WHERE proname = 'set_quotation_number';

-- 2. Test teklif oluştur
INSERT INTO quotations (name, description, created_by)
VALUES ('Test Teklif', 'Test açıklama', (SELECT id FROM users LIMIT 1))
RETURNING *;

-- 3. Teklif oluştu mu kontrol et
SELECT * FROM quotations ORDER BY created_at DESC LIMIT 1;
