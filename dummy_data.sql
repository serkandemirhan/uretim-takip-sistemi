-- ReklamPRO Dummy Data Insert Script
-- This script creates sample customers, jobs, job steps, and related data

-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert Process Groups
INSERT INTO process_groups (id, name, description, color, order_index) VALUES
('11111111-1111-1111-1111-111111111111', 'Ön Hazırlık', 'Tasarım ve hazırlık süreçleri', '#3B82F6', 1),
('22222222-2222-2222-2222-222222222222', 'Baskı', 'Baskı işlemleri', '#10B981', 2),
('33333333-3333-3333-3333-333333333333', 'Kesim ve Şekillendirme', 'Kesim ve şekillendirme işlemleri', '#F59E0B', 3),
('44444444-4444-4444-4444-444444444444', 'Son İşlemler', 'Kalite kontrol ve paketleme', '#EF4444', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert Processes
INSERT INTO processes (id, name, code, description, is_machine_based, is_production, order_index, group_id) VALUES
('a1111111-1111-1111-1111-111111111111', 'Tasarım', 'DESIGN', 'Grafik tasarım ve düzenleme', false, false, 1, '11111111-1111-1111-1111-111111111111'),
('a2222222-2222-2222-2222-222222222222', 'Dizgi', 'TYPESET', 'Metin dizgisi ve düzenleme', false, false, 2, '11111111-1111-1111-1111-111111111111'),
('a3333333-3333-3333-3333-333333333333', 'Montaj', 'MONTAGE', 'Film montajı', false, false, 3, '11111111-1111-1111-1111-111111111111'),
('b1111111-1111-1111-1111-111111111111', 'Ofset Baskı', 'OFFSET', 'Ofset baskı makinesi', true, true, 1, '22222222-2222-2222-2222-222222222222'),
('b2222222-2222-2222-2222-222222222222', 'Dijital Baskı', 'DIGITAL', 'Dijital baskı makinesi', true, true, 2, '22222222-2222-2222-2222-222222222222'),
('b3333333-3333-3333-3333-333333333333', 'Serigrafi', 'SCREEN', 'Serigrafi baskı', true, true, 3, '22222222-2222-2222-2222-222222222222'),
('c1111111-1111-1111-1111-111111111111', 'Giyotin Kesim', 'GUILLOTINE', 'Giyotin kesim makinesi', true, true, 1, '33333333-3333-3333-3333-333333333333'),
('c2222222-2222-2222-2222-222222222222', 'Lazer Kesim', 'LASER', 'Lazer kesim makinesi', true, true, 2, '33333333-3333-3333-3333-333333333333'),
('c3333333-3333-3333-3333-333333333333', 'Fleks Baskı', 'FLEXO', 'Flekso baskı makinesi', true, true, 3, '33333333-3333-3333-3333-333333333333'),
('d1111111-1111-1111-1111-111111111111', 'Ciltleme', 'BINDING', 'Ciltleme işlemleri', true, false, 1, '44444444-4444-4444-4444-444444444444'),
('d2222222-2222-2222-2222-222222222222', 'Laminasyon', 'LAMINATE', 'Laminasyon işlemleri', true, false, 2, '44444444-4444-4444-4444-444444444444'),
('d3333333-3333-3333-3333-333333333333', 'Paketleme', 'PACKAGE', 'Paketleme ve sevkiyat hazırlığı', false, false, 3, '44444444-4444-4444-4444-444444444444')
ON CONFLICT (id) DO NOTHING;

-- Insert Machines
INSERT INTO machines (id, name, code, type, status, location, capacity_per_hour) VALUES
('m1111111-1111-1111-1111-111111111111', 'Heidelberg Speedmaster', 'HB-SM-01', 'Ofset Baskı', 'active', 'Üretim Salonu A', 5000),
('m2222222-2222-2222-2222-222222222222', 'HP Indigo 7900', 'HP-IND-01', 'Dijital Baskı', 'active', 'Üretim Salonu B', 3000),
('m3333333-3333-3333-3333-333333333333', 'Polar 137 XT', 'POL-137-01', 'Giyotin Kesim', 'active', 'Kesim Bölümü', 800),
('m4444444-4444-4444-4444-444444444444', 'Trotec Speedy 400', 'TRT-400-01', 'Lazer Kesim', 'active', 'Kesim Bölümü', 200),
('m5555555-5555-5555-5555-555555555555', 'Kolbus KM 473', 'KOL-473-01', 'Ciltleme', 'active', 'Ciltleme Bölümü', 500),
('m6666666-6666-6666-6666-666666666666', 'GMP Surelam', 'GMP-SL-01', 'Laminasyon', 'active', 'Son İşlem Bölümü', 1000)
ON CONFLICT (id) DO NOTHING;

-- Link Machines to Processes
INSERT INTO machine_processes (machine_id, process_id) VALUES
('m1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111'),
('m2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222'),
('m3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111'),
('m4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222'),
('m5555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111'),
('m6666666-6666-6666-6666-666666666666', 'd2222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert Roles
INSERT INTO roles (id, name, code, description) VALUES
('r1111111-1111-1111-1111-111111111111', 'Sistem Yöneticisi', 'ADMIN', 'Tüm yetkilere sahip sistem yöneticisi'),
('r2222222-2222-2222-2222-222222222222', 'Üretim Müdürü', 'PROD_MANAGER', 'Üretim süreçlerini yöneten yetkili'),
('r3333333-3333-3333-3333-333333333333', 'Operatör', 'OPERATOR', 'Makine operatörü'),
('r4444444-4444-4444-4444-444444444444', 'Tasarımcı', 'DESIGNER', 'Grafik tasarımcı')
ON CONFLICT (id) DO NOTHING;

-- Insert Users
INSERT INTO users (id, username, email, password_hash, full_name, role, is_active) VALUES
('u1111111-1111-1111-1111-111111111111', 'admin', 'admin@reklampro.com', '$2b$10$dummyhash1', 'Ahmet Yılmaz', 'admin', true),
('u2222222-2222-2222-2222-222222222222', 'murat.kaya', 'murat.kaya@reklampro.com', '$2b$10$dummyhash2', 'Murat Kaya', 'production_manager', true),
('u3333333-3333-3333-3333-333333333333', 'mehmet.demir', 'mehmet.demir@reklampro.com', '$2b$10$dummyhash3', 'Mehmet Demir', 'operator', true),
('u4444444-4444-4444-4444-444444444444', 'ayse.yildirim', 'ayse.yildirim@reklampro.com', '$2b$10$dummyhash4', 'Ayşe Yıldırım', 'designer', true),
('u5555555-5555-5555-5555-555555555555', 'ali.cetin', 'ali.cetin@reklampro.com', '$2b$10$dummyhash5', 'Ali Çetin', 'operator', true)
ON CONFLICT (id) DO NOTHING;

-- Assign Roles to Users
INSERT INTO user_roles (user_id, role_id, is_primary) VALUES
('u1111111-1111-1111-1111-111111111111', 'r1111111-1111-1111-1111-111111111111', true),
('u2222222-2222-2222-2222-222222222222', 'r2222222-2222-2222-2222-222222222222', true),
('u3333333-3333-3333-3333-333333333333', 'r3333333-3333-3333-3333-333333333333', true),
('u4444444-4444-4444-4444-444444444444', 'r4444444-4444-4444-4444-444444444444', true),
('u5555555-5555-5555-5555-555555555555', 'r3333333-3333-3333-3333-333333333333', true)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert Customers
INSERT INTO customers (id, name, code, contact_person, phone, email, address, city, tax_office, tax_number, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'Koç Holding A.Ş.', 'KOC001', 'Zeynep Koç', '+90 212 123 4567', 'zeynep.koc@koc.com.tr', 'Nakkaştepe Aziz Bey Sokak No:1', 'İstanbul', 'Üsküdar', '1234567890', true),
('c2222222-2222-2222-2222-222222222222', 'Migros Ticaret A.Ş.', 'MIG001', 'Can Öztürk', '+90 212 234 5678', 'can.ozturk@migros.com.tr', 'Atatürk Caddesi No:234', 'İstanbul', 'Beşiktaş', '2345678901', true),
('c3333333-3333-3333-3333-333333333333', 'Türk Telekom', 'TT001', 'Selin Aydın', '+90 312 444 0000', 'selin.aydin@turktelekom.com.tr', 'Turgut Özal Bulvarı', 'Ankara', 'Çankaya', '3456789012', true),
('c4444444-4444-4444-4444-444444444444', 'Anadolu Efes', 'EFS001', 'Burak Şahin', '+90 216 586 8080', 'burak.sahin@anadoluefes.com', 'Bahçelievler Mah.', 'İstanbul', 'Kadıköy', '4567890123', true),
('c5555555-5555-5555-5555-555555555555', 'Eczacıbaşı Holding', 'ECZ001', 'Elif Özkan', '+90 212 350 8000', 'elif.ozkan@eczacibasi.com.tr', 'Büyükdere Caddesi', 'İstanbul', 'Şişli', '5678901234', true),
('c6666666-6666-6666-6666-666666666666', 'Şok Marketler A.Ş.', 'SOK001', 'Kerem Arslan', '+90 216 528 2828', 'kerem.arslan@sokmarket.com.tr', 'Soğanlık Yeni Mah.', 'İstanbul', 'Kartal', '6789012345', true),
('c7777777-7777-7777-7777-777777777777', 'THY - Türk Hava Yolları', 'THY001', 'Deniz Yılmaz', '+90 212 463 6363', 'deniz.yilmaz@thy.com', 'Genel Havacılık', 'İstanbul', 'Arnavutköy', '7890123456', true),
('c8888888-8888-8888-8888-888888888888', 'Vestel Elektronik', 'VES001', 'Cem Kara', '+90 236 235 0000', 'cem.kara@vestel.com.tr', 'Organize Sanayi Bölgesi', 'Manisa', 'Manisa', '8901234567', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Customer Dealers
INSERT INTO customer_dealers (customer_id, name, address, city, contact_person, contact_phone) VALUES
('c1111111-1111-1111-1111-111111111111', 'Koç Holding - Ankara Şubesi', 'Kızılırmak Mah.', 'Ankara', 'Hakan Beyaz', '+90 312 567 8901'),
('c2222222-2222-2222-2222-222222222222', 'Migros - İzmir Bölge Müdürlüğü', 'Folkart Towers', 'İzmir', 'Gizem Yıldız', '+90 232 456 7890'),
('c3333333-3333-3333-3333-333333333333', 'Türk Telekom - İstanbul Anadolu', 'Ümraniye', 'İstanbul', 'Okan Taş', '+90 216 789 0123')
ON CONFLICT DO NOTHING;

-- Insert Jobs
INSERT INTO jobs (id, job_number, customer_id, title, description, status, priority, due_date, created_by) VALUES
('j1111111-1111-1111-1111-111111111111', 'JOB-2025-001', 'c1111111-1111-1111-1111-111111111111', 'Katalog Baskısı - Bahar Koleksiyonu', '200 sayfa renkli katalog, 10.000 adet, mat kuşe kağıt', 'in_progress', 'high', '2025-11-15', 'u1111111-1111-1111-1111-111111111111'),
('j2222222-2222-2222-2222-222222222222', 'JOB-2025-002', 'c2222222-2222-2222-2222-222222222222', 'Broşür ve Afiş Baskısı', 'A4 broşür 5.000 adet + 70x100 afiş 500 adet', 'in_progress', 'normal', '2025-11-10', 'u1111111-1111-1111-1111-111111111111'),
('j3333333-3333-3333-3333-333333333333', 'JOB-2025-003', 'c3333333-3333-3333-3333-333333333333', 'Kurumsal Kimlik Seti', 'Kartvizit, antetli kağıt, zarflar', 'pending', 'normal', '2025-11-20', 'u2222222-2222-2222-2222-222222222222'),
('j4444444-4444-4444-4444-444444444444', 'JOB-2025-004', 'c4444444-4444-4444-4444-444444444444', 'Promosyon Malzemeleri', 'Özel kesim etiketler ve ambalaj', 'in_progress', 'high', '2025-11-08', 'u1111111-1111-1111-1111-111111111111'),
('j5555555-5555-5555-5555-555555555555', 'JOB-2025-005', 'c5555555-5555-5555-5555-555555555555', 'Yıllık Faaliyet Raporu', '150 sayfa, sert kapak ciltli, 1.000 adet', 'planning', 'normal', '2025-11-25', 'u2222222-2222-2222-2222-222222222222'),
('j6666666-6666-6666-6666-666666666666', 'JOB-2025-006', 'c6666666-6666-6666-6666-666666666666', 'Kampanya Afişleri', '50x70 cm afiş, 2.000 adet', 'completed', 'normal', '2025-10-30', 'u1111111-1111-1111-1111-111111111111'),
('j7777777-7777-7777-7777-777777777777', 'JOB-2025-007', 'c7777777-7777-7777-7777-777777777777', 'Uçak İçi Dergi Baskısı', 'Aylık dergi, 80 sayfa, 50.000 adet', 'in_progress', 'high', '2025-11-12', 'u1111111-1111-1111-1111-111111111111'),
('j8888888-8888-8888-8888-888888888888', 'JOB-2025-008', 'c8888888-8888-8888-8888-888888888888', 'Ürün Kullanım Kılavuzları', 'A5 boyut, 32 sayfa, 20.000 adet', 'pending', 'normal', '2025-11-18', 'u2222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Insert Job Steps for JOB-2025-001 (Katalog - Completed and In Progress)
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, started_at, completed_at) VALUES
('j1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1, 'u4444444-4444-4444-4444-444444444444', NULL, 'completed', '2025-10-15 09:00:00', '2025-10-17 17:00:00'),
('j1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 2, 'u4444444-4444-4444-4444-444444444444', NULL, 'completed', '2025-10-18 09:00:00', '2025-10-19 15:00:00'),
('j1111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 3, 'u3333333-3333-3333-3333-333333333333', NULL, 'completed', '2025-10-20 09:00:00', '2025-10-21 12:00:00'),
('j1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 4, 'u3333333-3333-3333-3333-333333333333', 'm1111111-1111-1111-1111-111111111111', 'in_progress', '2025-10-22 08:00:00', NULL),
('j1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 5, 'u5555555-5555-5555-5555-555555555555', 'm3333333-3333-3333-3333-333333333333', 'pending', NULL, NULL),
('j1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 6, NULL, 'm5555555-5555-5555-5555-555555555555', 'pending', NULL, NULL),
('j1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 7, NULL, 'm6666666-6666-6666-6666-666666666666', 'pending', NULL, NULL),
('j1111111-1111-1111-1111-111111111111', 'd3333333-3333-3333-3333-333333333333', 8, NULL, NULL, 'pending', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Insert Job Steps for JOB-2025-002 (Broşür ve Afiş)
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, started_at, completed_at) VALUES
('j2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 1, 'u4444444-4444-4444-4444-444444444444', NULL, 'completed', '2025-10-12 09:00:00', '2025-10-13 16:00:00'),
('j2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 2, 'u3333333-3333-3333-3333-333333333333', 'm2222222-2222-2222-2222-222222222222', 'in_progress', '2025-10-14 10:00:00', NULL),
('j2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 3, NULL, 'm3333333-3333-3333-3333-333333333333', 'pending', NULL, NULL),
('j2222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333', 4, NULL, NULL, 'pending', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Insert Job Steps for JOB-2025-003 (Kurumsal Kimlik - Pending)
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status) VALUES
('j3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 1, 'u4444444-4444-4444-4444-444444444444', 'pending'),
('j3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 2, NULL, 'pending'),
('j3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 3, NULL, 'pending')
ON CONFLICT DO NOTHING;

-- Insert Job Steps for JOB-2025-004 (Promosyon Malzemeleri)
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, started_at, completed_at) VALUES
('j4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 1, 'u4444444-4444-4444-4444-444444444444', NULL, 'completed', '2025-10-10 09:00:00', '2025-10-11 14:00:00'),
('j4444444-4444-4444-4444-444444444444', 'b3333333-3333-3333-3333-333333333333', 2, 'u5555555-5555-5555-5555-555555555555', NULL, 'completed', '2025-10-12 08:00:00', '2025-10-14 17:00:00'),
('j4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 3, 'u3333333-3333-3333-3333-333333333333', 'm4444444-4444-4444-4444-444444444444', 'in_progress', '2025-10-15 09:00:00', NULL),
('j4444444-4444-4444-4444-444444444444', 'd3333333-3333-3333-3333-333333333333', 4, NULL, NULL, 'pending', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Insert Job Steps for JOB-2025-006 (Kampanya Afişleri - Completed)
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, started_at, completed_at) VALUES
('j6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111', 1, 'u4444444-4444-4444-4444-444444444444', NULL, 'completed', '2025-10-05 09:00:00', '2025-10-06 15:00:00'),
('j6666666-6666-6666-6666-666666666666', 'b2222222-2222-2222-2222-222222222222', 2, 'u3333333-3333-3333-3333-333333333333', 'm2222222-2222-2222-2222-222222222222', 'completed', '2025-10-07 10:00:00', '2025-10-08 16:00:00'),
('j6666666-6666-6666-6666-666666666666', 'c1111111-1111-1111-1111-111111111111', 3, 'u5555555-5555-5555-5555-555555555555', 'm3333333-3333-3333-3333-333333333333', 'completed', '2025-10-09 09:00:00', '2025-10-09 14:00:00'),
('j6666666-6666-6666-6666-666666666666', 'd3333333-3333-3333-3333-333333333333', 4, 'u3333333-3333-3333-3333-333333333333', NULL, 'completed', '2025-10-10 09:00:00', '2025-10-10 11:00:00')
ON CONFLICT DO NOTHING;

-- Insert Job Steps for JOB-2025-007 (Uçak İçi Dergi)
INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, started_at) VALUES
('j7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111', 1, 'u4444444-4444-4444-4444-444444444444', NULL, 'completed', '2025-10-08 09:00:00'),
('j7777777-7777-7777-7777-777777777777', 'a2222222-2222-2222-2222-222222222222', 2, 'u4444444-4444-4444-4444-444444444444', NULL, 'completed', '2025-10-12 09:00:00'),
('j7777777-7777-7777-7777-777777777777', 'b1111111-1111-1111-1111-111111111111', 3, 'u3333333-3333-3333-3333-333333333333', 'm1111111-1111-1111-1111-111111111111', 'in_progress', '2025-10-16 08:00:00'),
('j7777777-7777-7777-7777-777777777777', 'c1111111-1111-1111-1111-111111111111', 4, NULL, 'm3333333-3333-3333-3333-333333333333', 'pending', NULL),
('j7777777-7777-7777-7777-777777777777', 'd1111111-1111-1111-1111-111111111111', 5, NULL, 'm5555555-5555-5555-5555-555555555555', 'pending', NULL)
ON CONFLICT DO NOTHING;

-- Insert some job step notes
INSERT INTO job_step_notes (job_step_id, user_id, note)
SELECT js.id, 'u3333333-3333-3333-3333-333333333333', 'Baskı kalitesi mükemmel, renk tonları müşteri onayına uygun.'
FROM job_steps js WHERE js.job_id = 'j6666666-6666-6666-6666-666666666666' AND js.process_id = 'b2222222-2222-2222-2222-222222222222'
ON CONFLICT DO NOTHING;

INSERT INTO job_step_notes (job_step_id, user_id, note)
SELECT js.id, 'u5555555-5555-5555-5555-555555555555', 'Kesim işlemi sorunsuz tamamlandı. Atık oranı %2.'
FROM job_steps js WHERE js.job_id = 'j6666666-6666-6666-6666-666666666666' AND js.process_id = 'c1111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

INSERT INTO job_step_notes (job_step_id, user_id, note)
SELECT js.id, 'u3333333-3333-3333-3333-333333333333', 'Katalog baskısı devam ediyor. Şu ana kadar 3.500 adet basıldı.'
FROM job_steps js WHERE js.job_id = 'j1111111-1111-1111-1111-111111111111' AND js.process_id = 'b1111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- Insert Stocks
INSERT INTO stocks (id, product_code, product_name, category, unit, current_quantity, min_quantity, unit_price, currency, supplier_name) VALUES
('s1111111-1111-1111-1111-111111111111', 'KGT-300-A3', 'Mat Kuşe Kağıt 300gr A3', 'Kağıt', 'kg', 5000, 1000, 45.50, 'TRY', 'Kağıt Dünyası A.Ş.'),
('s2222222-2222-2222-2222-222222222222', 'KGT-200-A4', 'Parlak Kuşe Kağıt 200gr A4', 'Kağıt', 'kg', 3500, 800, 38.75, 'TRY', 'Kağıt Dünyası A.Ş.'),
('s3333333-3333-3333-3333-333333333333', 'MUH-CMYK-01', 'CMYK Mürekkep Seti', 'Mürekkep', 'litre', 500, 100, 450.00, 'TRY', 'Baskı Malzemeleri Ltd.'),
('s4444444-4444-4444-4444-444444444444', 'CIL-TEL-01', 'Tel Spiral Cilt Malzemesi', 'Ciltleme', 'adet', 10000, 2000, 1.50, 'TRY', 'Ciltleme Ürünleri A.Ş.'),
('s5555555-5555-5555-5555-555555555555', 'LAM-MAT-50', 'Mat Laminasyon Film 50cm', 'Laminasyon', 'metre', 2000, 500, 12.00, 'TRY', 'Film Master'),
('s6666666-6666-6666-6666-666666666666', 'KRT-ONDULE-3', 'Oluklu Mukavva 3mm', 'Ambalaj', 'm2', 1500, 300, 8.50, 'TRY', 'Karton Ambalaj A.Ş.')
ON CONFLICT (id) DO NOTHING;

-- Insert Stock Movements
INSERT INTO stock_movements (stock_id, movement_type, quantity, unit_price, currency, job_id, purpose, notes, created_by) VALUES
('s1111111-1111-1111-1111-111111111111', 'OUT', 250, 45.50, 'TRY', 'j1111111-1111-1111-1111-111111111111', 'Katalog baskısı için kağıt çıkışı', 'JOB-2025-001 için kullanıldı', 'u3333333-3333-3333-3333-333333333333'),
('s2222222-2222-2222-2222-222222222222', 'OUT', 100, 38.75, 'TRY', 'j2222222-2222-2222-2222-222222222222', 'Broşür baskısı', 'JOB-2025-002 için', 'u3333333-3333-3333-3333-333333333333'),
('s3333333-3333-3333-3333-333333333333', 'OUT', 15, 450.00, 'TRY', 'j1111111-1111-1111-1111-111111111111', 'CMYK mürekkep kullanımı', 'Ofset baskı makinesi', 'u3333333-3333-3333-3333-333333333333'),
('s1111111-1111-1111-1111-111111111111', 'IN', 1000, 45.00, 'TRY', NULL, 'Stok takviyesi', 'Yeni sipariş geldi', 'u2222222-2222-2222-2222-222222222222'),
('s5555555-5555-5555-5555-555555555555', 'OUT', 50, 12.00, 'TRY', 'j6666666-6666-6666-6666-666666666666', 'Laminasyon işlemi', 'Afiş laminasyonu', 'u3333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- Insert Purchase Orders
INSERT INTO purchase_orders (id, stock_id, order_code, quantity, unit_price, currency, supplier_name, order_date, expected_delivery_date, status, created_by) VALUES
('po111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'PO-2025-001', 2000, 44.50, 'TRY', 'Kağıt Dünyası A.Ş.', '2025-10-15', '2025-10-25', 'PENDING', 'u2222222-2222-2222-2222-222222222222'),
('po222222-2222-2222-2222-222222222222', 's3333333-3333-3333-3333-333333333333', 'PO-2025-002', 200, 445.00, 'TRY', 'Baskı Malzemeleri Ltd.', '2025-10-12', '2025-10-22', 'APPROVED', 'u2222222-2222-2222-2222-222222222222'),
('po333333-3333-3333-3333-333333333333', 's4444444-4444-4444-4444-444444444444', 'PO-2025-003', 5000, 1.45, 'TRY', 'Ciltleme Ürünleri A.Ş.', '2025-10-10', '2025-10-18', '2025-10-17', 'DELIVERED', 'u2222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Insert Currency Settings
INSERT INTO currency_settings (usd_to_try, eur_to_try, updated_by) VALUES
(34.50, 37.25, 'u1111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Insert Notifications
INSERT INTO notifications (user_id, title, message, type, is_read, ref_type, ref_id) VALUES
('u3333333-3333-3333-3333-333333333333', 'Yeni İş Ataması', 'JOB-2025-001 kataloğu için baskı işlemi size atandı.', 'task_assigned', false, 'job', 'j1111111-1111-1111-1111-111111111111'),
('u2222222-2222-2222-2222-222222222222', 'Stok Uyarısı', 'Mat Kuşe Kağıt 300gr stok seviyesi minimum seviyeye yaklaşıyor.', 'warning', false, 'stock', 's1111111-1111-1111-1111-111111111111'),
('u1111111-1111-1111-1111-111111111111', 'İş Tamamlandı', 'JOB-2025-006 kampanya afişleri başarıyla tamamlandı.', 'success', true, 'job', 'j6666666-6666-6666-6666-666666666666'),
('u4444444-4444-4444-4444-444444444444', 'Tasarım Onayı Bekleniyor', 'JOB-2025-005 faaliyet raporu tasarımı müşteri onayına sunuldu.', 'info', false, 'job', 'j5555555-5555-5555-5555-555555555555')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Dummy data başarıyla eklendi!';
    RAISE NOTICE '- 8 müşteri';
    RAISE NOTICE '- 8 iş emri (farklı statülerde)';
    RAISE NOTICE '- 12 süreç, 4 süreç grubu';
    RAISE NOTICE '- 6 makine';
    RAISE NOTICE '- 5 kullanıcı';
    RAISE NOTICE '- 6 stok kalemi';
    RAISE NOTICE '- İş adımları, notlar ve bildirimler';
END $$;
