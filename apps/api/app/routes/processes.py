from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.middleware.auth_middleware import token_required, role_required

processes_bp = Blueprint('processes', __name__, url_prefix='/api/processes')

@processes_bp.route('', methods=['GET'])
@token_required
def get_processes():
    """Tüm süreçleri listele"""
    try:
        query = """
            SELECT 
                p.*,
                COUNT(DISTINCT mp.machine_id) as machine_count
            FROM processes p
            LEFT JOIN machine_processes mp ON p.id = mp.process_id
            WHERE deleted_at IS NULL AND p.is_active = true
            GROUP BY p.id
            ORDER BY p.order_index, p.name
        """
        processes = execute_query(query)
        
        processes_list = []
        for process in processes:
            processes_list.append({
                'id': str(process['id']),
                'name': process['name'],
                'code': process['code'],
                'description': process['description'],
                'is_machine_based': process['is_machine_based'],
                'is_production': process['is_production'],
                'order_index': process['order_index'],
                'machine_count': process['machine_count']
            })
        
        return jsonify({'data': processes_list}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@processes_bp.route('/<process_id>', methods=['GET'])
@token_required
def get_process(process_id):
    """Tek süreç detayı"""
    try:
        query = """
            SELECT *
            FROM processes
            WHERE id = %s
        """
        process = execute_query_one(query, (process_id,))
        
        if not process:
            return jsonify({'error': 'Süreç bulunamadı'}), 404
        
        # Bağlı makineleri getir
        machines_query = """
            SELECT m.id, m.name, m.code
            FROM machines m
            JOIN machine_processes mp ON m.id = mp.machine_id
            WHERE deleted_at IS NULL AND mp.process_id = %s AND m.is_active = true
        """
        machines = execute_query(machines_query, (process_id,))
        
        return jsonify({
            'data': {
                'id': str(process['id']),
                'name': process['name'],
                'code': process['code'],
                'description': process['description'],
                'is_machine_based': process['is_machine_based'],
                'is_production': process['is_production'],
                'order_index': process['order_index'],
                'machines': [{
                    'id': str(m['id']),
                    'name': m['name'],
                    'code': m['code']
                } for m in machines]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@processes_bp.route('/<uuid:process_id>', methods=['DELETE'])
@token_required
@role_required(['admin', 'yonetici'])
def delete_process(process_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1) Süreci soft-delete et
        cursor.execute("""
            UPDATE processes
               SET deleted_at = NOW()
             WHERE id = %s
             RETURNING id
        """, (str(process_id),))
        deleted = cursor.fetchone()
        if not deleted:
            conn.rollback()
            conn.close()
            return jsonify({'error': 'Süreç bulunamadı'}), 404

        # 2) Makine–süreç ilişkilerini temizle
        cursor.execute("""
            DELETE FROM machine_processes
             WHERE process_id = %s
        """, (str(process_id),))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Süreç arşivlendi ve makine ilişkileri temizlendi',
                        'data': {'id': str(process_id)}}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500




@processes_bp.route('', methods=['POST'])
@token_required
@role_required(['yonetici'])
def create_process():
    """Yeni süreç oluştur"""
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Süreç adı ve kodu gerekli'}), 400
        
        insert_query = """
            INSERT INTO processes (name, code, description, is_machine_based, is_production, order_index)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, name, code
        """
        
        params = (
            data.get('name'),
            data.get('code').upper(),
            data.get('description'),
            data.get('is_machine_based', False),
            data.get('is_production', False),
            data.get('order_index', 0)
        )
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(insert_query, params)
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Süreç başarıyla oluşturuldu',
            'data': {
                'id': str(result['id']),
                'name': result['name'],
                'code': result['code']
            }
        }), 201
        
    except Exception as e:
        print(f"Error creating process: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@processes_bp.route('/<process_id>', methods=['PATCH'])
@token_required
@role_required(['yonetici'])
def update_process(process_id):
    """Süreci güncelle"""
    try:
        data = request.get_json()
        
        update_fields = []
        params = []
        
        if 'name' in data:
            update_fields.append("name = %s")
            params.append(data['name'])
        
        if 'description' in data:
            update_fields.append("description = %s")
            params.append(data['description'])
        
        if 'is_machine_based' in data:
            update_fields.append("is_machine_based = %s")
            params.append(data['is_machine_based'])
        
        if 'is_production' in data:
            update_fields.append("is_production = %s")
            params.append(data['is_production'])
        
        if 'order_index' in data:
            update_fields.append("order_index = %s")
            params.append(data['order_index'])
        
        if not update_fields:
            return jsonify({'error': 'Güncellenecek alan bulunamadı'}), 400
        
        params.append(process_id)
        
        update_query = f"""
            UPDATE processes
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, name
        """
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(update_query, tuple(params))
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        if not result:
            return jsonify({'error': 'Süreç bulunamadı'}), 404
        
        return jsonify({
            'message': 'Süreç başarıyla güncellendi',
            'data': {
                'id': str(result['id']),
                'name': result['name']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500