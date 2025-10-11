from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.middleware.auth_middleware import token_required, role_required

machines_bp = Blueprint('machines', __name__, url_prefix='/api/machines')

@machines_bp.route('', methods=['GET'])
@token_required
def get_machines():
    """Tüm makineleri listele"""
    try:
        query = """
            SELECT 
                m.*,
                COUNT(DISTINCT mp.process_id) as process_count,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM job_steps js 
                        WHERE js.machine_id = m.id AND js.status = 'in_progress'
                    ) THEN true
                    ELSE false
                END as is_busy
            FROM machines m
            LEFT JOIN machine_processes mp ON m.id = mp.machine_id
            WHERE m.is_active = true
            GROUP BY m.id
            ORDER BY m.name
        """
        machines = execute_query(query)
        
        machines_list = []
        for machine in machines:
            # Aktif görev varsa getir
            current_task = None
            if machine['is_busy']:
                task_query = """
                    SELECT 
                        js.id, js.started_at,
                        j.title as job_title, j.job_number,
                        u.full_name as operator_name
                    FROM job_steps js
                    JOIN jobs j ON js.job_id = j.id
                    LEFT JOIN users u ON js.assigned_to = u.id
                    WHERE js.machine_id = %s AND js.status = 'in_progress'
                    LIMIT 1
                """
                task = execute_query_one(task_query, (machine['id'],))
                if task:
                    current_task = {
                        'id': str(task['id']),
                        'job_title': task['job_title'],
                        'job_number': task['job_number'],
                        'operator_name': task['operator_name'],
                        'started_at': task['started_at'].isoformat() if task['started_at'] else None
                    }
            
            machines_list.append({
                'id': str(machine['id']),
                'name': machine['name'],
                'code': machine['code'],
                'type': machine['type'],
                'status': machine['status'],
                'location': machine['location'],
                'capacity_per_hour': float(machine['capacity_per_hour']) if machine['capacity_per_hour'] else None,
                'notes': machine['notes'],
                'process_count': machine['process_count'],
                'is_busy': machine['is_busy'],
                'current_task': current_task
            })
        
        return jsonify({'data': machines_list}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@machines_bp.route('/<machine_id>', methods=['GET'])
@token_required
def get_machine(machine_id):
    """Tek makine detayı"""
    try:
        query = """
            SELECT *
            FROM machines
            WHERE id = %s
        """
        machine = execute_query_one(query, (machine_id,))
        
        if not machine:
            return jsonify({'error': 'Makine bulunamadı'}), 404
        
        # Bağlı süreçleri getir
        processes_query = """
            SELECT p.id, p.name, p.code
            FROM processes p
            JOIN machine_processes mp ON p.id = mp.process_id
            WHERE mp.machine_id = %s AND p.is_active = true
            ORDER BY p.name
        """
        processes = execute_query(processes_query, (machine_id,))
        
        return jsonify({
            'data': {
                'id': str(machine['id']),
                'name': machine['name'],
                'code': machine['code'],
                'type': machine['type'],
                'status': machine['status'],
                'location': machine['location'],
                'capacity_per_hour': float(machine['capacity_per_hour']) if machine['capacity_per_hour'] else None,
                'notes': machine['notes'],
                'processes': [{
                    'id': str(p['id']),
                    'name': p['name'],
                    'code': p['code']
                } for p in processes]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@machines_bp.route('', methods=['POST'])
@token_required
@role_required(['yonetici'])
def create_machine():
    """Yeni makine oluştur"""
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Makine adı ve kodu gerekli'}), 400
        
        insert_query = """
            INSERT INTO machines (name, code, type, status, location, capacity_per_hour, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, code
        """
        
        params = (
            data.get('name'),
            data.get('code').upper(),
            data.get('type'),
            data.get('status', 'active'),
            data.get('location'),
            data.get('capacity_per_hour'),
            data.get('notes')
        )
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(insert_query, params)
        result = cursor.fetchone()
        machine_id = result['id']
        
        # Süreçleri bağla
        if data.get('process_ids'):
            for process_id in data['process_ids']:
                cursor.execute(
                    "INSERT INTO machine_processes (machine_id, process_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (machine_id, process_id)
                )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Makine başarıyla oluşturuldu',
            'data': {
                'id': str(result['id']),
                'name': result['name'],
                'code': result['code']
            }
        }), 201
        
    except Exception as e:
        print(f"Error creating machine: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@machines_bp.route('/<machine_id>', methods=['PATCH'])
@token_required
@role_required(['yonetici'])
def update_machine(machine_id):
    """Makineyi güncelle"""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Makine bilgilerini güncelle
        update_fields = []
        params = []
        
        if 'name' in data:
            update_fields.append("name = %s")
            params.append(data['name'])
        
        if 'type' in data:
            update_fields.append("type = %s")
            params.append(data['type'])
        
        if 'status' in data:
            update_fields.append("status = %s")
            params.append(data['status'])
        
        if 'location' in data:
            update_fields.append("location = %s")
            params.append(data['location'])
        
        if 'capacity_per_hour' in data:
            update_fields.append("capacity_per_hour = %s")
            params.append(data['capacity_per_hour'])
        
        if 'notes' in data:
            update_fields.append("notes = %s")
            params.append(data['notes'])
        
        if update_fields:
            params.append(machine_id)
            update_query = f"""
                UPDATE machines
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, name
            """
            cursor.execute(update_query, tuple(params))
            result = cursor.fetchone()
            
            if not result:
                conn.close()
                return jsonify({'error': 'Makine bulunamadı'}), 404
        
        # Süreç bağlantılarını güncelle
        if 'process_ids' in data:
            # Önce mevcut bağlantıları sil
            cursor.execute("DELETE FROM machine_processes WHERE machine_id = %s", (machine_id,))
            
            # Yeni bağlantıları ekle
            for process_id in data['process_ids']:
                cursor.execute(
                    "INSERT INTO machine_processes (machine_id, process_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (machine_id, process_id)
                )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Makine başarıyla güncellendi'
        }), 200
        
    except Exception as e:
        print(f"Error updating machine: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@machines_bp.route('/<machine_id>', methods=['DELETE'])
@token_required
@role_required(['yonetici'])
def delete_machine(machine_id):
    """Makineyi sil (soft delete)"""
    try:
        query = """
            UPDATE machines
            SET is_active = false
            WHERE id = %s
            RETURNING id
        """
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, (machine_id,))
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        if not result:
            return jsonify({'error': 'Makine bulunamadı'}), 404
        
        return jsonify({'message': 'Makine başarıyla silindi'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    
@machines_bp.route('/status', methods=['GET'])
@token_required
def get_machines_status():
    """Tüm makinelerin anlık durumunu getir"""
    try:
        query = """
            SELECT 
                m.id, m.name, m.code, m.status, m.location,
                m.capacity_per_hour, m.notes,
                js.id as current_step_id,
                js.status as step_status,
                js.started_at,
                j.id as job_id,
                j.job_number,
                j.title as job_title,
                p.name as process_name,
                u.full_name as operator_name,
                COUNT(js_all.id) FILTER (WHERE js_all.status = 'completed') as completed_tasks_count
            FROM machines m
            LEFT JOIN job_steps js ON m.id = js.machine_id 
                AND js.status = 'in_progress'
            LEFT JOIN jobs j ON js.job_id = j.id
            LEFT JOIN processes p ON js.process_id = p.id
            LEFT JOIN users u ON js.assigned_to = u.id
            LEFT JOIN job_steps js_all ON m.id = js_all.machine_id 
                AND js_all.status = 'completed'
            WHERE m.is_active = true
            GROUP BY m.id, js.id, j.id, p.name, u.full_name
            ORDER BY m.name
        """
        
        machines = execute_query(query)
        
        machines_list = []
        for machine in machines:
            is_busy = machine['current_step_id'] is not None
            
            machines_list.append({
                'id': str(machine['id']),
                'name': machine['name'],
                'code': machine['code'],
                'status': machine['status'],
                'location': machine['location'],
                'capacity_per_hour': float(machine['capacity_per_hour']) if machine['capacity_per_hour'] else None,
                'notes': machine['notes'],
                'is_busy': is_busy,
                'completed_tasks_count': machine['completed_tasks_count'],
                'current_task': {
                    'step_id': str(machine['current_step_id']) if machine['current_step_id'] else None,
                    'job_id': str(machine['job_id']) if machine['job_id'] else None,
                    'job_number': machine['job_number'],
                    'job_title': machine['job_title'],
                    'process_name': machine['process_name'],
                    'operator_name': machine['operator_name'],
                    'started_at': machine['started_at'].isoformat() if machine['started_at'] else None
                } if is_busy else None
            })
        
        return jsonify({'data': machines_list}), 200
        
    except Exception as e:
        print(f"Error getting machines status: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@machines_bp.route('/stats', methods=['GET'])
@token_required
def get_machines_stats():
    """Makine istatistikleri"""
    try:
        query = """
            SELECT 
                COUNT(*) as total_machines,
                COUNT(*) FILTER (WHERE status = 'active') as active_machines,
                COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_machines,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive_machines,
                COUNT(*) FILTER (WHERE EXISTS (
                    SELECT 1 FROM job_steps js 
                    WHERE js.machine_id = machines.id 
                    AND js.status = 'in_progress'
                )) as busy_machines
            FROM machines
            WHERE is_active = true
        """
        
        stats = execute_query_one(query)
        
        return jsonify({
            'data': {
                'total': stats['total_machines'] if stats else 0,
                'active': stats['active_machines'] if stats else 0,
                'maintenance': stats['maintenance_machines'] if stats else 0,
                'inactive': stats['inactive_machines'] if stats else 0,
                'busy': stats['busy_machines'] if stats else 0,
                'available': (stats['active_machines'] - stats['busy_machines']) if stats else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500