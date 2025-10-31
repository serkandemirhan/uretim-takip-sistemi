## Supabase Database Migration Guide

This guide will help you sync your Supabase database with your local PostgreSQL schema.

## Files

1. **[supabase_01_add_missing_columns.sql](supabase_01_add_missing_columns.sql)** - Adds missing columns to existing tables
2. **[supabase_schema_from_local.sql](supabase_schema_from_local.sql)** - Creates all tables and basic structure
3. **[supabase_constraints_and_triggers.sql](supabase_constraints_and_triggers.sql)** - Adds foreign keys, triggers, and functions

## Migration Steps

### Step 1: Backup Your Database

**CRITICAL**: Always backup before running migrations!

1. Go to Supabase Dashboard → Project Settings → Database
2. Create a backup or export your schema

### Step 2: Add Missing Columns to Existing Tables

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy the **entire contents** of `supabase_01_add_missing_columns.sql`
4. Paste into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Wait for completion (should take ~5-10 seconds)

### Step 3: Create New Tables

1. Stay in the SQL Editor
2. Create a new query
3. Copy the **entire contents** of `supabase_schema_from_local.sql`
4. Paste into the SQL Editor
5. Click "Run"
6. Wait for completion (should take ~10-20 seconds)

### Step 4: Add Foreign Keys and Triggers

1. Stay in the SQL Editor
2. Create a new query
3. Copy the **entire contents** of `supabase_constraints_and_triggers.sql`
4. Paste into the SQL Editor
5. Click "Run"
6. Wait for completion (should take ~5-10 seconds)

### Step 5: Verify the Migration

Run these verification queries in the SQL Editor:

```sql
-- Check that all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check critical tables have data structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stocks'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quotations'
ORDER BY ordinal_position;

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Test a simple query
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM stocks;
SELECT COUNT(*) FROM quotations;
```

## What This Migration Includes

### New/Updated Tables

1. **stocks** - Complete inventory management with custom fields (group1-10, category1-10, etc.)
2. **quotations** & **quotation_items** - Full quotation system with versioning
3. **purchase_orders** - Enhanced with RFQ and supplier relations
4. **goods_receipts** - Quality control and receipt tracking
5. **stock_movements** - Material transaction tracking
6. **stock_reservations** - Job-based material reservations
7. **suppliers** - Supplier management
8. **rfqs**, **rfq_items** - Request for Quotation system
9. **supplier_quotations**, **supplier_quotation_items** - Supplier responses
10. **purchase_requests**, **purchase_request_items** - Purchase request workflow
11. **customer_dealers** - Multiple dealer locations per customer
12. **process_groups** - Process organization
13. **job_step_notes** - Notes on job steps
14. **units** - Measurement units
15. **job_materials** - Material planning for jobs
16. **stock_field_settings** - Custom field configuration
17. **purchase_order_items**, **goods_receipt_lines** - Detailed line items
18. **purchase_request_purchase_orders** - Request to order linking
19. **rfq_quotations**, **rfq_quotation_items** - Alternative RFQ structure
20. **HR Documents Module** (9 tables) - Complete document compliance system
21. **roles**, **user_roles**, **role_permissions** - Enhanced RBAC
22. **currency_settings** - Multi-currency support

### Automated Features

- **Auto-numbering**: Quotations (TKL-YYYY-NNNNN format)
- **Auto-calculation**: Quotation totals, line totals
- **Auto-tracking**: Stock reserved quantities
- **Auto-update**: Reservation usage tracking
- **Timestamps**: Automatic updated_at management

### Reporting Views

The migration also includes these views (they might need to be recreated separately):

- `stock_availability_summary`
- `upcoming_material_needs`
- `critical_stock_alerts`
- `v_critical_stocks`
- `job_material_usage_summary`
- `purchase_request_status_view`
- `stock_status_view`
- `v_goods_receipt_tracking`
- `v_purchase_order_tracking`

## Post-Migration Tasks

### 1. Set Up Row Level Security (RLS)

If you use Supabase Auth, enable RLS on new tables:

```sql
-- Example: Enable RLS
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Example: Add policies
CREATE POLICY "Users can view all stocks"
  ON stocks FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own quotations"
  ON quotations FOR SELECT
  USING (auth.uid()::text = created_by::text);
```

