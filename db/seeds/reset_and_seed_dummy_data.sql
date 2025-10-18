-- =============================================================
-- Reset and populate dummy data for development/demo purposes
-- =============================================================

BEGIN;

-- --- Cleanup existing domain data ---
DELETE FROM job_step_notes;
DELETE FROM job_steps;
DELETE FROM jobs;
DELETE FROM stock_movements;
DELETE FROM purchase_orders;
DELETE FROM quotation_items;
DELETE FROM quotations;
DELETE FROM customer_dealers;
DELETE FROM customers;
DELETE FROM machine_processes;
DELETE FROM machines;
DELETE FROM processes;
DELETE FROM process_groups;
DELETE FROM stocks;

-- Keep only the built-in admin user
DELETE FROM users WHERE username <> 'admin';

-- Reset currency settings
DELETE FROM currency_settings;
INSERT INTO currency_settings (usd_to_try, eur_to_try, updated_at, updated_by)
VALUES (32.50, 35.80, NOW(), (SELECT id FROM users WHERE username = 'admin'));

-- --- Users ---
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES
  ('ayse.temsil', 'ayse.temsil@example.com', crypt('123456', gen_salt('bf')), 'Ayşe Temsilci', 'musteri_temsilcisi'),
  ('zeynep.tasarim', 'zeynep.tasarim@example.com', crypt('123456', gen_salt('bf')), 'Zeynep Tasarım', 'tasarimci'),
  ('mehmet.operator', 'mehmet.operator@example.com', crypt('123456', gen_salt('bf')), 'Mehmet Operatör', 'operator'),
  ('burak.kesim', 'burak.kesim@example.com', crypt('123456', gen_salt('bf')), 'Burak Kesim', 'operator'),
  ('selin.depocu', 'selin.depocu@example.com', crypt('123456', gen_salt('bf')), 'Selin Depo', 'depocu');

-- --- Process groups & processes ---
INSERT INTO process_groups (name, description, order_index)
VALUES
  ('Ön Hazırlık', 'Brief alma ve tasarım hazırlığı', 1),
  ('Üretim', 'Baskı ve kesim süreçleri', 2),
  ('Saha Operasyonları', 'Montaj, sevkiyat ve teslimat', 3);

INSERT INTO processes (name, code, description, is_machine_based, is_production, order_index, group_id)
SELECT 'Brief Toplama', 'BRIEF', 'Müşteriden brief toplama', FALSE, FALSE, 1, id FROM process_groups WHERE name = 'Ön Hazırlık'
UNION ALL
SELECT 'Tasarım Çalışması', 'DESIGN', 'Grafik tasarım ve onay süreci', FALSE, FALSE, 2, id FROM process_groups WHERE name = 'Ön Hazırlık'
UNION ALL
SELECT 'Baskı Hazırlığı', 'PRINT_PREP', 'Baskı öncesi dosya hazırlama', FALSE, FALSE, 3, id FROM process_groups WHERE name = 'Üretim'
UNION ALL
SELECT 'Dijital Baskı', 'PRINT', 'Makinede baskı uygulaması', TRUE, TRUE, 4, id FROM process_groups WHERE name = 'Üretim'
UNION ALL
SELECT 'Kesim', 'CUT', 'Kesim ve formlama', TRUE, TRUE, 5, id FROM process_groups WHERE name = 'Üretim'
UNION ALL
SELECT 'Montaj & Teslim', 'INSTALL', 'Saha montajı ve teslimat', FALSE, TRUE, 6, id FROM process_groups WHERE name = 'Saha Operasyonları';

-- --- Machines ---
INSERT INTO machines (name, code, type, status, location, notes)
VALUES
  ('HP Latex R2000', 'HP-R2000', 'Baskı Makinesi', 'active', 'Matbaa 1', 'Geniş format UV baskı'),
  ('Summa F2630', 'SUMMA-F2630', 'Kesim Makinesi', 'active', 'Atölye', 'Flatbed kesim tezgâhı');

