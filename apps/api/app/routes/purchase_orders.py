from flask import Blueprint, request, jsonify, g
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required
from decimal import Decimal
from datetime import datetime

purchase_orders_bp = Blueprint('purchase_orders', __name__, url_prefix='/api/purchase-orders')

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

@purchase_orders_bp.route('', methods=['GET'])
@token_required
def get_purchase_orders():
    """Tüm satın alma emirlerini listele"""
    try:
        # Query parameters for filtering
        stock_id = request.args.get('stock_id')
        status = request.args.get('status')  # PENDING, DELIVERED, CANCELLED

        query = """
            SELECT
                po.id, po.stock_id, po.order_code, po.quantity, po.unit_price,
                po.currency, po.supplier_name, po.order_date, po.expected_delivery_date,
                po.actual_delivery_date, po.status, po.notes, po.created_at, po.updated_at,
                po.created_by,
                s.product_code, s.product_name, s.unit,
                u.full_name as created_by_name
            FROM purchase_orders po
            LEFT JOIN stocks s ON po.stock_id = s.id
            LEFT JOIN users u ON po.created_by = u.id
            WHERE 1=1
        """
        params = []

        if stock_id:
            query += " AND po.stock_id = %s"
            params.append(stock_id)

        if status:
            query += " AND po.status = %s"
            params.append(status.upper())

        query += " ORDER BY po.expected_delivery_date ASC, po.created_at DESC"

        rows = execute_query(query, tuple(params) if params else None)
        data = [{
            'id': str(r['id']),
            'stock_id': str(r['stock_id']),
            'product_code': r.get('product_code'),
            'product_name': r.get('product_name'),
            'unit': r.get('unit'),
            'order_code': r['order_code'],
            'quantity': float(r['quantity']) if r['quantity'] else 0,
            'unit_price': float(r['unit_price']) if r['unit_price'] else 0,
            'currency': r.get('currency', 'TRY'),
            'total_value': float(r['quantity'] * r['unit_price']) if r['quantity'] and r['unit_price'] else 0,
            'supplier_name': r['supplier_name'],
            'order_date': r['order_date'].isoformat() if r.get('order_date') else None,
            'expected_delivery_date': r['expected_delivery_date'].isoformat() if r.get('expected_delivery_date') else None,
            'actual_delivery_date': r['actual_delivery_date'].isoformat() if r.get('actual_delivery_date') else None,
            'status': r['status'],
            'notes': r.get('notes'),
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
            'updated_at': r['updated_at'].isoformat() if r.get('updated_at') else None,
            'created_by': str(r['created_by']) if r.get('created_by') else None,
            'created_by_name': r.get('created_by_name'),
        } for r in rows]
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_orders_bp.route('/<uuid:order_id>', methods=['GET'])
@token_required
def get_purchase_order_detail(order_id):
    """Tek satın alma emri detayı"""
    try:
        order = execute_query_one("""
            SELECT
                po.id, po.stock_id, po.order_code, po.quantity, po.unit_price,
                po.currency, po.supplier_name, po.order_date, po.expected_delivery_date,
                po.actual_delivery_date, po.status, po.notes, po.created_at, po.updated_at,
                po.created_by,
                s.product_code, s.product_name, s.unit,
                u.full_name as created_by_name
            FROM purchase_orders po
            LEFT JOIN stocks s ON po.stock_id = s.id
            LEFT JOIN users u ON po.created_by = u.id
            WHERE po.id = %s
            LIMIT 1
        """, (str(order_id),))

        if not order:
            return jsonify({'error': 'Satın alma emri bulunamadı'}), 404

        data = {
            'id': str(order['id']),
            'stock_id': str(order['stock_id']),
            'product_code': order.get('product_code'),
            'product_name': order.get('product_name'),
            'unit': order.get('unit'),
            'order_code': order['order_code'],
            'quantity': float(order['quantity']) if order['quantity'] else 0,
            'unit_price': float(order['unit_price']) if order['unit_price'] else 0,
            'currency': order.get('currency', 'TRY'),
            'total_value': float(order['quantity'] * order['unit_price']) if order['quantity'] and order['unit_price'] else 0,
            'supplier_name': order['supplier_name'],
            'order_date': order['order_date'].isoformat() if order.get('order_date') else None,
            'expected_delivery_date': order['expected_delivery_date'].isoformat() if order.get('expected_delivery_date') else None,
            'actual_delivery_date': order['actual_delivery_date'].isoformat() if order.get('actual_delivery_date') else None,
            'status': order['status'],
            'notes': order.get('notes'),
            'created_at': order['created_at'].isoformat() if order.get('created_at') else None,
            'updated_at': order['updated_at'].isoformat() if order.get('updated_at') else None,
            'created_by': str(order['created_by']) if order.get('created_by') else None,
            'created_by_name': order.get('created_by_name'),
        }
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_orders_bp.route('', methods=['POST'])
@token_required
def create_purchase_order():
    """Yeni satın alma emri oluştur"""
    try:
        data = request.get_json(force=True) or {}
        user_id = g.get('user_id')

        stock_id = _s(data.get('stock_id'))
        order_code = _s(data.get('order_code'))
        quantity = _decimal(data.get('quantity'))
        unit_price = _decimal(data.get('unit_price'))
        supplier_name = _s(data.get('supplier_name'))

        if not all([stock_id, order_code, quantity, unit_price, supplier_name]):
            return jsonify({'error': 'Stok ID, sipariş kodu, miktar, birim fiyat ve tedarikçi adı zorunludur'}), 400

        if quantity <= 0 or unit_price < 0:
            return jsonify({'error': 'Miktar 0\'dan büyük, fiyat 0 veya daha büyük olmalıdır'}), 400

        # Check if stock exists
        stock = execute_query_one(
            "SELECT id FROM stocks WHERE id = %s AND is_active = TRUE",
            (stock_id,)
        )
        if not stock:
            return jsonify({'error': 'Stok kartı bulunamadı'}), 404

        # Check if order_code already exists
        exists = execute_query_one(
            "SELECT id FROM purchase_orders WHERE order_code = %s",
            (order_code,)
        )
        if exists:
            return jsonify({'error': 'Bu sipariş kodu zaten kullanılıyor'}), 400

        currency = _s(data.get('currency', 'TRY'))
        order_date = _date(data.get('order_date'))
        expected_delivery_date = _date(data.get('expected_delivery_date'))
        notes = _s(data.get('notes'))

        rows = execute_write("""
            INSERT INTO purchase_orders
              (stock_id, order_code, quantity, unit_price, currency, supplier_name,
               order_date, expected_delivery_date, status, notes, created_at, updated_at, created_by)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, 'PENDING', %s, NOW(), NOW(), %s)
            RETURNING id
        """, (
            stock_id, order_code, quantity, unit_price, currency, supplier_name,
            order_date or datetime.now().date(), expected_delivery_date, notes, user_id
        ))

        order_id = rows[0]['id'] if rows else None
        return jsonify({
            'message': 'Satın alma emri oluşturuldu',
            'data': {'id': str(order_id)}
        }), 201

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_orders_bp.route('/<uuid:order_id>', methods=['PATCH'])
@token_required
def update_purchase_order(order_id):
    """Satın alma emrini güncelle"""
    try:
        data = request.get_json(force=True) or {}
        allowed = [
            'order_code', 'quantity', 'unit_price', 'currency', 'supplier_name',
            'order_date', 'expected_delivery_date', 'actual_delivery_date',
            'status', 'notes'
        ]

        setters, params = [], []
        for k in allowed:
            if k in data:
                if k in ['quantity', 'unit_price']:
                    val = _decimal(data[k])
                elif k in ['order_date', 'expected_delivery_date', 'actual_delivery_date']:
                    val = _date(data[k])
                else:
                    val = _s(data[k]) if k != 'status' else _s(data[k]).upper() if data[k] else None

                setters.append(f"{k} = %s")
                params.append(val)

        if not setters:
            return jsonify({'error': 'Güncellenecek alan yok'}), 400

        setters.append("updated_at = NOW()")
        params.append(str(order_id))

        rows = execute_query(f"""
            UPDATE purchase_orders
               SET {', '.join(setters)}
             WHERE id = %s
             RETURNING id
        """, tuple(params))

        if not rows:
            return jsonify({'error': 'Satın alma emri bulunamadı'}), 404

        return jsonify({'message': 'Satın alma emri güncellendi', 'data': {'id': str(order_id)}}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_orders_bp.route('/<uuid:order_id>', methods=['DELETE'])
@token_required
def delete_purchase_order(order_id):
    """Satın alma emrini sil"""
    try:
        # Check if there are any stock movements linked to this order
        movements = execute_query("""
            SELECT id FROM stock_movements
            WHERE purchase_order_id = %s
            LIMIT 1
        """, (str(order_id),))

        if movements:
            return jsonify({
                'error': 'Bu satın alma emrine bağlı stok hareketleri var. Önce hareketleri silmelisiniz.'
            }), 400

        rows = execute_write("""
            DELETE FROM purchase_orders
            WHERE id = %s
            RETURNING id
        """, (str(order_id),))

        if not rows:
            return jsonify({'error': 'Satın alma emri bulunamadı'}), 404

        return jsonify({'message': 'Satın alma emri silindi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_orders_bp.route('/<uuid:order_id>/deliver', methods=['POST'])
@token_required
def deliver_purchase_order(order_id):
    """Satın alma emrini teslim edildi olarak işaretle ve stok girişi yap"""
    try:
        user_id = g.get('user_id')
        data = request.get_json(force=True) or {}

        # Get order details
        order = execute_query_one("""
            SELECT stock_id, quantity, unit_price, currency, status
            FROM purchase_orders
            WHERE id = %s
        """, (str(order_id),))

        if not order:
            return jsonify({'error': 'Satın alma emri bulunamadı'}), 404

        if order['status'] == 'DELIVERED':
            return jsonify({'error': 'Bu sipariş zaten teslim edilmiş'}), 400

        if order['status'] == 'CANCELLED':
            return jsonify({'error': 'İptal edilmiş sipariş teslim edilemez'}), 400

        # Update order status
        execute_write("""
            UPDATE purchase_orders
            SET status = 'DELIVERED',
                actual_delivery_date = CURRENT_DATE,
                updated_at = NOW()
            WHERE id = %s
        """, (str(order_id),))

        # Create stock movement (IN)
        document_no = _s(data.get('document_no'))
        notes = _s(data.get('notes', 'Satın alma emri teslim alındı'))

        execute_write("""
            INSERT INTO stock_movements
              (stock_id, movement_type, quantity, unit_price, currency,
               purchase_order_id, document_no, notes, created_at, created_by)
            VALUES
              (%s, 'IN', %s, %s, %s, %s, %s, %s, NOW(), %s)
        """, (
            str(order['stock_id']), order['quantity'], order['unit_price'],
            order['currency'], str(order_id), document_no, notes, user_id
        ))

        # Update stock quantity
        execute_write("""
            UPDATE stocks
            SET current_quantity = current_quantity + %s, updated_at = NOW()
            WHERE id = %s
        """, (order['quantity'], str(order['stock_id'])))

        return jsonify({
            'message': 'Satın alma emri teslim edildi ve stok güncellendi',
            'data': {'id': str(order_id)}
        }), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@purchase_orders_bp.route('/<uuid:order_id>/cancel', methods=['POST'])
@token_required
def cancel_purchase_order(order_id):
    """Satın alma emrini iptal et"""
    try:
        # Get order details
        order = execute_query_one("""
            SELECT status FROM purchase_orders WHERE id = %s
        """, (str(order_id),))

        if not order:
            return jsonify({'error': 'Satın alma emri bulunamadı'}), 404

        if order['status'] == 'DELIVERED':
            return jsonify({'error': 'Teslim edilmiş sipariş iptal edilemez'}), 400

        if order['status'] == 'CANCELLED':
            return jsonify({'error': 'Bu sipariş zaten iptal edilmiş'}), 400

        # Update order status
        execute_write("""
            UPDATE purchase_orders
            SET status = 'CANCELLED', updated_at = NOW()
            WHERE id = %s
        """, (str(order_id),))

        return jsonify({
            'message': 'Satın alma emri iptal edildi',
            'data': {'id': str(order_id)}
        }), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500