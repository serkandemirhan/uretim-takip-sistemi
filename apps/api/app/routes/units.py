from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, execute_write
from app.middleware.auth_middleware import token_required, permission_required

units_bp = Blueprint('units', __name__, url_prefix='/api/units')


def _s(value):
    if value is None:
        return None
    text = str(value).strip()
    return text if text != '' else None


def ensure_units_initialized():
    """Tablo/trigger yoksa oluştur ve varsayılanları ekle."""
    statements = [
        """
        CREATE TABLE IF NOT EXISTS units (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_units_name ON units(name)",
        """
        CREATE OR REPLACE FUNCTION update_units_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """,
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_units_timestamp'
            ) THEN
                CREATE TRIGGER trigger_update_units_timestamp
                    BEFORE UPDATE ON units
                    FOR EACH ROW
                    EXECUTE FUNCTION update_units_timestamp();
            END IF;
        END;
        $$;
        """,
        """
        INSERT INTO units (code, name, description)
        VALUES
            ('ADET', 'Adet', 'Adet bazlı sayım birimi'),
            ('PAKET', 'Paket', 'Paket bazlı sayım birimi'),
            ('KUTU', 'Kutu', 'Kutu bazlı sayım birimi'),
            ('KG', 'Kilogram', 'Ağırlık birimi'),
            ('M', 'Metre', 'Uzunluk birimi'),
            ('M2', 'Metrekare', 'Alan birimi'),
            ('CM', 'Santimetre', 'Uzunluk birimi'),
            ('L', 'Litre', 'Hacim birimi')
        ON CONFLICT (code) DO NOTHING;
        """,
    ]

    for statement in statements:
        try:
            execute_write(statement)
        except Exception:
            continue


@units_bp.route('', methods=['GET'])
@token_required
def list_units():
    """Ölçü birimlerini listele"""
    try:
        ensure_units_initialized()
        include_inactive = request.args.get('include_inactive') == 'true'

        query = """
            SELECT id, code, name, description, is_active, created_at, updated_at
            FROM units
        """
        params = []

        if not include_inactive:
            query += " WHERE is_active = TRUE"

        query += " ORDER BY name"

        units = execute_query(query, params)

        return jsonify({
            'data': units,
            'count': len(units),
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@units_bp.route('', methods=['POST'])
@token_required
@permission_required(['yonetici'])
def create_unit():
    """Yeni ölçü birimi oluştur"""
    try:
        ensure_units_initialized()
        data = request.get_json() or {}
        code = _s(data.get('code'))
        name = _s(data.get('name'))
        description = _s(data.get('description'))
        is_active = bool(data.get('is_active', True))

        if not code or not name:
            return jsonify({'error': 'Kod ve ad zorunludur'}), 400

        code = code.upper()

        existing = execute_query_one(
            "SELECT id FROM units WHERE code = %s",
            (code,),
        )
        if existing:
            return jsonify({'error': 'Bu kodla tanımlanmış bir ölçü birimi mevcut'}), 400

        result = execute_write(
            """
            INSERT INTO units (code, name, description, is_active)
            VALUES (%s, %s, %s, %s)
            RETURNING id, code, name, description, is_active, created_at, updated_at
            """,
            (code, name, description, is_active),
        )

        unit = result[0] if result else None

        return jsonify({
            'message': 'Ölçü birimi oluşturuldu',
            'data': unit,
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@units_bp.route('/<unit_id>', methods=['PUT'])
@token_required
@permission_required(['yonetici'])
def update_unit(unit_id):
    """Ölçü birimini güncelle"""
    try:
        ensure_units_initialized()
        existing = execute_query_one(
            "SELECT id FROM units WHERE id = %s",
            (unit_id,),
        )
        if not existing:
            return jsonify({'error': 'Ölçü birimi bulunamadı'}), 404

        data = request.get_json() or {}

        updates = []
        params = []

        if 'code' in data:
            code = _s(data.get('code'))
            if not code:
                return jsonify({'error': 'Kod boş olamaz'}), 400
            code = code.upper()

            duplicate = execute_query_one(
                "SELECT id FROM units WHERE code = %s AND id <> %s",
                (code, unit_id),
            )
            if duplicate:
                return jsonify({'error': 'Bu kodla tanımlanmış başka bir ölçü birimi mevcut'}), 400

            updates.append("code = %s")
            params.append(code)

        if 'name' in data:
            name = _s(data.get('name'))
            if not name:
                return jsonify({'error': 'Ad boş olamaz'}), 400
            updates.append("name = %s")
            params.append(name)

        if 'description' in data:
            description = _s(data.get('description'))
            updates.append("description = %s")
            params.append(description)

        if 'is_active' in data:
            is_active = data.get('is_active')
            updates.append("is_active = %s")
            params.append(bool(is_active))

        if not updates:
            return jsonify({'error': 'Güncellenecek alan bulunamadı'}), 400

        updates.append("updated_at = NOW()")

        query = f"""
            UPDATE units
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id, code, name, description, is_active, created_at, updated_at
        """
        params.append(unit_id)

        result = execute_write(query, tuple(params))
        unit = result[0] if result else None

        return jsonify({
            'message': 'Ölçü birimi güncellendi',
            'data': unit,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@units_bp.route('/<unit_id>', methods=['DELETE'])
@token_required
@permission_required(['yonetici'])
def deactivate_unit(unit_id):
    """Ölçü birimini pasif et"""
    try:
        ensure_units_initialized()
        existing = execute_query_one(
            "SELECT id FROM units WHERE id = %s",
            (unit_id,),
        )
        if not existing:
            return jsonify({'error': 'Ölçü birimi bulunamadı'}), 404

        result = execute_write(
            """
            UPDATE units
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = %s
            RETURNING id, code, name, description, is_active, created_at, updated_at
            """,
            (unit_id,),
        )

        unit = result[0] if result else None

        return jsonify({
            'message': 'Ölçü birimi pasif edildi',
            'data': unit,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