INSERT INTO machine_processes (machine_id, process_id)
SELECT m.id, p.id
FROM machines m
JOIN processes p ON p.code IN ('PRINT', 'CUT')
WHERE (m.code = 'HP-R2000' AND p.code = 'PRINT')
   OR (m.code = 'SUMMA-F2630' AND p.code = 'CUT');

-- --- Customers & dealers ---
INSERT INTO customers (name, code, contact_person, phone, email, city, address, notes)
VALUES
  ('Metro AVM', 'CUST-IST-001', 'Gökçe Aydın', '+90 212 111 2233', 'gokce@metroavm.com', 'İstanbul', 'İstiklal Cad. No:45 Beyoğlu', 'AVM lansman projeleri'),
  ('Penta Enerji', 'CUST-ANK-002', 'Ahmet Sezer', '+90 312 444 5566', 'ahmet@pentaenerji.com', 'Ankara', 'Mustafa Kemal Mah. 2154. Sk. No:12 Çankaya', 'Enerji santrali saha uygulamaları'),
  ('Nova Medya', 'CUST-IZM-003', 'Melis Kara', '+90 232 777 8899', 'melis@novamedya.com', 'İzmir', 'Kazım Dirik Mah. 372/5 Sok. No:18 Bornova', 'Stüdyo branding ve etkinlikler');

INSERT INTO customer_dealers (customer_id, name, city, district, contact_person, contact_phone, email)
VALUES
  ((SELECT id FROM customers WHERE code = 'CUST-IST-001'), 'Metro AVM Anadolu Yakası', 'İstanbul', 'Ataşehir', 'Canan Usta', '+90 532 555 1122', 'canan@metrodealer.com'),
  ((SELECT id FROM customers WHERE code = 'CUST-ANK-002'), 'Penta Enerji Adana Bayi', 'Adana', 'Seyhan', 'Ercan Öztürk', '+90 505 333 7788', 'ercan@penta-bayi.com'),
  ((SELECT id FROM customers WHERE code = 'CUST-IZM-003'), 'Nova Medya Antalya Bayi', 'Antalya', 'Kepez', 'Damla Er', '+90 533 444 9911', 'damla@novabayi.com');

-- --- Stocks ---
INSERT INTO stocks (product_code, product_name, category, unit, current_quantity, min_quantity, unit_price, currency, supplier_name, description)
VALUES
  ('VINYL-101', '3M Premium Vinil', 'Vinil', 'metre', 420, 150, 48.50, 'TRY', '3M Türkiye', 'UV baskıya uygun parlak vinil'),
  ('CANVAS-055', 'HP Artist Canvas', 'Canvas', 'metre', 180, 60, 62.00, 'TRY', 'HP Supplies', 'Galeri kalite canvas malzeme'),
  ('FOAM-010', '10mm Dekota Levha', 'Dekota', 'adet', 320, 120, 95.00, 'TRY', 'DekotaCenter', 'İç mekan sert zemin uygulamaları'),
  ('ACRY-005', '5mm Pleksi Şeffaf', 'Pleksi', 'adet', 150, 50, 210.00, 'TRY', 'PlexiWorld', 'Şeffaf lazer kesim pleksi'),
  ('LAM-001', 'Mat Lamine Film', 'Laminasyon', 'metre', 500, 200, 18.90, 'TRY', 'Oraguard', 'UV korumalı mat lamine film');

