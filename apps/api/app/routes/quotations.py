from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required, permission_required
from decimal import Decimal
from datetime import datetime
from collections import defaultdict

ALLOWED_QUOTATION_STATUSES = {'draft', 'active', 'approved', 'rejected', 'archived'}

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


def _get_currency_rates():
    """TRY dönüşüm oranlarını getir."""
    settings = execute_query_one(
        """
        SELECT usd_to_try, eur_to_try
        FROM currency_settings
        ORDER BY updated_at DESC
        LIMIT 1
        """
    )
    rates = {
        'TRY': Decimal('1'),
    }
    if settings:
        usd = settings.get('usd_to_try')
        eur = settings.get('eur_to_try')
        rates['USD'] = Decimal(str(usd)) if usd else Decimal('1')
        rates['EUR'] = Decimal(str(eur)) if eur else Decimal('1')
    else:
        rates['USD'] = Decimal('1')
        rates['EUR'] = Decimal('1')
    return rates


def _convert_to_try(amount: Decimal, currency: str, rates: dict[str, Decimal]) -> Decimal:
    """Belirtilen para birimini TRY'ye çevir."""
    if amount is None:
        return Decimal('0')
    currency = (currency or 'TRY').upper()
    rate = rates.get(currency, Decimal('1'))
    return amount * rate


def _aggregate_currency_totals(items):
    totals = defaultdict(lambda: {'amount': Decimal('0'), 'amount_try': Decimal('0')})
    total_try = Decimal('0')

    for item in items:
        currency = (item.get('currency') or 'TRY').upper()
        amount = _decimal(item.get('total_cost')) or Decimal('0')
        amount_try = _decimal(item.get('total_cost_try')) or Decimal('0')

        totals[currency]['amount'] += amount
        totals[currency]['amount_try'] += amount_try
        total_try += amount_try

    formatted = [
        {
            'currency': currency,
            'amount': float(value['amount']),
            'amount_try': float(value['amount_try']),
        }
        for currency, value in totals.items()
    ]
    return formatted, total_try


