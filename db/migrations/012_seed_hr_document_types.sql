-- ============================================
-- Seed HR document types and baseline requirements
-- ============================================

WITH upsert_types AS (
    INSERT INTO hr_document_types
        (code, name, description, requires_approval, default_validity_days, default_renew_before_days, metadata_schema, is_active)
    VALUES
        ('ID_CARD_COPY', 'Nüfus cüzdanı örneği', 'Çalışanın kimlik fotokopisi', TRUE, NULL, NULL, '{"fields":["issue_authority","issue_date"]}'::jsonb, TRUE),
        ('RESIDENCE_CERT', 'İkametgah belgesi', 'Güncel ikamet adresini gösteren belge', TRUE, 365, 60, '{"fields":["issue_date"]}'::jsonb, TRUE),
        ('CRIMINAL_RECORD', 'Adli sicil kaydı', 'Adli sicil kayıt örneği', TRUE, 365, 30, '{}'::jsonb, TRUE),
        ('HEALTH_REPORT', 'Sağlık raporu', 'İşe giriş sağlık raporu', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('EMPLOYMENT_CONTRACT', 'İş/Hizmet sözleşmesi', 'İşe girişte imzalanan sözleşme', TRUE, NULL, NULL, '{"fields":["contract_type","effective_date"]}'::jsonb, TRUE),
        ('FAMILY_STATUS_FORM', 'Aile durum bildirir belge', 'Aile durum bildirim formu', FALSE, NULL, NULL, '{}'::jsonb, TRUE),
        ('PHOTO_SET', 'Vesikalık fotoğraf', '2 adet vesikalık fotoğraf', FALSE, NULL, NULL, '{}'::jsonb, TRUE),
        ('SGK_ENTRY', 'SGK işe giriş bildirgesi', 'Sosyal güvenlik işe giriş bildirgesi', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('JOB_APPLICATION_FORM', 'İş başvuru formu', 'Adayın doldurduğu başvuru formu', FALSE, NULL, NULL, '{}'::jsonb, TRUE),
        ('REFERENCE_LETTER', 'Referans mektubu', 'Referans/öneri yazıları', FALSE, NULL, NULL, '{}'::jsonb, TRUE),
        ('DEPENDENT_ID_COPY', 'Bakmakla yükümlü kimlik fotokopileri', 'Bakmakla yükümlü olunan kişilerin kimlik fotokopileri', FALSE, NULL, NULL, '{}'::jsonb, TRUE),
        ('PARENTAL_CONSENT_UNDER18', 'Veli/Vasi onayı (18 yaş altı)', '18 yaşından küçük çalışanlar için veli onay belgesi', TRUE, NULL, NULL, '{"fields":["guardian_name","guardian_tc"]}'::jsonb, TRUE),
        ('FOREIGN_WORK_PERMIT', 'Yabancı çalışma izni', 'Yabancı uyruklu çalışan için çalışma izni belgesi', TRUE, NULL, NULL, '{"fields":["permit_number","expiry_date"]}'::jsonb, TRUE),
        ('DISABILITY_REPORT', 'Engelli sağlık kurulu raporu', 'Engelli personel için sağlık kurulu raporu', TRUE, NULL, NULL, '{"fields":["degree","issue_date"]}'::jsonb, TRUE),
        ('INCENTIVE_ELIGIBILITY_FORM', 'Teşvik yararlanma belgesi', 'Teşvik / İŞKUR kayıt belgesi', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('PERIODIC_HEALTH_CHECK', 'Periyodik sağlık kontrol raporu', 'Riskli işlerde periyodik sağlık kontrol raporu', TRUE, 365, 30, '{"fields":["check_type","issue_date"]}'::jsonb, TRUE),
        ('DRIVING_LICENSE', 'Araç kullanım ehliyeti', 'Araç kullanılan işlerde ehliyet belgesi', TRUE, NULL, NULL, '{"fields":["license_class","expiry_date"]}'::jsonb, TRUE),
        ('PPE_DELIVERY_FORM', 'Zimmet / KKD teslim formu', 'Zimmetli araç-gereç ve KKD teslim formu', FALSE, NULL, NULL, '{}'::jsonb, TRUE),
        ('SHIFT_SCHEDULE', 'Vardiya planı onayı', 'Vardiya planının onaylı kopyası', FALSE, NULL, NULL, '{}'::jsonb, TRUE),
        ('ANNUAL_LEAVE_FORM', 'Yıllık izin formu', 'Yıllık izin talep ve onay formu', FALSE, NULL, NULL, '{"fields":["period_start","period_end"]}'::jsonb, TRUE),
        ('UNPAID_LEAVE_FORM', 'Ücretsiz izin formu', 'Ücretsiz izin talep formu', FALSE, NULL, NULL, '{"fields":["period_start","period_end"]}'::jsonb, TRUE),
        ('SICK_REPORT', 'Sağlık raporu (devam)', 'Çalışma süresince alınan istirahat raporları', FALSE, NULL, NULL, '{"fields":["report_no","issue_date","return_date"]}'::jsonb, TRUE),
        ('ACCIDENT_REPORT', 'İş kazası tutanağı', 'İş kazası bildirimi ve tutanaklar', TRUE, NULL, NULL, '{"fields":["incident_date"]}'::jsonb, TRUE),
        ('DISCIPLINARY_DEFENSE', 'Yazılı savunma', 'Disiplin sürecinde alınan savunma yazıları', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('PAY_SLIP', 'Maaş bordrosu', 'Maaş/ücret pusulası', FALSE, NULL, NULL, '{"fields":["period"]}'::jsonb, TRUE),
        ('POSITION_CHANGE_FORM', 'Görev/ünvan değişikliği onayı', 'Görev değişikliği onay belgesi', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('OHS_TRAINING_RECORD', 'İSG eğitim katılım belgesi', 'İş güvenliği eğitim kayıtları', TRUE, 365, 60, '{"fields":["training_type","issue_date"]}'::jsonb, TRUE),
        ('RESIGNATION_LETTER', 'İstifa dilekçesi', 'Çalışanın istifa beyanı', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('TERMINATION_NOTICE', 'Fesih bildirimi', 'İşveren fesih bildirimi', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('IBRA_FORM', 'İbraname', 'İşten ayrılışta alınan ibraname', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('SGK_EXIT', 'SGK işten çıkış bildirgesi', 'Sosyal güvenlik işten ayrılış bildirimi', TRUE, NULL, NULL, '{}'::jsonb, TRUE),
        ('CLEARANCE_FORM', 'Zimmet/iade tutanağı', 'İşe ait zimmetlerin iade tutanağı', TRUE, NULL, NULL, '{}'::jsonb, TRUE)
    ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            requires_approval = EXCLUDED.requires_approval,
            default_validity_days = EXCLUDED.default_validity_days,
            default_renew_before_days = EXCLUDED.default_renew_before_days,
            metadata_schema = EXCLUDED.metadata_schema,
            updated_at = NOW(),
            is_active = TRUE
    RETURNING id, code
)
SELECT 1;

-- ============================================
-- Baseline mandatory requirements
-- ============================================

WITH type_ids AS (
    SELECT code, id FROM hr_document_types
),
mandatory_codes AS (
    SELECT code FROM (VALUES
        ('ID_CARD_COPY'),
        ('RESIDENCE_CERT'),
        ('CRIMINAL_RECORD'),
        ('HEALTH_REPORT'),
        ('EMPLOYMENT_CONTRACT'),
        ('SGK_ENTRY')
    ) AS vc(code)
)
INSERT INTO hr_document_requirements (document_type_id, is_mandatory, created_by)
SELECT t.id, TRUE, NULL
FROM type_ids t
JOIN mandatory_codes mc ON mc.code = t.code
ON CONFLICT DO NOTHING;

-- 18 yaş altı çalışanlar
INSERT INTO hr_document_requirements (document_type_id, is_mandatory, employment_type, created_by)
SELECT id, TRUE, 'minor', NULL
FROM hr_document_types
WHERE code = 'PARENTAL_CONSENT_UNDER18'
ON CONFLICT DO NOTHING;

-- Yabancı çalışanlar
INSERT INTO hr_document_requirements (document_type_id, is_mandatory, employment_type, created_by)
SELECT id, TRUE, 'foreign', NULL
FROM hr_document_types
WHERE code = 'FOREIGN_WORK_PERMIT'
ON CONFLICT DO NOTHING;

-- Engelli çalışanlar
INSERT INTO hr_document_requirements (document_type_id, is_mandatory, employment_type, created_by)
SELECT id, TRUE, 'disabled', NULL
FROM hr_document_types
WHERE code = 'DISABILITY_REPORT'
ON CONFLICT DO NOTHING;

-- Üretim departmanı periyodik sağlık kontrolü
INSERT INTO hr_document_requirements (document_type_id, is_mandatory, department_code, validity_days_override, renew_before_days_override, created_by)
SELECT id, TRUE, 'PRODUCTION', 365, 30, NULL
FROM hr_document_types
WHERE code = 'PERIODIC_HEALTH_CHECK'
ON CONFLICT DO NOTHING;

-- Lojistik / araç kullanan rollere ehliyet (örnek employment_type)
INSERT INTO hr_document_requirements (document_type_id, is_mandatory, employment_type, created_by)
SELECT id, TRUE, 'driver', NULL
FROM hr_document_types
WHERE code = 'DRIVING_LICENSE'
ON CONFLICT DO NOTHING;

-- Çıkış sürecinde zorunlu belgeler
INSERT INTO hr_document_requirements (document_type_id, is_mandatory, employment_type, created_by)
SELECT id, TRUE, 'terminated', NULL
FROM hr_document_types
WHERE code IN ('RESIGNATION_LETTER','TERMINATION_NOTICE','IBRA_FORM','SGK_EXIT','CLEARANCE_FORM')
ON CONFLICT DO NOTHING;