### 2. Grant API Access

Ensure your API service role has access:

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

### 3. Seed Default Data

Insert default units (already included in the schema script):

```sql
-- Units are automatically seeded by the schema script
SELECT * FROM units;
```

### 4. Update Your Application

Update your frontend/backend code to use the new schema:

- Update TypeScript types
- Update API endpoints
- Update UI components
- Test all CRUD operations

## Common Issues & Solutions

### Issue: "relation already exists"

**Solution**: The script uses `CREATE TABLE IF NOT EXISTS`, so this is just a warning. Safe to ignore.

### Issue: "column already exists"

**Solution**: The script checks before adding columns. Safe to ignore.

### Issue: "foreign key constraint failed" or "column does not exist"

**Solution**: Make sure you ran the scripts in the correct order:
1. First: `supabase_01_add_missing_columns.sql`
2. Second: `supabase_schema_from_local.sql`
3. Third: `supabase_constraints_and_triggers.sql`

### Issue: "permission denied"

**Solution**: Make sure you're using the Supabase SQL Editor, which runs as the postgres superuser.

### Issue: Missing views

**Solution**: Views might need to be recreated. Check your local database and recreate any missing views manually.

## Rollback

If something goes wrong, restore from your backup:

1. Go to Supabase Dashboard → Project Settings → Database → Backups
2. Restore from the backup you created before migration

Or manually drop the new tables (dangerous - make sure you have a backup!):

```sql
BEGIN;

-- Drop all new tables in reverse dependency order
DROP TABLE IF EXISTS hr_document_import_items CASCADE;
DROP TABLE IF EXISTS hr_document_import_jobs CASCADE;
DROP TABLE IF EXISTS hr_document_access_logs CASCADE;
DROP TABLE IF EXISTS hr_document_share_links CASCADE;
DROP TABLE IF EXISTS hr_document_versions CASCADE;
DROP TABLE IF EXISTS hr_employee_documents CASCADE;
DROP TABLE IF EXISTS hr_document_requirements CASCADE;
DROP TABLE IF EXISTS hr_document_types CASCADE;

DROP TABLE IF EXISTS purchase_request_purchase_orders CASCADE;
DROP TABLE IF EXISTS goods_receipt_lines CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS rfq_quotation_items CASCADE;
DROP TABLE IF EXISTS rfq_quotations CASCADE;
DROP TABLE IF EXISTS purchase_request_items CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS supplier_quotation_items CASCADE;
DROP TABLE IF EXISTS supplier_quotations CASCADE;
DROP TABLE IF EXISTS rfq_items CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS stock_reservations CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS job_materials CASCADE;
DROP TABLE IF EXISTS stock_field_settings CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS job_step_notes CASCADE;
DROP TABLE IF EXISTS customer_dealers CASCADE;
DROP TABLE IF EXISTS process_groups CASCADE;
DROP TABLE IF EXISTS currency_settings CASCADE;
DROP TABLE IF EXISTS role_process_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

COMMIT;
```

## Testing

After migration, test these workflows:

1. **Stock Management**
   - Create a stock item
   - Create a stock movement
   - Check reserved quantities

2. **Quotations**
   - Create a quotation
   - Add line items
   - Check total calculation

3. **Purchase Flow**
   - Create a purchase request
   - Create an RFQ
   - Add supplier quotations
   - Create purchase order

4. **Stock Reservations**
   - Create a job
   - Reserve materials
   - Check stock availability

## Need Help?

- Check Supabase logs for detailed errors
- Review PostgreSQL error messages
- Compare your local database structure with Supabase
- Ensure all dependent tables exist before creating foreign keys

## Summary

This migration syncs your Supabase database with your local PostgreSQL schema, including:

- ✅ 30+ tables
- ✅ 50+ foreign key relationships
- ✅ 15+ triggers and functions
- ✅ Auto-numbering and calculations
- ✅ Complete stock management system
- ✅ Quotation system
- ✅ Purchase workflow
- ✅ HR documents module
- ✅ RBAC system

Total migration time: ~30-60 seconds

---

**Generated**: 2025-10-29
**Source**: Local PostgreSQL database schema dump