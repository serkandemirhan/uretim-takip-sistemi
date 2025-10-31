# Supabase Database Schema Update

## Overview
This migration script syncs your Supabase database with all local schema changes made to the ReklamPRO system.

## What's Included

### New Modules & Features

1. **User Enhancements**
   - Avatar support (file_id and URL)
   - New role: `satinalma` (purchasing)

2. **Customer Management**
   - Customer dealers table
   - Support for multiple dealer locations per customer

3. **Process Management**
   - Process groups for organizing workflows
   - Folder name support for processes

4. **Job & Production Tracking**
   - Dealer assignment to jobs
   - Due date/time for job steps
   - Production quantity tracking
   - Job step notes system
   - Block/pause functionality with reasons

5. **Quotations Module**
   - Full quotation system with line items
   - Version control (major/minor)
   - Multi-currency support
   - Auto-calculation of totals
   - Job relation support

6. **Units Management**
   - Standard measurement units (ADET, KG, M, M2, etc.)
   - Extensible unit system

7. **Stock Management System**
   - Comprehensive stock tracking
   - Reserved, on-order, and available quantities
   - Minimum/maximum stock levels
   - Reorder points
   - Stock movements/transactions
   - Multi-currency support
   - Barcode support

8. **Stock Reservations**
   - Material reservations for jobs
   - Planned usage dates
   - Automatic quantity tracking
   - Usage vs. plan comparison

9. **Supplier Management**
   - Supplier information
   - Payment terms
   - Credit limits
   - Contact management

10. **RFQ System (Request for Quotation)**
    - Create RFQs with multiple items
    - Track supplier quotations
    - Compare prices and terms
    - Lead time tracking

11. **Purchase Orders & Goods Receipts**
    - Full purchase order lifecycle
    - Approval workflow
    - Goods receipt tracking
    - Status automation

12. **Purchase Requests**
    - Material purchase requests
    - Priority management
    - Approval workflow

13. **HR Documents Module**
    - Document types with categories (Onboarding, Operations, HR Lifecycle, Offboarding)
    - Document requirements by role/department
    - Employee document tracking
    - Version control for documents
    - Secure share links
    - Access logging
    - Bulk import functionality

### Automated Functions & Triggers

- Automatic quotation number generation (TKL-YYYY-NNNNN)
- Automatic purchase request number generation (PR-YYYY-NNN)
- Auto-calculation of quotation totals
- Auto-update of stock reserved quantities
- Auto-update of reservation usage
- Timestamp management for all tables
- Purchase order status updates on goods receipt

### Reporting Views

- `stock_availability_summary` - Real-time stock status
- `upcoming_material_needs` - Materials needed by date
- `critical_stock_alerts` - Items below minimum levels
- `v_critical_stocks` - Stock status with reorder suggestions

## Migration Steps

### 1. Backup Your Supabase Database

**IMPORTANT**: Always backup before running migrations!

```sql
-- In Supabase SQL Editor, you can export your schema
-- Go to: Project Settings > Database > Connection String
-- Use pg_dump to create a backup
```

### 2. Review the Migration Script

Open `supabase_complete_schema_update.sql` and review the changes to ensure they match your requirements.

### 3. Run the Migration

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy the entire contents of `supabase_complete_schema_update.sql`
5. Paste into the SQL Editor
6. Click "Run" to execute the script

### 4. Verify the Migration

After running the script, verify:

```sql
-- Check tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check specific new tables
SELECT * FROM stocks LIMIT 1;
SELECT * FROM quotations LIMIT 1;
SELECT * FROM suppliers LIMIT 1;
SELECT * FROM hr_document_types LIMIT 1;

-- Check views
SELECT * FROM stock_availability_summary LIMIT 5;
SELECT * FROM critical_stock_alerts LIMIT 5;
```

## Post-Migration Tasks

### 1. Seed HR Document Types (if using HR module)

You may want to seed the HR document types. Create a separate SQL file with your company's document types:

