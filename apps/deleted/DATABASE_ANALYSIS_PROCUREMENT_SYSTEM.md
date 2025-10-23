# ReklamPRO Database Structure Analysis
## For Procurement System Implementation (Quotations → Purchase Requests → Purchase Orders → Goods Receipt → Stock)

---

## EXECUTIVE SUMMARY

ReklamPRO already has a **partial procurement system foundation** in place:
- Quotations system (Teklifler) - EXISTS with full CRUD and versioning
- Stock/Inventory (Stok Kartları) - BASIC implementation with product tracking
- Stock Movements (Stok Hareketleri) - BASIC implementation for IN/OUT tracking
- Purchase Orders (Satın Alma Emirleri) - BASIC implementation with status tracking
- Jobs/Orders (İşler) - Core business process with customer-dealer relationships

**What needs to be built/enhanced:**
1. Proper linking of Quotations → Purchase Requests → Purchase Orders workflow
2. Goods Receipt (Mal Kabulü) tracking table and workflow
3. Enhanced stock allocation for jobs
4. Integration between jobs and stock/materials
5. Procurement workflow states and transitions

---

## 1. EXISTING DATABASE TABLES

### 1.1 Core Business Entities

#### **JOBS (İşler)** - Line 89-90 of supabase_schema.sql
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    job_number VARCHAR(50) UNIQUE,
    customer_id UUID REFERENCES customers,
    dealer_id UUID REFERENCES customer_dealers,
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    priority VARCHAR(50) DEFAULT 'normal',
    due_date DATE,
    revision_no INTEGER DEFAULT 1,
    created_by UUID REFERENCES users,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Current Status Values:** draft, active, on_hold, in_progress, completed, canceled

**Key Relationships:**
- Many-to-One: customers
- Many-to-One: customer_dealers (dealers)
- One-to-Many: job_steps (production steps)
- One-to-Many: stock_movements (materials used)

**Gap:** No direct relationship to quotations. No materials/BOM (Bill of Materials) associated with job.

---

