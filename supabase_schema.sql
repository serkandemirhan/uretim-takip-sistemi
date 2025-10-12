-- ReklamPRO Database Schema
-- Generated for Supabase import


-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (id uuid NOT NULL DEFAULT uuid_generate_v4(), user_id uuid, action character varying(100) NOT NULL, entity_type character varying(100), entity_id uuid, changes jsonb, ip_address inet, created_at timestamp without time zone DEFAULT now());

-- Table: customers
CREATE TABLE IF NOT EXISTS customers (id uuid NOT NULL DEFAULT uuid_generate_v4(), name character varying(255) NOT NULL, contact_person character varying(255), phone character varying(50), email character varying(255), address text, tax_office character varying(255), tax_number character varying(50), notes text, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());

-- Table: files
CREATE TABLE IF NOT EXISTS files (id uuid NOT NULL DEFAULT uuid_generate_v4(), bucket character varying(255) NOT NULL DEFAULT 'reklampro-files'::character varying, object_key character varying(500) NOT NULL, filename character varying(255) NOT NULL, file_type character varying(100), file_size bigint, ref_type character varying(50), ref_id uuid, uploaded_by uuid, checksum character varying(64), version integer DEFAULT 1, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), folder_path character varying(500), content_type character varying(255), url text);

-- Table: job_steps
CREATE TABLE IF NOT EXISTS job_steps (id uuid NOT NULL DEFAULT uuid_generate_v4(), job_id uuid NOT NULL, process_id uuid NOT NULL, order_index integer NOT NULL, assigned_to uuid, machine_id uuid, status character varying(50) DEFAULT 'pending'::character varying, is_parallel boolean DEFAULT false, started_at timestamp without time zone, completed_at timestamp without time zone, estimated_duration integer, actual_duration integer, production_quantity numeric, production_unit character varying(50), production_notes text, revision_no integer DEFAULT 1, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());

-- Table: jobs
CREATE TABLE IF NOT EXISTS jobs (id uuid NOT NULL DEFAULT uuid_generate_v4(), job_number character varying(50) NOT NULL, customer_id uuid, title character varying(255) NOT NULL, description text, status character varying(50) DEFAULT 'draft'::character varying, priority character varying(50) DEFAULT 'normal'::character varying, due_date date, revision_no integer DEFAULT 1, created_by uuid, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());

-- Table: machine_processes
CREATE TABLE IF NOT EXISTS machine_processes (id uuid NOT NULL DEFAULT uuid_generate_v4(), machine_id uuid NOT NULL, process_id uuid NOT NULL, created_at timestamp without time zone DEFAULT now());

-- Table: machines
CREATE TABLE IF NOT EXISTS machines (id uuid NOT NULL DEFAULT uuid_generate_v4(), name character varying(255) NOT NULL, code character varying(50) NOT NULL, type character varying(100), status character varying(50) DEFAULT 'active'::character varying, location character varying(255), capacity_per_hour numeric, notes text, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (id uuid NOT NULL DEFAULT uuid_generate_v4(), user_id uuid NOT NULL, title character varying(255) NOT NULL, message text, type character varying(50) DEFAULT 'info'::character varying, is_read boolean DEFAULT false, ref_type character varying(50), ref_id uuid, created_at timestamp without time zone DEFAULT now());

-- Table: processes
CREATE TABLE IF NOT EXISTS processes (id uuid NOT NULL DEFAULT uuid_generate_v4(), name character varying(255) NOT NULL, code character varying(50) NOT NULL, description text, is_machine_based boolean DEFAULT false, is_production boolean DEFAULT false, order_index integer DEFAULT 0, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), deleted_at timestamp with time zone);

-- Table: role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (id uuid NOT NULL DEFAULT gen_random_uuid(), role_id uuid NOT NULL, resource character varying(100) NOT NULL, can_view boolean DEFAULT false, can_create boolean DEFAULT false, can_update boolean DEFAULT false, can_delete boolean DEFAULT false, created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP);

-- Table: role_process_permissions
CREATE TABLE IF NOT EXISTS role_process_permissions (role_id uuid NOT NULL, process_id uuid NOT NULL, can_view boolean DEFAULT true);

-- Table: roles
CREATE TABLE IF NOT EXISTS roles (id uuid NOT NULL DEFAULT gen_random_uuid(), name character varying(100) NOT NULL, code character varying(50) NOT NULL, description text, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP);

-- Table: user_roles
CREATE TABLE IF NOT EXISTS user_roles (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role_id uuid NOT NULL, created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP);

-- Table: users
CREATE TABLE IF NOT EXISTS users (id uuid NOT NULL DEFAULT uuid_generate_v4(), username character varying(100) NOT NULL, email character varying(255) NOT NULL, password_hash character varying(255) NOT NULL, full_name character varying(255), role character varying(50) NOT NULL, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());


-- Indexes and Constraints
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE files ADD CONSTRAINT files_pkey PRIMARY KEY (id);
ALTER TABLE job_steps ADD CONSTRAINT job_steps_pkey PRIMARY KEY (id);
ALTER TABLE jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_pkey PRIMARY KEY (id);
ALTER TABLE machines ADD CONSTRAINT machines_pkey PRIMARY KEY (id);
ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE processes ADD CONSTRAINT processes_pkey PRIMARY KEY (id);
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_pkey PRIMARY KEY (process_id, role_id);
ALTER TABLE roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines (id) ON DELETE CASCADE;
ALTER TABLE machine_processes ADD CONSTRAINT machine_processes_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes (id) ON DELETE CASCADE;
ALTER TABLE jobs ADD CONSTRAINT jobs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL;
ALTER TABLE jobs ADD CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE job_steps ADD CONSTRAINT job_steps_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE;
ALTER TABLE job_steps ADD CONSTRAINT job_steps_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes (id);
ALTER TABLE job_steps ADD CONSTRAINT job_steps_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE job_steps ADD CONSTRAINT job_steps_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines (id) ON DELETE SET NULL;
ALTER TABLE files ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users (id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
ALTER TABLE role_process_permissions ADD CONSTRAINT role_process_permissions_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes (id) ON DELETE CASCADE;