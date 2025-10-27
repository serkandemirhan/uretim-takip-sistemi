-- ============================================
-- HR document categories, sequence codes, folder prefixes
-- ============================================

ALTER TABLE hr_document_types
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'HR_LIFECYCLE',
    ADD COLUMN IF NOT EXISTS sequence_no INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS folder_code VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_hr_document_types_category'
          AND conrelid = 'hr_document_types'::regclass
    ) THEN
        ALTER TABLE hr_document_types
            ADD CONSTRAINT chk_hr_document_types_category
                CHECK (category IN ('ONBOARDING','OPERATIONS','HR_LIFECYCLE','OFFBOARDING'));
    END IF;
END $$;

-- Existing records: assign categories and sequence numbers
WITH mapping AS (
    SELECT code, category, sequence_no FROM (
        VALUES
            ('ID_CARD_COPY','ONBOARDING',1),
            ('RESIDENCE_CERT','ONBOARDING',2),
            ('CRIMINAL_RECORD','ONBOARDING',3),
            ('HEALTH_REPORT','ONBOARDING',4),
            ('EMPLOYMENT_CONTRACT','ONBOARDING',5),
            ('SGK_ENTRY','ONBOARDING',6),
            ('FAMILY_STATUS_FORM','ONBOARDING',7),
            ('PHOTO_SET','ONBOARDING',8),
            ('JOB_APPLICATION_FORM','ONBOARDING',9),
            ('REFERENCE_LETTER','ONBOARDING',10),
            ('DEPENDENT_ID_COPY','ONBOARDING',11),
            ('PARENTAL_CONSENT_UNDER18','ONBOARDING',12),
            ('FOREIGN_WORK_PERMIT','ONBOARDING',13),
            ('DISABILITY_REPORT','ONBOARDING',14),
            ('INCENTIVE_ELIGIBILITY_FORM','ONBOARDING',15),

            ('PERIODIC_HEALTH_CHECK','OPERATIONS',1),
            ('DRIVING_LICENSE','OPERATIONS',2),
            ('PPE_DELIVERY_FORM','OPERATIONS',3),
            ('SHIFT_SCHEDULE','OPERATIONS',4),
            ('OHS_TRAINING_RECORD','OPERATIONS',5),

            ('ANNUAL_LEAVE_FORM','HR_LIFECYCLE',1),
            ('UNPAID_LEAVE_FORM','HR_LIFECYCLE',2),
            ('SICK_REPORT','HR_LIFECYCLE',3),
            ('ACCIDENT_REPORT','HR_LIFECYCLE',4),
            ('DISCIPLINARY_DEFENSE','HR_LIFECYCLE',5),
            ('PAY_SLIP','HR_LIFECYCLE',6),
            ('POSITION_CHANGE_FORM','HR_LIFECYCLE',7),

            ('RESIGNATION_LETTER','OFFBOARDING',1),
            ('TERMINATION_NOTICE','OFFBOARDING',2),
            ('IBRA_FORM','OFFBOARDING',3),
            ('SGK_EXIT','OFFBOARDING',4),
            ('CLEARANCE_FORM','OFFBOARDING',5)
    ) AS t(code, category, sequence_no)
)
UPDATE hr_document_types t
SET category = m.category,
    sequence_no = m.sequence_no
FROM mapping m
WHERE t.code = m.code;

-- Compute folder codes (prefix + two digit sequence)
WITH prefix AS (
    SELECT 'ONBOARDING' AS category, 'ON' AS prefix UNION ALL
    SELECT 'OPERATIONS','OP' UNION ALL
    SELECT 'HR_LIFECYCLE','HR' UNION ALL
    SELECT 'OFFBOARDING','OF'
)
UPDATE hr_document_types t
SET folder_code = CONCAT(p.prefix, '_', LPAD(t.sequence_no::text, 2, '0'))
FROM prefix p
WHERE t.category = p.category;

-- Ensure all rows have folder_code
UPDATE hr_document_types
SET folder_code = CONCAT('HR', '_', LPAD(sequence_no::text, 2, '0'))
WHERE folder_code IS NULL;

ALTER TABLE hr_document_types
    ALTER COLUMN folder_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_hr_document_types_folder_code ON hr_document_types(folder_code);

-- Remove default of 0 for new rows to enforce explicit sequence assignment
ALTER TABLE hr_document_types ALTER COLUMN sequence_no DROP DEFAULT;
ALTER TABLE hr_document_types ALTER COLUMN category DROP DEFAULT;
