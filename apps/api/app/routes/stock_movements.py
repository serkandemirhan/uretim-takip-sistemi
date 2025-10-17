from flask import Blueprint, request, jsonify, g
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required
from decimal import Decimal

stock_movements_bp = Blueprint('stock_movements', __name__, url_prefix='/api/stock-movements')

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

@stock_movements_bp.route('', methods=['GET'])
@token_required
def get_stock_movements():
    """Tüm stok hareketlerini listele"""
    try:
        # Query parameters for filtering
        stock_id = request.args.get('stock_id')
        job_id = request.args.get('job_id')
        movement_type = request.args.get('movement_type')  # IN or OUT
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = """
            SELECT
                sm.id, sm.stock_id, sm.movement_type, sm.quantity, sm.unit_price,
                sm.currency, sm.job_id, sm.purchase_order_id, sm.purpose,
                sm.document_no, sm.notes, sm.created_at, sm.created_by,
                s.product_code, s.product_name, s.unit,
                j.job_number, j.title as job_title,
                po.order_code,
                u.full_name as created_by_name
            FROM stock_movements sm
            LEFT JOIN stocks s ON sm.stock_id = s.id
            LEFT JOIN jobs j ON sm.job_id = j.id
            LEFT JOIN purchase_orders po ON sm.purchase_order_id = po.id
            LEFT JOIN users u ON sm.created_by = u.id
            WHERE 1=1
        """
        params = []

        if stock_id:
            query += " AND sm.stock_id = %s"
            params.append(stock_id)

        if job_id:
            query += " AND sm.job_id = %s"
            params.append(job_id)

        if movement_type:
            query += " AND sm.movement_type = %s"
            params.append(movement_type.upper())

        if start_date:
            query += " AND sm.created_at >= %s"
            params.append(start_date)

        if end_date:
            query += " AND sm.created_at <= %s"
            params.append(end_date + ' 23:59:59')

        query += " ORDER BY sm.created_at DESC"

        rows = execute_query(query, tuple(params) if params else None)
        data = [{
            'id': str(r['id']),
            'stock_id': str(r['stock_id']),
            'product_code': r.get('product_code'),
            'product_name': r.get('product_name'),
            'unit': r.get('unit'),
            'movement_type': r['movement_type'],
            'quantity': float(r['quantity']) if r['quantity'] else 0,
            'unit_price': float(r['unit_price']) if r['unit_price'] else None,
            'currency': r.get('currency'),
            'total_value': float(r['quantity'] * r['unit_price']) if r['quantity'] and r['unit_price'] else 0,
            'job_id': str(r['job_id']) if r.get('job_id') else None,
            'job_number': r.get('job_number'),
            'job_title': r.get('job_title'),
            'purchase_order_id': str(r['purchase_order_id']) if r.get('purchase_order_id') else None,
            'order_code': r.get('order_code'),
            'purpose': r.get('purpose'),
            'document_no': r.get('document_no'),
            'notes': r.get('notes'),
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
            'created_by': str(r['created_by']) if r.get('created_by') else None,
            'created_by_name': r.get('created_by_name'),
        } for r in rows]
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stock_movements_bp.route('/<uuid:movement_id>', methods=['GET'])
@token_required
def get_stock_movement_detail(movement_id):
    """Tek stok hareketi detayı"""
    try:
        movement = execute_query_one("""
            SELECT
                sm.id, sm.stock_id, sm.movement_type, sm.quantity, sm.unit_price,
                sm.currency, sm.job_id, sm.purchase_order_id, sm.purpose,
                sm.document_no, sm.notes, sm.created_at, sm.created_by,
                s.product_code, s.product_name, s.unit,
                j.job_number, j.title as job_title,
                po.order_code,
                u.full_name as created_by_name
            FROM stock_movements sm
            LEFT JOIN stocks s ON sm.stock_id = s.id
            LEFT JOIN jobs j ON sm.job_id = j.id
            LEFT JOIN purchase_orders po ON sm.purchase_order_id = po.id
            LEFT JOIN users u ON sm.created_by = u.id
            WHERE sm.id = %s
            LIMIT 1
        """, (str(movement_id),))

        if not movement:
            return jsonify({'error': 'Stok hareketi bulunamadı'}), 404

        data = {
            'id': str(movement['id']),
            'stock_id': str(movement['stock_id']),
            'product_code': movement.get('product_code'),
            'product_name': movement.get('product_name'),
            'unit': movement.get('unit'),
            'movement_type': movement['movement_type'],
            'quantity': float(movement['quantity']) if movement['quantity'] else 0,
            'unit_price': float(movement['unit_price']) if movement['unit_price'] else None,
            'currency': movement.get('currency'),
            'total_value': float(movement['quantity'] * movement['unit_price']) if movement['quantity'] and movement['unit_price'] else 0,
            'job_id': str(movement['job_id']) if movement.get('job_id') else None,
            'job_number': movement.get('job_number'),
            'job_title': movement.get('job_title'),
            'purchase_order_id': str(movement['purchase_order_id']) if movement.get('purchase_order_id') else None,
            'order_code': movement.get('order_code'),
            'purpose': movement.get('purpose'),
            'document_no': movement.get('document_no'),
            'notes': movement.get('notes'),
            'created_at': movement['created_at'].isoformat() if movement.get('created_at') else None,
            'created_by': str(movement['created_by']) if movement.get('created_by') else None,
            'created_by_name': movement.get('created_by_name'),
        }
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stock_movements_bp.route('', methods=['POST'])
@token_required
def create_stock_movement():
    """Yeni stok hareketi oluştur (giriş veya çıkış)"""
    try:
        data = request.get_json(force=True) or {}
        user_id = g.get('user_id')

        stock_id = _s(data.get('stock_id'))
        movement_type = _s(data.get('movement_type', '')).upper()
        quantity = _decimal(data.get('quantity'))

        if not stock_id or not movement_type or not quantity:
            return jsonify({'error': 'Stok ID, hareket tipi ve miktar zorunludur'}), 400

        if movement_type not in ['IN', 'OUT']:
            return jsonify({'error': 'Hareket tipi IN veya OUT olmalıdır'}), 400

        if quantity <= 0:
            return jsonify({'error': 'Miktar 0\'dan büyük olmalıdır'}), 400

        # Check if stock exists
        stock = execute_query_one(
            "SELECT id, current_quantity, product_name FROM stocks WHERE id = %s AND is_active = TRUE",
            (stock_id,)
        )
        if not stock:
            return jsonify({'error': 'Stok kartı bulunamadı'}), 404

        # Check if enough stock for OUT movement
        if movement_type == 'OUT':
            current_qty = float(stock['current_quantity']) if stock['current_quantity'] else 0
            if current_qty < float(quantity):
                return jsonify({
                    'error': f'Yetersiz stok! Mevcut: {current_qty}, İstenen: {quantity}'
                }), 400

        unit_price = _decimal(data.get('unit_price'))
        currency = _s(data.get('currency'))
        job_id = _s(data.get('job_id'))
        purchase_order_id = _s(data.get('purchase_order_id'))
        purpose = _s(data.get('purpose'))
        document_no = _s(data.get('document_no'))
        notes = _s(data.get('notes'))

        # Validate job_id if provided
        if job_id:
            job_exists = execute_query_one("SELECT id FROM jobs WHERE id = %s", (job_id,))
            if not job_exists:
                return jsonify({'error': 'Proje bulunamadı'}), 404

        # Validate purchase_order_id if provided
        if purchase_order_id:
            po_exists = execute_query_one("SELECT id FROM purchase_orders WHERE id = %s", (purchase_order_id,))
            if not po_exists:
                return jsonify({'error': 'Satın alma emri bulunamadı'}), 404

        # Insert stock movement
        rows = execute_write("""
            INSERT INTO stock_movements
              (stock_id, movement_type, quantity, unit_price, currency, job_id,
               purchase_order_id, purpose, document_no, notes, created_at, created_by)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
            RETURNING id
        """, (
            stock_id, movement_type, quantity, unit_price, currency, job_id,
            purchase_order_id, purpose, document_no, notes, user_id
        ))

        movement_id = rows[0]['id'] if rows else None

        # Update stock quantity
        if movement_type == 'IN':
            execute_write("""
                UPDATE stocks
                SET current_quantity = current_quantity + %s, updated_at = NOW()
                WHERE id = %s
            """, (quantity, stock_id))
        elif movement_type == 'OUT':
            execute_write("""
                UPDATE stocks
                SET current_quantity = current_quantity - %s, updated_at = NOW()
                WHERE id = %s
            """, (quantity, stock_id))

        return jsonify({
            'message': f'Stok {"girişi" if movement_type == "IN" else "çıkışı"} kaydedildi',
            'data': {'id': str(movement_id)}
        }), 201

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stock_movements_bp.route('/<uuid:movement_id>', methods=['DELETE'])
@token_required
def delete_stock_movement(movement_id):
    """Stok hareketini sil ve stok miktarını geri al"""
    try:
        # Get movement details first
        movement = execute_query_one("""
            SELECT stock_id, movement_type, quantity
            FROM stock_movements
            WHERE id = %s
        """, (str(movement_id),))

        if not movement:
            return jsonify({'error': 'Stok hareketi bulunamadı'}), 404

        # Reverse the stock quantity change
        if movement['movement_type'] == 'IN':
            # If it was IN, subtract the quantity
            execute_write("""
                UPDATE stocks
                SET current_quantity = current_quantity - %s, updated_at = NOW()
                WHERE id = %s
            """, (movement['quantity'], str(movement['stock_id'])))
        elif movement['movement_type'] == 'OUT':
            # If it was OUT, add the quantity back
            execute_write("""
                UPDATE stocks
                SET current_quantity = current_quantity + %s, updated_at = NOW()
                WHERE id = %s
            """, (movement['quantity'], str(movement['stock_id'])))

        # Delete the movement
        execute_write("""
            DELETE FROM stock_movements
            WHERE id = %s
        """, (str(movement_id),))

        return jsonify({'message': 'Stok hareketi silindi ve stok miktarı güncellendi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500