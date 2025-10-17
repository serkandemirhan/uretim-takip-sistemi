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
                   min_quantity, unit_price, currency, supplier_name, description,
                   is_active, created_at, updated_at
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
            'min_quantity': float(r['min_quantity']) if r['min_quantity'] else 0,
            'unit_price': float(r['unit_price']) if r['unit_price'] else None,
            'currency': r.get('currency', 'TRY'),
            'supplier_name': r.get('supplier_name'),
            'description': r.get('description'),
            'is_active': r['is_active'],
            'is_critical': r['current_quantity'] <= r['min_quantity'] if r['min_quantity'] else False,
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
            'updated_at': r['updated_at'].isoformat() if r.get('updated_at') else None,
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
                   min_quantity, unit_price, currency, supplier_name, description,
                   is_active, created_at, updated_at
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
            'min_quantity': float(stock['min_quantity']) if stock['min_quantity'] else 0,
            'unit_price': float(stock['unit_price']) if stock['unit_price'] else None,
            'currency': stock.get('currency', 'TRY'),
            'supplier_name': stock.get('supplier_name'),
            'description': stock.get('description'),
            'is_active': stock['is_active'],
            'is_critical': stock['current_quantity'] <= stock['min_quantity'] if stock['min_quantity'] else False,
            'created_at': stock['created_at'].isoformat() if stock.get('created_at') else None,
            'updated_at': stock['updated_at'].isoformat() if stock.get('updated_at') else None,
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
               unit_price, currency, supplier_name, description, is_active, created_at, updated_at)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW(), NOW())
            RETURNING id
        """, (
            product_code, product_name, category, unit, current_quantity, min_quantity,
            unit_price, currency, supplier_name, description
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
            'unit_price', 'currency', 'supplier_name', 'description', 'is_active'
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

        rows = execute_query(f"""
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