```sql
INSERT INTO hr_document_types (code, name, category, sequence_no, folder_code, description)
VALUES
  ('ID_CARD_COPY', 'Kimlik Fotokopisi', 'ONBOARDING', 1, 'ON_01', 'TC Kimlik kartı veya pasaport fotokopisi'),
  ('HEALTH_REPORT', 'Sağlık Raporu', 'ONBOARDING', 4, 'ON_04', 'İşe giriş sağlık raporu');
```

### 2. Update Row Level Security (RLS) Policies

If you're using Supabase RLS, you'll need to add policies for the new tables:

```sql
-- Example: Enable RLS on new tables
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Add your specific policies
CREATE POLICY "Users can view their own quotations"
  ON quotations FOR SELECT
  USING (auth.uid()::text = created_by::text);
```

### 3. Grant API Access

Ensure your API service role has access to the new tables in your backend code.

### 4. Update Your Frontend

Update your frontend application to use the new tables and fields:
- Add quotations UI
- Add stock management UI
- Add HR documents UI
- Update job forms with new fields (dealer, due date/time, etc.)

## Troubleshooting

### Foreign Key Errors

If you get foreign key constraint errors, it may be because some referenced tables don't exist yet. The script is designed to handle this, but if you encounter issues:

1. Check that the base `init.sql` schema was applied first
2. Ensure tables like `users`, `jobs`, `files` exist
3. Run the script again (it uses `IF NOT EXISTS` so it's safe to re-run)

### Trigger Already Exists

If you see "trigger already exists" errors:
- The script includes `DROP TRIGGER IF EXISTS` statements
- These warnings are safe to ignore

### Column Already Exists

If you see "column already exists" errors:
- The script uses `ADD COLUMN IF NOT EXISTS`
- These warnings are safe to ignore

### Permission Denied

If you get permission errors:
- Ensure you're running the script as a database owner or superuser
- In Supabase, use the SQL Editor which runs as the postgres role

## Rollback

If you need to rollback the migration:

1. Restore from your backup
2. Or manually drop the new tables:

```sql
-- Drop new tables (in reverse dependency order)
DROP TABLE IF EXISTS hr_document_import_items CASCADE;
DROP TABLE IF EXISTS hr_document_import_jobs CASCADE;
DROP TABLE IF EXISTS hr_document_access_logs CASCADE;
DROP TABLE IF EXISTS hr_document_share_links CASCADE;
DROP TABLE IF EXISTS hr_document_versions CASCADE;
DROP TABLE IF EXISTS hr_employee_documents CASCADE;
DROP TABLE IF EXISTS hr_document_requirements CASCADE;
DROP TABLE IF EXISTS hr_document_types CASCADE;

DROP TABLE IF EXISTS purchase_request_items CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS supplier_quotation_items CASCADE;
DROP TABLE IF EXISTS supplier_quotations CASCADE;
DROP TABLE IF EXISTS rfq_items CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS stock_reservations CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS job_step_notes CASCADE;
DROP TABLE IF EXISTS customer_dealers CASCADE;
DROP TABLE IF EXISTS process_groups CASCADE;

-- Drop views
DROP VIEW IF EXISTS v_critical_stocks CASCADE;
DROP VIEW IF EXISTS critical_stock_alerts CASCADE;
DROP VIEW IF EXISTS upcoming_material_needs CASCADE;
DROP VIEW IF EXISTS stock_availability_summary CASCADE;
```

## Need Help?

If you encounter any issues:

1. Check the Supabase logs for detailed error messages
2. Review the PostgreSQL error codes
3. Ensure your Supabase project is on a plan that supports the number of tables/columns you're adding
4. Contact your team's database administrator

## Notes

- The script is idempotent (safe to run multiple times)
- All new columns use `IF NOT EXISTS` clauses
- Triggers are dropped and recreated to ensure they're up to date
- The script runs in a transaction (BEGIN/COMMIT) so it will rollback on errors

## Summary

This migration adds approximately:
- **25+ new tables**
- **50+ new columns to existing tables**
- **20+ indexes**
- **15+ triggers and functions**
- **4 reporting views**

Total migration time: ~5-10 seconds (depending on existing data volume)
