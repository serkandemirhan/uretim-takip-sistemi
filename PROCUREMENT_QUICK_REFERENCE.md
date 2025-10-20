# ReklamPRO Procurement System - Quick Reference

## Current State vs Needed State

### QUOTATION SYSTEM - COMPLETE
```
✅ quotations table (with versioning major.minor)
✅ quotation_items (with multi-currency support)
✅ Full API endpoints (CRUD, add items, reorder)
✅ Automatic calculations (totals via triggers)
✅ Status workflow (draft → active → approved/rejected → archived)
```

### STOCK MANAGEMENT - PARTIAL
```
✅ stocks table (product catalog)
✅ stock_movements (IN/OUT tracking)
✅ purchase_orders (vendor orders)
✅ API endpoints for all operations
✅ Soft delete pattern (is_active)

❌ NO: Goods receipt tracking (separate from PO delivery)
❌ NO: Multi-item purchase orders (only 1 product per PO)
❌ NO: Warehouse locations
❌ NO: Supplier management table
❌ NO: Batch/lot tracking
```

### JOB/ORDER MANAGEMENT - PARTIAL
```
✅ jobs table (customer orders)
✅ job_steps (production steps)
✅ job_step_notes (audit trail)
✅ Dealer associations
✅ Step status workflow

❌ NO: Direct quotation links
❌ NO: Material requirements (BOM)
❌ NO: Stock allocation for jobs
❌ NO: Material consumption tracking
```

### PROCUREMENT WORKFLOW - MISSING
```
❌ NO: Purchase requests (intermediary step)
❌ NO: Goods receipts (quality inspection)
❌ NO: Job materials (allocation tracking)
❌ NO: Approval workflows
❌ NO: Quotation → Purchase Request → PO workflow
```

---

## Key Database Files

| File | Purpose |
|------|---------|
| `/Users/user/ReklamPRO/supabase_schema.sql` | Main schema with core tables |
| `/Users/user/ReklamPRO/db/init.sql` | Detailed schema with data types |
| `/Users/user/ReklamPRO/db/migrations/007_quotations.sql` | Quotations + triggers |
| `/Users/user/ReklamPRO/db/migrations/008_units.sql` | Measurement units |
| `/Users/user/ReklamPRO/db/migrations/009_quotation_enhancements.sql` | Currency support |
| `/Users/user/ReklamPRO/apps/api/migrations/007_add_job_dealer.sql` | Job dealer link |

---

## Key API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/quotations` | GET, POST, PUT, DELETE | Main quotation CRUD |
| `/api/quotations/{id}/items` | POST, PUT, DELETE | Line items |
| `/api/stocks` | GET, POST, PATCH, DELETE | Stock management |
| `/api/stock-movements` | GET, POST, DELETE | Movement ledger |
| `/api/purchase-orders` | GET, POST, PATCH, DELETE | PO management |
| `/api/purchase-orders/{id}/deliver` | POST | Mark as received |
| `/api/jobs` | GET, POST, PATCH | Job management |
| `/api/jobs/{id}/steps` | GET, POST, PATCH, DELETE | Job steps |

---

## What to Build First (Priority Order)

### Phase 1: Core Missing Tables
1. **purchase_requests** - Intermediary between quotation & PO
2. **purchase_request_items** - Line items for PR
3. **goods_receipts** - Quality inspection step
4. **goods_receipt_lines** - Receipt line items

### Phase 2: Job Materials
1. **job_materials** - Track material requirements per job
2. Allocation logic - Reserve stock for jobs
3. Consumption tracking - Update as job progresses

### Phase 3: Enhanced Purchase Orders
1. Support multiple line items per PO
2. Link to purchase requests
3. Partial delivery support

### Phase 4: Workflow Integration
1. Link jobs → quotations → purchase requests
2. Automatic PO generation from approved PRs
3. Stock allocation validation

---

## Example Workflow Flow

