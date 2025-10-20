-- ReklamPRO Test Data - V2
-- Mevcut kullanıcıları kullanarak test verileri ekler

-- Önce mevcut kullanıcı ID'lerini değişkenlere alalım
DO $$
DECLARE
    admin_id uuid;
    operator1_id uuid;
    operator2_id uuid;
    customer1_id uuid;
    customer2_id uuid;
    customer3_id uuid;
    process_olcu_id uuid;
    process_tasarim_id uuid;
    process_kesim_id uuid;
    process_baski_id uuid;
    process_kaplama_id uuid;
    process_montaj_id uuid;
    machine_baski_id uuid;
    job1_id uuid;
    job2_id uuid;
    job3_id uuid;
    job4_id uuid;
    step1_id uuid;
    step2_id uuid;
    step3_id uuid;
BEGIN
    -- Kullanıcı ID'lerini al
    SELECT id INTO admin_id FROM users WHERE username = 'admin' LIMIT 1;
    SELECT id INTO operator1_id FROM users WHERE username = 'akaya' LIMIT 1;
    SELECT id INTO operator2_id FROM users WHERE username = 'cyilmaz' LIMIT 1;

    -- Müşteriler ekle (eğer yoksa)
    IF NOT EXISTS (SELECT 1 FROM customers WHERE code = 'ABC001') THEN
        INSERT INTO customers (name, code, contact_person, phone, email, city, is_active)
        VALUES
        ('ABC AVM', 'ABC001', 'Zeynep Arslan', '0212 555 1234', 'info@abcavm.com', 'İstanbul', true),
        ('XYZ Market Zinciri', 'XYZ002', 'Can Öztürk', '0216 555 5678', 'iletisim@xyzmarket.com', 'İstanbul', true),
        ('Güneş Restoran', 'GNS003', 'Deniz Acar', '0312 555 9012', 'info@gunesrestoran.com', 'Ankara', true),
        ('Mavi Otel', 'MVO004', 'Selin Kara', '0232 555 3456', 'rezervasyon@maviotel.com', 'İzmir', true),
        ('Teknoloji A.Ş.', 'TEK005', 'Burak Çelik', '0216 555 7890', 'info@teknolojilab.com', 'İstanbul', true);
    END IF;

    SELECT id INTO customer1_id FROM customers WHERE code = 'ABC001' LIMIT 1;
    SELECT id INTO customer2_id FROM customers WHERE code = 'XYZ002' LIMIT 1;
    SELECT id INTO customer3_id FROM customers WHERE code = 'GNS003' LIMIT 1;

    -- Süreç grupları ekle
    IF NOT EXISTS (SELECT 1 FROM process_groups WHERE name = 'Ön Hazırlık') THEN
        INSERT INTO process_groups (name, description, color, order_index)
        VALUES
        ('Ön Hazırlık', 'Ölçüm ve tasarım süreçleri', '#3B82F6', 1),
        ('Üretim', 'Kesim, baskı ve üretim süreçleri', '#10B981', 2),
        ('Son İşlemler', 'Montaj ve teslim süreçleri', '#F59E0B', 3);
    END IF;

    -- Mevcut süreçleri kullan (eklemeden)
    SELECT id INTO process_olcu_id FROM processes WHERE code = 'OLCU' LIMIT 1;
    SELECT id INTO process_baski_id FROM processes WHERE code = 'BASKI' LIMIT 1;
    SELECT id INTO process_tasarim_id FROM processes WHERE code = 'LAMINE' LIMIT 1; -- Tasarım yerine lamine kullan
    SELECT id INTO process_kesim_id FROM processes WHERE code = 'FASON' LIMIT 1; -- Kesim yerine fason
    SELECT id INTO process_kaplama_id FROM processes WHERE code = 'LAMINE' LIMIT 1;
    SELECT id INTO process_montaj_id FROM processes WHERE code = 'TESLIMAT' LIMIT 1;

    -- Debug: Process ID'leri kontrol et
    IF process_olcu_id IS NULL OR process_tasarim_id IS NULL THEN
        RAISE EXCEPTION 'Süreçler bulunamadı! Lütfen önce süreçleri ekleyin.';
    END IF;

    -- Makineler ekle
    IF NOT EXISTS (SELECT 1 FROM machines WHERE code = 'CNC001') THEN
        INSERT INTO machines (code, name, type, status, capacity_per_hour)
        VALUES
        ('CNC001', 'CNC Kesim Makinesi', 'Kesim', 'active', 10.0),
        ('PRINT001', 'HP Latex Baskı Makinesi', 'Baskı', 'active', 15.0),
        ('LAM001', 'Laminasyon Makinesi', 'Kaplama', 'active', 20.0);
    END IF;

    SELECT id INTO machine_baski_id FROM machines WHERE code = 'PRINT001' LIMIT 1;

    -- İŞ 1: Tamamlanmış iş
    INSERT INTO jobs (job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
    VALUES
    ('2024-001', customer1_id, 'ABC AVM Cephe Tabelası', 'Ana giriş cephe tabelası - 5x2 metre',
     'completed', 'high', CURRENT_DATE - INTERVAL '15 days', admin_id,
     NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days')
    RETURNING id INTO job1_id;

    -- İş 1 aşamaları (hepsi tamamlanmış)
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
    VALUES
    (job1_id, process_olcu_id, 1, operator1_id, 'completed', 60,
     NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '45 minutes',
     1, 'adet', 'Ölçümler alındı, onaylandı'),
    (job1_id, process_tasarim_id, 2, admin_id, 'completed', 180,
     NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days' + INTERVAL '2 hours',
     1, 'adet', 'Müşteri 2. revizyonda onayladı'),
    (job1_id, process_kesim_id, 3, operator1_id, 'completed', 120,
     NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '100 minutes',
     10, 'm²', 'Kesim kalitesi mükemmel'),
    (job1_id, process_baski_id, 4, operator2_id, 'completed', 240,
     NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days' + INTERVAL '220 minutes',
     10, 'm²', 'Renkler mükemmel çıktı'),
    (job1_id, process_montaj_id, 5, operator1_id, 'completed', 180,
     NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days' + INTERVAL '3 hours',
     1, 'adet', 'Müşteri çok memnun kaldı');

    -- İŞ 2: Devam eden iş
    INSERT INTO jobs (job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
    VALUES
    ('2024-002', customer2_id, 'XYZ Market Şube Tabelaları', '10 farklı şube için tabela seti',
     'in_progress', 'normal', CURRENT_DATE + INTERVAL '7 days', admin_id,
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day')
    RETURNING id INTO job2_id;

    -- İş 2 aşamaları
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
    VALUES
    (job2_id, process_olcu_id, 1, operator1_id, NULL, 'completed', 120,
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '90 minutes',
     10, 'adet', '10 şube ölçümü tamamlandı'),
    (job2_id, process_tasarim_id, 2, admin_id, NULL, 'completed', 300,
     NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days' + INTERVAL '5 hours',
     10, 'adet', 'Tüm şube tasarımları onaylandı'),
    (job2_id, process_kesim_id, 3, operator2_id, NULL, 'completed', 240,
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days' + INTERVAL '4 hours',
     50, 'm²', 'Tüm kesimler tamamlandı')
    RETURNING id INTO step1_id;

    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, estimated_duration, started_at, production_quantity, production_unit)
    VALUES
    (job2_id, process_baski_id, 4, operator1_id, machine_baski_id, 'in_progress', 360,
     NOW() - INTERVAL '4 hours', 30, 'm²')
    RETURNING id INTO step2_id;

    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration)
    VALUES
    (job2_id, process_kaplama_id, 5, operator2_id, 'pending', 180),
    (job2_id, process_montaj_id, 6, operator1_id, 'pending', 240);

    -- İŞ 3: Acil iş (yarın teslim)
    INSERT INTO jobs (job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
    VALUES
    ('2024-003', customer3_id, 'Güneş Restoran Menü Boardları', 'Duvar menü panoları (3 adet)',
     'in_progress', 'urgent', CURRENT_DATE + INTERVAL '1 day', admin_id,
     NOW() - INTERVAL '3 days', NOW())
    RETURNING id INTO job3_id;

    -- İş 3 aşamaları
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
    VALUES
    (job3_id, process_tasarim_id, 1, admin_id, 'completed', 90,
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '75 minutes',
     3, 'adet', 'Hızlı tasarım, onaylandı'),
    (job3_id, process_baski_id, 2, operator2_id, 'completed', 120,
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day' + INTERVAL '2 hours',
     15, 'm²', 'Acil iş, kalite kontrol tamam');

    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration)
    VALUES
    (job3_id, process_montaj_id, 3, operator1_id, 'ready', 150)
    RETURNING id INTO step3_id;

    -- İŞ 4: Gecikmiş iş (malzeme bekleniyor)
    INSERT INTO jobs (job_number, customer_id, title, description, status, priority, due_date, created_by, created_at, updated_at)
    VALUES
    ('2024-004', (SELECT id FROM customers WHERE code = 'MVO004'),
     'Mavi Otel Yönlendirme Tabelaları', 'İç mekan yönlendirme sistemi',
     'on_hold', 'high', CURRENT_DATE - INTERVAL '2 days', admin_id,
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day')
    RETURNING id INTO job4_id;

    -- İş 4 aşamaları
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration, started_at, completed_at, production_quantity, production_unit, production_notes)
    VALUES
    (job4_id, process_olcu_id, 1, operator1_id, 'completed', 90,
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '95 minutes',
     1, 'adet', 'Otel içi ölçümler'),
    (job4_id, process_tasarim_id, 2, admin_id, 'completed', 180,
     NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days' + INTERVAL '4 hours',
     25, 'adet', 'Çok revizyon istendi');

    -- Duraklatılmış step
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, machine_id, status, block_reason, blocked_at, status_before_block, estimated_duration, started_at)
    VALUES
    (job4_id, process_baski_id, 3, operator2_id, machine_baski_id, 'blocked',
     'Özel malzeme tedarikçiden bekleniyor', NOW() - INTERVAL '1 day', 'in_progress', 240,
     NOW() - INTERVAL '2 days');

    -- Notlar ekle
    INSERT INTO job_step_notes (job_step_id, user_id, note, created_at)
    VALUES
    (step2_id, operator1_id, 'İlk 3 şube baskısı tamamlandı, kalite çok iyi', NOW() - INTERVAL '3 hours'),
    (step2_id, operator1_id, '5. şubeye geçiyoruz', NOW() - INTERVAL '1 hour'),
    (step3_id, operator2_id, 'Acil iş, yarın sabah montaja başlayalım', NOW() - INTERVAL '2 hours');

    -- Audit logs ekle
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_at)
    VALUES
    (admin_id, 'job_created', 'job', job1_id,
     '{"title": "ABC AVM Cephe Tabelası"}', NOW() - INTERVAL '30 days'),
    (admin_id, 'job_activated', 'job', job1_id,
     '{"status": "active"}', NOW() - INTERVAL '30 days' + INTERVAL '10 minutes'),
    (admin_id, 'job_created', 'job', job2_id,
     '{"title": "XYZ Market Şube Tabelaları", "quantity": 10}', NOW() - INTERVAL '5 days'),
    (admin_id, 'job_activated', 'job', job2_id,
     '{"status": "active"}', NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
    (admin_id, 'job_created', 'job', job3_id,
     '{"title": "Güneş Restoran Menü Boardları", "priority": "urgent"}', NOW() - INTERVAL '3 days'),
    (admin_id, 'job_activated', 'job', job3_id,
     '{"status": "active", "note": "Acil iş, öncelikli"}', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
    (admin_id, 'job_created', 'job', job4_id,
     '{"title": "Mavi Otel Yönlendirme Tabelaları"}', NOW() - INTERVAL '10 days'),
    (admin_id, 'job_held', 'job', job4_id,
     '{"reason": "Malzeme bekleniyor"}', NOW() - INTERVAL '1 day');

    RAISE NOTICE '✅ Test verileri başarıyla eklendi!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Özet:';
    RAISE NOTICE '  - 5 Müşteri eklendi';
    RAISE NOTICE '  - 8 Süreç eklendi';
    RAISE NOTICE '  - 4 İş eklendi:';
    RAISE NOTICE '    • İş 1 (2024-001): Tamamlanmış ✅';
    RAISE NOTICE '    • İş 2 (2024-002): Devam ediyor (Baskı aşamasında) 🔄';
    RAISE NOTICE '    • İş 3 (2024-003): Acil - Yarın teslim ⚠️';
    RAISE NOTICE '    • İş 4 (2024-004): Gecikmiş - Malzeme bekleniyor 🔴';
    RAISE NOTICE '';
    RAISE NOTICE '👤 Test Kullanıcıları:';
    RAISE NOTICE '  - admin (Şifre: admin123)';
    RAISE NOTICE '  - akaya (Ali Kaya - Operator)';
    RAISE NOTICE '  - cyilmaz (Can Yılmaz - Operator)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test Senaryoları:';
    RAISE NOTICE '  1. "akaya" olarak giriş yap → Görevlerim''de görevleri gör';
    RAISE NOTICE '  2. Dashboard''da performans kartlarını kontrol et';
    RAISE NOTICE '  3. İş 2''nin detayına git → Timeline''da olayları gör';
    RAISE NOTICE '  4. İş 3''te "ACİL" badge''i gör (yarın teslim)';
    RAISE NOTICE '  5. İş 4''te "GECİKMİŞ" badge''i gör (deadline geçti)';

END $$;
