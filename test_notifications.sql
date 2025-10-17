-- Admin kullanıcısı için test bildirimleri oluştur

-- Önce admin kullanıcısının ID'sini alalım
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Admin kullanıcısının ID'sini bul
    SELECT id INTO admin_id FROM users WHERE username = 'admin' LIMIT 1;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin kullanıcısı bulunamadı!';
    END IF;

    RAISE NOTICE 'Admin kullanıcı ID: %', admin_id;

    -- Test bildirimleri ekle

    -- 1. Info tipi bildirim
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
        admin_id,
        'Hoş Geldiniz',
        'ReklamPRO sistemine hoş geldiniz! Notification sistemi başarıyla çalışıyor.',
        'info',
        false
    );

    -- 2. Success tipi bildirim
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
        admin_id,
        'İş Tamamlandı',
        'Test işi başarıyla tamamlandı. Tüm adımlar başarılı.',
        'success',
        false
    );

    -- 3. Warning tipi bildirim
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
        admin_id,
        'Dikkat Gerekli',
        'Makine bakım zamanı yaklaşıyor. Lütfen HP Latex 360 için bakım planlayın.',
        'warning',
        false
    );

    -- 4. Error tipi bildirim
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
        admin_id,
        'Hata Oluştu',
        'Test baskı işleminde hata meydana geldi. Lütfen kontrol edin.',
        'error',
        false
    );

    -- 5. İşe referanslı bildirim (job ref)
    INSERT INTO notifications (user_id, title, message, type, ref_type, is_read)
    VALUES (
        admin_id,
        'Yeni İş Atandı',
        'Size yeni bir iş atandı. Detayları kontrol etmeyi unutmayın.',
        'info',
        'job',
        false
    );

    -- 6. Bir okunmuş bildirim
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
        admin_id,
        'Sistem Güncellemesi',
        'Sistem güncellemesi başarıyla tamamlandı. (Bu okunmuş bir bildirimdir)',
        'success',
        true
    );

    RAISE NOTICE 'Test bildirimleri başarıyla oluşturuldu!';

END $$;

-- Oluşturulan bildirimleri göster
SELECT
    id,
    title,
    message,
    type,
    is_read,
    ref_type,
    created_at
FROM notifications
WHERE user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
ORDER BY created_at DESC;