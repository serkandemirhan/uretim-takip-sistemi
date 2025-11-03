from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required
from decimal import Decimal
from datetime import datetime

purchase_requests_bp = Blueprint('purchase_requests', __name__, url_prefix='/api/purchase-requests')

def _s(v):
    """Boş/whitespace string -> None."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s != '' else None

def _decimal(v):
    """Convert to Decimal or None."""
    if v is None or v == '':
        return None
    try:
        return Decimal(str(v))
    except:
        return None

def _date(v):
    """Convert to date string or None."""
    if v is None or v == '':
        return None
    return str(v).strip()


@purchase_requests_bp.route('', methods=['GET'])
@token_required
def get_purchase_requests():
    """Tüm satın alma taleplerini listele"""
    try:
        # Query parameters for filtering
        status = request.args.get('status')
        job_id = request.args.get('job_id')
        quotation_id = request.args.get('quotation_id')
        priority = request.args.get('priority')

        query = """
            SELECT
                pr.id, pr.request_number, pr.title, pr.status, pr.priority,
                pr.quotation_id, pr.job_id,
                pr.requested_date, pr.required_by_date,
                pr.requested_by, pr.approved_by, pr.approved_at,
                pr.notes, pr.rejection_reason,
                pr.created_at, pr.updated_at,
                u_req.full_name as requested_by_name,
                u_app.full_name as approved_by_name,
                q.quotation_number, q.name as quotation_name,
                j.title as job_title, j.job_number,
                COUNT(pri.id) as items_count,
                SUM(pri.estimated_total_price) as estimated_total
            FROM purchase_requests pr
            LEFT JOIN users u_req ON pr.requested_by = u_req.id
            LEFT JOIN users u_app ON pr.approved_by = u_app.id
            LEFT JOIN quotations q ON pr.quotation_id = q.id
            LEFT JOIN jobs j ON pr.job_id = j.id
            LEFT JOIN purchase_request_items pri ON pri.purchase_request_id = pr.id
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND pr.status = %s"
            params.append(status)

        if job_id:
            query += " AND pr.job_id = %s"
            params.append(job_id)

        if quotation_id:
            query += " AND pr.quotation_id = %s"
            params.append(quotation_id)

        if priority:
            query += " AND pr.priority = %s"
            params.append(priority)

        query += """
            GROUP BY pr.id, u_req.full_name, u_app.full_name,
                     q.quotation_number, q.name, j.title, j.job_number
            ORDER BY
                CASE pr.priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                pr.required_by_date ASC NULLS LAST,
                pr.created_at DESC
        """

        rows = execute_query(query, tuple(params) if params else None)
        data = [{
            'id': str(r['id']),
            'request_number': r['request_number'],
            'title': r.get('title'),
            'status': r['status'],
            'priority': r['priority'],
            'quotation_id': str(r['quotation_id']) if r.get('quotation_id') else None,
            'quotation_number': r.get('quotation_number'),
            'quotation_name': r.get('quotation_name'),
            'job_id': str(r['job_id']) if r.get('job_id') else None,
            'job_title': r.get('job_title'),
            'job_number': r.get('job_number'),
            'requested_date': r['requested_date'].isoformat() if r.get('requested_date') else None,
            'required_by_date': r['required_by_date'].isoformat() if r.get('required_by_date') else None,
            'requested_by': str(r['requested_by']) if r.get('requested_by') else None,
            'requested_by_name': r.get('requested_by_name'),
            'approved_by': str(r['approved_by']) if r.get('approved_by') else None,
            'approved_by_name': r.get('approved_by_name'),
            'approved_at': r['approved_at'].isoformat() if r.get('approved_at') else None,
            'notes': r.get('notes'),
            'rejection_reason': r.get('rejection_reason'),
            'items_count': int(r['items_count']) if r.get('items_count') else 0,
            'estimated_total': float(r['estimated_total']) if r.get('estimated_total') else 0,
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
            'updated_at': r['updated_at'].isoformat() if r.get('updated_at') else None,
        } for r in rows]

        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>', methods=['GET'])
