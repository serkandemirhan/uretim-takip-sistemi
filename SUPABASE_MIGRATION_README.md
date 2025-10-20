# Supabase Schema Synchronization

## Overview
This document explains the schema synchronization between your local PostgreSQL database and Supabase for the ReklamPRO project.

## Files Created

### 1. `supabase_migration.sql`
A targeted migration script that adds missing columns and updates the existing Supabase schema to match your current local database.

### 2. `supabase_schema.sql` (Updated)
The complete schema file has been updated to reflect the current state of your local database.

## Key Changes Identified

### Tables Analysis
All 21 tables from your local database are already defined in the schema:
- audit_logs
- currency_settings
- customer_dealers
- customers
- files
- job_step_notes
- job_steps
- jobs
- machine_processes
- machines
- notifications
- process_groups
- processes
- purchase_orders
- role_permissions
- role_process_permissions
- roles
- stock_movements
- stocks
- user_roles
- users

### Schema Differences Fixed

#### 1. **roles table**
   - **Removed**: `permissions` jsonb column (not in local schema)
   - **Updated**: Column order to match local database (name, code, description)

#### 2. **user_roles table**
   - **Updated**: Column order to match local database
   - `assigned_at` uses `now()` instead of `CURRENT_TIMESTAMP` (functionally equivalent)

#### 3. **users table**
   - ✅ Already has `avatar_file_id` and `avatar_url` columns

## How to Apply the Migration

### Option 1: Run the Migration Script (Recommended)
If your Supabase database already has the basic schema, run the migration script:

```bash
# Connect to your Supabase database and run:
psql -h <your-supabase-host> -U postgres -d postgres -f supabase_migration.sql
```

Or use the Supabase SQL Editor:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase_migration.sql`
4. Click "Run"

### Option 2: Full Schema Import (Fresh Start)
If you're setting up a new Supabase database from scratch:

```bash
# Connect to your Supabase database and run:
psql -h <your-supabase-host> -U postgres -d postgres -f supabase_schema.sql
```

## Migration Script Features

The `supabase_migration.sql` script is:
- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Only adds missing elements
- **Comprehensive**: Includes all tables, indexes, constraints, and foreign keys

### What the Migration Does:
1. Enables UUID extension
2. Removes the `permissions` jsonb column from `roles` table (not in local schema)
3. Ensures `updated_at` column exists in `roles` table
4. Adds `avatar_file_id` and `avatar_url` to `users` table (if missing)
5. Creates all necessary foreign key constraints
6. Creates all required indexes for optimal performance

## Verification

After running the migration, verify the schema matches:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check roles table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'roles'
ORDER BY ordinal_position;

-- Check users table for avatar columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('avatar_file_id', 'avatar_url');
```

## Important Notes

1. **UUID Extension**: The migration ensures `uuid-ossp` extension is enabled
2. **Data Preservation**: All existing data will be preserved
3. **Foreign Keys**: All relationships are properly maintained
4. **Indexes**: Performance indexes are created for frequently queried columns

## Next Steps

After applying the migration:
1. Test your application connectivity to Supabase
2. Verify all tables and columns are accessible
3. Run your application's test suite
4. Consider setting up Supabase Auth if using user authentication

## Support

If you encounter any issues:
- Check Supabase logs in the Dashboard
- Verify your connection string
- Ensure you have proper permissions on the Supabase database