
from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write
from app.middleware.auth_middleware import token_required

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

@customers_bp.route('', methods=['GET'])
@token_required
def get_customers():
    """Tüm müşterileri listele (yalnızca aktif)"""
    try:
        query = """
            SELECT id, name, contact_person, phone, email, address, tax_office, tax_number, notes, is_active
            FROM customers
            WHERE is_active = TRUE
            ORDER BY name
        """
        rows = execute_query(query)
        data = [{
            'id': str(r['id']),
            'name': r['name'],
            'contact_person': r['contact_person'],
            'phone': r['phone'],
            'email': r['email'],
            'address': r['address'],
            'tax_office': r['tax_office'],
            'tax_number': r['tax_number'],
            'notes': r['notes'],
            'is_active': r['is_active'],
        } for r in rows]
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@customers_bp.route('/<uuid:customer_id>', methods=['GET'])
@token_required
def get_customer_detail(customer_id):
    """Tek müşteri"""
    try:
        rows = execute_query("""
            SELECT id, name, contact_person, phone, email, address, tax_office, tax_number, notes, is_active
            FROM customers
            WHERE id = %s
            LIMIT 1
        """, (str(customer_id),))
        if not rows:
            return jsonify({'error': 'Müşteri bulunamadı'}), 404
        r = rows[0]
        data = {
            'id': str(r['id']),
            'name': r['name'],
            'contact_person': r['contact_person'],
            'phone': r['phone'],
            'email': r['email'],
            'address': r['address'],
            'tax_office': r['tax_office'],
            'tax_number': r['tax_number'],
            'notes': r['notes'],
            'is_active': r['is_active'],
        }
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@customers_bp.route('/<uuid:customer_id>', methods=['PATCH'])
@token_required
def update_customer(customer_id):
    """Müşteri güncelle (yalnızca gönderilen alanlar)"""
    try:
        data = request.get_json(force=True) or {}
        allowed = [
            'name', 'contact_person', 'phone', 'email', 'address',
            'tax_office', 'tax_number', 'notes', 'is_active'
        ]

        def norm_str(v):
            if v is None: return None
            s = str(v).strip()
            return s if s != '' else None

        def norm_bool(v):
            if isinstance(v, bool): return v
            if v is None: return None
            if isinstance(v, (int, float)): return bool(v)
            return str(v).strip().lower() in ('1','true','yes','on')

        setters, params = [], []
        for k in allowed:
            if k in data:
                val = norm_bool(data[k]) if k == 'is_active' else norm_str(data[k])
                setters.append(f"{k} = %s")
                params.append(val)

        if not setters:
            return jsonify({'error': 'Güncellenecek alan yok'}), 400

        setters.append("updated_at = NOW()")
        params.append(str(customer_id))

        rows = execute_query(f"""
            UPDATE customers
               SET {', '.join(setters)}
             WHERE id = %s
             RETURNING id
        """, tuple(params))

        if not rows:
            return jsonify({'error': 'Müşteri bulunamadı'}), 404

        return jsonify({'message': 'Güncellendi', 'data': {'id': str(customer_id)}}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@customers_bp.route('/<uuid:customer_id>', methods=['DELETE'])
@token_required
def delete_customer(customer_id):
    """Soft delete: is_active = false"""
    try:
        rows = execute_query("""
            UPDATE customers
               SET is_active = FALSE, updated_at = NOW()
             WHERE id = %s AND is_active = TRUE
             RETURNING id
        """, (str(customer_id),))
        if not rows:
            return jsonify({'error': 'Müşteri bulunamadı veya zaten pasif'}), 404
        return jsonify({'message': 'Müşteri arşivlendi', 'data': {'id': str(customer_id)}}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


def _s(v):
    """Boş/whitespace string -> None."""
    if v is None: 
        return None
    s = str(v).strip()
    return s if s != '' else None

@customers_bp.route('', methods=['POST'])
@token_required
def create_customer():
    try:
        data = request.get_json(force=True) or {}

        name          = _s(data.get('name'))
        if not name:
            return jsonify({'error': 'name zorunludur'}), 400

        contact_person = _s(data.get('contact_person'))
        phone          = _s(data.get('phone'))
        email          = _s(data.get('email'))
        address        = _s(data.get('address'))
        tax_office     = _s(data.get('tax_office'))
        tax_number     = _s(data.get('tax_number'))
        notes          = _s(data.get('notes'))

        is_active_raw  = data.get('is_active')
        if is_active_raw is None:
            is_active = True
        else:
            is_active = str(is_active_raw).strip().lower() in ('1','true','yes','on')

        rows = execute_write("""
            INSERT INTO customers
              (name, contact_person, phone, email, address, tax_office, tax_number, notes, is_active, created_at, updated_at)
            VALUES
              (%s,   %s,             %s,    %s,    %s,     %s,         %s,         %s,    %s,        NOW(),      NOW())
            RETURNING id
        """, (name, contact_person, phone, email, address, tax_office, tax_number, notes, is_active))

        new_id = rows[0]['id'] if rows else None
        return jsonify({'message': 'Oluşturuldu', 'data': {'id': str(new_id)}}), 201

    except Exception as e:
        # geçici olarak exception'ı da döndürelim ki 500'ün sebebini net görelim
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