@token_required
def get_purchase_request_detail(request_id):
    """Tek satın alma talebi detayı"""
    try:
        # Ana talep
        pr = execute_query_one("""
            SELECT
                pr.*,
                u_req.full_name as requested_by_name,
                u_app.full_name as approved_by_name,
                q.quotation_number, q.name as quotation_name,
                j.title as job_title, j.job_number
            FROM purchase_requests pr
            LEFT JOIN users u_req ON pr.requested_by = u_req.id
            LEFT JOIN users u_app ON pr.approved_by = u_app.id
            LEFT JOIN quotations q ON pr.quotation_id = q.id
            LEFT JOIN jobs j ON pr.job_id = j.id
            WHERE pr.id = %s
        """, (str(request_id),))

        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        # Kalemler
        items = execute_query("""
            SELECT
                pri.*,
                s.product_code as current_product_code,
                s.product_name as current_product_name,
                s.current_quantity as current_stock
            FROM purchase_request_items pri
            LEFT JOIN stocks s ON pri.product_id = s.id
            WHERE pri.purchase_request_id = %s
            ORDER BY pri.created_at
        """, (str(request_id),))

        # İlişkili Purchase Orders
        pos = execute_query("""
            SELECT
                po.id, po.order_code, po.status, po.supplier_name,
                po.expected_delivery_date
            FROM purchase_orders po
            INNER JOIN purchase_request_purchase_orders prpo
                ON prpo.purchase_order_id = po.id
            WHERE prpo.purchase_request_id = %s
            ORDER BY po.created_at DESC
        """, (str(request_id),))

        data = {
            'id': str(pr['id']),
            'request_number': pr['request_number'],
            'title': pr.get('title'),
            'status': pr['status'],
            'priority': pr['priority'],
            'quotation_id': str(pr['quotation_id']) if pr.get('quotation_id') else None,
            'quotation_number': pr.get('quotation_number'),
            'quotation_name': pr.get('quotation_name'),
            'job_id': str(pr['job_id']) if pr.get('job_id') else None,
            'job_title': pr.get('job_title'),
            'job_number': pr.get('job_number'),
            'requested_date': pr['requested_date'].isoformat() if pr.get('requested_date') else None,
            'required_by_date': pr['required_by_date'].isoformat() if pr.get('required_by_date') else None,
            'requested_by': str(pr['requested_by']) if pr.get('requested_by') else None,
            'requested_by_name': pr.get('requested_by_name'),
            'approved_by': str(pr['approved_by']) if pr.get('approved_by') else None,
            'approved_by_name': pr.get('approved_by_name'),
            'approved_at': pr['approved_at'].isoformat() if pr.get('approved_at') else None,
            'notes': pr.get('notes'),
            'rejection_reason': pr.get('rejection_reason'),
            'created_at': pr['created_at'].isoformat() if pr.get('created_at') else None,
            'updated_at': pr['updated_at'].isoformat() if pr.get('updated_at') else None,
            'items': [{
                'id': str(item['id']),
                'product_id': str(item['product_id']) if item.get('product_id') else None,
                'product_name': item['product_name'],
                'product_code': item.get('product_code'),
                'category': item.get('category'),
                'quantity': float(item['quantity']) if item.get('quantity') else 0,
                'unit': item.get('unit', 'adet'),
                'estimated_unit_price': float(item['estimated_unit_price']) if item.get('estimated_unit_price') else 0,
                'estimated_total_price': float(item['estimated_total_price']) if item.get('estimated_total_price') else 0,
                'currency': item.get('currency', 'TRY'),
                'current_stock_quantity': float(item['current_stock_quantity']) if item.get('current_stock_quantity') else 0,
                'current_stock': float(item['current_stock']) if item.get('current_stock') else 0,
                'ordered_quantity': float(item['ordered_quantity']) if item.get('ordered_quantity') else 0,
                'received_quantity': float(item['received_quantity']) if item.get('received_quantity') else 0,
                'suggested_supplier': item.get('suggested_supplier'),
                'notes': item.get('notes'),
            } for item in items],
            'purchase_orders': [{
                'id': str(po['id']),
                'order_code': po['order_code'],
                'status': po['status'],
                'supplier_name': po['supplier_name'],
                'expected_delivery_date': po['expected_delivery_date'].isoformat() if po.get('expected_delivery_date') else None,
            } for po in pos]
        }

        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('', methods=['POST'])