-- --- Jobs ---
INSERT INTO jobs (job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
VALUES
  ('JOB-2025-001', (SELECT id FROM customers WHERE code = 'CUST-IST-001'), 'Metro AVM Açılış Branding', 'AVM açılışı için iç/dış mekan branding çalışmaları', 'in_progress', 'high', CURRENT_DATE + INTERVAL '12 days', (SELECT id FROM users WHERE username = 'ayse.temsil'), NOW() - INTERVAL '20 days', NOW()),
  ('JOB-2025-002', (SELECT id FROM customers WHERE code = 'CUST-ANK-002'), 'Penta Enerji Santral Tanıtımı', 'Yüksek gerilim sahası için uyarı ve yönlendirme panoları', 'on_hold', 'normal', CURRENT_DATE + INTERVAL '20 days', (SELECT id FROM users WHERE username = 'ayse.temsil'), NOW() - INTERVAL '15 days', NOW()),
  ('JOB-2025-003', (SELECT id FROM customers WHERE code = 'CUST-IZM-003'), 'Nova Medya Studio Refresh', 'TV stüdyosu için set yenileme görselleri', 'completed', 'high', CURRENT_DATE - INTERVAL '5 days', (SELECT id FROM users WHERE username = 'ayse.temsil'), NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days');

-- --- Job steps ---
-- Job 1 steps
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, started_at, completed_at, production_notes, revision_no)
VALUES
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-001'), (SELECT id FROM processes WHERE code = 'BRIEF'), 1, (SELECT id FROM users WHERE username = 'ayse.temsil'), 'completed', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days', 'Müşteriden tüm mağaza planları alındı.', 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-001'), (SELECT id FROM processes WHERE code = 'DESIGN'), 2, (SELECT id FROM users WHERE username = 'zeynep.tasarim'), 'in_progress', NOW() - INTERVAL '17 days', NULL, 'AVM giriş için LED pano tasarımı revize ediliyor.', 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-001'), (SELECT id FROM processes WHERE code = 'PRINT'), 3, (SELECT id FROM users WHERE username = 'mehmet.operator'), 'pending', NULL, NULL, NULL, 1);

-- Job 2 steps
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, started_at, completed_at, production_notes, block_reason, status_before_block, revision_no)
VALUES
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-002'), (SELECT id FROM processes WHERE code = 'BRIEF'), 1, (SELECT id FROM users WHERE username = 'ayse.temsil'), 'completed', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days', 'Saha keşfi tamamlandı.', NULL, NULL, 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-002'), (SELECT id FROM processes WHERE code = 'DESIGN'), 2, (SELECT id FROM users WHERE username = 'zeynep.tasarim'), 'blocked', NOW() - INTERVAL '11 days', NULL, 'Enerji hatları için güvenlik uyarıları çalışılıyor.', 'Müşteri onayı bekleniyor', 'in_progress', 1);

