from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required, permission_required
from decimal import Decimal
from datetime import datetime

quotations_bp = Blueprint('quotations', __name__, url_prefix='/api/quotations')

# Debug endpoint
@quotations_bp.route('/debug', methods=['GET'])
def debug_quotations():
    """Debug endpoint - tablo var mı kontrol et"""
    try:
        from app.models.database import execute_query
        result = execute_query("SELECT COUNT(*) as count FROM quotations")
        return jsonify({
            'status': 'ok',
            'table_exists': True,
            'count': result[0] if result else 0
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'table_exists': False,
            'error': str(e)
        }), 500

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

# ============================================
# GET ALL QUOTATIONS - Tüm teklifleri listele
# ============================================
@quotations_bp.route('', methods=['GET'])
@token_required
def get_quotations():
    """Tüm teklifleri listele"""
    try:
        status = request.args.get('status')
        customer_id = request.args.get('customer_id')

        query = """
            SELECT
                q.id, q.quotation_number, q.name, q.description,
                q.version, q.status, q.total_cost, q.currency,
                q.created_at, q.updated_at,
                c.id as customer_id, c.name as customer_name,
                u.id as created_by_id, u.full_name as created_by_name,
                (SELECT COUNT(*) FROM quotation_items WHERE quotation_id = q.id) as item_count
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN users u ON q.created_by = u.id
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND q.status = %s"
            params.append(status)

        if customer_id:
            query += " AND q.customer_id = %s"
            params.append(customer_id)

        query += " ORDER BY q.created_at DESC"

        quotations = execute_query(query, params)

        return jsonify({
            'data': quotations,
            'count': len(quotations)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# GET QUOTATION BY ID - Teklif detayı
# ============================================
@quotations_bp.route('/<quotation_id>', methods=['GET'])
@token_required
def get_quotation(quotation_id):
    """Teklif detayını getir"""
    try:
        # Ana teklif bilgisi
        query = """
            SELECT
                q.id, q.quotation_number, q.name, q.description,
                q.version, q.status, q.total_cost, q.currency,
                q.created_at, q.updated_at,
                c.id as customer_id, c.name as customer_name,
                u.id as created_by_id, u.full_name as created_by_name
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN users u ON q.created_by = u.id
            WHERE q.id = %s
        """
        quotation = execute_query_one(query, (quotation_id,))

        if not quotation:
            return jsonify({'error': 'Teklif bulunamadı'}), 404

        # Teklif kalemleri
        items_query = """
            SELECT
                qi.id, qi.stock_id, qi.product_code, qi.product_name,
                qi.category, qi.quantity, qi.unit, qi.unit_cost,
                qi.total_cost, qi.notes, qi.order_index,
                qi.created_at, qi.updated_at,
                s.current_quantity as stock_current_quantity,
                s.min_quantity as stock_min_quantity
            FROM quotation_items qi
            LEFT JOIN stocks s ON qi.stock_id = s.id
            WHERE qi.quotation_id = %s
            ORDER BY qi.order_index, qi.created_at
        """
        items = execute_query(items_query, (quotation_id,))

        quotation['items'] = items

        return jsonify({'data': quotation}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# CREATE QUOTATION - Yeni teklif oluştur
# ============================================
@quotations_bp.route('', methods=['POST'])
@token_required
def create_quotation():
    """Yeni teklif oluştur"""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info("=== CREATE QUOTATION START ===")

        # Current user'ı request'ten al
        current_user = request.current_user
        logger.info(f"Current user from request: {current_user}")

        data = request.get_json()
        logger.info(f"Request data: {data}")

        if not data:
            return jsonify({'error': 'Request body gerekli'}), 400

        name = _s(data.get('name'))
        customer_id = _s(data.get('customer_id'))
        description = _s(data.get('description'))

        logger.info(f"Parsed - name: {name}, customer_id: {customer_id}")

        if not name:
            return jsonify({'error': 'Teklif adı gerekli'}), 400

        # Current user ID'yi al (JWT payload'ında 'user_id' olarak saklanıyor)
        user_id = current_user.get('user_id')
        logger.info(f"User ID: {user_id}")

        if not user_id:
            logger.error(f"User ID not found in token payload: {current_user}")
            return jsonify({'error': 'Kullanıcı bilgisi bulunamadı'}), 401

        query = """
            INSERT INTO quotations (name, customer_id, description, created_by)
            VALUES (%s, %s, %s, %s)
            RETURNING id, quotation_number, name, customer_id, description,
                      version, status, total_cost, currency, created_at, updated_at
        """

        logger.info(f"Executing query with params: {(name, customer_id, description, user_id)}")

        # execute_write kullan çünkü INSERT işlemi yapıyoruz ve commit gerekli
        result = execute_write(
            query,
            (name, customer_id, description, user_id)
        )

        # execute_write liste döndürür, ilk elemanı al
        result = result[0] if result else None

        logger.info(f"Query result: {result}")

        if not result:
            return jsonify({'error': 'Teklif oluşturulamadı - result is None'}), 500

        logger.info("=== CREATE QUOTATION SUCCESS ===")
        return jsonify({
            'message': 'Teklif oluşturuldu',
            'data': result
        }), 201

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"Create quotation error: {error_detail}")
        print(f"=== ERROR ===\n{error_detail}")
        return jsonify({'error': str(e)}), 500


# ============================================
# UPDATE QUOTATION - Teklif güncelle
# ============================================
@quotations_bp.route('/<quotation_id>', methods=['PUT'])
@token_required
def update_quotation(quotation_id):
    """Teklif bilgilerini güncelle"""
    try:
        data = request.get_json()

        name = _s(data.get('name'))
        customer_id = _s(data.get('customer_id'))
        description = _s(data.get('description'))
        status = _s(data.get('status'))

        # Mevcut teklifi kontrol et
        existing = execute_query_one(
            "SELECT id, status FROM quotations WHERE id = %s",
            (quotation_id,)
        )

        if not existing:
            return jsonify({'error': 'Teklif bulunamadı'}), 404

        query = """
            UPDATE quotations
            SET name = COALESCE(%s, name),
                customer_id = COALESCE(%s, customer_id),
                description = COALESCE(%s, description),
                status = COALESCE(%s, status),
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, quotation_number, name, customer_id, description,
                      version, status, total_cost, currency, created_at, updated_at
        """

        # execute_write kullan çünkü UPDATE işlemi yapıyoruz ve commit gerekli
        result = execute_write(
            query,
            (name, customer_id, description, status, quotation_id)
        )

        # execute_write liste döndürür, ilk elemanı al
        result = result[0] if result else None

        return jsonify({
            'message': 'Teklif güncellendi',
            'data': result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# DELETE QUOTATION - Teklif sil
# ============================================
@quotations_bp.route('/<quotation_id>', methods=['DELETE'])
@token_required
@permission_required(['yonetici'])
def delete_quotation(quotation_id):
    """Teklif sil (cascade ile kalemleri de siler)"""
    try:
        existing = execute_query_one(
            "SELECT id FROM quotations WHERE id = %s",
            (quotation_id,)
        )

        if not existing:
            return jsonify({'error': 'Teklif bulunamadı'}), 404

        execute_write("DELETE FROM quotations WHERE id = %s", (quotation_id,))

        return jsonify({'message': 'Teklif silindi'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# ADD ITEM - Teklif kalemleri ekleme
# ============================================
@quotations_bp.route('/<quotation_id>/items', methods=['POST'])
@token_required
def add_quotation_items(quotation_id):
    """Teklif'e ürün/stok kalemleri ekle (toplu ekleme destekler)"""
    try:
        data = request.get_json()
        items = data.get('items', [])

        if not items:
            return jsonify({'error': 'En az bir ürün eklenmelidir'}), 400

        # Teklif var mı kontrol et
        existing = execute_query_one(
            "SELECT id FROM quotations WHERE id = %s",
            (quotation_id,)
        )

        if not existing:
            return jsonify({'error': 'Teklif bulunamadı'}), 404

        added_items = []

        for item in items:
            stock_id = _s(item.get('stock_id'))
            quantity = _decimal(item.get('quantity', 1))

            if not stock_id:
                continue

            # Stok bilgilerini getir
            stock = execute_query_one(
                """
                SELECT id, product_code, product_name, category, unit, unit_price, currency
                FROM stocks WHERE id = %s AND is_active = TRUE
                """,
                (stock_id,)
            )

            if not stock:
                continue

            # Sıralama indexi - en son kalem + 1
            max_order = execute_query_one(
                "SELECT COALESCE(MAX(order_index), 0) as max_order FROM quotation_items WHERE quotation_id = %s",
                (quotation_id,)
            )
            next_order = (max_order['max_order'] or 0) + 1

            # Kalem ekle
            query = """
                INSERT INTO quotation_items (
                    quotation_id, stock_id, product_code, product_name, category,
                    quantity, unit, unit_cost, order_index
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, stock_id, product_code, product_name, category,
                          quantity, unit, unit_cost, total_cost, order_index
            """

            # execute_write kullan çünkü INSERT işlemi yapıyoruz ve commit gerekli
            result = execute_write(
                query,
                (
                    quotation_id,
                    stock['id'],
                    stock['product_code'],
                    stock['product_name'],
                    stock['category'],
                    quantity or 1,
                    stock['unit'],
                    stock['unit_price'],
                    next_order
                )
            )

            # execute_write liste döndürür, ilk elemanı al
            if result:
                added_items.append(result[0])

        return jsonify({
            'message': f'{len(added_items)} ürün eklendi',
            'data': added_items
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# UPDATE ITEM - Kalem güncelle
# ============================================
@quotations_bp.route('/<quotation_id>/items/<item_id>', methods=['PUT'])
@token_required
def update_quotation_item(quotation_id, item_id):
    """Teklif kalemini güncelle"""
    try:
        data = request.get_json()

        quantity = _decimal(data.get('quantity'))
        unit_cost = _decimal(data.get('unit_cost'))
        notes = _s(data.get('notes'))

        # Kalem var mı kontrol et
        existing = execute_query_one(
            "SELECT id FROM quotation_items WHERE id = %s AND quotation_id = %s",
            (item_id, quotation_id)
        )

        if not existing:
            return jsonify({'error': 'Kalem bulunamadı'}), 404

        query = """
            UPDATE quotation_items
            SET quantity = COALESCE(%s, quantity),
                unit_cost = COALESCE(%s, unit_cost),
                notes = COALESCE(%s, notes),
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, stock_id, product_code, product_name, category,
                      quantity, unit, unit_cost, total_cost, notes, order_index
        """

        # execute_write kullan çünkü UPDATE işlemi yapıyoruz ve commit gerekli
        result = execute_write(query, (quantity, unit_cost, notes, item_id))

        # execute_write liste döndürür, ilk elemanı al
        result = result[0] if result else None

        return jsonify({
            'message': 'Kalem güncellendi',
            'data': result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# DELETE ITEM - Kalem sil
# ============================================
@quotations_bp.route('/<quotation_id>/items/<item_id>', methods=['DELETE'])
@token_required
def delete_quotation_item(quotation_id, item_id):
    """Teklif kalemini sil"""
    try:
        existing = execute_query_one(
            "SELECT id FROM quotation_items WHERE id = %s AND quotation_id = %s",
            (item_id, quotation_id)
        )

        if not existing:
            return jsonify({'error': 'Kalem bulunamadı'}), 404

        execute_write("DELETE FROM quotation_items WHERE id = %s", (item_id,))

        return jsonify({'message': 'Kalem silindi'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# REORDER ITEMS - Kalemleri yeniden sırala
# ============================================
@quotations_bp.route('/<quotation_id>/items/reorder', methods=['POST'])
@token_required
def reorder_items(quotation_id):
    """Teklif kalemlerini yeniden sırala"""
    try:
        data = request.get_json()
        item_ids = data.get('item_ids', [])

        if not item_ids:
            return jsonify({'error': 'Sıralama listesi boş'}), 400

        # Her bir item'ın order_index'ini güncelle
        for index, item_id in enumerate(item_ids):
            execute_write(
                "UPDATE quotation_items SET order_index = %s WHERE id = %s AND quotation_id = %s",
                (index, item_id, quotation_id)
            )

        return jsonify({'message': 'Sıralama güncellendi'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
