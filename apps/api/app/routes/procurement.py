"""
Procurement API Blueprint
Handles purchasing needs analysis, RFQs, and supplier quotations
"""

from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required, permission_required
import uuid
from datetime import datetime, timedelta

procurement_bp = Blueprint('procurement', __name__, url_prefix='/api/procurement')


@procurement_bp.route('/needs-analysis', methods=['GET'])
@token_required
def get_needs_analysis():
    """
    Comprehensive materials needs analysis combining:
    1. Active project materials from approved quotations
    2. Critical stock levels (below minimum)

    Returns materials that need to be ordered either due to:
    - Project shortages (not enough stock for planned projects)
    - Critical stock levels (below minimum stock level)
    """
    try:
        # Get filter type from query params
        filter_type = request.args.get('filter', 'all')  # 'all', 'project_shortage', 'critical_stock'

        query = """
            WITH active_jobs_materials AS (
                -- Get all materials from approved quotations for active/draft jobs
                SELECT
                    qi.stock_id,
                    s.product_code,
                    s.product_name,
                    s.category,
                    s.unit,
                    SUM(qi.quantity) as total_planned,
                    j.id as job_id,
                    j.job_number,
                    j.title as job_title,
                    j.status as job_status
                FROM quotation_items qi
                JOIN quotations q ON qi.quotation_id = q.id
                JOIN jobs j ON q.job_id = j.id
                JOIN stocks s ON qi.stock_id = s.id
                WHERE q.status = 'approved'
                AND j.status IN ('draft', 'active', 'on_hold')
                AND qi.stock_id IS NOT NULL
                GROUP BY qi.stock_id, s.product_code, s.product_name, s.category, s.unit,
                         j.id, j.job_number, j.title, j.status
            ),
            stock_usage AS (
                -- Calculate how much has been used and reserved for each job
                SELECT
                    sm.stock_id,
                    sm.job_id,
                    COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0) as used_quantity
                FROM stock_movements sm
                WHERE sm.job_id IS NOT NULL
                GROUP BY sm.stock_id, sm.job_id
            ),
            stock_reservations_summary AS (
                -- Get reserved quantities per stock per job
                SELECT
                    sr.stock_id,
                    sr.job_id,
                    COALESCE(SUM(sr.reserved_quantity - sr.used_quantity), 0) as reserved_remaining
                FROM stock_reservations sr
                WHERE sr.status IN ('active', 'partially_used')
                GROUP BY sr.stock_id, sr.job_id
            ),
            job_materials_combined AS (
                -- Combine planned, used, and reserved for each stock-job combination
                SELECT
                    ajm.stock_id,
                    ajm.product_code,
                    ajm.product_name,
                    ajm.category,
                    ajm.unit,
                    ajm.job_id,
                    ajm.job_number,
                    ajm.job_title,
                    ajm.job_status,
                    ajm.total_planned,
                    COALESCE(su.used_quantity, 0) as used_quantity,
                    COALESCE(srs.reserved_remaining, 0) as reserved_remaining,
                    GREATEST(ajm.total_planned - COALESCE(su.used_quantity, 0), 0) as remaining_need
                FROM active_jobs_materials ajm
                LEFT JOIN stock_usage su ON ajm.stock_id = su.stock_id AND ajm.job_id = su.job_id
                LEFT JOIN stock_reservations_summary srs ON ajm.stock_id = srs.stock_id AND ajm.job_id = srs.job_id
            ),
            stock_aggregate AS (
                -- Aggregate all materials by stock
                SELECT
                    jmc.stock_id,
                    jmc.product_code,
                    jmc.product_name,
                    jmc.category,
                    jmc.unit,
                    SUM(jmc.total_planned) as total_planned,
                    SUM(jmc.used_quantity) as total_used,
                    SUM(jmc.reserved_remaining) as total_reserved,
                    SUM(jmc.remaining_need) as total_remaining_need,
                    COUNT(DISTINCT jmc.job_id) as jobs_count,
                    ARRAY_AGG(DISTINCT jmc.job_number) as job_numbers
                FROM job_materials_combined jmc
                GROUP BY jmc.stock_id, jmc.product_code, jmc.product_name, jmc.category, jmc.unit
            ),
            current_stock_status AS (
                -- Get current stock levels and minimums
                SELECT
                    s.id as stock_id,
                    s.product_code,
                    s.product_name,
                    s.category,
                    s.unit,
                    s.current_quantity,
                    s.reserved_quantity,
                    s.available_quantity,
                    s.on_order_quantity,
                    COALESCE(s.min_stock_level, 0) as min_stock_level,
                    COALESCE(s.reorder_point, 0) as reorder_point
                FROM stocks s
            ),
            final_analysis AS (
                -- Combine project needs with current stock status
                SELECT
                    COALESCE(sa.stock_id, css.stock_id) as stock_id,
                    COALESCE(sa.product_code, css.product_code) as product_code,
                    COALESCE(sa.product_name, css.product_name) as product_name,
                    COALESCE(sa.category, css.category) as category,
                    COALESCE(sa.unit, css.unit) as unit,

                    -- Project-related
                    COALESCE(sa.total_planned, 0) as total_planned,
                    COALESCE(sa.total_used, 0) as total_used,
                    COALESCE(sa.total_reserved, 0) as total_reserved,
                    COALESCE(sa.total_remaining_need, 0) as total_remaining_need,
                    COALESCE(sa.jobs_count, 0) as jobs_count,
                    sa.job_numbers,

                    -- Stock-related
                    COALESCE(css.current_quantity, 0) as current_quantity,
                    COALESCE(css.reserved_quantity, 0) as reserved_quantity,
                    COALESCE(css.available_quantity, 0) as available_quantity,
                    COALESCE(css.on_order_quantity, 0) as on_order_quantity,
                    COALESCE(css.min_stock_level, 0) as min_stock_level,
                    COALESCE(css.reorder_point, 0) as reorder_point,

                    -- Calculations
                    CASE
                        WHEN COALESCE(sa.total_remaining_need, 0) > (COALESCE(css.available_quantity, 0) + COALESCE(css.on_order_quantity, 0))
                        THEN COALESCE(sa.total_remaining_need, 0) - (COALESCE(css.available_quantity, 0) + COALESCE(css.on_order_quantity, 0))
                        ELSE 0
                    END as project_shortage,

                    CASE
                        WHEN COALESCE(css.current_quantity, 0) < COALESCE(css.min_stock_level, 0) AND COALESCE(css.min_stock_level, 0) > 0
                        THEN COALESCE(css.min_stock_level, 0) - COALESCE(css.current_quantity, 0)
                        ELSE 0
                    END as below_minimum,

                    CASE
                        WHEN COALESCE(css.current_quantity, 0) <= COALESCE(css.reorder_point, 0) AND COALESCE(css.reorder_point, 0) > 0
                        THEN true
                        ELSE false
                    END as needs_reorder

                FROM stock_aggregate sa
                FULL OUTER JOIN current_stock_status css ON sa.stock_id = css.stock_id
            )
            SELECT *
            FROM final_analysis
            WHERE
                CASE
                    WHEN %s = 'project_shortage' THEN project_shortage > 0
                    WHEN %s = 'critical_stock' THEN (below_minimum > 0 OR needs_reorder = true)
                    ELSE (project_shortage > 0 OR below_minimum > 0 OR needs_reorder = true)
                END
            ORDER BY
                (project_shortage + below_minimum) DESC,
                product_name ASC
        """

        results = execute_query(query, (filter_type, filter_type))

        materials = []
        for row in results:
            materials.append({
                'stock_id': str(row['stock_id']),
                'product_code': row['product_code'],
                'product_name': row['product_name'],
                'category': row['category'],
                'unit': row['unit'],

                # Project data
                'total_planned': float(row['total_planned']),
                'total_used': float(row['total_used']),
                'total_reserved': float(row['total_reserved']),
                'total_remaining_need': float(row['total_remaining_need']),
                'jobs_count': int(row['jobs_count']),
                'job_numbers': row['job_numbers'] if row['job_numbers'] else [],

                # Stock data
                'current_quantity': float(row['current_quantity']),
                'reserved_quantity': float(row['reserved_quantity']),
                'available_quantity': float(row['available_quantity']),
                'on_order_quantity': float(row['on_order_quantity']),
                'min_stock_level': float(row['min_stock_level']),
                'reorder_point': float(row['reorder_point']),

                # Analysis
                'project_shortage': float(row['project_shortage']),
                'below_minimum': float(row['below_minimum']),
                'needs_reorder': bool(row['needs_reorder']),

                # Suggested order quantity
                'suggested_order_quantity': max(
                    float(row['project_shortage']),
                    float(row['below_minimum'])
                ),

                # Issue type
                'issue_type': 'both' if (float(row['project_shortage']) > 0 and float(row['below_minimum']) > 0)
                             else 'project' if float(row['project_shortage']) > 0
                             else 'stock_level'
            })

        return jsonify({
            'data': materials,
            'summary': {
                'total_items': len(materials),
                'project_shortage_items': sum(1 for m in materials if m['project_shortage'] > 0),
                'critical_stock_items': sum(1 for m in materials if m['below_minimum'] > 0 or m['needs_reorder']),
                'total_shortage_value': sum(m['project_shortage'] + m['below_minimum'] for m in materials)
            }
        }), 200

    except Exception as e:
        print(f"Error in needs analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


# ==================== RFQ Endpoints ====================

@procurement_bp.route('/rfq', methods=['POST'])
@token_required
def create_rfq():
    """Create a new RFQ with items"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']

        # Generate RFQ number
        year_month = datetime.now().strftime('%Y%m')
        count_query = "SELECT COUNT(*) as count FROM rfqs WHERE rfq_number LIKE %s"
        count_result = execute_query(count_query, (f'RFQ-{year_month}%',))
        next_number = count_result[0]['count'] + 1 if count_result else 1
        rfq_number = f"RFQ-{year_month}-{next_number:04d}"

        # Create RFQ
        rfq_id = str(uuid.uuid4())
        rfq_query = """
            INSERT INTO rfqs (id, rfq_number, title, description, status, due_date, notes, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        execute_write(rfq_query, (
            rfq_id,
            rfq_number,
            data.get('title', 'Malzeme Talebi'),
            data.get('description', ''),
            'draft',
            data.get('due_date'),
            data.get('notes', ''),
            user_id
        ))

        # Create RFQ items
        items = data.get('items', [])
        for item in items:
            # Get product details from stocks table
            stock_query = "SELECT product_code, product_name, unit FROM stocks WHERE id = %s"
            stock_result = execute_query(stock_query, (item.get('stock_id'),))

            if not stock_result:
                continue  # Skip if stock not found

            stock_data = stock_result[0]

            item_id = str(uuid.uuid4())
            item_query = """
                INSERT INTO rfq_items (id, rfq_id, stock_id, product_code, product_name, quantity, unit, required_date, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            execute_write(item_query, (
                item_id,
                rfq_id,
                item.get('stock_id'),
                stock_data['product_code'],
                stock_data['product_name'],
                item.get('quantity'),
                stock_data['unit'],
                item.get('required_date'),
                item.get('notes', '')
            ))

        return jsonify({
            'message': 'RFQ başarıyla oluşturuldu',
            'rfq_id': rfq_id,
            'rfq_number': rfq_number
        }), 201

    except Exception as e:
        print(f"Error creating RFQ: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/rfq', methods=['GET'])
@token_required
def list_rfqs():
    """List all RFQs with filtering"""
    try:
        status = request.args.get('status', '')
        search = request.args.get('search', '')

        query = """
            SELECT
                r.id,
                r.rfq_number,
                r.title,
                r.description,
                r.status,
                r.due_date,
                r.created_at,
                u.full_name as created_by_name,
                COUNT(ri.id) as items_count,
                COUNT(DISTINCT sq.id) as quotations_count
            FROM rfqs r
            LEFT JOIN users u ON r.created_by = u.id
            LEFT JOIN rfq_items ri ON r.id = ri.rfq_id
            LEFT JOIN supplier_quotations sq ON r.id = sq.rfq_id
            WHERE 1=1
        """

        params = []

        if status:
            query += " AND r.status = %s"
            params.append(status)

        if search:
            query += " AND (r.rfq_number LIKE %s OR r.title LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])

        query += """
            GROUP BY r.id, r.rfq_number, r.title, r.description, r.status, r.due_date, r.created_at, u.full_name
            ORDER BY r.created_at DESC
        """

        rfqs = execute_query(query, tuple(params) if params else None)

        result = []
        for rfq in rfqs:
            result.append({
                'id': str(rfq['id']),
                'rfq_number': rfq['rfq_number'],
                'title': rfq['title'],
                'description': rfq['description'],
                'status': rfq['status'],
                'due_date': rfq['due_date'].isoformat() if rfq['due_date'] else None,
                'created_at': rfq['created_at'].isoformat() if rfq['created_at'] else None,
                'created_by_name': rfq['created_by_name'],
                'items_count': int(rfq['items_count']) if rfq['items_count'] else 0,
                'quotations_count': int(rfq['quotations_count']) if rfq['quotations_count'] else 0
            })

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"Error listing RFQs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/rfq/<rfq_id>', methods=['GET'])
@token_required
def get_rfq_detail(rfq_id):
    """Get RFQ details with items"""
    try:
        # Get RFQ info
        rfq_query = """
            SELECT
                r.*,
                u.full_name as created_by_name
            FROM rfqs r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = %s
        """
        rfq = execute_query(rfq_query, (rfq_id,))

        if not rfq:
            return jsonify({'error': 'RFQ bulunamadı'}), 404

        rfq = rfq[0]

        # Get RFQ items
        items_query = """
            SELECT
                ri.*,
                s.current_quantity as stock_current_quantity,
                s.available_quantity as stock_available_quantity
            FROM rfq_items ri
            LEFT JOIN stocks s ON ri.stock_id = s.id
            WHERE ri.rfq_id = %s
            ORDER BY ri.created_at
        """
        items = execute_query(items_query, (rfq_id,))

        # Get supplier quotations
        quotations_query = """
            SELECT
                sq.id,
                sq.quotation_number,
                sq.status,
                sq.quotation_date,
                sq.valid_until,
                s.name as supplier_name,
                s.contact_person as supplier_contact,
                COUNT(sqi.id) as items_count
            FROM supplier_quotations sq
            LEFT JOIN suppliers s ON sq.supplier_id = s.id
            LEFT JOIN supplier_quotation_items sqi ON sq.id = sqi.quotation_id
            WHERE sq.rfq_id = %s
            GROUP BY sq.id, sq.quotation_number, sq.status, sq.quotation_date, sq.valid_until,
                     s.name, s.contact_person
            ORDER BY sq.created_at DESC
        """
        quotations = execute_query(quotations_query, (rfq_id,))

        result = {
            'id': str(rfq['id']),
            'rfq_number': rfq['rfq_number'],
            'title': rfq['title'],
            'description': rfq['description'],
            'status': rfq['status'],
            'due_date': rfq['due_date'].isoformat() if rfq['due_date'] else None,
            'notes': rfq['notes'],
            'created_at': rfq['created_at'].isoformat() if rfq['created_at'] else None,
            'created_by_name': rfq['created_by_name'],
            'items': [{
                'id': str(item['id']),
                'stock_id': str(item['stock_id']) if item['stock_id'] else None,
                'product_code': item['product_code'],
                'product_name': item['product_name'],
                'quantity': float(item['quantity']),
                'unit': item['unit'],
                'required_date': item['required_date'].isoformat() if item['required_date'] else None,
                'notes': item['notes'],
                'stock_current_quantity': float(item['stock_current_quantity']) if item['stock_current_quantity'] else 0,
                'stock_available_quantity': float(item['stock_available_quantity']) if item['stock_available_quantity'] else 0
            } for item in items],
            'quotations': [{
                'id': str(q['id']),
                'quotation_number': q['quotation_number'],
                'status': q['status'],
                'quotation_date': q['quotation_date'].isoformat() if q['quotation_date'] else None,
                'valid_until': q['valid_until'].isoformat() if q['valid_until'] else None,
                'supplier_name': q['supplier_name'],
                'supplier_contact': q['supplier_contact'],
                'items_count': int(q['items_count']) if q['items_count'] else 0
            } for q in quotations]
        }

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"Error getting RFQ detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/rfq/<rfq_id>', methods=['PUT'])
@token_required
def update_rfq(rfq_id):
    """Update RFQ"""
    try:
        data = request.get_json()

        update_query = """
            UPDATE rfqs
            SET title = %s,
                description = %s,
                due_date = %s,
                notes = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """

        execute_write(update_query, (
            data.get('title'),
            data.get('description'),
            data.get('due_date'),
            data.get('notes'),
            rfq_id
        ))

        return jsonify({'message': 'RFQ güncellendi'}), 200

    except Exception as e:
        print(f"Error updating RFQ: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/rfq/<rfq_id>/status', methods=['PATCH'])
@token_required
def update_rfq_status(rfq_id):
    """Update RFQ status (e.g., send, close)"""
    try:
        data = request.get_json()
        new_status = data.get('status')

        if new_status not in ['draft', 'sent', 'responded', 'closed', 'cancelled']:
            return jsonify({'error': 'Geçersiz durum'}), 400

        update_query = """
            UPDATE rfqs
            SET status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """

        execute_write(update_query, (new_status, rfq_id))

        return jsonify({'message': 'RFQ durumu güncellendi'}), 200

    except Exception as e:
        print(f"Error updating RFQ status: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


# ==================== Supplier Endpoints ====================

@procurement_bp.route('/suppliers', methods=['POST'])
@token_required
def create_supplier():
    """Create a new supplier"""
    try:
        data = request.get_json()

        supplier_id = str(uuid.uuid4())
        query = """
            INSERT INTO suppliers (
                id, name, contact_person, email, phone, address,
                tax_number, payment_terms, credit_limit, currency, is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        execute_write(query, (
            supplier_id,
            data.get('name'),
            data.get('contact_person'),
            data.get('email'),
            data.get('phone'),
            data.get('address'),
            data.get('tax_number'),
            data.get('payment_terms'),
            data.get('credit_limit'),
            data.get('currency', 'TRY'),
            data.get('is_active', True)
        ))

        return jsonify({
            'message': 'Tedarikçi başarıyla oluşturuldu',
            'supplier_id': supplier_id
        }), 201

    except Exception as e:
        print(f"Error creating supplier: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/suppliers', methods=['GET'])
@token_required
def list_suppliers():
    """List all suppliers"""
    try:
        is_active = request.args.get('is_active', '')
        search = request.args.get('search', '')

        query = "SELECT * FROM suppliers WHERE 1=1"
        params = []

        if is_active:
            query += " AND is_active = %s"
            params.append(is_active == 'true')

        if search:
            query += " AND (name LIKE %s OR contact_person LIKE %s OR email LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

        query += " ORDER BY name ASC"

        suppliers = execute_query(query, tuple(params) if params else None)

        result = []
        for s in suppliers:
            result.append({
                'id': str(s['id']),
                'name': s['name'],
                'contact_person': s['contact_person'],
                'email': s['email'],
                'phone': s['phone'],
                'address': s['address'],
                'tax_number': s['tax_number'],
                'payment_terms': s['payment_terms'],
                'credit_limit': float(s['credit_limit']) if s['credit_limit'] else None,
                'currency': s['currency'],
                'is_active': bool(s['is_active']),
                'created_at': s['created_at'].isoformat() if s['created_at'] else None
            })

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"Error listing suppliers: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/suppliers/<supplier_id>', methods=['GET'])
@token_required
def get_supplier(supplier_id):
    """Get supplier details"""
    try:
        query = "SELECT * FROM suppliers WHERE id = %s"
        supplier = execute_query(query, (supplier_id,))

        if not supplier:
            return jsonify({'error': 'Tedarikçi bulunamadı'}), 404

        s = supplier[0]
        return jsonify({
            'data': {
                'id': str(s['id']),
                'name': s['name'],
                'contact_person': s['contact_person'],
                'email': s['email'],
                'phone': s['phone'],
                'address': s['address'],
                'tax_number': s['tax_number'],
                'payment_terms': s['payment_terms'],
                'credit_limit': float(s['credit_limit']) if s['credit_limit'] else None,
                'currency': s['currency'],
                'is_active': bool(s['is_active']),
                'created_at': s['created_at'].isoformat() if s['created_at'] else None
            }
        }), 200

    except Exception as e:
        print(f"Error getting supplier: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/suppliers/<supplier_id>', methods=['PUT'])
@token_required
def update_supplier(supplier_id):
    """Update supplier"""
    try:
        data = request.get_json()

        query = """
            UPDATE suppliers
            SET name = %s,
                contact_person = %s,
                email = %s,
                phone = %s,
                address = %s,
                tax_number = %s,
                payment_terms = %s,
                credit_limit = %s,
                currency = %s,
                is_active = %s
            WHERE id = %s
        """

        execute_write(query, (
            data.get('name'),
            data.get('contact_person'),
            data.get('email'),
            data.get('phone'),
            data.get('address'),
            data.get('tax_number'),
            data.get('payment_terms'),
            data.get('credit_limit'),
            data.get('currency', 'TRY'),
            data.get('is_active', True),
            supplier_id
        ))

        return jsonify({'message': 'Tedarikçi güncellendi'}), 200

    except Exception as e:
        print(f"Error updating supplier: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


# ==================== Supplier Quotation Endpoints ====================

@procurement_bp.route('/rfq/<rfq_id>/quotations', methods=['POST'])
@token_required
def create_supplier_quotation(rfq_id):
    """Create a supplier quotation for an RFQ"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']

        # Generate quotation number
        year_month = datetime.now().strftime('%Y%m')
        count_query = "SELECT COUNT(*) as count FROM supplier_quotations WHERE quotation_number LIKE %s"
        count_result = execute_query(count_query, (f'SQ-{year_month}%',))
        next_number = count_result[0]['count'] + 1 if count_result else 1
        quotation_number = f"SQ-{year_month}-{next_number:04d}"

        # Create supplier quotation
        quotation_id = str(uuid.uuid4())
        quotation_query = """
            INSERT INTO supplier_quotations (
                id, rfq_id, supplier_id, quotation_number, quotation_date,
                valid_until, payment_terms, delivery_terms, status, notes, created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        execute_write(quotation_query, (
            quotation_id,
            rfq_id,
            data.get('supplier_id'),
            quotation_number,
            data.get('quotation_date', datetime.now().date()),
            data.get('valid_until'),
            data.get('payment_terms'),
            data.get('delivery_terms'),
            'pending',
            data.get('notes', ''),
            user_id
        ))

        # Create quotation items
        items = data.get('items', [])
        for item in items:
            # Get product details from RFQ items
            rfq_item_query = """
                SELECT ri.stock_id, ri.product_code, ri.product_name, ri.unit
                FROM rfq_items ri
                WHERE ri.id = %s
            """
            rfq_item_result = execute_query(rfq_item_query, (item.get('rfq_item_id'),))

            if not rfq_item_result:
                continue  # Skip if RFQ item not found

            rfq_item_data = rfq_item_result[0]

            item_id = str(uuid.uuid4())
            item_query = """
                INSERT INTO supplier_quotation_items (
                    id, quotation_id, rfq_item_id, stock_id, product_code, product_name,
                    unit_price, quantity, unit, lead_time_days, notes, currency
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            execute_write(item_query, (
                item_id,
                quotation_id,
                item.get('rfq_item_id'),
                rfq_item_data['stock_id'],
                rfq_item_data['product_code'],
                rfq_item_data['product_name'],
                item.get('unit_price'),
                item.get('quantity'),
                rfq_item_data['unit'],
                item.get('lead_time_days'),
                item.get('notes', ''),
                item.get('currency', 'TRY')
            ))

        return jsonify({
            'message': 'Tedarikçi teklifi başarıyla oluşturuldu',
            'quotation_id': quotation_id,
            'quotation_number': quotation_number
        }), 201

    except Exception as e:
        print(f"Error creating supplier quotation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/quotations/<quotation_id>', methods=['GET'])
@token_required
def get_quotation_detail(quotation_id):
    """Get supplier quotation details with items"""
    try:
        # Get quotation info
        quotation_query = """
            SELECT
                sq.*,
                s.name as supplier_name,
                s.contact_person as supplier_contact,
                s.email as supplier_email,
                s.phone as supplier_phone,
                r.rfq_number,
                r.title as rfq_title,
                u.full_name as created_by_name
            FROM supplier_quotations sq
            LEFT JOIN suppliers s ON sq.supplier_id = s.id
            LEFT JOIN rfqs r ON sq.rfq_id = r.id
            LEFT JOIN users u ON sq.created_by = u.id
            WHERE sq.id = %s
        """
        quotation = execute_query(quotation_query, (quotation_id,))

        if not quotation:
            return jsonify({'error': 'Teklif bulunamadı'}), 404

        quotation = quotation[0]

        # Get quotation items with RFQ item details
        items_query = """
            SELECT
                sqi.*,
                ri.product_code,
                ri.product_name,
                ri.unit,
                ri.quantity as rfq_quantity
            FROM supplier_quotation_items sqi
            LEFT JOIN rfq_items ri ON sqi.rfq_item_id = ri.id
            WHERE sqi.quotation_id = %s
            ORDER BY ri.product_name
        """
        items = execute_query(items_query, (quotation_id,))

        # Calculate total
        total_amount = sum(
            float(item['unit_price'] or 0) * float(item['quantity'] or 0)
            for item in items
        )

        result = {
            'id': str(quotation['id']),
            'quotation_number': quotation['quotation_number'],
            'rfq_id': str(quotation['rfq_id']),
            'rfq_number': quotation['rfq_number'],
            'rfq_title': quotation['rfq_title'],
            'supplier_id': str(quotation['supplier_id']),
            'supplier_name': quotation['supplier_name'],
            'supplier_contact': quotation['supplier_contact'],
            'supplier_email': quotation['supplier_email'],
            'supplier_phone': quotation['supplier_phone'],
            'quotation_date': quotation['quotation_date'].isoformat() if quotation['quotation_date'] else None,
            'valid_until': quotation['valid_until'].isoformat() if quotation['valid_until'] else None,
            'payment_terms': quotation['payment_terms'],
            'delivery_terms': quotation['delivery_terms'],
            'status': quotation['status'],
            'notes': quotation['notes'],
            'created_at': quotation['created_at'].isoformat() if quotation['created_at'] else None,
            'created_by_name': quotation['created_by_name'],
            'items': [{
                'id': str(item['id']),
                'rfq_item_id': str(item['rfq_item_id']),
                'product_code': item['product_code'],
                'product_name': item['product_name'],
                'unit': item['unit'],
                'rfq_quantity': float(item['rfq_quantity']),
                'quantity': float(item['quantity']),
                'unit_price': float(item['unit_price']),
                'currency': item['currency'],
                'lead_time_days': int(item['lead_time_days']) if item['lead_time_days'] else None,
                'notes': item['notes'],
                'total_price': float(item['unit_price'] or 0) * float(item['quantity'] or 0)
            } for item in items],
            'total_amount': total_amount
        }

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"Error getting quotation detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/quotations/<quotation_id>/status', methods=['PATCH'])
@token_required
def update_quotation_status(quotation_id):
    """Update quotation status"""
    try:
        data = request.get_json()
        new_status = data.get('status')

        if new_status not in ['pending', 'accepted', 'rejected', 'expired']:
            return jsonify({'error': 'Geçersiz durum'}), 400

        update_query = """
            UPDATE supplier_quotations
            SET status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """

        execute_write(update_query, (new_status, quotation_id))

        return jsonify({'message': 'Teklif durumu güncellendi'}), 200

    except Exception as e:
        print(f"Error updating quotation status: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@procurement_bp.route('/rfq/<rfq_id>/quotations/compare', methods=['GET'])
@token_required
def compare_quotations(rfq_id):
    """Get all quotations for an RFQ with items for comparison"""
    try:
        # Get RFQ info
        rfq_query = """
            SELECT id, rfq_number, title
            FROM rfqs
            WHERE id = %s
        """
        rfq = execute_query(rfq_query, (rfq_id,))

        if not rfq:
            return jsonify({'error': 'RFQ bulunamadı'}), 404

        rfq = rfq[0]

        # Get all RFQ items
        rfq_items_query = """
            SELECT id, product_code, product_name, quantity, unit
            FROM rfq_items
            WHERE rfq_id = %s
            ORDER BY product_name
        """
        rfq_items = execute_query(rfq_items_query, (rfq_id,))

        # Get all quotations for this RFQ
        quotations_query = """
            SELECT
                sq.id,
                sq.quotation_number,
                sq.quotation_date,
                sq.valid_until,
                sq.payment_terms,
                sq.delivery_terms,
                sq.status,
                sq.notes,
                s.name as supplier_name,
                s.contact_person as supplier_contact,
                s.email as supplier_email,
                s.phone as supplier_phone
            FROM supplier_quotations sq
            LEFT JOIN suppliers s ON sq.supplier_id = s.id
            WHERE sq.rfq_id = %s
            ORDER BY sq.created_at
        """
        quotations = execute_query(quotations_query, (rfq_id,))

        # For each quotation, get its items
        quotations_with_items = []
        for q in quotations:
            items_query = """
                SELECT
                    sqi.id,
                    sqi.rfq_item_id,
                    sqi.unit_price,
                    sqi.quantity,
                    sqi.currency,
                    sqi.lead_time_days,
                    sqi.notes,
                    ri.product_code,
                    ri.product_name
                FROM supplier_quotation_items sqi
                LEFT JOIN rfq_items ri ON sqi.rfq_item_id = ri.id
                WHERE sqi.quotation_id = %s
                ORDER BY ri.product_name
            """
            items = execute_query(items_query, (q['id'],))

            # Calculate total
            total = sum(
                float(item['unit_price'] or 0) * float(item['quantity'] or 0)
                for item in items
            )

            quotations_with_items.append({
                'id': str(q['id']),
                'quotation_number': q['quotation_number'],
                'quotation_date': q['quotation_date'].isoformat() if q['quotation_date'] else None,
                'valid_until': q['valid_until'].isoformat() if q['valid_until'] else None,
                'payment_terms': q['payment_terms'],
                'delivery_terms': q['delivery_terms'],
                'status': q['status'],
                'notes': q['notes'],
                'supplier_name': q['supplier_name'],
                'supplier_contact': q['supplier_contact'],
                'supplier_email': q['supplier_email'],
                'supplier_phone': q['supplier_phone'],
                'total_amount': total,
                'items': [{
                    'id': str(item['id']),
                    'rfq_item_id': str(item['rfq_item_id']),
                    'product_code': item['product_code'],
                    'product_name': item['product_name'],
                    'unit_price': float(item['unit_price']) if item['unit_price'] else None,
                    'quantity': float(item['quantity']),
                    'currency': item['currency'],
                    'lead_time_days': int(item['lead_time_days']) if item['lead_time_days'] else None,
                    'notes': item['notes'],
                    'total_price': float(item['unit_price'] or 0) * float(item['quantity'] or 0)
                } for item in items]
            })

        result = {
            'rfq': {
                'id': str(rfq['id']),
                'rfq_number': rfq['rfq_number'],
                'title': rfq['title']
            },
            'rfq_items': [{
                'id': str(item['id']),
                'product_code': item['product_code'],
                'product_name': item['product_name'],
                'quantity': float(item['quantity']),
                'unit': item['unit']
            } for item in rfq_items],
            'quotations': quotations_with_items
        }

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"Error comparing quotations: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