def _recalculate_quotation_totals(quotation_id):
    items = execute_query(
        """
        SELECT currency, total_cost, total_cost_try
        FROM quotation_items
        WHERE quotation_id = %s
        """,
        (quotation_id,),
    )
    currency_totals, total_try = _aggregate_currency_totals(items)
    execute_write(
        "UPDATE quotations SET total_cost = %s WHERE id = %s",
        (total_try, quotation_id),
    )
    return currency_totals, total_try

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
        job_id = request.args.get('job_id')

        query = """
            SELECT
                q.id, q.quotation_number, q.name, q.description,
                q.version, q.version_major, q.version_minor,
                q.status, q.total_cost, q.currency,
                q.job_id,
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

        if job_id:
            query += " AND q.job_id = %s"
            params.append(job_id)

        query += " ORDER BY q.created_at DESC"

        quotations = execute_query(query, params)

        for quotation in quotations:
            quotation['version_label'] = f"Ver{quotation.get('version_major', 1)}.{quotation.get('version_minor', 0)}"
            quotation['total_cost_try'] = float(_decimal(quotation.get('total_cost')) or Decimal('0'))
            if quotation.get('job_id'):
                quotation['job_id'] = str(quotation['job_id'])

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
                q.version, q.version_major, q.version_minor,
                q.status, q.total_cost, q.currency,
                q.job_id,
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

        if quotation.get('job_id'):
            quotation['job_id'] = str(quotation['job_id'])

        # Teklif kalemleri
        items_query = """
            SELECT
                qi.id, qi.stock_id, qi.product_code, qi.product_name,
                qi.category, qi.quantity, qi.unit, qi.unit_cost,
                qi.total_cost, qi.currency, qi.unit_cost_try,
                qi.total_cost_try, qi.notes, qi.order_index,
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
        currency_totals, total_try = _aggregate_currency_totals(items)
        quotation['currency_totals'] = currency_totals
        quotation['total_cost_try'] = float(total_try)
        quotation['version_label'] = f"Ver{quotation['version_major']}.{quotation['version_minor']}"

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
        job_id = _s(data.get('job_id'))
        status = _s(data.get('status')) or 'draft'

        logger.info(f"Parsed - name: {name}, customer_id: {customer_id}")

        if not name:
            return jsonify({'error': 'Teklif adı gerekli'}), 400

        if status not in ALLOWED_QUOTATION_STATUSES:
            return jsonify({'error': 'Geçersiz teklif durumu'}), 400

        # Current user ID'yi al (JWT payload'ında 'user_id' olarak saklanıyor)
        user_id = current_user.get('user_id')
        logger.info(f"User ID: {user_id}")

        if not user_id:
            logger.error(f"User ID not found in token payload: {current_user}")
            return jsonify({'error': 'Kullanıcı bilgisi bulunamadı'}), 401

        query = """
            INSERT INTO quotations (name, customer_id, description, job_id, created_by, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, quotation_number, name, customer_id, description,
                      version, version_major, version_minor,
                      status, total_cost, currency, job_id, created_at, updated_at
        """

        logger.info(
            f"Executing query with params: {(name, customer_id, description, job_id, user_id, status)}"
        )

        # execute_write kullan çünkü INSERT işlemi yapıyoruz ve commit gerekli
        result = execute_write(
            query,
            (name, customer_id, description, job_id, user_id, status)
        )

        # execute_write liste döndürür, ilk elemanı al
        result = result[0] if result else None

        logger.info(f"Query result: {result}")

        if not result:
            return jsonify({'error': 'Teklif oluşturulamadı - result is None'}), 500

        result['currency_totals'] = []
        result['total_cost_try'] = float(_decimal(result.get('total_cost')) or Decimal('0'))
        result['version_label'] = f"Ver{result.get('version_major', 1)}.{result.get('version_minor', 0)}"
        if result.get('job_id'):
            result['job_id'] = str(result['job_id'])

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
        job_id = _s(data.get('job_id'))

        # Mevcut teklifi kontrol et
        existing = execute_query_one(
            "SELECT id, status FROM quotations WHERE id = %s",
            (quotation_id,)
        )

        if not existing:
            return jsonify({'error': 'Teklif bulunamadı'}), 404

        if status and status not in ALLOWED_QUOTATION_STATUSES:
            return jsonify({'error': 'Geçersiz teklif durumu'}), 400

        query = """
            UPDATE quotations
            SET name = COALESCE(%s, name),
                customer_id = COALESCE(%s, customer_id),
                description = COALESCE(%s, description),
                status = COALESCE(%s, status),
                job_id = COALESCE(%s, job_id),
                version_major = version_major + 1,
                version_minor = 0,
                version = (version_major + 1) * 1000,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, quotation_number, name, customer_id, description,
                      version, version_major, version_minor,
                      status, total_cost, currency, job_id, created_at, updated_at
        """

        # execute_write kullan çünkü UPDATE işlemi yapıyoruz ve commit gerekli
        result = execute_write(
            query,
            (name, customer_id, description, status, job_id, quotation_id)
        )

        # execute_write liste döndürür, ilk elemanı al
        result = result[0] if result else None

        currency_totals, total_try = _recalculate_quotation_totals(quotation_id)

        if result:
            result['currency_totals'] = currency_totals
            result['total_cost_try'] = float(total_try)
            result['version_label'] = f"Ver{result.get('version_major', 1)}.{result.get('version_minor', 0)}"
            if result.get('job_id'):
                result['job_id'] = str(result['job_id'])

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
        rates = _get_currency_rates()

        for item in items:
            stock_id = _s(item.get('stock_id'))
            product_code = _s(item.get('product_code'))
            product_name = _s(item.get('product_name'))
            category = _s(item.get('category'))
            quantity = _decimal(item.get('quantity'))
            if quantity is None:
                quantity = Decimal('1')
            unit = _s(item.get('unit'))
            unit_cost = _decimal(item.get('unit_cost'))
            notes = _s(item.get('notes'))
            currency_code = _s(item.get('currency'))

            stock_data = None

            if stock_id:
                stock_data = execute_query_one(
                    """
                    SELECT id, product_code, product_name, category, unit, unit_price, currency
                    FROM stocks WHERE id = %s AND is_active = TRUE
                    """,
                    (stock_id,)
                )

                if not stock_data:
                    continue

            if not stock_data and not product_name:
                # Stok seçilmediyse ürün adı zorunlu
                continue

            if not currency_code and stock_data:
                currency_code = _s(stock_data.get('currency'))
            currency_code = (currency_code or 'TRY').upper()

            # Sıralama indexi - en son kalem + 1
            max_order = execute_query_one(
                "SELECT COALESCE(MAX(order_index), 0) as max_order FROM quotation_items WHERE quotation_id = %s",
                (quotation_id,)
            )
            next_order = (max_order['max_order'] or 0) + 1

            final_product_code = product_code or (stock_data['product_code'] if stock_data else None)
            final_product_name = product_name or (stock_data['product_name'] if stock_data else None)
            final_category = category or (stock_data['category'] if stock_data else None)
            final_unit = unit or (stock_data['unit'] if stock_data else None)
            final_unit_cost = unit_cost

            if final_unit_cost is None:
                if stock_data and stock_data.get('unit_price') is not None:
                    final_unit_cost = Decimal(str(stock_data['unit_price']))
                else:
                    final_unit_cost = Decimal('0')

            unit_cost_try = _convert_to_try(final_unit_cost, currency_code, rates)
            total_cost_try = unit_cost_try * quantity

            query = """
                INSERT INTO quotation_items (
                    quotation_id, stock_id, product_code, product_name, category,
                    quantity, unit, unit_cost, currency, unit_cost_try, total_cost_try,
                    notes, order_index
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, stock_id, product_code, product_name, category,
                          quantity, unit, unit_cost, total_cost, currency,
                          unit_cost_try, total_cost_try, notes, order_index
            """

            result = execute_write(
                query,
                (
                    quotation_id,
                    stock_data['id'] if stock_data else None,
                    final_product_code,
                    final_product_name,
                    final_category,
                    quantity,
                    final_unit,
                    final_unit_cost,
                    currency_code,
                    unit_cost_try,
                    total_cost_try,
                    notes,
                    next_order
                )
            )

            if result:
                added_items.append(result[0])

        if added_items:
            execute_write(
                """
                UPDATE quotations
                SET version_minor = version_minor + 1,
                    version = (version_major * 1000) + (version_minor + 1),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (quotation_id,)
            )

        currency_totals, total_try = _recalculate_quotation_totals(quotation_id)
        version_info = execute_query_one(
            "SELECT version_major, version_minor FROM quotations WHERE id = %s",
            (quotation_id,),
        )

        return jsonify({
            'message': f'{len(added_items)} ürün eklendi',
            'data': added_items,
            'currency_totals': currency_totals,
            'total_cost_try': float(total_try),
            'version': {
                'major': version_info['version_major'],
                'minor': version_info['version_minor'],
                'label': f"Ver{version_info['version_major']}.{version_info['version_minor']}",
            } if version_info else None
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
        data = request.get_json() or {}

        updates = []
        params = []

        if 'quantity' in data:
            quantity = _decimal(data.get('quantity'))
            if quantity is not None:
                updates.append("quantity = %s")
                params.append(quantity)

        if 'unit_cost' in data:
            unit_cost = _decimal(data.get('unit_cost'))
            if unit_cost is not None:
                updates.append("unit_cost = %s")
                params.append(unit_cost)

        if 'product_name' in data:
            product_name = _s(data.get('product_name'))
            if product_name:
                updates.append("product_name = %s")
                params.append(product_name)

        if 'product_code' in data:
            product_code = _s(data.get('product_code'))
            updates.append("product_code = %s")
            params.append(product_code)

        if 'category' in data:
            category = _s(data.get('category'))
            updates.append("category = %s")
            params.append(category)

        if 'unit' in data:
            unit = _s(data.get('unit'))
            updates.append("unit = %s")
            params.append(unit)

        if 'notes' in data:
            notes = _s(data.get('notes'))
            updates.append("notes = %s")
            params.append(notes)

        if 'currency' in data:
            currency_value = _s(data.get('currency'))
            if currency_value:
                updates.append("currency = %s")
                params.append(currency_value.upper())

        if not updates:
            return jsonify({'error': 'Güncellenecek alan bulunamadı'}), 400

        existing = execute_query_one(
            "SELECT id FROM quotation_items WHERE id = %s AND quotation_id = %s",
            (item_id, quotation_id)
        )

        if not existing:
            return jsonify({'error': 'Kalem bulunamadı'}), 404

        updates.append("updated_at = NOW()")
        query = f"""
            UPDATE quotation_items
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id
        """

        params.append(item_id)

        update_result = execute_write(query, tuple(params))

        if not update_result:
            return jsonify({'error': 'Kalem güncellenemedi'}), 500

        updated_row = execute_query_one(
            """
            SELECT id, stock_id, product_code, product_name, category,
                   quantity, unit, unit_cost, total_cost, currency,
                   unit_cost_try, total_cost_try, notes, order_index
            FROM quotation_items
            WHERE id = %s
            """,
            (item_id,),
        )

        rates = _get_currency_rates()
        currency_code = (updated_row.get('currency') or 'TRY').upper()
        quantity_val = _decimal(updated_row.get('quantity')) or Decimal('0')
        unit_cost_val = _decimal(updated_row.get('unit_cost')) or Decimal('0')
        unit_cost_try = _convert_to_try(unit_cost_val, currency_code, rates)
        total_cost_try = unit_cost_try * quantity_val

        execute_write(
            """
            UPDATE quotation_items
            SET unit_cost_try = %s,
                total_cost_try = %s
            WHERE id = %s
            """,
            (unit_cost_try, total_cost_try, item_id)
        )

        updated_row['unit_cost_try'] = float(unit_cost_try)
        updated_row['total_cost_try'] = float(total_cost_try)
        updated_row['currency'] = currency_code

        currency_totals, total_try = _recalculate_quotation_totals(quotation_id)
        version_info = execute_write(
            """
            UPDATE quotations
            SET version_minor = version_minor + 1,
                version = (version_major * 1000) + (version_minor + 1),
                updated_at = NOW()
            WHERE id = %s
            RETURNING version_major, version_minor
            """,
            (quotation_id,)
        )
        version_data = version_info[0] if version_info else None

        return jsonify({
            'message': 'Kalem güncellendi',
            'data': updated_row,
            'currency_totals': currency_totals,
            'total_cost_try': float(total_try),
            'version': {
                'major': version_data['version_major'],
                'minor': version_data['version_minor'],
                'label': f"Ver{version_data['version_major']}.{version_data['version_minor']}",
            } if version_data else None
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

        currency_totals, total_try = _recalculate_quotation_totals(quotation_id)
        version_info = execute_write(
            """
            UPDATE quotations
            SET version_minor = version_minor + 1,
                version = (version_major * 1000) + (version_minor + 1),
                updated_at = NOW()
            WHERE id = %s
            RETURNING version_major, version_minor
            """,
            (quotation_id,)
        )
        version_data = version_info[0] if version_info else None

        return jsonify({
            'message': 'Kalem silindi',
            'currency_totals': currency_totals,
            'total_cost_try': float(total_try),
            'version': {
                'major': version_data['version_major'],
                'minor': version_data['version_minor'],
                'label': f"Ver{version_data['version_major']}.{version_data['version_minor']}",
            } if version_data else None
        }), 200

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

        version_info = execute_write(
            """
            UPDATE quotations
            SET version_minor = version_minor + 1,
                version = (version_major * 1000) + (version_minor + 1),
                updated_at = NOW()
            WHERE id = %s
            RETURNING version_major, version_minor
            """,
            (quotation_id,)
        )
        version_data = version_info[0] if version_info else None

        return jsonify({
            'message': 'Sıralama güncellendi',
            'version': {
                'major': version_data['version_major'],
                'minor': version_data['version_minor'],
                'label': f"Ver{version_data['version_major']}.{version_data['version_minor']}",
            } if version_data else None
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@quotations_bp.route('/job/<job_id>/approved-materials', methods=['GET'])
@token_required
def get_job_approved_quotation_materials(job_id):
    """
    Get all materials from approved quotations for a specific job.
    This is used in the job materials reservation page.
    """
    try:
        # Get all approved quotations for this job with their items
        materials = execute_query("""
            SELECT
                qi.id as item_id,
                qi.quotation_id,
                qi.stock_id,
                qi.product_code,
                qi.product_name,
                qi.category,
                qi.quantity,
                qi.unit,
                qi.notes,
                q.quotation_number,
                q.name as quotation_name,
                q.updated_at,
                s.current_quantity as stock_quantity,
                s.reserved_quantity,
                s.available_quantity,
                s.supplier_name,
                s.unit_price
            FROM quotation_items qi
            INNER JOIN quotations q ON qi.quotation_id = q.id
            LEFT JOIN stocks s ON qi.stock_id = s.id
            WHERE q.job_id = %s
              AND q.status = 'approved'
              AND qi.stock_id IS NOT NULL
            ORDER BY q.updated_at DESC, qi.order_index
        """, (str(job_id),))

        data = [{
            'id': str(m['item_id']),
            'quotation_id': str(m['quotation_id']),
            'quotation_number': m['quotation_number'],
            'quotation_name': m['quotation_name'],
            'approved_at': m['updated_at'].isoformat() if m.get('updated_at') else None,
            'stock_id': str(m['stock_id']),
            'product_code': m['product_code'],
            'product_name': m['product_name'],
            'category': m.get('category'),
            'quantity': float(m['quantity']) if m.get('quantity') else 0,
            'unit': m.get('unit', 'adet'),
            'unit_price': float(m['unit_price']) if m.get('unit_price') else 0,
            'notes': m.get('notes'),
            'stock_quantity': float(m['stock_quantity']) if m.get('stock_quantity') else 0,
            'reserved_quantity': float(m['reserved_quantity']) if m.get('reserved_quantity') else 0,
            'available_quantity': float(m['available_quantity']) if m.get('available_quantity') else 0,
            'supplier_name': m.get('supplier_name'),
        } for m in materials]

        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