#### **JOB_STEPS (İş Adımları)** - Line 55-77 of supabase_schema.sql
```sql
CREATE TABLE job_steps (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs,
    process_id UUID NOT NULL REFERENCES processes,
    order_index INTEGER,
    assigned_to UUID REFERENCES users,
    machine_id UUID REFERENCES machines,
    status VARCHAR(50) DEFAULT 'pending',
    is_parallel BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration INTEGER,  -- in minutes
    actual_duration INTEGER,
    production_quantity NUMERIC,
    production_unit VARCHAR(50),
    production_notes TEXT,
    block_reason TEXT,
    blocked_at TIMESTAMP,
    status_before_block VARCHAR(50),
    revision_no INTEGER DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Current Status Values:** pending, ready, in_progress, blocked, completed, canceled

**Connection to Stock:** No direct connection. No material allocation or consumption tracking.

---

### 1.2 Quotation System (EXISTING)

#### **QUOTATIONS (Teklifler)** - Migration 007_quotations.sql
```sql
CREATE TABLE quotations (
    id UUID PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers,
    description TEXT,
    version INTEGER DEFAULT 1,
    version_major INTEGER DEFAULT 1,
    version_minor INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',  -- draft, active, approved, rejected, archived
    total_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TRY',
    created_by UUID REFERENCES users,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Features:**
- Versioning system (major.minor)
- Multi-currency support
- Automatic total cost calculation via triggers
- Status workflow: draft → active → approved/rejected → archived

#### **QUOTATION_ITEMS (Teklif Kalemleri)** - Migration 007_quotations.sql
```sql
CREATE TABLE quotation_items (
    id UUID PRIMARY KEY,
    quotation_id UUID NOT NULL REFERENCES quotations CASCADE,
    stock_id UUID,  -- Optional reference to existing stock
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    category VARCHAR(100),
    quantity DECIMAL(15,3),
    unit VARCHAR(50),
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),  -- Calculated: quantity * unit_cost
    currency VARCHAR(10) DEFAULT 'TRY',
    unit_cost_try DECIMAL(15,2),  -- TRY equivalent
    total_cost_try DECIMAL(15,2),  -- Calculated: quantity * unit_cost_try
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Features:**
- Snapshot of product data (protects against stock deletion)
- Multi-currency support with TRY conversion
- Automatic total calculation
- Order preservation (order_index)

**API Endpoints Available:**
- GET /api/quotations - List all
- GET /api/quotations/{id} - Get detail with items
- POST /api/quotations - Create
- PUT /api/quotations/{id} - Update
- DELETE /api/quotations/{id} - Delete
- POST /api/quotations/{id}/items - Add items (bulk supported)
- PUT /api/quotations/{id}/items/{item_id} - Update item
- DELETE /api/quotations/{id}/items/{item_id} - Delete item
- POST /api/quotations/{id}/items/reorder - Reorder items

---

### 1.3 Stock Management System (BASIC IMPLEMENTATION)

#### **STOCKS (Stok Kartları)** - Line 171-186 of supabase_schema.sql
```sql
CREATE TABLE stocks (
    id UUID PRIMARY KEY,
    product_code VARCHAR(100) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'adet',
    current_quantity NUMERIC DEFAULT 0,
    min_quantity NUMERIC DEFAULT 0,
    unit_price NUMERIC,
    currency VARCHAR(10) DEFAULT 'TRY',
    supplier_name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Features:**
- Product catalog with codes and categories
- Current quantity tracking
- Minimum quantity threshold for alerts
- Unit pricing and currency support
- Soft delete (is_active flag)

**Gaps:**
- No reorder level management
- No supplier relationships (just name text)
- No warehouse/location tracking
- No batch/lot tracking
- No expiration date tracking

#### **STOCK_MOVEMENTS (Stok Hareketleri)** - Line 188-203 of supabase_schema.sql
```sql
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY,
    stock_id UUID NOT NULL REFERENCES stocks CASCADE,
    movement_type VARCHAR(10) NOT NULL,  -- IN or OUT
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC,
    currency VARCHAR(10),
    job_id UUID REFERENCES jobs,  -- Link to job (material consumption)
    purchase_order_id UUID REFERENCES purchase_orders,  -- Link to PO (receipt)
    purpose TEXT,
    document_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP,
    created_by UUID REFERENCES users
);
```

**Features:**
- IN/OUT tracking
- Links to jobs (material allocation/consumption)
- Links to purchase orders (receipt tracking)
- Audit trail with created_by

**Gaps:**
- No transaction type classification (purchase, production, adjustment, etc.)
- No reference to goods receipt document
- No cost tracking beyond unit_price
- No warehouse location for IN movements

#### **PURCHASE_ORDERS (Satın Alma Emirleri)** - Line 205-222 of supabase_schema.sql
```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY,
    stock_id UUID NOT NULL REFERENCES stocks CASCADE,
    order_code VARCHAR(100) NOT NULL UNIQUE,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'TRY',
    supplier_name VARCHAR(255) NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, DELIVERED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID REFERENCES users
);
```

**Current Status Values:** PENDING, DELIVERED, CANCELLED

**Features:**
- Single stock item per PO
- Delivery date tracking
- Multi-currency support
- Status transitions (PENDING → DELIVERED or CANCELLED)
- Automatic stock movement creation on delivery

**Gaps:**
- No line items (only single product per PO)
- No quotation reference
- No purchase request intermediary
- No goods receipt state (separate from DELIVERED)
- No partial delivery tracking
- No invoice/payment tracking

#### **UNITS (Ölçü Birimleri)** - Migration 008_units.sql
```sql
CREATE TABLE units (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Pre-populated Units:**
ADET (Piece), PAKET (Package), KUTU (Box), KG (Kilogram), M (Meter), M2 (Square Meter), CM (Centimeter), L (Liter)

---

### 1.4 Currency Management

#### **CURRENCY_SETTINGS (Döviz Kuru Ayarları)** - Line 224-231 of supabase_schema.sql
```sql
CREATE TABLE currency_settings (
    id UUID PRIMARY KEY,
    usd_to_try NUMERIC DEFAULT 1.0,
    eur_to_try NUMERIC DEFAULT 1.0,
    updated_at TIMESTAMP DEFAULT now(),
    updated_by UUID REFERENCES users
);
```

**Purpose:** Central location for exchange rates used in quotations and stock calculations.

---

### 1.5 Supporting Tables

#### **CUSTOMERS (Müşteriler)**
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    code VARCHAR(50),
    contact_person VARCHAR(255),
    phone, gsm, email VARCHAR,
    address TEXT,
    city VARCHAR(255),
    tax_office, tax_number VARCHAR(50),
    notes TEXT,
    short_code VARCHAR(50),
    postal_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### **CUSTOMER_DEALERS (Müşteri Bayileri)**
```sql
CREATE TABLE customer_dealers (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers CASCADE,
    name VARCHAR(255),
    address TEXT,
    district, city VARCHAR(255),
    contact_person, contact_phone VARCHAR,
    tax_office, tax_number VARCHAR(50),
    phone1, phone2 VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    postal_code VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### **PROCESSES (Süreçler)**
- Ölçü (Measurement)
- Keşif (Survey)
- Tasarım (Design)
- Baskı (Printing)
- Kesim (Cutting)
- Montaj (Assembly)

#### **MACHINES (Makineler)**
- HP Latex 360, CNC Router, Epson S80600, etc.
- Status: active, maintenance, inactive
- Linked to processes via machine_processes

---

## 2. WHAT'S MISSING FOR COMPLETE PROCUREMENT WORKFLOW

### 2.1 Missing Table: PURCHASE_REQUESTS (Satın Alma Talepleri)

**Purpose:** Intermediate step between quotation approval and purchase order creation.

**Suggested Structure:**
```sql
CREATE TABLE purchase_requests (
    id UUID PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE,
    quotation_id UUID REFERENCES quotations,  -- Optional: from which quotation
    job_id UUID REFERENCES jobs,  -- Optional: for which job
    status VARCHAR(50) DEFAULT 'draft',  -- draft, pending_approval, approved, rejected, cancelled
    created_by UUID REFERENCES users,
    approved_by UUID REFERENCES users,
    total_cost DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    requested_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE purchase_request_items (
    id UUID PRIMARY KEY,
    purchase_request_id UUID REFERENCES purchase_requests CASCADE,
    quotation_item_id UUID REFERENCES quotation_items,  -- Optional
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    quantity DECIMAL(15,3),
    unit VARCHAR(50),
    unit_cost DECIMAL(15,2),
    currency VARCHAR(10),
    notes TEXT,
    order_index INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Workflow:**
1. Quotation approved by customer
2. Purchase Request created from Quotation items
3. Purchase Request approved internally
4. Purchase Orders created from approved requests

---

### 2.2 Missing Table: GOODS_RECEIPTS (Mal Kabulü)

**Purpose:** Separate goods receipt document that tracks what was actually received, vs what was ordered.

**Suggested Structure:**
```sql
CREATE TABLE goods_receipts (
    id UUID PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE,
    purchase_order_id UUID REFERENCES purchase_orders,
    supplier_name VARCHAR(255),
    receipt_date DATE DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES users,
    warehouse_location VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending_inspection',  -- pending_inspection, inspected, accepted, rejected, partial
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE goods_receipt_lines (
    id UUID PRIMARY KEY,
    goods_receipt_id UUID REFERENCES goods_receipts CASCADE,
    stock_id UUID REFERENCES stocks,
    purchase_order_item_id UUID,  -- Reference to PO line (if PO had line items)
    ordered_quantity DECIMAL(15,3),
    received_quantity DECIMAL(15,3),
    unit VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP
);
```

**Workflow:**
1. Purchase Order sent to supplier
2. Goods arrive
3. Goods Receipt created
4. Items inspected (quality check)
5. Accepted/Rejected status set
6. Stock movement (IN) created only on acceptance

---

### 2.3 Missing: Job Material Allocation

**Purpose:** Track which materials are required for a specific job and allocate from stock.

**Suggested Structure:**
```sql
CREATE TABLE job_materials (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs CASCADE,
    stock_id UUID REFERENCES stocks,
    product_name VARCHAR(255),
    product_code VARCHAR(100),
    required_quantity DECIMAL(15,3),
    allocated_quantity DECIMAL(15,3) DEFAULT 0,
    consumed_quantity DECIMAL(15,3) DEFAULT 0,
    unit VARCHAR(50),
    unit_cost DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'TRY',
    status VARCHAR(50) DEFAULT 'required',  -- required, allocated, partially_consumed, consumed
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Purpose:**
- Link quotation items to job materials
- Track allocation (reserved from stock)
- Track consumption (actual usage)
- Validate sufficient stock exists before job start

---

## 3. CURRENT API ENDPOINTS

### 3.1 Quotations API
**Base URL:** `/api/quotations`

- GET / - List with filtering by status, customer
- GET /{id} - Get full quotation with items and totals
- POST / - Create new quotation
- PUT /{id} - Update quotation details
- DELETE /{id} - Delete quotation
- POST /{id}/items - Add items (bulk)
- PUT /{id}/items/{item_id} - Update item
- DELETE /{id}/items/{item_id} - Delete item
- POST /{id}/items/reorder - Reorder items

**Request/Response Examples Documented in:** /apps/api/app/routes/quotations.py

---

### 3.2 Stock Management API
**Base URL:** `/api/stocks`

- GET / - List stocks (with critical_only, category filters)
- GET /{id} - Get stock detail
- POST / - Create stock
- PATCH /{id} - Update stock
- DELETE /{id} - Soft delete (set is_active=false)
- GET /categories - List distinct categories
- GET /summary - Get total value, critical count, currency rates

**Request/Response Examples Documented in:** /apps/api/app/routes/stocks.py

---

### 3.3 Stock Movements API
**Base URL:** `/api/stock-movements`

- GET / - List movements (filter by stock_id, job_id, movement_type, date range)
- GET /{id} - Get movement detail
- POST / - Create movement (IN or OUT)
- DELETE /{id} - Delete movement (reverses stock adjustment)

**Validations:**
- Sufficient stock for OUT movements
- Job exists if job_id provided
- PO exists if purchase_order_id provided

**Request/Response Examples Documented in:** /apps/api/app/routes/stock_movements.py

---

### 3.4 Purchase Orders API
**Base URL:** `/api/purchase-orders`

- GET / - List POs (filter by stock_id, status)
- GET /{id} - Get PO detail
- POST / - Create PO
- PATCH /{id} - Update PO
- DELETE /{id} - Delete PO (blocked if stock movements exist)
- POST /{id}/deliver - Mark as delivered + create IN stock movement
- POST /{id}/cancel - Cancel PO

**Special Endpoints:**
- `/deliver` - Automatically creates stock_movements entry (IN) and updates stock

**Request/Response Examples Documented in:** /apps/api/app/routes/purchase_orders.py

---

### 3.5 Jobs API
**Base URL:** `/api/jobs`

- GET / - List jobs (search, filter by status/priority/customer, pagination)
- GET /{id} - Get job detail with steps
- POST / - Create job
- PATCH /{id} - Update job
- GET /{id}/steps - Get job steps
- POST /{id}/steps - Add step
- PATCH /{id}/steps/{step_id} - Update step
- DELETE /{id}/steps/{step_id} - Delete step

**No current material/stock endpoints for jobs**

**Request/Response Examples Documented in:** /apps/api/app/routes/jobs.py

---

## 4. FRONTEND PAGES & STRUCTURE

### 4.1 Stock Management Pages
- `/dashboard/stocks/inventory` - Inventory listing, search, add/edit stock cards
- `/dashboard/stocks/movements` - Stock movement history/ledger
- `/dashboard/stocks/movements/[id]` - Movement detail
- `/dashboard/stocks/purchase-orders` - Purchase orders listing and management
- `/dashboard/stocks/settings` - Stock settings (categories, suppliers)

### 4.2 Quotations Pages
- `/dashboard/quotations` - List all quotations
- `/dashboard/quotations/[id]` - Detail view (edit items, versioning)

### 4.3 Material/Components Pages
- `/dashboard/files/explorer` - File management for quotations/docs

### 4.4 Job Pages
- `/dashboard/jobs` - Job listing
- `/dashboard/jobs/new` - Create job
- `/dashboard/jobs/[id]` - Job detail
- `/dashboard/jobs/[id]/edit` - Edit job
- `/dashboard/jobs/[id]/revisions` - Job revision history

---

## 5. DATA MODEL RELATIONSHIPS

```
CUSTOMERS
  ├─ CUSTOMER_DEALERS (many, for regional distribution)
  ├─ JOBS (many, customer orders)
  │   ├─ JOB_STEPS (many, production processes)
  │   ├─ JOB_MATERIALS (many, required materials) [MISSING]
  │   └─ STOCK_MOVEMENTS (many, material consumption)
  └─ QUOTATIONS (many, customer quotes)
      └─ QUOTATION_ITEMS (many, line items)
          └─ STOCKS (optional reference)

STOCKS (Product Catalog)
  ├─ STOCK_MOVEMENTS (many, IN/OUT transactions)
  ├─ QUOTATION_ITEMS (many, can be referenced)
  ├─ PURCHASE_ORDERS (many, what to buy)
  │   ├─ GOODS_RECEIPTS (many, what arrived) [MISSING]
  │   └─ STOCK_MOVEMENTS (many, receipt IN)
  └─ JOB_MATERIALS (many, what job needs) [MISSING]

USERS
  ├─ JOBS (many, created_by)
  ├─ QUOTATIONS (many, created_by)
  ├─ JOB_STEPS (many, assigned_to)
  └─ STOCK_MOVEMENTS (many, created_by)

PROCESSES
  ├─ JOB_STEPS (many, process performed)
  └─ MACHINES (many, via machine_processes)

MACHINES
  ├─ JOB_STEPS (many, used in step)
  └─ PROCESSES (many, via machine_processes)
```

---

## 6. CURRENT BUSINESS LOGIC & WORKFLOWS

### 6.1 Quotation Workflow
1. Create quotation (name, customer, description)
2. Add items from stock or manual entry
3. System automatically calculates totals in multiple currencies
4. Update status: draft → active → approved/rejected → archived
5. Track versions (major.minor) for change history

### 6.2 Stock Management Workflow
1. Create stock cards with product info
2. Track current quantity vs minimum quantity
3. Create movements (IN/OUT) manually or from PO delivery
4. OUT movements validated against current quantity
5. Movement reversal available (deletes movement, reverses quantity change)

### 6.3 Purchase Order Workflow
1. Create PO manually or from quotation/request
2. Status: PENDING → (delivery process) → DELIVERED or CANCELLED
3. On deliver: automatically creates IN stock movement
4. Cannot delete PO if stock movements exist

### 6.4 Job Workflow
1. Create job from customer order
2. Add job steps (production processes)
3. Assign steps to users/machines
4. Track step status: pending → ready → in_progress → blocked/completed → canceled
5. Currently NO material tracking or consumption

---

## 7. KEY ARCHITECTURE DECISIONS & PATTERNS

### 7.1 Database Patterns
- **Soft Deletes:** Used for stocks (is_active flag), not for others
- **Audit Trail:** created_by, created_at, updated_at on most tables
- **Versioning:** Used in quotations (major.minor) and jobs (revision_no)
- **Snapshot Pattern:** Quotation_items snapshot product data (protects data)
- **Currency Conversion:** Central currency_settings for multi-currency support
- **Automatic Calculations:** Database triggers for quotation totals and item totals

### 7.2 API Patterns
- Flask Blueprint-based routing
- Token-based auth middleware
- Permission-based access control
- Idempotent operations
- Standard error responses with HTTP status codes

### 7.3 Data Validation
- Non-null field validation in API layer
- Foreign key constraint validation in DB
- Stock quantity validation for OUT movements
- Decimal precision for monetary values (NUMERIC type)

---

## 8. RECOMMENDATIONS FOR PROCUREMENT SYSTEM ENHANCEMENT

### Priority 1: Immediate (Foundation)
1. **Add Purchase Request table** - Intermediary step for workflow control
2. **Add Job Materials table** - Link jobs to material requirements
3. **Add Goods Receipt table** - Separate receipt from delivery status
4. **Enhance Purchase Orders** - Support line items, not just single product

### Priority 2: Short-term (Integration)
1. **Job-Quotation linking** - Allow creating jobs from quotations
2. **Stock allocation API** - Reserve stock for jobs
3. **Material consumption tracking** - Track actual usage per job step
4. **Purchase request approval workflow** - Add approval routing

### Priority 3: Medium-term (Advanced)
1. **Multi-item purchase orders** - Support multiple products per PO
2. **Partial delivery tracking** - Handle phased deliveries
3. **Invoice/Payment tracking** - Link to financial system
4. **Supplier management** - Dedicated supplier table vs text field
5. **Warehouse locations** - Track where materials are stored

### Priority 4: Long-term (Optimization)
1. **Batch/Lot tracking** - Expiration dates, quality lots
2. **Automated reordering** - Min quantity triggers
3. **Supply chain forecasting** - Predict needs based on job pipeline
4. **Cost analysis** - Job profitability by material costs
5. **Integration with accounting** - Real-time cost tracking

---

## 9. SQL SCHEMA SUMMARY FOR REFERENCE

### Core Tables (EXISTING)
- users, customers, customer_dealers
- machines, processes, machine_processes, process_groups
- jobs, job_steps, job_step_notes
- files, audit_logs, notifications
- roles, user_roles, role_permissions

### Stock Management (EXISTING BUT BASIC)
- stocks (product catalog)
- stock_movements (IN/OUT ledger)
- purchase_orders (vendor orders)
- currency_settings (exchange rates)
- units (measurement units)

### Quotations (EXISTING AND COMPLETE)
- quotations (main table with versioning)
- quotation_items (line items with multi-currency)

### TO BE CREATED
- purchase_requests + purchase_request_items
- goods_receipts + goods_receipt_lines
- job_materials (job requirements)

---

## 10. MIGRATION PATH

To implement the full procurement workflow while maintaining backward compatibility:

1. Create missing tables as new migrations (010, 011, 012, etc.)
2. Add optional foreign keys to existing tables
3. Create API endpoints for new entities
4. Create frontend pages for new workflows
5. Maintain existing API compatibility
6. Gradually migrate business logic

---

