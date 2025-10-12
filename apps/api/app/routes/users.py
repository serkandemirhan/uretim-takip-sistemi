from flask import Blueprint, request, jsonify
import json
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
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.role AS legacy_role,
                u.is_active,
                u.created_at,
                primary_role.primary_role_id,
                primary_role.primary_role_code,
                primary_role.primary_role_name,
                COALESCE(role_list.roles, '[]'::json) AS roles
            FROM users u
            LEFT JOIN (
                SELECT
                    ur.user_id,
                    r.id AS primary_role_id,
                    r.code AS primary_role_code,
                    r.name AS primary_role_name
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.is_primary = TRUE
            ) primary_role ON primary_role.user_id = u.id
            LEFT JOIN (
                SELECT
                    ur.user_id,
                    json_agg(
                        json_build_object(
                            'role_id', r.id,
                            'role_code', r.code,
                            'role_name', r.name,
                            'is_primary', ur.is_primary
                        )
                        ORDER BY ur.is_primary DESC, r.name
                    ) AS roles
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE r.is_active = TRUE
                GROUP BY ur.user_id
            ) role_list ON role_list.user_id = u.id
            WHERE u.is_active = TRUE
            ORDER BY u.created_at DESC
        """

        users = execute_query(query)

        users_list = []
        for user in users:
            roles = user.get('roles') or []
            if isinstance(roles, str):
                roles = json.loads(roles)

            users_list.append({
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user.get('primary_role_code') or user['legacy_role'],
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'primary_role': {
                    'id': str(user['primary_role_id']) if user.get('primary_role_id') else None,
                    'code': user.get('primary_role_code') or user['legacy_role'],
                    'name': user.get('primary_role_name')
                },
                'roles': [
                    {
                        'role_id': str(role.get('role_id')),
                        'role_code': role.get('role_code'),
                        'role_name': role.get('role_name'),
                        'is_primary': role.get('is_primary', False)
                    }
                    for role in roles
                ]
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
        
        roles_query = """
            SELECT
                r.id as role_id,
                r.code as role_code,
                r.name as role_name,
                r.description as role_description,
                ur.is_primary,
                ur.assigned_at
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = %s
            ORDER BY ur.is_primary DESC, r.name
        """
        roles = execute_query(roles_query, (user_id,))

        role_list = []
        primary_role = None

        for role in roles or []:
            role_item = {
                'role_id': str(role['role_id']),
                'role_code': role['role_code'],
                'role_name': role['role_name'],
                'role_description': role['role_description'],
                'is_primary': role['is_primary'],
                'assigned_at': role['assigned_at'].isoformat() if role['assigned_at'] else None
            }
            role_list.append(role_item)
            if role['is_primary']:
                primary_role = role_item

        # Legacy support: primary role yoksa users.role kolonu ile doldur
        if not primary_role and user.get('role'):
            legacy_query = """
                SELECT id, code, name, description
                FROM roles
                WHERE code = %s
                LIMIT 1
            """
            legacy_role = execute_query_one(legacy_query, (user['role'],))
            if legacy_role:
                legacy_item = {
                    'role_id': str(legacy_role['id']),
                    'role_code': legacy_role['code'],
                    'role_name': legacy_role['name'],
                    'role_description': legacy_role['description'],
                    'is_primary': True,
                    'assigned_at': None
                }
                role_list.insert(0, legacy_item)
                primary_role = legacy_item

        return jsonify({
            'data': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'],
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'primary_role': primary_role,
                'roles': role_list,
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
