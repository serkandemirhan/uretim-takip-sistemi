from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required, permission_required
from app.services.storage_paths import get_minio, ensure_bucket, make_folder, customer_prefix
import os
import logging
from app.services.s3_client import get_s3

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

@customers_bp.route('', methods=['GET'])
@token_required
@permission_required('customers', 'view')
def get_customers():
    """Tüm müşterileri listele (yalnızca aktif)"""
    try:
        query = """
            SELECT id, name, code, contact_person, phone, phone_secondary, gsm, email, address,
                   city, tax_office, tax_number, notes, short_code, postal_code, is_active
            FROM customers
            WHERE is_active = TRUE
            ORDER BY name
        """
        rows = execute_query(query)
        data = [{
            'id': str(r['id']),
            'name': r['name'],
            'code': r.get('code'),
            'contact_person': r['contact_person'],
            'phone': r['phone'],
            'phone_secondary': r.get('phone_secondary'),
            'gsm': r.get('gsm'),
            'email': r['email'],
            'address': r['address'],
            'city': r.get('city'),
            'tax_office': r['tax_office'],
            'tax_number': r['tax_number'],
            'notes': r['notes'],
            'short_code': r.get('short_code'),
            'postal_code': r.get('postal_code'),
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
        customer = execute_query_one("""
            SELECT id, name, code, contact_person, phone, phone_secondary, gsm, email, address,
                   city, tax_office, tax_number, notes, short_code, postal_code, is_active
            FROM customers
            WHERE id = %s
            LIMIT 1
        """, (str(customer_id),))
        if not customer:
            return jsonify({'error': 'Müşteri bulunamadı'}), 404

        dealers = execute_query("""
            SELECT id, name, address, district, city, contact_person, contact_phone,
                   tax_office, tax_number, phone1, phone2, email, website, postal_code, notes,
                   created_at, updated_at
            FROM customer_dealers
            WHERE customer_id = %s
            ORDER BY name
        """, (str(customer_id),))

        data = {
            'id': str(customer['id']),
            'name': customer['name'],
            'code': customer.get('code'),
            'contact_person': customer['contact_person'],
            'phone': customer['phone'],
            'phone_secondary': customer.get('phone_secondary'),
            'gsm': customer.get('gsm'),
            'email': customer['email'],
            'address': customer['address'],
            'city': customer.get('city'),
            'tax_office': customer['tax_office'],
            'tax_number': customer['tax_number'],
            'notes': customer['notes'],
            'short_code': customer.get('short_code'),
            'postal_code': customer.get('postal_code'),
            'is_active': customer['is_active'],
            'dealers': [
                {
                    'id': str(row['id']),
                    'name': row['name'],
                    'address': row.get('address'),
                    'district': row.get('district'),
                    'city': row.get('city'),
                    'contact_person': row.get('contact_person'),
                    'contact_phone': row.get('contact_phone'),
                    'tax_office': row.get('tax_office'),
                    'tax_number': row.get('tax_number'),
                    'phone1': row.get('phone1'),
                    'phone2': row.get('phone2'),
                    'email': row.get('email'),
                    'website': row.get('website'),
                    'postal_code': row.get('postal_code'),
                    'notes': row.get('notes'),
                    'created_at': row['created_at'].isoformat() if row.get('created_at') else None,
                    'updated_at': row['updated_at'].isoformat() if row.get('updated_at') else None,
                }
                for row in dealers or []
            ],
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
            'name', 'code', 'contact_person', 'phone', 'phone_secondary', 'gsm', 'email', 'address',
            'city', 'tax_office', 'tax_number', 'notes', 'short_code', 'postal_code', 'is_active'
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

        rows = execute_write(f"""
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


def _dealer_payload(data):
    return {
        'name': _s(data.get('name')),
        'address': _s(data.get('address')),
        'district': _s(data.get('district')),
        'city': _s(data.get('city')),
        'contact_person': _s(data.get('contact_person')),
        'contact_phone': _s(data.get('contact_phone')),
        'tax_office': _s(data.get('tax_office')),
        'tax_number': _s(data.get('tax_number')),
        'phone1': _s(data.get('phone1')),
        'phone2': _s(data.get('phone2')),
        'email': _s(data.get('email')),
        'website': _s(data.get('website')),
        'postal_code': _s(data.get('postal_code')),
        'notes': _s(data.get('notes')),
    }

@customers_bp.route('', methods=['POST'])
@token_required
def create_customer():
    try:
        data = request.get_json(force=True) or {}

        name          = _s(data.get('name'))
        if not name:
            return jsonify({'error': 'name zorunludur'}), 400

        code           = _s(data.get('code'))
        contact_person = _s(data.get('contact_person'))
        phone          = _s(data.get('phone'))
        phone_secondary = _s(data.get('phone_secondary'))
        gsm            = _s(data.get('gsm'))
        email          = _s(data.get('email'))
        address        = _s(data.get('address'))
        city           = _s(data.get('city'))
        tax_office     = _s(data.get('tax_office'))
        tax_number     = _s(data.get('tax_number'))
        notes          = _s(data.get('notes'))
        short_code     = _s(data.get('short_code'))
        postal_code    = _s(data.get('postal_code'))

        is_active_raw  = data.get('is_active')
        if is_active_raw is None:
            is_active = True
        else:
            is_active = str(is_active_raw).strip().lower() in ('1','true','yes','on')

        rows = execute_write("""
            INSERT INTO customers
              (name, code, contact_person, phone, phone_secondary, gsm, email, address, city,
               tax_office, tax_number, notes, short_code, postal_code, is_active, created_at, updated_at)
            VALUES
              (%s,   %s,   %s,             %s,   %s,             %s,  %s,    %s,     %s,
               %s,         %s,         %s,   %s,          %s,         %s,        NOW(),      NOW())
            RETURNING id
        """, (
            name, code, contact_person, phone, phone_secondary, gsm, email, address, city,
            tax_office, tax_number, notes, short_code, postal_code, is_active
        ))

        new_id = rows[0]['id'] if rows else None
        
        # ... INSERT sonrası:
        new_id = rows[0]['id']
        # müşteri_kodu yoksa name’i kullanacağız:

        # Klasör oluşturma denemesini hataya düşürmeyelim:
        try:
            customer_code_or_name = short_code or code or name
            s3 = get_s3()
            bucket = os.environ.get("MINIO_BUCKET", "reklampro-files")
            #ensure_bucket(client, bucket)
            prefix = customer_prefix(customer_code_or_name, new_id).rstrip('/') + '/'
           # 0-byte obje ile klasör “simülasyonu”
            s3.put_object(Bucket=bucket, Key=prefix, Body=b'')            
            logging.info("[customers.create] MinIO folder created: bucket=%s, prefix=%s", bucket)
        except Exception as e:          
            logging.exception("[customers.create] MinIO folder create failed: %s", e)
            # Kayıt başarıyla oluştu, klasör sonra da oluşturulabilir; 201 döndürmeye devam!

        return jsonify({'message': 'Oluşturuldu', 'data': {'id': str(new_id)}}), 201

    except Exception as e:
        # geçici olarak exception'ı da döndürelim ki 500'ün sebebini net görelim
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@customers_bp.route('/<uuid:customer_id>/dealers', methods=['GET'])
@token_required
def list_customer_dealers(customer_id):
    try:
        rows = execute_query("""
            SELECT id, name, address, district, city, contact_person, contact_phone,
                   tax_office, tax_number, phone1, phone2, email, website, postal_code, notes,
                   created_at, updated_at
            FROM customer_dealers
            WHERE customer_id = %s
            ORDER BY name
        """, (str(customer_id),))

        dealers = [
            {
                'id': str(row['id']),
                'name': row['name'],
                'address': row.get('address'),
                'district': row.get('district'),
                'city': row.get('city'),
                'contact_person': row.get('contact_person'),
                'contact_phone': row.get('contact_phone'),
                'tax_office': row.get('tax_office'),
                'tax_number': row.get('tax_number'),
                'phone1': row.get('phone1'),
                'phone2': row.get('phone2'),
                'email': row.get('email'),
                'website': row.get('website'),
                'postal_code': row.get('postal_code'),
                'notes': row.get('notes'),
                'created_at': row['created_at'].isoformat() if row.get('created_at') else None,
                'updated_at': row['updated_at'].isoformat() if row.get('updated_at') else None,
            }
            for row in rows or []
        ]
        return jsonify({'data': dealers}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@customers_bp.route('/<uuid:customer_id>/dealers', methods=['POST'])
@token_required
def create_customer_dealer(customer_id):
    try:
        data = request.get_json(force=True) or {}
        payload = _dealer_payload(data)

        if not payload['name']:
            return jsonify({'error': 'Bayi adı zorunludur'}), 400

        customer_exists = execute_query_one("SELECT id FROM customers WHERE id = %s", (str(customer_id),))
        if not customer_exists:
            return jsonify({'error': 'Müşteri bulunamadı'}), 404

        rows = execute_write("""
            INSERT INTO customer_dealers
              (customer_id, name, address, district, city, contact_person, contact_phone,
               tax_office, tax_number, phone1, phone2, email, website, postal_code, notes,
               created_at, updated_at)
            VALUES
              (%(customer_id)s, %(name)s, %(address)s, %(district)s, %(city)s, %(contact_person)s, %(contact_phone)s,
               %(tax_office)s, %(tax_number)s, %(phone1)s, %(phone2)s, %(email)s, %(website)s, %(postal_code)s, %(notes)s,
               NOW(), NOW())
            RETURNING id
        """, {**payload, 'customer_id': str(customer_id)})

        dealer_id = rows[0]['id'] if rows else None
        return jsonify({'message': 'Bayi eklendi', 'data': {'id': str(dealer_id)}}), 201
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@customers_bp.route('/<uuid:customer_id>/dealers/<uuid:dealer_id>', methods=['PATCH'])
@token_required
def update_customer_dealer(customer_id, dealer_id):
    try:
        data = request.get_json(force=True) or {}
        payload = _dealer_payload(data)

        setters = []
        params = {'customer_id': str(customer_id), 'dealer_id': str(dealer_id)}
        for key, value in payload.items():
            if value is not None:
                setters.append(f"{key} = %({key})s")
                params[key] = value

        if not setters:
            return jsonify({'error': 'Güncellenecek alan yok'}), 400

        setters.append("updated_at = NOW()")

        rows = execute_write(f"""
            UPDATE customer_dealers
               SET {', '.join(setters)}
             WHERE customer_id = %(customer_id)s AND id = %(dealer_id)s
             RETURNING id
        """, params)

        if not rows:
            return jsonify({'error': 'Bayi bulunamadı'}), 404

        return jsonify({'message': 'Bayi güncellendi', 'data': {'id': str(dealer_id)}}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@customers_bp.route('/<uuid:customer_id>/dealers/<uuid:dealer_id>', methods=['DELETE'])
@token_required
def delete_customer_dealer(customer_id, dealer_id):
    try:
        rows = execute_write("""
            DELETE FROM customer_dealers
             WHERE customer_id = %s AND id = %s
             RETURNING id
        """, (str(customer_id), str(dealer_id)))

        if not rows:
            return jsonify({'error': 'Bayi bulunamadı'}), 404

        return jsonify({'message': 'Bayi silindi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
