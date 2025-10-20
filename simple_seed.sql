-- Basit test verisi - sadece işler ve görevler

DO $$
DECLARE
    admin_id uuid;
    operator1_id uuid;
    customer1_id uuid;
    customer2_id uuid;
    process1_id uuid;
    process2_id uuid;
    job1_id uuid;
    job2_id uuid;
BEGIN
    -- Mevcut kullanıcılar
    SELECT id INTO admin_id FROM users WHERE username = 'admin';
    SELECT id INTO operator1_id FROM users WHERE username = 'akaya';
    
    -- Müşteri ekle
    IF NOT EXISTS (SELECT 1 FROM customers WHERE code = 'TEST001') THEN
        INSERT INTO customers (name, code, contact_person, phone, city)
        VALUES ('Test Müşteri 1', 'TEST001', 'Ahmet Test', '0555 111 2233', 'İstanbul')
        RETURNING id INTO customer1_id;
    ELSE
        SELECT id INTO customer1_id FROM customers WHERE code = 'TEST001';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM customers WHERE code = 'TEST002') THEN
        INSERT INTO customers (name, code, contact_person, phone, city)
        VALUES ('Test Müşteri 2', 'TEST002', 'Ayşe Test', '0555 444 5566', 'Ankara')
        RETURNING id INTO customer2_id;
    ELSE
        SELECT id INTO customer2_id FROM customers WHERE code = 'TEST002';
    END IF;
    
    -- Mevcut süreçler
    SELECT id INTO process1_id FROM processes WHERE code = 'OLCU' LIMIT 1;
    SELECT id INTO process2_id FROM processes WHERE code = 'BASKI' LIMIT 1;
    
    -- İŞ 1: Tamamlanmış
    INSERT INTO jobs (job_number, customer_id, title, status, priority, due_date, created_by, created_at)
    VALUES ('TEST-001', customer1_id, 'Test İş Tamamlanmış', 'completed', 'normal',
            CURRENT_DATE - INTERVAL '10 days', admin_id, NOW() - INTERVAL '30 days')
    RETURNING id INTO job1_id;
    
    -- İş 1 görevleri
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration,
                           started_at, completed_at, production_quantity, production_unit)
    VALUES 
    (job1_id, process1_id, 1, operator1_id, 'completed', 60,
     NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '50 minutes',
     1, 'adet'),
    (job1_id, process2_id, 2, operator1_id, 'completed', 120,
     NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days',
     10, 'm²');
    
    -- İŞ 2: Devam ediyor
    INSERT INTO jobs (job_number, customer_id, title, status, priority, due_date, created_by, created_at)
    VALUES ('TEST-002', customer2_id, 'Test İş Devam Ediyor', 'in_progress', 'high',
            CURRENT_DATE + INTERVAL '3 days', admin_id, NOW() - INTERVAL '5 days')
    RETURNING id INTO job2_id;
    
    -- İş 2 görevleri
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration,
                           started_at, completed_at, production_quantity, production_unit)
    VALUES 
    (job1_id, process1_id, 1, operator1_id, 'completed', 90,
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days',
     1, 'adet');
     
    INSERT INTO job_steps (job_id, process_id, order_index, assigned_to, status, estimated_duration, started_at)
    VALUES 
    (job2_id, process2_id, 2, operator1_id, 'in_progress', 180, NOW() - INTERVAL '2 hours');
    
    -- İŞ 3: Acil
    INSERT INTO jobs (job_number, customer_id, title, status, priority, due_date, created_by, created_at)
    VALUES ('TEST-003', customer1_id, 'Acil Test İşi', 'in_progress', 'urgent',
            CURRENT_DATE + INTERVAL '1 day', admin_id, NOW() - INTERVAL '2 days');
    
    RAISE NOTICE '✅ Test verileri eklendi!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Özet:';
    RAISE NOTICE '  - 2 Müşteri (TEST001, TEST002)';
    RAISE NOTICE '  - 3 İş (TEST-001, TEST-002, TEST-003)';
    RAISE NOTICE '  - TEST-001: Tamamlanmış ✅';
    RAISE NOTICE '  - TEST-002: Devam ediyor 🔄';
    RAISE NOTICE '  - TEST-003: Acil - Yarın teslim ⚠️';
    RAISE NOTICE '';
    RAISE NOTICE '👤 Test için "akaya" kullanıcısıyla giriş yapın';
    
END $$;
