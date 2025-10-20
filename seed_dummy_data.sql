-- ReklamPRO Dummy Data Script
-- Bu script test için gerçekçi veriler ekler
-- UYARI: Bu sadece development ortamında çalıştırılmalıdır!

-- Önce mevcut test verilerini temizle (isteğe bağlı)
-- TRUNCATE TABLE audit_logs, job_step_notes, job_steps, jobs, customers, users, processes CASCADE;

-- ============================================
-- 1. KULLANICILAR (Farklı Roller)
-- ============================================

-- Şifre: 123456 (hash'li)
-- Admin
INSERT INTO users (id, username, password_hash, full_name, email, role, is_active)
VALUES
('11111111-1111-1111-1111-111111111111', 'admin', 'scrypt:32768:8:1$EfKjJz4h5TAi9gPC$0f3e5d8c9f3c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b', 'Ahmet Yılmaz', 'admin@reklampro.com', 'yonetici', true),
('22222222-2222-2222-2222-222222222222', 'operator1', 'scrypt:32768:8:1$EfKjJz4h5TAi9gPC$0f3e5d8c9f3c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b', 'Mehmet Demir', 'mehmet@reklampro.com', 'operator', true),
('33333333-3333-3333-3333-333333333333', 'operator2', 'scrypt:32768:8:1$EfKjJz4h5TAi9gPC$0f3e5d8c9f3c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b', 'Ayşe Kaya', 'ayse@reklampro.com', 'operator', true),
('44444444-4444-4444-4444-444444444444', 'tasarim1', 'scrypt:32768:8:1$EfKjJz4h5TAi9gPC$0f3e5d8c9f3c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b', 'Fatma Şahin', 'fatma@reklampro.com', 'tasarimci', true),
('55555555-5555-5555-5555-555555555555', 'satinalma1', 'scrypt:32768:8:1$EfKjJz4h5TAi9gPC$0f3e5d8c9f3c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b', 'Ali Yıldız', 'ali@reklampro.com', 'satinalma', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. MÜŞTERİLER
-- ============================================

INSERT INTO customers (id, name, code, contact_person, phone, email, city, tax_office, tax_number, is_active)
VALUES
('c1111111-1111-1111-1111-111111111111', 'ABC AVM', 'ABC001', 'Zeynep Arslan', '0212 555 1234', 'info@abcavm.com', 'İstanbul', 'Kadıköy', '1234567890', true),
('c2222222-2222-2222-2222-222222222222', 'XYZ Market Zinciri', 'XYZ002', 'Can Öztürk', '0216 555 5678', 'iletisim@xyzmarket.com', 'İstanbul', 'Ataşehir', '9876543210', true),
('c3333333-3333-3333-3333-333333333333', 'Güneş Restoran', 'GNS003', 'Deniz Acar', '0312 555 9012', 'info@gunesrestoran.com', 'Ankara', 'Çankaya', '5555555555', true),
('c4444444-4444-4444-4444-444444444444', 'Mavi Otel', 'MVO004', 'Selin Kara', '0232 555 3456', 'rezervasyon@maviotel.com', 'İzmir', 'Konak', '7777777777', true),
('c5555555-5555-5555-5555-555555555555', 'Teknoloji A.Ş.', 'TEK005', 'Burak Çelik', '0216 555 7890', 'info@teknolojilab.com', 'İstanbul', 'Kartal', '3333333333', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. SÜREÇLER (Process Groups & Processes)
-- ============================================

INSERT INTO process_groups (id, name, description, color, order_index)
VALUES
('g1111111-1111-1111-1111-111111111111', 'Ön Hazırlık', 'Ölçüm ve tasarım süreçleri', '#3B82F6', 1),
('g2222222-2222-2222-2222-222222222222', 'Üretim', 'Kesim, baskı ve üretim süreçleri', '#10B981', 2),
('g3333333-3333-3333-3333-333333333333', 'Son İşlemler', 'Montaj ve teslim süreçleri', '#F59E0B', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO processes (id, code, name, description, is_machine_based, is_production, order_index, group_id)
VALUES
('p1111111-1111-1111-1111-111111111111', 'OLCU', 'Ölçüm', 'Sahada ölçüm alma', false, false, 1, 'g1111111-1111-1111-1111-111111111111'),
('p2222222-2222-2222-2222-222222222222', 'TASARIM', 'Tasarım', 'Grafik tasarım hazırlama', false, false, 2, 'g1111111-1111-1111-1111-111111111111'),
('p3333333-3333-3333-3333-333333333333', 'KESIM', 'Kesim', 'Malzeme kesme işlemi', true, true, 3, 'g2222222-2222-2222-2222-222222222222'),
('p4444444-4444-4444-4444-444444444444', 'BASKI', 'Baskı', 'Dijital baskı işlemi', true, true, 4, 'g2222222-2222-2222-2222-222222222222'),
('p5555555-5555-5555-5555-555555555555', 'KAPLAMA', 'Kaplama', 'Laminasyon ve kaplama', true, true, 5, 'g2222222-2222-2222-2222-222222222222'),
('p6666666-6666-6666-6666-666666666666', 'MONTAJ', 'Montaj', 'Sahada montaj işlemi', false, true, 6, 'g3333333-3333-3333-3333-333333333333'),
('p7777777-7777-7777-7777-777777777777', 'PAKETLEME', 'Paketleme', 'Ürün paketleme', false, true, 7, 'g3333333-3333-3333-3333-333333333333'),
('p8888888-8888-8888-8888-888888888888', 'TESLIMAT', 'Teslimat', 'Müşteriye teslimat', false, false, 8, 'g3333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. MAKİNELER
-- ============================================

INSERT INTO machines (id, code, name, type, status, capacity_per_hour)
VALUES
('m1111111-1111-1111-1111-111111111111', 'CNC001', 'CNC Kesim Makinesi', 'Kesim', 'available', 10.0),
('m2222222-2222-2222-2222-222222222222', 'PRINT001', 'HP Latex Baskı Makinesi', 'Baskı', 'available', 15.0),
('m3333333-3333-3333-3333-333333333333', 'LAM001', 'Laminasyon Makinesi', 'Kaplama', 'available', 20.0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. İŞLER (JOBS) - Farklı Senaryolar
-- ============================================

-- İŞ 1: Tamamlanmış iş (geçmişte)
INSERT INTO jobs (id, job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
VALUES
('j1111111-1111-1111-1111-111111111111', '2024-001', 'c1111111-1111-1111-1111-111111111111',
 'ABC AVM Cephe Tabelası', 'Ana giriş cephe tabelası - 5x2 metre',
 'completed', 'high', '2024-01-15', '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days')
ON CONFLICT (id) DO NOTHING;

-- İŞ 2: Devam eden iş (çok aşamalı)
INSERT INTO jobs (id, job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
VALUES
('j2222222-2222-2222-2222-222222222222', '2024-002', 'c2222222-2222-2222-2222-222222222222',
 'XYZ Market Şube Tabelaları', '10 farklı şube için tabela seti',
 'in_progress', 'normal', CURRENT_DATE + INTERVAL '7 days', '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- İŞ 3: Acil iş (yaklaşan deadline)
INSERT INTO jobs (id, job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
VALUES
('j3333333-3333-3333-3333-333333333333', '2024-003', 'c3333333-3333-3333-3333-333333333333',
 'Güneş Restoran Menü Boardları', 'Duvar menü panoları (3 adet)',
 'in_progress', 'urgent', CURRENT_DATE + INTERVAL '1 day', '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- İŞ 4: Gecikmiş iş
INSERT INTO jobs (id, job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
VALUES
('j4444444-4444-4444-4444-444444444444', '2024-004', 'c4444444-4444-4444-4444-444444444444',
 'Mavi Otel Yönlendirme Tabelaları', 'İç mekan yönlendirme sistemi',
 'in_progress', 'high', CURRENT_DATE - INTERVAL '2 days', '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- İŞ 5: Yeni başlayan iş
INSERT INTO jobs (id, job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
VALUES
('j5555555-5555-5555-5555-555555555555', '2024-005', 'c5555555-5555-5555-5555-555555555555',
 'Teknoloji A.Ş. Logo Tabelası', 'Bina giriş logo tabelası - 3x1.5 metre',
 'active', 'normal', CURRENT_DATE + INTERVAL '14 days', '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- İŞ 6: Draft iş
INSERT INTO jobs (id, job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
VALUES
('j6666666-6666-6666-6666-666666666666', '2024-006', 'c1111111-1111-1111-1111-111111111111',
 'ABC AVM Promosyon Tabelaları', 'Sezonluk kampanya tabelaları',
 'draft', 'low', CURRENT_DATE + INTERVAL '30 days', '11111111-1111-1111-1111-111111111111',
 NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. İŞ AŞAMALARI (JOB STEPS)
-- ============================================

-- İŞ 1: Tamamlanmış iş aşamaları
INSERT INTO job_steps (id, job_id, process_id, order_index, assigned_to, machine_id, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
VALUES
-- Ölçüm
('s1111111-1111-1111-1111-111111111111', 'j1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 1,
 '22222222-2222-2222-2222-222222222222', NULL, 'completed', 60,
 NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '45 minutes',
 1, 'adet', 'Ölçümler alındı, onaylandı'),
-- Tasarım
('s1111112-1111-1111-1111-111111111111', 'j1111111-1111-1111-1111-111111111111', 'p2222222-2222-2222-2222-222222222222', 2,
 '44444444-4444-4444-4444-444444444444', NULL, 'completed', 180,
 NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days' + INTERVAL '2 hours',
 1, 'adet', 'Müşteri 2. revizyonda onayladı'),
-- Kesim
('s1111113-1111-1111-1111-111111111111', 'j1111111-1111-1111-1111-111111111111', 'p3333333-3333-3333-3333-333333333333', 3,
 '22222222-2222-2222-2222-222222222222', 'm1111111-1111-1111-1111-111111111111', 'completed', 120,
 NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '100 minutes',
 10, 'm²', 'Kesim kalitesi mükemmel'),
-- Baskı
('s1111114-1111-1111-1111-111111111111', 'j1111111-1111-1111-1111-111111111111', 'p4444444-4444-4444-4444-444444444444', 4,
 '33333333-3333-3333-3333-333333333333', 'm2222222-2222-2222-2222-222222222222', 'completed', 240,
 NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days' + INTERVAL '220 minutes',
 10, 'm²', 'Renkler mükemmel çıktı'),
-- Montaj
('s1111115-1111-1111-1111-111111111111', 'j1111111-1111-1111-1111-111111111111', 'p6666666-6666-6666-6666-666666666666', 5,
 '22222222-2222-2222-2222-222222222222', NULL, 'completed', 180,
 NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days' + INTERVAL '3 hours',
 1, 'adet', 'Müşteri çok memnun kaldı')
ON CONFLICT (id) DO NOTHING;

-- İŞ 2: Devam eden iş aşamaları
INSERT INTO job_steps (id, job_id, process_id, order_index, assigned_to, machine_id, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
VALUES
-- Tamamlanmış: Ölçüm
('s2221111-2222-2222-2222-222222222222', 'j2222222-2222-2222-2222-222222222222', 'p1111111-1111-1111-1111-111111111111', 1,
 '22222222-2222-2222-2222-222222222222', NULL, 'completed', 120,
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '90 minutes',
 10, 'adet', '10 şube ölçümü tamamlandı'),
-- Tamamlanmış: Tasarım
('s2221112-2222-2222-2222-222222222222', 'j2222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222222', 2,
 '44444444-4444-4444-4444-444444444444', NULL, 'completed', 300,
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days' + INTERVAL '5 hours',
 10, 'adet', 'Tüm şube tasarımları onaylandı'),
-- Tamamlanmış: Kesim
('s2221113-2222-2222-2222-222222222222', 'j2222222-2222-2222-2222-222222222222', 'p3333333-3333-3333-3333-333333333333', 3,
 '33333333-3333-3333-3333-333333333333', 'm1111111-1111-1111-1111-111111111111', 'completed', 240,
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days' + INTERVAL '4 hours',
 50, 'm²', 'Tüm kesimler tamamlandı'),
-- Devam Ediyor: Baskı
('s2221114-2222-2222-2222-222222222222', 'j2222222-2222-2222-2222-222222222222', 'p4444444-4444-4444-4444-444444444444', 4,
 '22222222-2222-2222-2222-222222222222', 'm2222222-2222-2222-2222-222222222222', 'in_progress', 360,
 NOW() - INTERVAL '4 hours', NULL,
 30, 'm²', NULL),
-- Bekliyor: Kaplama
('s2221115-2222-2222-2222-222222222222', 'j2222222-2222-2222-2222-222222222222', 'p5555555-5555-5555-5555-555555555555', 5,
 '33333333-3333-3333-3333-333333333333', 'm3333333-3333-3333-3333-333333333333', 'pending', 180,
 NULL, NULL, NULL, NULL, NULL),
-- Bekliyor: Montaj
('s2221116-2222-2222-2222-222222222222', 'j2222222-2222-2222-2222-222222222222', 'p6666666-6666-6666-6666-666666666666', 6,
 '22222222-2222-2222-2222-222222222222', NULL, 'pending', 240,
 NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- İŞ 3: Acil iş (yarına teslim)
INSERT INTO job_steps (id, job_id, process_id, order_index, assigned_to, machine_id, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
VALUES
-- Tamamlandı: Tasarım
('s3331111-3333-3333-3333-333333333333', 'j3333333-3333-3333-3333-333333333333', 'p2222222-2222-2222-2222-222222222222', 1,
 '44444444-4444-4444-4444-444444444444', NULL, 'completed', 90,
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '75 minutes',
 3, 'adet', 'Hızlı tasarım, onaylandı'),
-- Tamamlandı: Baskı
('s3331112-3333-3333-3333-333333333333', 'j3333333-3333-3333-3333-333333333333', 'p4444444-4444-4444-4444-444444444444', 2,
 '33333333-3333-3333-3333-333333333333', 'm2222222-2222-2222-2222-222222222222', 'completed', 120,
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day' + INTERVAL '2 hours',
 15, 'm²', 'Acil iş, kalite kontrol tamam'),
-- Hazır: Montaj
('s3331113-3333-3333-3333-333333333333', 'j3333333-3333-3333-3333-333333333333', 'p6666666-6666-6666-6666-666666666666', 3,
 '22222222-2222-2222-2222-222222222222', NULL, 'ready', 150,
 NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- İŞ 4: Gecikmiş iş
INSERT INTO job_steps (id, job_id, process_id, order_index, assigned_to, machine_id, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
VALUES
-- Tamamlandı: Ölçüm
('s4441111-4444-4444-4444-444444444444', 'j4444444-4444-4444-4444-444444444444', 'p1111111-1111-1111-1111-111111111111', 1,
 '22222222-2222-2222-2222-222222222222', NULL, 'completed', 90,
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '95 minutes',
 1, 'adet', 'Otel içi ölçümler'),
-- Tamamlandı: Tasarım
('s4441112-4444-4444-4444-444444444444', 'j4444444-4444-4444-4444-444444444444', 'p2222222-2222-2222-2222-222222222222', 2,
 '44444444-4444-4444-4444-444444444444', NULL, 'completed', 180,
 NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days' + INTERVAL '4 hours',
 25, 'adet', 'Çok revizyon istendi'),
-- Duraklatıldı: Baskı (malzeme bekleniyor)
('s4441113-4444-4444-4444-444444444444', 'j4444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444444', 3,
 '33333333-3333-3333-3333-333333333333', 'm2222222-2222-2222-2222-222222222222', 'blocked', 240,
 NOW() - INTERVAL '2 days', NULL,
 NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Duraklatma bilgisi ekle
UPDATE job_steps
SET block_reason = 'Özel malzeme tedarikçiden bekleniyor',
    blocked_at = NOW() - INTERVAL '1 day',
    status_before_block = 'in_progress'
WHERE id = 's4441113-4444-4444-4444-444444444444';

-- İŞ 5: Yeni başlayan iş
INSERT INTO job_steps (id, job_id, process_id, order_index, assigned_to, machine_id, status, estimated_duration, started_at, completed_at, production_quantity, production_unit)
VALUES
-- Hazır: Ölçüm
('s5551111-5555-5555-5555-555555555555', 'j5555555-5555-5555-5555-555555555555', 'p1111111-1111-1111-1111-111111111111', 1,
 '22222222-2222-2222-2222-222222222222', NULL, 'ready', 60,
 NULL, NULL, NULL, NULL),
-- Bekliyor: Tasarım
('s5551112-5555-5555-5555-555555555555', 'j5555555-5555-5555-5555-555555555555', 'p2222222-2222-2222-2222-222222222222', 2,
 '44444444-4444-4444-4444-444444444444', NULL, 'pending', 120,
 NULL, NULL, NULL, NULL),
-- Bekliyor: Baskı
('s5551113-5555-5555-5555-555555555555', 'j5555555-5555-5555-5555-555555555555', 'p4444444-4444-4444-4444-444444444444', 3,
 '22222222-2222-2222-2222-222222222222', 'm2222222-2222-2222-2222-222222222222', 'pending', 180,
 NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. NOTLAR (Job Step Notes)
-- ============================================

INSERT INTO job_step_notes (id, job_step_id, user_id, note, created_at)
VALUES
-- İş 1 notları
('n1111111-1111-1111-1111-111111111111', 's1111112-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'İlk tasarımda logo rengi değiştirildi', NOW() - INTERVAL '28 days' + INTERVAL '30 minutes'),
('n1111112-1111-1111-1111-111111111111', 's1111112-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'Müşteri onayladı, üretime geçilebilir', NOW() - INTERVAL '28 days' + INTERVAL '2 hours'),
('n1111113-1111-1111-1111-111111111111', 's1111114-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
 'Renk kalibrasyonu mükemmel', NOW() - INTERVAL '27 days' + INTERVAL '1 hour'),

-- İş 2 notları
('n2221111-2222-2222-2222-222222222222', 's2221114-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 'İlk 3 şube baskısı tamamlandı, kalite çok iyi', NOW() - INTERVAL '3 hours'),
('n2221112-2222-2222-2222-222222222222', 's2221114-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 '5. şubeye geçiyoruz', NOW() - INTERVAL '1 hour'),

-- İş 3 notları (acil)
('n3331111-3333-3333-3333-333333333333', 's3331112-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
 'Acil iş, hızlı üretim yapıldı', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),

-- İş 4 notları (gecikmiş)
('n4441111-4444-4444-4444-444444444444', 's4441112-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444',
 'Müşteri 3 kez revizyon istedi', NOW() - INTERVAL '8 days'),
('n4441112-4444-4444-4444-444444444444', 's4441113-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555',
 'Özel malzeme siparişi verildi, tedarikçi yarın teslim edecek', NOW() - INTERVAL '1 day' + INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. AUDIT LOGS (İş Geçmişi)
-- ============================================

INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
VALUES
-- İş 1 olayları
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'job_created', 'job', 'j1111111-1111-1111-1111-111111111111',
 '{"title": "ABC AVM Cephe Tabelası"}', NOW() - INTERVAL '30 days'),
('a1111112-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'job_activated', 'job', 'j1111111-1111-1111-1111-111111111111',
 '{"status": "active"}', NOW() - INTERVAL '30 days' + INTERVAL '10 minutes'),
('a1111113-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'step_completed', 'job', 'j1111111-1111-1111-1111-111111111111',
 '{"step": "Tasarım", "revision": 2}', NOW() - INTERVAL '28 days' + INTERVAL '2 hours'),

-- İş 2 olayları
('a2221111-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'job_created', 'job', 'j2222222-2222-2222-2222-222222222222',
 '{"title": "XYZ Market Şube Tabelaları", "quantity": 10}', NOW() - INTERVAL '5 days'),
('a2221112-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'job_activated', 'job', 'j2222222-2222-2222-2222-222222222222',
 '{"status": "active"}', NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),

-- İş 3 olayları (acil)
('a3331111-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'job_created', 'job', 'j3333333-3333-3333-3333-333333333333',
 '{"title": "Güneş Restoran Menü Boardları", "priority": "urgent"}', NOW() - INTERVAL '3 days'),
('a3331112-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'job_activated', 'job', 'j3333333-3333-3333-3333-333333333333',
 '{"status": "active", "note": "Acil iş, öncelikli"}', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),

-- İş 4 olayları (gecikmiş)
('a4441111-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'job_created', 'job', 'j4444444-4444-4444-4444-444444444444',
 '{"title": "Mavi Otel Yönlendirme Tabelaları"}', NOW() - INTERVAL '10 days'),
('a4441112-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'job_held', 'job', 'j4444444-4444-4444-4444-444444444444',
 '{"reason": "Malzeme bekleniyor"}', NOW() - INTERVAL '1 day'),

-- İş 5 olayları
('a5551111-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'job_created', 'job', 'j5555555-5555-5555-5555-555555555555',
 '{"title": "Teknoloji A.Ş. Logo Tabelası"}', NOW() - INTERVAL '1 day'),
('a5551112-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'job_activated', 'job', 'j5555555-5555-5555-5555-555555555555',
 '{"status": "active"}', NOW() - INTERVAL '1 day' + INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ÖZET
-- ============================================
-- Kullanıcılar:
--   - admin (Ahmet Yılmaz) - Yönetici
--   - operator1 (Mehmet Demir) - Operatör
--   - operator2 (Ayşe Kaya) - Operatör
--   - tasarim1 (Fatma Şahin) - Tasarımcı
--   - satinalma1 (Ali Yıldız) - Satınalma
--
-- Tüm şifreler: 123456
--
-- İşler:
--   - İş 1: Tamamlanmış (ABC AVM)
--   - İş 2: Devam ediyor (XYZ Market) - Baskı aşamasında
--   - İş 3: Acil (Güneş Restoran) - Yarın teslim
--   - İş 4: Gecikmiş (Mavi Otel) - Malzeme bekleniyor
--   - İş 5: Yeni başlayan (Teknoloji A.Ş.)
--   - İş 6: Taslak (ABC AVM)
--
-- Test senaryoları:
--   1. operator1 olarak giriş yap → Görevlerim'de 3 görev görmelisin
--   2. Dashboard'da performans kartlarını kontrol et
--   3. İş 2'nin detayına git → Timeline'da tüm olayları gör
--   4. İş 3'te "ACİL" badge'i görmeli (yarın teslim)
--   5. İş 4'te "GECİKMİŞ" badge'i görmeli (deadline geçti)

SELECT 'Dummy data başarıyla eklendi! Test etmeye başlayabilirsiniz.' as status;