```
1. QUOTATION CREATION
   ├─ Create quotation (draft status)
   ├─ Add items from stock or manual
   └─ System calculates totals (TRY + multi-currency)

2. QUOTATION APPROVAL
   ├─ Customer approves quotation
   └─ Status: draft → approved

3. PURCHASE REQUEST [MISSING]
   ├─ Create PR from approved quotation items
   ├─ Internal approval workflow
   └─ Status: draft → pending_approval → approved

4. PURCHASE ORDER CREATION
   ├─ Create PO(s) from approved PR
   ├─ Select supplier
   └─ Status: PENDING

5. GOODS RECEIPT [MISSING]
   ├─ Supplier ships goods
   ├─ Create goods receipt
   ├─ Inspect items (quality check)
   └─ Accept/Reject status

6. STOCK UPDATE
   ├─ Accepted items: IN stock movement
   ├─ Update current_quantity
   └─ Complete

7. JOB EXECUTION [PARTIALLY MISSING]
   ├─ Create job from quotation [NEED LINK]
   ├─ Allocate materials from stock [NEED TABLE]
   ├─ Track consumption as job_steps progress [NEED LOGIC]
   └─ Final material variance report [NEED FEATURE]
```

---

## SQL Diagrams

### Current Relationships (Existing)
```
customers
  ├─ jobs → job_steps → processes
  ├─ quotations → quotation_items → stocks
  └─ customer_dealers → jobs

stocks
  ├─ stock_movements ─→ jobs (consumption)
  ├─ stock_movements ─→ purchase_orders (receipt)
  └─ purchase_orders ─→ delivery → stock_movements
```

### With Procurement Enhancements
```
customers
  ├─ jobs → job_materials ─→ stocks
  ├─ quotations → purchase_requests ─→ purchase_orders
  └─ customer_dealers → jobs

stocks
  ├─ stock_movements ─→ jobs (consumption)
  ├─ purchase_orders ─→ goods_receipts ─→ stock_movements
  ├─ purchase_requests ─→ purchase_request_items
  └─ job_materials (allocation)
```

---

## Multi-Currency Support (Already Implemented)

**Currency Conversion Flow:**
1. currency_settings table stores: USD→TRY, EUR→TRY rates
2. Quotation items store: unit_cost, total_cost (original currency)
3. Quotation items store: unit_cost_try, total_cost_try (converted)
4. Triggers auto-calculate conversions
5. API returns all calculations

**Example:**
```
Quotation Item:
  currency: USD
  unit_cost: 100
  quantity: 5
  
Conversion (if 1 USD = 30 TRY):
  unit_cost_try: 3000
  total_cost_try: 15000
  
Quotation shows TRY total of 15000
```

---

## Key Architectural Patterns

### Database Patterns
- **Soft Delete:** stocks.is_active = false (reversible)
- **Versioning:** quotations.version_major, version_minor
- **Snapshot:** quotation_items copy product data (independent)
- **Audit Trail:** created_by, created_at, updated_at fields
- **Triggers:** Automatic calculations on INSERT/UPDATE

### API Patterns
- **Blueprints:** Flask Blueprint organization
- **Auth:** token_required middleware on all endpoints
- **Permissions:** permission_required for sensitive ops
- **Status Codes:** 200, 201, 400, 404, 500
- **Decimal Precision:** NUMERIC type for money

### Validation Patterns
- **Required Fields:** Checked in API layer
- **Constraints:** Foreign keys at DB level
- **Stock Validation:** Insufficient quantity blocks OUT
- **Exists Check:** Job, PO exists before reference
- **Uniqueness:** product_code, order_code, quotation_number

---

## Frontend Pages Inventory

| Page | Status | Purpose |
|------|--------|---------|
| /quotations | EXISTS | List/create/edit quotations |
| /quotations/[id] | EXISTS | Quotation detail with items |
| /stocks/inventory | EXISTS | Stock card management |
| /stocks/purchase-orders | EXISTS | PO listing/creation |
| /stocks/movements | EXISTS | Ledger view |
| /jobs | EXISTS | Job listing |
| /jobs/[id] | EXISTS | Job detail with steps |
| NEED: /purchase-requests | MISSING | PR management |
| NEED: /goods-receipts | MISSING | Receipt inspection |
| NEED: /job-materials | MISSING | Job BOM management |

---

## Performance Considerations

### Current Indexes
```
- idx_quotations_customer, status, created_at
- idx_quotation_items_quotation, stock, order
- idx_stocks_product_code
- idx_stock_movements_stock_id, job_id
- idx_purchase_orders_stock_id, status
- idx_jobs_customer, status, created_by
- idx_job_steps_job, assigned, machine, status
- idx_customer_dealers_customer_id
```

### Recommended New Indexes
```
- idx_purchase_requests_quotation_id
- idx_purchase_requests_status
- idx_goods_receipts_purchase_order_id
- idx_goods_receipts_status
- idx_job_materials_job_id
- idx_job_materials_stock_id
```

---

