from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required, permission_required
from decimal import Decimal

stocks_bp = Blueprint('stocks', __name__, url_prefix='/api/stocks')

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

@stocks_bp.route('', methods=['GET'])
@token_required
def get_stocks():
    """Tüm stokları listele (yalnızca aktif)"""
    try:
        # Query parameters for filtering
        category = request.args.get('category')
        critical_only = request.args.get('critical_only') == 'true'

        query = """
            SELECT id, product_code, product_name, category, unit, current_quantity,
                   reserved_quantity, available_quantity, min_quantity, unit_price,
                   currency, supplier_name, description, is_active, created_at, updated_at,
                   group1, group2, group3, group4, group5, group6, group7, group8, group9, group10,
                   category1, category2, category3, category4, category5, category6, category7, category8, category9, category10,
                   string1, string2, string3, string4, string5, string6, string7, string8, string9, string10,
                   properties1, properties2, properties3, properties4, properties5, properties6, properties7, properties8, properties9, properties10
            FROM stocks
            WHERE is_active = TRUE
        """
        params = []

        if category:
            query += " AND category = %s"
            params.append(category)

        if critical_only:
            query += " AND current_quantity <= min_quantity"

        query += " ORDER BY product_name"

        rows = execute_query(query, tuple(params) if params else None)
        data = [{
            'id': str(r['id']),
            'product_code': r['product_code'],
            'product_name': r['product_name'],
            'category': r.get('category'),
            'unit': r.get('unit', 'adet'),
            'current_quantity': float(r['current_quantity']) if r['current_quantity'] else 0,
            'reserved_quantity': float(r['reserved_quantity']) if r.get('reserved_quantity') else 0,
            'available_quantity': float(r['available_quantity']) if r.get('available_quantity') else 0,
            'min_quantity': float(r['min_quantity']) if r['min_quantity'] else 0,
            'unit_price': float(r['unit_price']) if r['unit_price'] else None,
            'currency': r.get('currency', 'TRY'),
            'supplier_name': r.get('supplier_name'),
            'description': r.get('description'),
            'is_active': r['is_active'],
            'is_critical': r['current_quantity'] <= r['min_quantity'] if r['min_quantity'] else False,
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
            'updated_at': r['updated_at'].isoformat() if r.get('updated_at') else None,
            'group1': r.get('group1'), 'group2': r.get('group2'), 'group3': r.get('group3'),
            'group4': r.get('group4'), 'group5': r.get('group5'), 'group6': r.get('group6'),
            'group7': r.get('group7'), 'group8': r.get('group8'), 'group9': r.get('group9'), 'group10': r.get('group10'),
            'category1': r.get('category1'), 'category2': r.get('category2'), 'category3': r.get('category3'),
            'category4': r.get('category4'), 'category5': r.get('category5'), 'category6': r.get('category6'),
            'category7': r.get('category7'), 'category8': r.get('category8'), 'category9': r.get('category9'), 'category10': r.get('category10'),
            'string1': r.get('string1'), 'string2': r.get('string2'), 'string3': r.get('string3'),
            'string4': r.get('string4'), 'string5': r.get('string5'), 'string6': r.get('string6'),
            'string7': r.get('string7'), 'string8': r.get('string8'), 'string9': r.get('string9'), 'string10': r.get('string10'),
            'properties1': r.get('properties1'), 'properties2': r.get('properties2'), 'properties3': r.get('properties3'),
            'properties4': r.get('properties4'), 'properties5': r.get('properties5'), 'properties6': r.get('properties6'),
            'properties7': r.get('properties7'), 'properties8': r.get('properties8'), 'properties9': r.get('properties9'), 'properties10': r.get('properties10'),
        } for r in rows]
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stocks_bp.route('/<uuid:stock_id>', methods=['GET'])
@token_required
def get_stock_detail(stock_id):
    """Tek stok kartı detayı"""
    try:
        stock = execute_query_one("""
            SELECT id, product_code, product_name, category, unit, current_quantity,
                   reserved_quantity, available_quantity, min_quantity, unit_price,
                   currency, supplier_name, description, is_active, created_at, updated_at,
                   group1, group2, group3, group4, group5, group6, group7, group8, group9, group10,
                   category1, category2, category3, category4, category5, category6, category7, category8, category9, category10,
                   string1, string2, string3, string4, string5, string6, string7, string8, string9, string10,
                   properties1, properties2, properties3, properties4, properties5, properties6, properties7, properties8, properties9, properties10
            FROM stocks
            WHERE id = %s
            LIMIT 1
        """, (str(stock_id),))

        if not stock:
            return jsonify({'error': 'Stok bulunamadı'}), 404

        data = {
            'id': str(stock['id']),
            'product_code': stock['product_code'],
            'product_name': stock['product_name'],
            'category': stock.get('category'),
            'unit': stock.get('unit', 'adet'),
            'current_quantity': float(stock['current_quantity']) if stock['current_quantity'] else 0,
            'reserved_quantity': float(stock['reserved_quantity']) if stock.get('reserved_quantity') else 0,
            'available_quantity': float(stock['available_quantity']) if stock.get('available_quantity') else 0,
            'min_quantity': float(stock['min_quantity']) if stock['min_quantity'] else 0,
            'unit_price': float(stock['unit_price']) if stock['unit_price'] else None,
            'currency': stock.get('currency', 'TRY'),
            'supplier_name': stock.get('supplier_name'),
            'description': stock.get('description'),
            'is_active': stock['is_active'],
            'is_critical': stock['current_quantity'] <= stock['min_quantity'] if stock['min_quantity'] else False,
            'created_at': stock['created_at'].isoformat() if stock.get('created_at') else None,
            'updated_at': stock['updated_at'].isoformat() if stock.get('updated_at') else None,
            'group1': stock.get('group1'), 'group2': stock.get('group2'), 'group3': stock.get('group3'),
            'group4': stock.get('group4'), 'group5': stock.get('group5'), 'group6': stock.get('group6'),
            'group7': stock.get('group7'), 'group8': stock.get('group8'), 'group9': stock.get('group9'), 'group10': stock.get('group10'),
            'category1': stock.get('category1'), 'category2': stock.get('category2'), 'category3': stock.get('category3'),
            'category4': stock.get('category4'), 'category5': stock.get('category5'), 'category6': stock.get('category6'),
            'category7': stock.get('category7'), 'category8': stock.get('category8'), 'category9': stock.get('category9'), 'category10': stock.get('category10'),
            'string1': stock.get('string1'), 'string2': stock.get('string2'), 'string3': stock.get('string3'),
            'string4': stock.get('string4'), 'string5': stock.get('string5'), 'string6': stock.get('string6'),
            'string7': stock.get('string7'), 'string8': stock.get('string8'), 'string9': stock.get('string9'), 'string10': stock.get('string10'),
            'properties1': stock.get('properties1'), 'properties2': stock.get('properties2'), 'properties3': stock.get('properties3'),
            'properties4': stock.get('properties4'), 'properties5': stock.get('properties5'), 'properties6': stock.get('properties6'),
            'properties7': stock.get('properties7'), 'properties8': stock.get('properties8'), 'properties9': stock.get('properties9'), 'properties10': stock.get('properties10'),
        }
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stocks_bp.route('', methods=['POST'])
@token_required
def create_stock():
    """Yeni stok kartı oluştur"""
    try:
        data = request.get_json(force=True) or {}

        product_code = _s(data.get('product_code'))
        product_name = _s(data.get('product_name'))

        if not product_code or not product_name:
            return jsonify({'error': 'Ürün kodu ve ürün adı zorunludur'}), 400

        category = _s(data.get('category'))
        unit = _s(data.get('unit', 'adet'))
        current_quantity = _decimal(data.get('current_quantity', 0))
        min_quantity = _decimal(data.get('min_quantity', 0))
        unit_price = _decimal(data.get('unit_price'))
        currency = _s(data.get('currency', 'TRY'))
        supplier_name = _s(data.get('supplier_name'))
        description = _s(data.get('description'))

        # New custom fields
        group1 = _s(data.get('group1'))
        group2 = _s(data.get('group2'))
        group3 = _s(data.get('group3'))
        group4 = _s(data.get('group4'))
        group5 = _s(data.get('group5'))
        group6 = _s(data.get('group6'))
        group7 = _s(data.get('group7'))
        group8 = _s(data.get('group8'))
        group9 = _s(data.get('group9'))
        group10 = _s(data.get('group10'))

        category1 = _s(data.get('category1'))
        category2 = _s(data.get('category2'))
        category3 = _s(data.get('category3'))
        category4 = _s(data.get('category4'))
        category5 = _s(data.get('category5'))
        category6 = _s(data.get('category6'))
        category7 = _s(data.get('category7'))
        category8 = _s(data.get('category8'))
        category9 = _s(data.get('category9'))
        category10 = _s(data.get('category10'))

        string1 = _s(data.get('string1'))
        string2 = _s(data.get('string2'))
        string3 = _s(data.get('string3'))
        string4 = _s(data.get('string4'))
        string5 = _s(data.get('string5'))
        string6 = _s(data.get('string6'))
        string7 = _s(data.get('string7'))
        string8 = _s(data.get('string8'))
        string9 = _s(data.get('string9'))
        string10 = _s(data.get('string10'))

        properties1 = _s(data.get('properties1'))
        properties2 = _s(data.get('properties2'))
        properties3 = _s(data.get('properties3'))
        properties4 = _s(data.get('properties4'))
        properties5 = _s(data.get('properties5'))
        properties6 = _s(data.get('properties6'))
        properties7 = _s(data.get('properties7'))
        properties8 = _s(data.get('properties8'))
        properties9 = _s(data.get('properties9'))
        properties10 = _s(data.get('properties10'))

        # Check if product_code already exists
        exists = execute_query_one(
            "SELECT id FROM stocks WHERE product_code = %s AND is_active = TRUE",
            (product_code,)
        )
        if exists:
            return jsonify({'error': 'Bu ürün kodu zaten kullanılıyor'}), 400

        rows = execute_write("""
            INSERT INTO stocks
              (product_code, product_name, category, unit, current_quantity, min_quantity,
               unit_price, currency, supplier_name, description, is_active, created_at, updated_at,
               group1, group2, group3, group4, group5, group6, group7, group8, group9, group10,
               category1, category2, category3, category4, category5, category6, category7, category8, category9, category10,
               string1, string2, string3, string4, string5, string6, string7, string8, string9, string10,
               properties1, properties2, properties3, properties4, properties5, properties6, properties7, properties8, properties9, properties10)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW(), NOW(),
               %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
               %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
               %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
               %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            product_code, product_name, category, unit, current_quantity, min_quantity,
            unit_price, currency, supplier_name, description,
            group1, group2, group3, group4, group5, group6, group7, group8, group9, group10,
            category1, category2, category3, category4, category5, category6, category7, category8, category9, category10,
            string1, string2, string3, string4, string5, string6, string7, string8, string9, string10,
            properties1, properties2, properties3, properties4, properties5, properties6, properties7, properties8, properties9, properties10
        ))

        new_id = rows[0]['id'] if rows else None
        return jsonify({'message': 'Stok kartı oluşturuldu', 'data': {'id': str(new_id)}}), 201

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stocks_bp.route('/<uuid:stock_id>', methods=['PATCH'])
@token_required
def update_stock(stock_id):
    """Stok kartını güncelle"""
    try:
        data = request.get_json(force=True) or {}
        allowed = [
            'product_code', 'product_name', 'category', 'unit', 'min_quantity',
            'unit_price', 'currency', 'supplier_name', 'description', 'is_active',
            'group1', 'group2', 'group3', 'group4', 'group5', 'group6', 'group7', 'group8', 'group9', 'group10',
            'category1', 'category2', 'category3', 'category4', 'category5', 'category6', 'category7', 'category8', 'category9', 'category10',
            'string1', 'string2', 'string3', 'string4', 'string5', 'string6', 'string7', 'string8', 'string9', 'string10',
            'properties1', 'properties2', 'properties3', 'properties4', 'properties5', 'properties6', 'properties7', 'properties8', 'properties9', 'properties10'
        ]

        setters, params = [], []
        for k in allowed:
            if k in data:
                if k in ['min_quantity', 'unit_price']:
                    val = _decimal(data[k])
                elif k == 'is_active':
                    val = bool(data[k])
                else:
                    val = _s(data[k])
                setters.append(f"{k} = %s")
                params.append(val)

        if not setters:
            return jsonify({'error': 'Güncellenecek alan yok'}), 400

        setters.append("updated_at = NOW()")
        params.append(str(stock_id))

        rows = execute_write(f"""
            UPDATE stocks
               SET {', '.join(setters)}
             WHERE id = %s
             RETURNING id
        """, tuple(params))

        if not rows:
            return jsonify({'error': 'Stok kartı bulunamadı'}), 404

        return jsonify({'message': 'Stok kartı güncellendi', 'data': {'id': str(stock_id)}}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stocks_bp.route('/<uuid:stock_id>', methods=['DELETE'])
@token_required
def delete_stock(stock_id):
    """Soft delete: is_active = false"""
    try:
        rows = execute_query("""
            UPDATE stocks
               SET is_active = FALSE, updated_at = NOW()
             WHERE id = %s AND is_active = TRUE
             RETURNING id
        """, (str(stock_id),))
        if not rows:
            return jsonify({'error': 'Stok kartı bulunamadı veya zaten pasif'}), 404
        return jsonify({'message': 'Stok kartı arşivlendi', 'data': {'id': str(stock_id)}}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stocks_bp.route('/categories', methods=['GET'])
@token_required
def get_stock_categories():
    """Tüm stok kategorilerini listele"""
    try:
        rows = execute_query("""
            SELECT DISTINCT category
            FROM stocks
            WHERE category IS NOT NULL AND is_active = TRUE
            ORDER BY category
        """)
        categories = [r['category'] for r in rows if r.get('category')]
        return jsonify({'data': categories}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stocks_bp.route('/summary', methods=['GET'])
@token_required
def get_stock_summary():
    """Stok özeti: toplam değerler ve kritik stoklar"""
    try:
        # Döviz kurlarını al
        currency_settings = execute_query_one("""
            SELECT usd_to_try, eur_to_try
            FROM currency_settings
            ORDER BY updated_at DESC
            LIMIT 1
        """)

        usd_rate = float(currency_settings['usd_to_try']) if currency_settings else 1.0
        eur_rate = float(currency_settings['eur_to_try']) if currency_settings else 1.0

        # Toplam stok değeri hesapla
        stocks = execute_query("""
            SELECT currency,
                   SUM(current_quantity * COALESCE(unit_price, 0)) as total_value
            FROM stocks
            WHERE is_active = TRUE
            GROUP BY currency
        """)

        total_try = 0
        total_usd = 0
        total_eur = 0

        for row in stocks:
            value = float(row['total_value']) if row['total_value'] else 0
            curr = row['currency'] or 'TRY'

            if curr == 'TRY':
                total_try += value
            elif curr == 'USD':
                total_usd += value
                total_try += value * usd_rate
            elif curr == 'EUR':
                total_eur += value
                total_try += value * eur_rate

        # Kritik stok sayısı
        critical_count = execute_query_one("""
            SELECT COUNT(*) as count
            FROM stocks
            WHERE is_active = TRUE AND current_quantity <= min_quantity
        """)

        # Toplam stok kalemi sayısı
        total_items = execute_query_one("""
            SELECT COUNT(*) as count
            FROM stocks
            WHERE is_active = TRUE
        """)

        return jsonify({
            'data': {
                'total_value': {
                    'TRY': round(total_try, 2),
                    'USD': round(total_try / usd_rate, 2) if usd_rate > 0 else 0,
                    'EUR': round(total_try / eur_rate, 2) if eur_rate > 0 else 0,
                },
                'by_currency': {
                    'TRY': round(total_try, 2),
                    'USD': round(total_usd, 2),
                    'EUR': round(total_eur, 2),
                },
                'critical_stock_count': critical_count['count'] if critical_count else 0,
                'total_stock_items': total_items['count'] if total_items else 0,
                'currency_rates': {
                    'USD_to_TRY': usd_rate,
                    'EUR_to_TRY': eur_rate,
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500