@token_required
def create_purchase_request():
    """Yeni satın alma talebi oluştur"""
    try:
        data = request.get_json()
        user_id = request.current_user.get('user_id')

        title = _s(data.get('title'))
        if not title:
            return jsonify({'error': 'Talep başlığı zorunludur'}), 400

        quotation_id = _s(data.get('quotation_id'))
        job_id = _s(data.get('job_id'))
        priority = _s(data.get('priority', 'medium'))
        required_by_date = _date(data.get('required_by_date'))
        notes = _s(data.get('notes'))

        # Talep oluştur
        pr_result = execute_write("""
            INSERT INTO purchase_requests
            (title, quotation_id, job_id, priority, required_by_date, notes, requested_by, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'draft')
            RETURNING id
        """, (title, quotation_id, job_id, priority, required_by_date, notes, user_id))
        pr_id = str(pr_result[0]['id']) if pr_result else None

        # Items ekle (eğer gönderildiyse)
        items = data.get('items', [])
        for item in items:
            product_id = _s(item.get('product_id'))
            product_name = _s(item.get('product_name'))
            product_code = _s(item.get('product_code'))
            category = _s(item.get('category'))
            quantity = _decimal(item.get('quantity', 0))
            unit = _s(item.get('unit', 'adet'))
            estimated_unit_price = _decimal(item.get('estimated_unit_price'))
            currency = _s(item.get('currency', 'TRY'))
            suggested_supplier = _s(item.get('suggested_supplier'))
            item_notes = _s(item.get('notes'))

            # Stokta varsa bilgileri çek
            current_stock = 0
            if product_id:
                stock = execute_query_one("""
                    SELECT product_code, product_name, category, current_quantity, unit
                    FROM stocks WHERE id = %s
                """, (product_id,))
                if stock:
                    product_code = stock['product_code'] or product_code
                    product_name = stock['product_name'] or product_name
                    category = stock.get('category') or category
                    unit = stock.get('unit') or unit
                    current_stock = stock['current_quantity'] or 0

            # product_name zorunlu - eğer hala None ise hata ver
            if not product_name:
                return jsonify({'error': 'Ürün adı gerekli'}), 400

            execute_write("""
                INSERT INTO purchase_request_items
                (purchase_request_id, product_id, product_name, product_code, category,
                 quantity, unit, estimated_unit_price, currency, current_stock_quantity,
                 suggested_supplier, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (pr_id, product_id, product_name, product_code, category,
                  quantity, unit, estimated_unit_price, currency, current_stock,
                  suggested_supplier, item_notes))

        return jsonify({
            'message': 'Satın alma talebi oluşturuldu',
            'id': str(pr_id)
        }), 201
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>', methods=['PUT'])
@token_required
def update_purchase_request(request_id):
    """Satın alma talebini güncelle (sadece draft durumunda)"""
    try:
        data = request.get_json()

        # Önce durum kontrolü
        pr = execute_query_one("SELECT status FROM purchase_requests WHERE id = %s", (str(request_id),))
        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        if pr['status'] != 'draft':
            return jsonify({'error': 'Sadece taslak durumundaki talepler güncellenebilir'}), 400

        title = _s(data.get('title'))
        quotation_id = _s(data.get('quotation_id'))
        job_id = _s(data.get('job_id'))
        priority = _s(data.get('priority'))
        required_by_date = _date(data.get('required_by_date'))
        notes = _s(data.get('notes'))

        execute_write("""
            UPDATE purchase_requests
            SET title = %s, quotation_id = %s, job_id = %s, priority = %s,
                required_by_date = %s, notes = %s
            WHERE id = %s
        """, (title, quotation_id, job_id, priority, required_by_date, notes, str(request_id)))

        return jsonify({'message': 'Satın alma talebi güncellendi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>', methods=['DELETE'])
@token_required
def delete_purchase_request(request_id):
    """Satın alma talebini sil (sadece draft durumunda)"""
    try:
        # Durum kontrolü
        pr = execute_query_one("SELECT status FROM purchase_requests WHERE id = %s", (str(request_id),))
        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        if pr['status'] != 'draft':
            return jsonify({'error': 'Sadece taslak durumundaki talepler silinebilir'}), 400

        execute_write("DELETE FROM purchase_requests WHERE id = %s", (str(request_id),))
        return jsonify({'message': 'Satın alma talebi silindi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>/items', methods=['POST'])
@token_required
def add_purchase_request_item(request_id):
    """Satın alma talebine kalem ekle"""
    try:
        # Durum kontrolü
        pr = execute_query_one("SELECT status FROM purchase_requests WHERE id = %s", (str(request_id),))
        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        if pr['status'] != 'draft':
            return jsonify({'error': 'Sadece taslak durumundaki taleplere kalem eklenebilir'}), 400

        data = request.get_json()
        product_id = _s(data.get('product_id'))
        product_name = _s(data.get('product_name'))
        product_code = _s(data.get('product_code'))
        category = _s(data.get('category'))
        quantity = _decimal(data.get('quantity', 0))
        unit = _s(data.get('unit', 'adet'))
        estimated_unit_price = _decimal(data.get('estimated_unit_price'))
        currency = _s(data.get('currency', 'TRY'))
        suggested_supplier = _s(data.get('suggested_supplier'))
        item_notes = _s(data.get('notes'))

        # Stokta varsa bilgileri çek
        current_stock = 0
        if product_id:
            stock = execute_query_one("""
                SELECT product_code, product_name, category, current_quantity, unit
                FROM stocks WHERE id = %s
            """, (product_id,))
            if stock:
                product_code = stock['product_code']
                product_name = stock['product_name']
                category = stock.get('category')
                unit = stock.get('unit', unit)
                current_stock = stock['current_quantity']

        item_result = execute_write("""
            INSERT INTO purchase_request_items
            (purchase_request_id, product_id, product_name, product_code, category,
             quantity, unit, estimated_unit_price, currency, current_stock_quantity,
             suggested_supplier, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (str(request_id), product_id, product_name, product_code, category,
              quantity, unit, estimated_unit_price, currency, current_stock,
              suggested_supplier, item_notes))
        item_id = str(item_result[0]['id']) if item_result else None

        return jsonify({
            'message': 'Kalem eklendi',
            'id': item_id
        }), 201
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>/items/<uuid:item_id>', methods=['DELETE'])
@token_required
def delete_purchase_request_item(request_id, item_id):
    """Satın alma talebinden kalem sil"""
    try:
        # Durum kontrolü
        pr = execute_query_one("SELECT status FROM purchase_requests WHERE id = %s", (str(request_id),))
        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        if pr['status'] != 'draft':
            return jsonify({'error': 'Sadece taslak durumundaki taleplerden kalem silinebilir'}), 400

        execute_write("""
            DELETE FROM purchase_request_items
            WHERE id = %s AND purchase_request_id = %s
        """, (str(item_id), str(request_id)))

        return jsonify({'message': 'Kalem silindi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>/submit', methods=['POST'])
@token_required
def submit_purchase_request(request_id):
    """Satın alma talebini onaya gönder"""
    try:
        pr = execute_query_one("SELECT status FROM purchase_requests WHERE id = %s", (str(request_id),))
        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        if pr['status'] != 'draft':
            return jsonify({'error': 'Sadece taslak durumundaki talepler onaya gönderilebilir'}), 400

        # Kalem kontrolü
        items_count = execute_query_one("""
            SELECT COUNT(*) as cnt FROM purchase_request_items WHERE purchase_request_id = %s
        """, (str(request_id),))

        if items_count['cnt'] == 0:
            return jsonify({'error': 'En az bir kalem eklemelisiniz'}), 400

        execute_write("""
            UPDATE purchase_requests SET status = 'pending_approval' WHERE id = %s
        """, (str(request_id),))

        # TODO: Bildirim gönder (admin, müşteri temsilcisi)

        return jsonify({'message': 'Talep onaya gönderildi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>/approve', methods=['POST'])
@token_required
def approve_purchase_request(request_id):
    """Satın alma talebini onayla (admin veya müşteri temsilcisi)"""
    try:
        user_id = request.current_user.get('user_id')
        user_role = request.current_user.get('role')

        # Yetki kontrolü
        if user_role not in ['yonetici', 'musteri_temsilcisi']:
            return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403

        pr = execute_query_one("SELECT status FROM purchase_requests WHERE id = %s", (str(request_id),))
        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        if pr['status'] != 'pending_approval':
            return jsonify({'error': 'Sadece onay bekleyen talepler onaylanabilir'}), 400

        execute_write("""
            UPDATE purchase_requests
            SET status = 'approved', approved_by = %s, approved_at = NOW()
            WHERE id = %s
        """, (user_id, str(request_id)))

        # TODO: Bildirim gönder (satın almacı)

        return jsonify({'message': 'Talep onaylandı'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_requests_bp.route('/<uuid:request_id>/reject', methods=['POST'])
@token_required
def reject_purchase_request(request_id):
    """Satın alma talebini reddet"""
    try:
        user_id = request.current_user.get('user_id')
        user_role = request.current_user.get('role')

        # Yetki kontrolü
        if user_role not in ['yonetici', 'musteri_temsilcisi']:
            return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403

        data = request.get_json()
        rejection_reason = _s(data.get('rejection_reason'))

        if not rejection_reason:
            return jsonify({'error': 'Red nedeni gerekli'}), 400

        pr = execute_query_one("SELECT status FROM purchase_requests WHERE id = %s", (str(request_id),))
        if not pr:
            return jsonify({'error': 'Satın alma talebi bulunamadı'}), 404

        if pr['status'] != 'pending_approval':
            return jsonify({'error': 'Sadece onay bekleyen talepler reddedilebilir'}), 400

        execute_write("""
            UPDATE purchase_requests
            SET status = 'rejected', rejection_reason = %s, approved_by = %s, approved_at = NOW()
            WHERE id = %s
        """, (rejection_reason, user_id, str(request_id)))

        # TODO: Bildirim gönder (talep sahibi)

        return jsonify({'message': 'Talep reddedildi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
