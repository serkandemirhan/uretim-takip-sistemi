from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required

stock_field_settings_bp = Blueprint('stock_field_settings', __name__, url_prefix='/api/settings/stock-fields')

def _s(v):
    """Boş/whitespace string -> None."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s != '' else None


@stock_field_settings_bp.route('', methods=['GET'])
@token_required
def get_stock_field_settings():
    """
    Tüm stok alan ayarlarını getir
    Query params:
      - active_only: true (sadece aktif alanları getir)
      - field_type: group, category, string, properties (tipe göre filtrele)
    """
    try:
        active_only = request.args.get('active_only') == 'true'
        field_type = request.args.get('field_type')

        query = """
            SELECT field_key, custom_label, is_active, display_order, field_type,
                   created_at, updated_at
            FROM stock_field_settings
            WHERE 1=1
        """
        params = []

        if active_only:
            query += " AND is_active = TRUE"

        if field_type:
            query += " AND field_type = %s"
            params.append(field_type)

        query += " ORDER BY display_order, field_key"

        rows = execute_query(query, tuple(params) if params else None)

        data = [{
            'field_key': r['field_key'],
            'custom_label': r['custom_label'],
            'is_active': r['is_active'],
            'display_order': r['display_order'],
            'field_type': r['field_type'],
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
            'updated_at': r['updated_at'].isoformat() if r.get('updated_at') else None,
        } for r in rows]

        return jsonify({'data': data}), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stock_field_settings_bp.route('/<field_key>', methods=['GET'])
@token_required
def get_stock_field_setting(field_key):
    """Tek bir alan ayarını getir"""
    try:
        row = execute_query_one("""
            SELECT field_key, custom_label, is_active, display_order, field_type,
                   created_at, updated_at
            FROM stock_field_settings
            WHERE field_key = %s
        """, (field_key,))

        if not row:
            return jsonify({'error': 'Alan ayarı bulunamadı'}), 404

        data = {
            'field_key': row['field_key'],
            'custom_label': row['custom_label'],
            'is_active': row['is_active'],
            'display_order': row['display_order'],
            'field_type': row['field_type'],
            'created_at': row['created_at'].isoformat() if row.get('created_at') else None,
            'updated_at': row['updated_at'].isoformat() if row.get('updated_at') else None,
        }

        return jsonify({'data': data}), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stock_field_settings_bp.route('', methods=['POST'])
@token_required
def update_stock_field_settings():
    """
    Toplu ayar güncelleme
    Body: {
      "settings": [
        {
          "field_key": "group1",
          "custom_label": "Malzeme Tipi",
          "is_active": true,
          "display_order": 1
        },
        ...
      ]
    }
    """
    try:
        data = request.get_json()
        settings = data.get('settings', [])

        if not settings or not isinstance(settings, list):
            return jsonify({'error': 'settings dizisi gerekli'}), 400

        # Her bir ayarı güncelle
        for setting in settings:
            field_key = setting.get('field_key')
            if not field_key:
                continue

            custom_label = _s(setting.get('custom_label'))
            is_active = setting.get('is_active')
            display_order = setting.get('display_order')

            # Güncelleme sorgusu
            update_parts = []
            params = []

            if custom_label is not None:
                update_parts.append("custom_label = %s")
                params.append(custom_label)

            if is_active is not None:
                update_parts.append("is_active = %s")
                params.append(bool(is_active))

            if display_order is not None:
                update_parts.append("display_order = %s")
                params.append(int(display_order))

            if update_parts:
                params.append(field_key)
                execute_write(f"""
                    UPDATE stock_field_settings
                    SET {', '.join(update_parts)}
                    WHERE field_key = %s
                """, tuple(params))

        return jsonify({'message': 'Ayarlar güncellendi'}), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stock_field_settings_bp.route('/<field_key>', methods=['PATCH'])
@token_required
def update_single_field_setting(field_key):
    """
    Tek bir alan ayarını güncelle
    Body: {
      "custom_label": "Yeni İsim",
      "is_active": true,
      "display_order": 5
    }
    """
    try:
        data = request.get_json()

        # Alan var mı kontrol et
        existing = execute_query_one(
            "SELECT field_key FROM stock_field_settings WHERE field_key = %s",
            (field_key,)
        )
        if not existing:
            return jsonify({'error': 'Alan bulunamadı'}), 404

        update_parts = []
        params = []

        custom_label = _s(data.get('custom_label'))
        if custom_label is not None:
            update_parts.append("custom_label = %s")
            params.append(custom_label)

        if 'is_active' in data:
            update_parts.append("is_active = %s")
            params.append(bool(data['is_active']))

        if 'display_order' in data:
            update_parts.append("display_order = %s")
            params.append(int(data['display_order']))

        if not update_parts:
            return jsonify({'error': 'Güncellenecek alan yok'}), 400

        params.append(field_key)
        execute_write(f"""
            UPDATE stock_field_settings
            SET {', '.join(update_parts)}
            WHERE field_key = %s
        """, tuple(params))

        return jsonify({'message': 'Alan ayarı güncellendi'}), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@stock_field_settings_bp.route('/reset', methods=['POST'])
@token_required
def reset_stock_field_settings():
    """Tüm ayarları varsayılan değerlere sıfırla"""
    try:
        # Tüm alanları pasif yap ve varsayılan isimlere dön
        execute_write("""
            UPDATE stock_field_settings
            SET is_active = FALSE,
                custom_label = CASE field_key
                    WHEN 'group1' THEN 'Grup 1'
                    WHEN 'group2' THEN 'Grup 2'
                    WHEN 'group3' THEN 'Grup 3'
                    WHEN 'group4' THEN 'Grup 4'
                    WHEN 'group5' THEN 'Grup 5'
                    WHEN 'group6' THEN 'Grup 6'
                    WHEN 'group7' THEN 'Grup 7'
                    WHEN 'group8' THEN 'Grup 8'
                    WHEN 'group9' THEN 'Grup 9'
                    WHEN 'group10' THEN 'Grup 10'
                    WHEN 'category1' THEN 'Kategori 1'
                    WHEN 'category2' THEN 'Kategori 2'
                    WHEN 'category3' THEN 'Kategori 3'
                    WHEN 'category4' THEN 'Kategori 4'
                    WHEN 'category5' THEN 'Kategori 5'
                    WHEN 'category6' THEN 'Kategori 6'
                    WHEN 'category7' THEN 'Kategori 7'
                    WHEN 'category8' THEN 'Kategori 8'
                    WHEN 'category9' THEN 'Kategori 9'
                    WHEN 'category10' THEN 'Kategori 10'
                    WHEN 'string1' THEN 'Özel Alan 1'
                    WHEN 'string2' THEN 'Özel Alan 2'
                    WHEN 'string3' THEN 'Özel Alan 3'
                    WHEN 'string4' THEN 'Özel Alan 4'
                    WHEN 'string5' THEN 'Özel Alan 5'
                    WHEN 'string6' THEN 'Özel Alan 6'
                    WHEN 'string7' THEN 'Özel Alan 7'
                    WHEN 'string8' THEN 'Özel Alan 8'
                    WHEN 'string9' THEN 'Özel Alan 9'
                    WHEN 'string10' THEN 'Özel Alan 10'
                    WHEN 'properties1' THEN 'Özellik 1'
                    WHEN 'properties2' THEN 'Özellik 2'
                    WHEN 'properties3' THEN 'Özellik 3'
                    WHEN 'properties4' THEN 'Özellik 4'
                    WHEN 'properties5' THEN 'Özellik 5'
                    WHEN 'properties6' THEN 'Özellik 6'
                    WHEN 'properties7' THEN 'Özellik 7'
                    WHEN 'properties8' THEN 'Özellik 8'
                    WHEN 'properties9' THEN 'Özellik 9'
                    WHEN 'properties10' THEN 'Özellik 10'
                    ELSE custom_label
                END
        """)

        return jsonify({'message': 'Ayarlar sıfırlandı'}), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
