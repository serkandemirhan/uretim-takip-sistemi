from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required
from decimal import Decimal
from datetime import datetime

goods_receipts_bp = Blueprint('goods_receipts', __name__, url_prefix='/api/goods-receipts')

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


@goods_receipts_bp.route('', methods=['GET'])
@token_required
def get_goods_receipts():
    """Tüm mal kabul kayıtlarını listele"""
    try:
        # Query parameters
        status = request.args.get('status')
        purchase_order_id = request.args.get('purchase_order_id')

        query = """
            SELECT
                gr.id, gr.receipt_number, gr.status,
                gr.purchase_order_id, gr.received_date,
                gr.received_by, gr.quality_check_by, gr.quality_check_date,
                gr.quality_status, gr.notes, gr.rejection_reason,
                gr.created_at, gr.updated_at,
                u_rec.full_name as received_by_name,
                u_qc.full_name as quality_check_by_name,
                po.order_code, po.supplier_name,
                COUNT(grl.id) as lines_count,
                SUM(grl.accepted_quantity) as total_accepted,
                SUM(grl.rejected_quantity) as total_rejected
            FROM goods_receipts gr
            LEFT JOIN users u_rec ON gr.received_by = u_rec.id
            LEFT JOIN users u_qc ON gr.quality_check_by = u_qc.id
            LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
            LEFT JOIN goods_receipt_lines grl ON grl.goods_receipt_id = gr.id
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND gr.status = %s"
            params.append(status)

        if purchase_order_id:
            query += " AND gr.purchase_order_id = %s"
            params.append(purchase_order_id)

        query += """
            GROUP BY gr.id, u_rec.full_name, u_qc.full_name, po.order_code, po.supplier_name
            ORDER BY gr.received_date DESC, gr.created_at DESC
        """

        rows = execute_query(query, tuple(params) if params else None)
        data = [{
            'id': str(r['id']),
            'receipt_number': r['receipt_number'],
            'status': r['status'],
            'purchase_order_id': str(r['purchase_order_id']) if r.get('purchase_order_id') else None,
            'order_code': r.get('order_code'),
            'supplier_name': r.get('supplier_name'),
            'received_date': r['received_date'].isoformat() if r.get('received_date') else None,
            'received_by': str(r['received_by']) if r.get('received_by') else None,
            'received_by_name': r.get('received_by_name'),
            'quality_check_by': str(r['quality_check_by']) if r.get('quality_check_by') else None,
            'quality_check_by_name': r.get('quality_check_by_name'),
            'quality_check_date': r['quality_check_date'].isoformat() if r.get('quality_check_date') else None,
            'quality_status': r.get('quality_status'),
            'notes': r.get('notes'),
            'rejection_reason': r.get('rejection_reason'),
            'lines_count': int(r['lines_count']) if r.get('lines_count') else 0,
            'total_accepted': float(r['total_accepted']) if r.get('total_accepted') else 0,
            'total_rejected': float(r['total_rejected']) if r.get('total_rejected') else 0,
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
            'updated_at': r['updated_at'].isoformat() if r.get('updated_at') else None,
        } for r in rows]

        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@goods_receipts_bp.route('/<uuid:receipt_id>', methods=['GET'])
@token_required
def get_goods_receipt_detail(receipt_id):
    """Tek mal kabul kaydı detayı"""
    try:
        # Ana kayıt
        gr = execute_query_one("""
            SELECT
                gr.*,
                u_rec.full_name as received_by_name,
                u_qc.full_name as quality_check_by_name,
                po.order_code, po.supplier_name, po.expected_delivery_date
            FROM goods_receipts gr
            LEFT JOIN users u_rec ON gr.received_by = u_rec.id
            LEFT JOIN users u_qc ON gr.quality_check_by = u_qc.id
            LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
            WHERE gr.id = %s
        """, (str(receipt_id),))

        if not gr:
            return jsonify({'error': 'Mal kabul kaydı bulunamadı'}), 404

        # Kalemler
        lines = execute_query("""
            SELECT
                grl.*,
                s.product_code, s.product_name as current_product_name,
                s.unit as current_unit
            FROM goods_receipt_lines grl
            LEFT JOIN stocks s ON grl.product_id = s.id
            WHERE grl.goods_receipt_id = %s
            ORDER BY grl.created_at
        """, (str(receipt_id),))

        data = {
            'id': str(gr['id']),
            'receipt_number': gr['receipt_number'],
            'status': gr['status'],
            'purchase_order_id': str(gr['purchase_order_id']) if gr.get('purchase_order_id') else None,
            'order_code': gr.get('order_code'),
            'supplier_name': gr.get('supplier_name'),
            'expected_delivery_date': gr['expected_delivery_date'].isoformat() if gr.get('expected_delivery_date') else None,
            'received_date': gr['received_date'].isoformat() if gr.get('received_date') else None,
            'received_by': str(gr['received_by']) if gr.get('received_by') else None,
            'received_by_name': gr.get('received_by_name'),
            'quality_check_by': str(gr['quality_check_by']) if gr.get('quality_check_by') else None,
            'quality_check_by_name': gr.get('quality_check_by_name'),
            'quality_check_date': gr['quality_check_date'].isoformat() if gr.get('quality_check_date') else None,
            'quality_status': gr.get('quality_status'),
            'notes': gr.get('notes'),
            'rejection_reason': gr.get('rejection_reason'),
            'created_at': gr['created_at'].isoformat() if gr.get('created_at') else None,
            'updated_at': gr['updated_at'].isoformat() if gr.get('updated_at') else None,
            'lines': [{
                'id': str(line['id']),
                'purchase_order_item_id': str(line['purchase_order_item_id']) if line.get('purchase_order_item_id') else None,
                'product_id': str(line['product_id']) if line.get('product_id') else None,
                'product_code': line.get('product_code'),
                'product_name': line.get('current_product_name'),
                'ordered_quantity': float(line['ordered_quantity']) if line.get('ordered_quantity') else 0,
                'received_quantity': float(line['received_quantity']) if line.get('received_quantity') else 0,
                'accepted_quantity': float(line['accepted_quantity']) if line.get('accepted_quantity') else 0,
                'rejected_quantity': float(line['rejected_quantity']) if line.get('rejected_quantity') else 0,
                'unit': line.get('unit', 'adet'),
                'status': line.get('status'),
                'notes': line.get('notes'),
                'rejection_reason': line.get('rejection_reason'),
            } for line in lines]
        }

        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@goods_receipts_bp.route('', methods=['POST'])
@token_required
def create_goods_receipt():
    """Yeni mal kabul kaydı oluştur"""
    try:
        data = request.get_json()
        user_id = request.current_user.get('user_id')

        purchase_order_id = _s(data.get('purchase_order_id'))
        if not purchase_order_id:
            return jsonify({'error': 'Satın alma emri gerekli'}), 400

        notes = _s(data.get('notes'))

        # PO kontrolü
        po = execute_query_one("""
            SELECT id, order_code FROM purchase_orders WHERE id = %s
        """, (purchase_order_id,))

        if not po:
            return jsonify({'error': 'Satın alma emri bulunamadı'}), 404

        # Goods receipt oluştur
        gr_result = execute_write("""
            INSERT INTO goods_receipts
            (purchase_order_id, received_by, notes, status)
            VALUES (%s, %s, %s, 'pending_inspection')
            RETURNING id
        """, (purchase_order_id, user_id, notes))
        gr_id = str(gr_result[0]['id']) if gr_result else None

        # Lines ekle
        lines = data.get('lines', [])
        for line in lines:
            product_id = _s(line.get('product_id'))
            if not product_id:
                continue

            ordered_qty = _decimal(line.get('ordered_quantity', 0))
            received_qty = _decimal(line.get('received_quantity', 0))
            unit = _s(line.get('unit', 'adet'))
            line_notes = _s(line.get('notes'))

            execute_write("""
                INSERT INTO goods_receipt_lines
                (goods_receipt_id, product_id, ordered_quantity, received_quantity,
                 unit, status, notes)
                VALUES (%s, %s, %s, %s, %s, 'pending', %s)
            """, (gr_id, product_id, ordered_qty, received_qty, unit, line_notes))

        return jsonify({
            'message': 'Mal kabul kaydı oluşturuldu',
            'id': gr_id
        }), 201
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@goods_receipts_bp.route('/<uuid:receipt_id>/inspect', methods=['POST'])
@token_required
def inspect_goods_receipt(receipt_id):
    """Kalite kontrol yap - Kabul/Red miktarlarını güncelle"""
    try:
        data = request.get_json()
        user_id = request.current_user.get('user_id')

        # Durum kontrolü
        gr = execute_query_one("SELECT status FROM goods_receipts WHERE id = %s", (str(receipt_id),))
        if not gr:
            return jsonify({'error': 'Mal kabul kaydı bulunamadı'}), 404

        if gr['status'] not in ['pending_inspection']:
            return jsonify({'error': 'Sadece kontrol bekleyen kayıtlar incelenebilir'}), 400

        # Her line için kabul/red miktarlarını güncelle
        lines = data.get('lines', [])
        for line_data in lines:
            line_id = _s(line_data.get('line_id'))
            accepted_qty = _decimal(line_data.get('accepted_quantity', 0))
            rejected_qty = _decimal(line_data.get('rejected_quantity', 0))
            line_status = _s(line_data.get('status', 'pending'))
            rejection_reason = _s(line_data.get('rejection_reason'))

            execute_write("""
                UPDATE goods_receipt_lines
                SET accepted_quantity = %s,
                    rejected_quantity = %s,
                    status = %s,
                    rejection_reason = %s
                WHERE id = %s AND goods_receipt_id = %s
            """, (accepted_qty, rejected_qty, line_status, rejection_reason, line_id, str(receipt_id)))

        # Quality check bilgilerini güncelle
        quality_status = _s(data.get('quality_status'))
        execute_write("""
            UPDATE goods_receipts
            SET quality_check_by = %s,
                quality_check_date = NOW(),
                quality_status = %s
            WHERE id = %s
        """, (user_id, quality_status, str(receipt_id)))

        return jsonify({'message': 'Kalite kontrol tamamlandı'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@goods_receipts_bp.route('/<uuid:receipt_id>/approve', methods=['POST'])
@token_required
def approve_goods_receipt(receipt_id):
    """Mal kabulü onayla ve stoğa ekle"""
    try:
        # Durum kontrolü
        gr = execute_query_one("SELECT status FROM goods_receipts WHERE id = %s", (str(receipt_id),))
        if not gr:
            return jsonify({'error': 'Mal kabul kaydı bulunamadı'}), 404

        if gr['status'] == 'approved':
            return jsonify({'error': 'Bu kayıt zaten onaylanmış'}), 400

        # Tüm kabul edilen miktarları kontrol et
        lines = execute_query("""
            SELECT id, accepted_quantity
            FROM goods_receipt_lines
            WHERE goods_receipt_id = %s
        """, (str(receipt_id),))

        has_accepted = any(float(line['accepted_quantity'] or 0) > 0 for line in lines)

        if not has_accepted:
            return jsonify({'error': 'En az bir kalem kabul edilmeli'}), 400

        # Durumu güncelle (trigger otomatik stok ekleyecek)
        execute_write("""
            UPDATE goods_receipts
            SET status = 'approved'
            WHERE id = %s
        """, (str(receipt_id),))

        # TODO: Bildirim gönder (satın almacı, talep sahibi)

        return jsonify({'message': 'Mal kabul onaylandı ve stok güncellendi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@goods_receipts_bp.route('/<uuid:receipt_id>/reject', methods=['POST'])
@token_required
def reject_goods_receipt(receipt_id):
    """Mal kabulünü reddet"""
    try:
        data = request.get_json()
        rejection_reason = _s(data.get('rejection_reason'))

        if not rejection_reason:
            return jsonify({'error': 'Red nedeni gerekli'}), 400

        # Durum kontrolü
        gr = execute_query_one("SELECT status FROM goods_receipts WHERE id = %s", (str(receipt_id),))
        if not gr:
            return jsonify({'error': 'Mal kabul kaydı bulunamadı'}), 404

        execute_write("""
            UPDATE goods_receipts
            SET status = 'rejected', rejection_reason = %s
            WHERE id = %s
        """, (rejection_reason, str(receipt_id)))

        # TODO: Bildirim gönder (satın almacı, talep sahibi)

        return jsonify({'message': 'Mal kabul reddedildi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@goods_receipts_bp.route('/pending-orders', methods=['GET'])
@token_required
def get_pending_purchase_orders():
    """Mal kabul bekleyen satın alma emirlerini listele"""
    try:
        # PENDING veya kısmen teslim alınmış PO'lar
        query = """
            SELECT
                po.id, po.order_code, po.supplier_name,
                po.expected_delivery_date, po.status,
                po.created_at,
                COUNT(poi.id) as items_count,
                COALESCE(SUM(poi.quantity - poi.received_quantity), 0) as pending_quantity
            FROM purchase_orders po
            LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
            WHERE po.status IN ('PENDING', 'CONFIRMED', 'IN_TRANSIT')
            GROUP BY po.id, po.order_code, po.supplier_name, po.expected_delivery_date, po.status, po.created_at
            HAVING COALESCE(SUM(poi.quantity - poi.received_quantity), 0) > 0
            ORDER BY po.expected_delivery_date ASC NULLS LAST, po.created_at DESC
        """

        rows = execute_query(query)
        data = [{
            'id': str(r['id']),
            'order_code': r['order_code'],
            'supplier_name': r['supplier_name'],
            'expected_delivery_date': r['expected_delivery_date'].isoformat() if r.get('expected_delivery_date') else None,
            'status': r['status'],
            'items_count': int(r['items_count']) if r.get('items_count') else 0,
            'pending_quantity': float(r['pending_quantity']) if r.get('pending_quantity') else 0,
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
        } for r in rows]

        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@goods_receipts_bp.route('/purchase-order/<uuid:po_id>/items', methods=['GET'])
@token_required
def get_purchase_order_items_for_receipt(po_id):
    """Mal kabul için PO kalemlerini getir"""
    try:
        items = execute_query("""
            SELECT
                poi.id, poi.product_id, poi.product_name, poi.product_code,
                poi.quantity, poi.unit, poi.received_quantity,
                (poi.quantity - COALESCE(poi.received_quantity, 0)) as pending_quantity,
                s.current_quantity as current_stock
            FROM purchase_order_items poi
            LEFT JOIN stocks s ON poi.product_id = s.id
            WHERE poi.purchase_order_id = %s
            AND (poi.quantity - COALESCE(poi.received_quantity, 0)) > 0
            ORDER BY poi.created_at
        """, (str(po_id),))

        data = [{
            'id': str(item['id']),
            'product_id': str(item['product_id']) if item.get('product_id') else None,
            'product_name': item['product_name'],
            'product_code': item.get('product_code'),
            'ordered_quantity': float(item['quantity']) if item.get('quantity') else 0,
            'received_quantity': float(item['received_quantity']) if item.get('received_quantity') else 0,
            'pending_quantity': float(item['pending_quantity']) if item.get('pending_quantity') else 0,
            'unit': item.get('unit', 'adet'),
            'current_stock': float(item['current_stock']) if item.get('current_stock') else 0,
        } for item in items]

        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