-- Job 3 steps
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, started_at, completed_at, production_notes, revision_no)
VALUES
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-003'), (SELECT id FROM processes WHERE code = 'BRIEF'), 1, (SELECT id FROM users WHERE username = 'ayse.temsil'), 'completed', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', 'Stüdyo ölçümleri alındı.', 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-003'), (SELECT id FROM processes WHERE code = 'DESIGN'), 2, (SELECT id FROM users WHERE username = 'zeynep.tasarim'), 'completed', NOW() - INTERVAL '24 days', NOW() - INTERVAL '20 days', 'Stüdyo ana görselleri onaylandı.', 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-003'), (SELECT id FROM processes WHERE code = 'PRINT_PREP'), 3, (SELECT id FROM users WHERE username = 'zeynep.tasarim'), 'completed', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days', 'Baskı dosyaları RIP için hazırlandı.', 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-003'), (SELECT id FROM processes WHERE code = 'PRINT'), 4, (SELECT id FROM users WHERE username = 'mehmet.operator'), 'completed', NOW() - INTERVAL '18 days', NOW() - INTERVAL '16 days', 'Gece vardiyasında baskılar tamamlandı.', 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-003'), (SELECT id FROM processes WHERE code = 'CUT'), 5, (SELECT id FROM users WHERE username = 'burak.kesim'), 'completed', NOW() - INTERVAL '16 days', NOW() - INTERVAL '14 days', 'Pleksi panolar CNC’de kesildi.', 1),
  ((SELECT id FROM jobs WHERE job_number = 'JOB-2025-003'), (SELECT id FROM processes WHERE code = 'INSTALL'), 6, (SELECT id FROM users WHERE username = 'mehmet.operator'), 'completed', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days', 'Montaj ekibi stüdyoyu teslim etti.', 1);

-- --- Job step notes ---
INSERT INTO job_step_notes (job_step_id, user_id, note, created_at)
VALUES
  ((SELECT id FROM job_steps WHERE job_id = (SELECT id FROM jobs WHERE job_number = 'JOB-2025-001') AND order_index = 2), (SELECT id FROM users WHERE username = 'zeynep.tasarim'), 'Vitrin görselinde renk revizyonu talep edildi.', NOW() - INTERVAL '2 days'),
  ((SELECT id FROM job_steps WHERE job_id = (SELECT id FROM jobs WHERE job_number = 'JOB-2025-001') AND order_index = 2), (SELECT id FROM users WHERE username = 'ayse.temsil'), 'Müşteri onayı için PDF paylaşıldı.', NOW() - INTERVAL '1 day'),
  ((SELECT id FROM job_steps WHERE job_id = (SELECT id FROM jobs WHERE job_number = 'JOB-2025-002') AND order_index = 2), (SELECT id FROM users WHERE username = 'ayse.temsil'), 'Enerji güvenlik sorumlusu saha onayı bekleniyor.', NOW() - INTERVAL '3 days'),
  ((SELECT id FROM job_steps WHERE job_id = (SELECT id FROM jobs WHERE job_number = 'JOB-2025-003') AND order_index = 4), (SELECT id FROM users WHERE username = 'mehmet.operator'), 'Baskı sırasında ICC profili güncellendi.', NOW() - INTERVAL '17 days'),
  ((SELECT id FROM job_steps WHERE job_id = (SELECT id FROM jobs WHERE job_number = 'JOB-2025-003') AND order_index = 6), (SELECT id FROM users WHERE username = 'burak.kesim'), 'Montaj sonrası küçük düzeltmeler uygulandı.', NOW() - INTERVAL '10 days');

-- --- Stock movements ---
INSERT INTO stock_movements (stock_id, movement_type, quantity, unit_price, currency, purpose, notes, created_by, created_at)
VALUES
  ((SELECT id FROM stocks WHERE product_code = 'VINYL-101'), 'IN', 200, 45.00, 'TRY', 'Tedarik', '3M Türkiye toplu alım', (SELECT id FROM users WHERE username = 'selin.depocu'), NOW() - INTERVAL '15 days'),
  ((SELECT id FROM stocks WHERE product_code = 'LAM-001'), 'IN', 150, 18.50, 'TRY', 'Tedarik', 'Lamine film haftalık alım', (SELECT id FROM users WHERE username = 'selin.depocu'), NOW() - INTERVAL '9 days'),
  ((SELECT id FROM stocks WHERE product_code = 'VINYL-101'), 'OUT', 120, 48.50, 'TRY', 'Üretim', 'Metro AVM projesi baskı kullanımı', (SELECT id FROM users WHERE username = 'mehmet.operator'), NOW() - INTERVAL '5 days'),
  ((SELECT id FROM stocks WHERE product_code = 'FOAM-010'), 'OUT', 40, 95.00, 'TRY', 'Üretim', 'Nova Medya stüdyo dekoru', (SELECT id FROM users WHERE username = 'burak.kesim'), NOW() - INTERVAL '14 days');

-- İşlere bağlı stok hareketlerini güncelle
UPDATE stock_movements
SET job_id = (SELECT id FROM jobs WHERE job_number = 'JOB-2025-001')
WHERE purpose = 'Üretim' AND notes ILIKE '%Metro AVM%';

UPDATE stock_movements
SET job_id = (SELECT id FROM jobs WHERE job_number = 'JOB-2025-003')
WHERE purpose = 'Üretim' AND notes ILIKE '%Nova Medya%';

COMMIT;

-- Çalıştırma notu:
--   psql -h <host> -U <user> -d <database> -f db/seeds/reset_and_seed_dummy_data.sql
