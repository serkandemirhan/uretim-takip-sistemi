from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, execute_write, get_db_connection
from app.middleware.auth_middleware import token_required, role_required

processes_bp = Blueprint('processes', __name__, url_prefix='/api/processes')

@processes_bp.route('', methods=['GET'])
@token_required
def get_processes():
    """Tüm süreçleri listele"""
    try:
        groups_query = """
            SELECT pg.*, COUNT(p.id) AS process_count
            FROM process_groups pg
            LEFT JOIN processes p ON p.group_id = pg.id AND p.deleted_at IS NULL AND p.is_active = TRUE
            GROUP BY pg.id
            ORDER BY pg.order_index, pg.name
        """
        group_rows = execute_query(groups_query)

        processes_query = """
            SELECT 
                p.*,
                COUNT(DISTINCT mp.machine_id) as machine_count
            FROM processes p
            LEFT JOIN machine_processes mp ON p.id = mp.process_id
            WHERE p.deleted_at IS NULL AND p.is_active = TRUE
            GROUP BY p.id
            ORDER BY p.order_index, p.name
        """
        processes = execute_query(processes_query)

        groups = []
        for grp in group_rows or []:
            groups.append({
                'id': str(grp['id']),
                'name': grp['name'],
                'description': grp.get('description'),
                'color': grp.get('color'),
                'order_index': grp.get('order_index') or 0,
                'process_count': grp.get('process_count') or 0,
                'processes': []
            })

        group_map = {g['id']: g for g in groups}
        ungrouped = []

        for process in processes or []:
            item = {
                'id': str(process['id']),
                'name': process['name'],
                'code': process['code'],
                'description': process['description'],
                'is_machine_based': process['is_machine_based'],
                'is_production': process['is_production'],
                'order_index': process['order_index'],
                'machine_count': process['machine_count'],
                'group_id': str(process['group_id']) if process.get('group_id') else None
            }

            group_id = item['group_id']
            if group_id and group_id in group_map:
                group_map[group_id]['processes'].append(item)
            else:
                ungrouped.append(item)

        return jsonify({'data': {'groups': groups, 'ungrouped': ungrouped}}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@processes_bp.route('/<process_id>', methods=['GET'])
@token_required
def get_process(process_id):
    """Tek süreç detayı"""
    try:
        query = """
            SELECT p.*, pg.name AS group_name, pg.id AS group_id, pg.color AS group_color
            FROM processes p
            LEFT JOIN process_groups pg ON p.group_id = pg.id
            WHERE p.id = %s
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
                'group': {
                    'id': str(process['group_id']) if process.get('group_id') else None,
                    'name': process.get('group_name'),
                    'color': process.get('group_color')
                },
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

        # folder_name yoksa code'dan üret
        folder_name = data.get('folder_name')
        if not folder_name or not folder_name.strip():
            folder_name = data.get('code').upper()

        insert_query = """
            INSERT INTO processes (name, code, description, is_machine_based, is_production, order_index, group_id, folder_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, code, group_id, folder_name
        """

        params = (
            data.get('name'),
            data.get('code').upper(),
            data.get('description'),
            data.get('is_machine_based', False),
            data.get('is_production', False),
            data.get('order_index', 0),
            data.get('group_id'),
            folder_name
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
        
        if 'code' in data:
            new_code = (data.get('code') or '').strip()
            if not new_code:
                return jsonify({'error': 'Dosya ismi boş olamaz'}), 400
            update_fields.append("code = %s")
            params.append(new_code.upper())
        
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

        if 'group_id' in data:
            update_fields.append("group_id = %s")
            params.append(data['group_id'])

        if 'folder_name' in data:
            folder_name = (data.get('folder_name') or '').strip()
            if folder_name:
                update_fields.append("folder_name = %s")
                params.append(folder_name)

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


@processes_bp.route('/groups', methods=['GET'])
@token_required
def list_process_groups():
    try:
        rows = execute_query("""
            SELECT pg.*, COUNT(p.id) AS process_count
            FROM process_groups pg
            LEFT JOIN processes p ON p.group_id = pg.id AND p.deleted_at IS NULL AND p.is_active = TRUE
            GROUP BY pg.id
            ORDER BY pg.order_index, pg.name
        """)

        groups = [
            {
                'id': str(row['id']),
                'name': row['name'],
                'description': row.get('description'),
                'color': row.get('color'),
                'order_index': row.get('order_index') or 0,
                'process_count': row.get('process_count') or 0,
            }
            for row in rows or []
        ]
        return jsonify({'data': groups}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@processes_bp.route('/groups', methods=['POST'])
@token_required
@role_required(['yonetici', 'admin'])
def create_process_group():
    try:
        data = request.get_json(force=True) or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'Grup adı zorunludur'}), 400

        color = data.get('color')
        color = color.strip() if isinstance(color, str) else color
        if color == '':
            color = None

        description = data.get('description')
        if isinstance(description, str):
            description = description.strip() or None

        params = (
            name,
            description,
            color,
            data.get('order_index', 0),
        )

        rows = execute_write("""
            INSERT INTO process_groups (name, description, color, order_index)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name, description, color, order_index
        """, params)

        if not rows:
            return jsonify({'error': 'Grup oluşturulamadı'}), 500

        new_row = rows[0]
        return jsonify({
            'message': 'Grup oluşturuldu',
            'data': {
                'id': str(new_row['id']),
                'name': new_row['name'],
                'description': new_row.get('description'),
                'color': new_row.get('color'),
                'order_index': new_row.get('order_index') or 0,
            }
        }), 201
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@processes_bp.route('/groups/<uuid:group_id>', methods=['PATCH'])
@token_required
@role_required(['yonetici', 'admin'])
def update_process_group(group_id):
    try:
        data = request.get_json(force=True) or {}

        setters = []
        params = []
        if 'name' in data:
            name = (data.get('name') or '').strip()
            if not name:
                return jsonify({'error': 'Grup adı boş olamaz'}), 400
            setters.append('name = %s')
            params.append(name)
        if 'description' in data:
            desc = data.get('description')
            if isinstance(desc, str):
                desc = desc.strip() or None
            setters.append('description = %s')
            params.append(desc)
        if 'color' in data:
            color = data.get('color')
            if isinstance(color, str):
                color = color.strip() or None
            setters.append('color = %s')
            params.append(color)
        if 'order_index' in data:
            setters.append('order_index = %s')
            params.append(data.get('order_index'))

        if not setters:
            return jsonify({'error': 'Güncellenecek alan yok'}), 400

        setters.append('updated_at = NOW()')
        params.append(str(group_id))

        rows = execute_write(f"""
            UPDATE process_groups
               SET {', '.join(setters)}
             WHERE id = %s
             RETURNING id, name, description, color, order_index
        """, tuple(params))

        if not rows:
            return jsonify({'error': 'Grup bulunamadı'}), 404

        updated = rows[0]
        return jsonify({
            'message': 'Grup güncellendi',
            'data': {
                'id': str(updated['id']),
                'name': updated['name'],
                'description': updated.get('description'),
                'color': updated.get('color'),
                'order_index': updated.get('order_index') or 0,
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@processes_bp.route('/groups/<uuid:group_id>', methods=['DELETE'])
@token_required
@role_required(['yonetici', 'admin'])
def delete_process_group(group_id):
    try:
        # Önce bağlı süreçlerin group_id değerini temizle
        execute_write("""
            UPDATE processes
               SET group_id = NULL
             WHERE group_id = %s
        """, (str(group_id),))

        rows = execute_write("""
            DELETE FROM process_groups
             WHERE id = %s
             RETURNING id
        """, (str(group_id),))

        if not rows:
            return jsonify({'error': 'Grup bulunamadı'}), 404

        return jsonify({'message': 'Grup silindi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
