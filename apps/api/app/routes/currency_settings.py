from flask import Blueprint, request, jsonify, g
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required
from decimal import Decimal

currency_settings_bp = Blueprint('currency_settings', __name__, url_prefix='/api/currency-settings')

def _decimal(v):
    """Convert to Decimal or None."""
    if v is None or v == '':
        return None
    try:
        return Decimal(str(v))
    except:
        return None

@currency_settings_bp.route('', methods=['GET'])
@token_required
def get_currency_settings():
    """Döviz kuru ayarlarını getir"""
    try:
        settings = execute_query_one("""
            SELECT cs.id, cs.usd_to_try, cs.eur_to_try, cs.updated_at, cs.updated_by,
                   u.full_name as updated_by_name
            FROM currency_settings cs
            LEFT JOIN users u ON cs.updated_by = u.id
            ORDER BY cs.updated_at DESC
            LIMIT 1
        """)

        if not settings:
            # Create default settings if none exist
            rows = execute_write("""
                INSERT INTO currency_settings
                  (usd_to_try, eur_to_try, updated_at)
                VALUES
                  (1.0, 1.0, NOW())
                RETURNING id, usd_to_try, eur_to_try, updated_at
            """)
            settings = rows[0] if rows else None

        if not settings:
            return jsonify({'error': 'Ayarlar oluşturulamadı'}), 500

        data = {
            'id': str(settings['id']),
            'usd_to_try': float(settings['usd_to_try']) if settings['usd_to_try'] else 1.0,
            'eur_to_try': float(settings['eur_to_try']) if settings['eur_to_try'] else 1.0,
            'updated_at': settings['updated_at'].isoformat() if settings.get('updated_at') else None,
            'updated_by': str(settings['updated_by']) if settings.get('updated_by') else None,
            'updated_by_name': settings.get('updated_by_name'),
        }
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@currency_settings_bp.route('', methods=['POST'])
@token_required
def update_currency_settings():
    """Döviz kuru ayarlarını güncelle"""
    try:
        data = request.get_json(force=True) or {}
        user_id = g.get('user_id')

        usd_to_try = _decimal(data.get('usd_to_try'))
        eur_to_try = _decimal(data.get('eur_to_try'))

        if usd_to_try is None and eur_to_try is None:
            return jsonify({'error': 'En az bir kur değeri gereklidir'}), 400

        if (usd_to_try is not None and usd_to_try <= 0) or (eur_to_try is not None and eur_to_try <= 0):
            return jsonify({'error': 'Kur değerleri 0\'dan büyük olmalıdır'}), 400

        # Check if settings exist
        existing = execute_query_one("SELECT id FROM currency_settings ORDER BY updated_at DESC LIMIT 1")

        if existing:
            # Update existing
            setters = []
            params = []

            if usd_to_try is not None:
                setters.append("usd_to_try = %s")
                params.append(usd_to_try)

            if eur_to_try is not None:
                setters.append("eur_to_try = %s")
                params.append(eur_to_try)

            setters.append("updated_at = NOW()")
            setters.append("updated_by = %s")
            params.append(user_id)
            params.append(str(existing['id']))

            execute_write(f"""
                UPDATE currency_settings
                SET {', '.join(setters)}
                WHERE id = %s
            """, tuple(params))

            settings_id = existing['id']
        else:
            # Insert new
            rows = execute_write("""
                INSERT INTO currency_settings
                  (usd_to_try, eur_to_try, updated_at, updated_by)
                VALUES
                  (%s, %s, NOW(), %s)
                RETURNING id
            """, (usd_to_try or 1.0, eur_to_try or 1.0, user_id))

            settings_id = rows[0]['id'] if rows else None

        return jsonify({
            'message': 'Döviz kurları güncellendi',
            'data': {'id': str(settings_id)}
        }), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@currency_settings_bp.route('/convert', methods=['POST'])
@token_required
def convert_currency():
    """Para birimi dönüştürme"""
    try:
        data = request.get_json(force=True) or {}

        amount = _decimal(data.get('amount'))
        from_currency = data.get('from_currency', 'TRY').upper()
        to_currency = data.get('to_currency', 'TRY').upper()

        if amount is None:
            return jsonify({'error': 'Miktar gereklidir'}), 400

        if from_currency not in ['TRY', 'USD', 'EUR'] or to_currency not in ['TRY', 'USD', 'EUR']:
            return jsonify({'error': 'Geçersiz para birimi (TRY, USD, EUR)'}), 400

        # Get current rates
        settings = execute_query_one("""
            SELECT usd_to_try, eur_to_try
            FROM currency_settings
            ORDER BY updated_at DESC
            LIMIT 1
        """)

        if not settings:
            return jsonify({'error': 'Döviz kurları bulunamadı'}), 404

        usd_rate = float(settings['usd_to_try']) if settings['usd_to_try'] else 1.0
        eur_rate = float(settings['eur_to_try']) if settings['eur_to_try'] else 1.0

        # Convert to TRY first
        amount_in_try = float(amount)
        if from_currency == 'USD':
            amount_in_try *= usd_rate
        elif from_currency == 'EUR':
            amount_in_try *= eur_rate

        # Convert from TRY to target currency
        result = amount_in_try
        if to_currency == 'USD':
            result = amount_in_try / usd_rate if usd_rate > 0 else 0
        elif to_currency == 'EUR':
            result = amount_in_try / eur_rate if eur_rate > 0 else 0

        return jsonify({
            'data': {
                'amount': float(amount),
                'from_currency': from_currency,
                'to_currency': to_currency,
                'converted_amount': round(result, 2),
                'rates_used': {
                    'USD_to_TRY': usd_rate,
                    'EUR_to_TRY': eur_rate,
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500