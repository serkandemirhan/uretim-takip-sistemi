from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.middleware.auth_middleware import token_required, role_required

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('', methods=['GET'])
@token_required
def get_users():
    """Kullanıcıları listele"""
    try:
        query = """
            SELECT 
                u.id, u.username, u.email, u.full_name, u.role, 
                u.is_active, u.created_at
            FROM users u
            WHERE u.is_active = true
            ORDER BY u.created_at DESC
        """
        
        users = execute_query(query)
        
        users_list = []
        for user in users:
            users_list.append({
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'],
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            })
        
        return jsonify({'data': users_list}), 200
        
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@users_bp.route('/<user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    """Tek kullanıcı detayı"""
    try:
        query = """
            SELECT 
                id, username, email, full_name, role, is_active, created_at
            FROM users
            WHERE id = %s
        """
        user = execute_query_one(query, (user_id,))
        
        if not user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
        
        # Kullanıcının istatistikleri
        stats_query = """
            SELECT 
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                COUNT(*) FILTER (WHERE status = 'ready') as ready_count
            FROM job_steps
            WHERE assigned_to = %s
        """
        stats = execute_query_one(stats_query, (user_id,))
        
        return jsonify({
            'data': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'],
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'stats': {
                    'in_progress': stats['in_progress_count'] if stats else 0,
                    'completed': stats['completed_count'] if stats else 0,
                    'ready': stats['ready_count'] if stats else 0
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@users_bp.route('', methods=['POST'])
@token_required
@role_required(['yonetici'])
def create_user():
    """Yeni kullanıcı oluştur"""
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Kullanıcı adı, email ve şifre gerekli'}), 400
        
        # Kullanıcı adı ve email kontrolü
        check_query = """
            SELECT id FROM users 
            WHERE username = %s OR email = %s
        """
        existing = execute_query_one(check_query, (data.get('username'), data.get('email')))
        
        if existing:
            return jsonify({'error': 'Bu kullanıcı adı veya email zaten kullanılıyor'}), 400
        
        insert_query = """
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES (%s, %s, crypt(%s, gen_salt('bf')), %s, %s)
            RETURNING id, username, full_name
        """
        
        params = (
            data.get('username'),
            data.get('email'),
            data.get('password'),
            data.get('full_name'),
            data.get('role', 'operator')
        )
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(insert_query, params)
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Kullanıcı başarıyla oluşturuldu',
            'data': {
                'id': str(result['id']),
                'username': result['username'],
                'full_name': result['full_name']
            }
        }), 201
        
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@users_bp.route('/<user_id>', methods=['PATCH'])
@token_required
@role_required(['yonetici'])
def update_user(user_id):
    """Kullanıcıyı güncelle"""
    try:
        data = request.get_json()
        
        update_fields = []
        params = []
        
        if 'full_name' in data:
            update_fields.append("full_name = %s")
            params.append(data['full_name'])
        
        if 'email' in data:
            update_fields.append("email = %s")
            params.append(data['email'])
        
        if 'role' in data:
            update_fields.append("role = %s")
            params.append(data['role'])
        
        if 'is_active' in data:
            update_fields.append("is_active = %s")
            params.append(data['is_active'])
        
        # Şifre güncellemesi (opsiyonel)
        if data.get('password'):
            update_fields.append("password_hash = crypt(%s, gen_salt('bf'))")
            params.append(data['password'])
        
        if not update_fields:
            return jsonify({'error': 'Güncellenecek alan bulunamadı'}), 400
        
        params.append(user_id)
        
        update_query = f"""
            UPDATE users
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, username, full_name
        """
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(update_query, tuple(params))
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        if not result:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
        
        return jsonify({
            'message': 'Kullanıcı başarıyla güncellendi',
            'data': {
                'id': str(result['id']),
                'username': result['username'],
                'full_name': result['full_name']
            }
        }), 200
        
    except Exception as e:
        print(f"Error updating user: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@users_bp.route('/<user_id>', methods=['DELETE'])
@token_required
@role_required(['yonetici'])
def delete_user(user_id):
    """Kullanıcıyı sil (soft delete)"""
    try:
        query = """
            UPDATE users
            SET is_active = false
            WHERE id = %s
            RETURNING id
        """
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        if not result:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
        
        return jsonify({'message': 'Kullanıcı başarıyla silindi'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500