from flask import Blueprint, request, jsonify
import json
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.middleware.auth_middleware import token_required, role_required

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

def _get_user_avatar_column_flags():
    """Determine whether legacy avatar columns are available."""
    avatar_columns_query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name IN ('avatar_url', 'avatar_file_id')
    """
    columns = execute_query(avatar_columns_query)
    has_avatar_url = any(col['column_name'] == 'avatar_url' for col in columns or [])
    has_avatar_file_id = any(col['column_name'] == 'avatar_file_id' for col in columns or [])
    return has_avatar_url, has_avatar_file_id

@users_bp.route('', methods=['GET'])
@token_required
def get_users():
    """Kullanıcıları listele"""
    try:
        # Legacy role kolonunun varlığını kontrol et
        role_column_exists_query = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = 'role'
            ) AS role_exists
        """
        role_column_exists = execute_query_one(role_column_exists_query)
        legacy_role_map = {}

        if role_column_exists and role_column_exists.get('role_exists'):
            legacy_roles = execute_query("""
                SELECT id, role
                FROM users
                WHERE role IS NOT NULL
            """)
            legacy_role_map = {
                str(row['id']): row['role']
                for row in legacy_roles or []
                if row.get('role')
            }

        has_avatar_url, has_avatar_file_id = _get_user_avatar_column_flags()
        avatar_select_parts = []
        if has_avatar_url:
            avatar_select_parts.append("u.avatar_url")
        if has_avatar_file_id:
            avatar_select_parts.append("u.avatar_file_id")
        avatar_select_sql = ""
        if avatar_select_parts:
            avatar_select_sql = ", " + ", ".join(avatar_select_parts)

        query = f"""
            SELECT
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.is_active,
                u.created_at
                {avatar_select_sql},
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

        fallback_avatars = {}
        if not has_avatar_file_id:
            user_ids = [str(user['id']) for user in users] if users else []
            if user_ids:
                fallback_rows = execute_query(
                    """
                    SELECT DISTINCT ON (ref_id)
                        ref_id,
                        id AS file_id,
                        object_key
                    FROM files
                    WHERE ref_type = 'user' AND ref_id = ANY(%s::uuid[])
                    ORDER BY ref_id, created_at DESC
                    """,
                    (user_ids,)
                ) or []
                for row in fallback_rows:
                    fallback_avatars[row['ref_id']] = {
                        'file_id': row['file_id'],
                        'object_key': row.get('object_key')
                    }

        users_list = []
        for user in users:
            roles = user.get('roles') or []
            if isinstance(roles, str):
                roles = json.loads(roles)

            legacy_role_code = legacy_role_map.get(str(user['id']))
            primary_role_code = user.get('primary_role_code') or legacy_role_code

            avatar_url = user.get('avatar_url') if has_avatar_url else None
            avatar_file_id_value = user.get('avatar_file_id') if has_avatar_file_id else None
            if not avatar_file_id_value:
                fallback = fallback_avatars.get(str(user['id']))
                if fallback:
                    avatar_file_id_value = fallback.get('file_id')
                    if not avatar_url:
                        avatar_url = fallback.get('object_key')
            users_list.append({
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': primary_role_code,
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'avatar_url': avatar_url,
                'avatar_file_id': str(avatar_file_id_value) if avatar_file_id_value else None,
                'primary_role': {
                    'id': str(user['primary_role_id']) if user.get('primary_role_id') else None,
                    'code': primary_role_code,
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
        # Avatar kolonları schema'da yoksa NULL dönecek şekilde handle et
        has_avatar_url, has_avatar_file_id = _get_user_avatar_column_flags()

        select_fields = [
            "id",
            "username",
            "email",
            "full_name",
            "is_active",
            "created_at"
        ]

        if has_avatar_url:
            select_fields.append("avatar_url")
        if has_avatar_file_id:
            select_fields.append("avatar_file_id")

        query = f"""
            SELECT 
                {', '.join(select_fields)}
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
        legacy_role_code = None
        role_column_exists_query = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = 'role'
            ) AS role_exists
        """
        role_column_exists = execute_query_one(role_column_exists_query)

        if role_column_exists and role_column_exists.get('role_exists'):
            legacy_role_result = execute_query_one(
                "SELECT role FROM users WHERE id = %s",
                (user_id,)
            )
            legacy_role_code = legacy_role_result.get('role') if legacy_role_result else None

        if not primary_role and legacy_role_code:
            legacy_query = """
                SELECT id, code, name, description
                FROM roles
                WHERE code = %s
                LIMIT 1
            """
            legacy_role = execute_query_one(legacy_query, (legacy_role_code,))
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

        user_role_code = primary_role['role_code'] if primary_role else legacy_role_code
        
        avatar_url = user.get('avatar_url') if has_avatar_url else None
        avatar_file_id = str(user.get('avatar_file_id')) if has_avatar_file_id and user.get('avatar_file_id') else None
        if not avatar_file_id:
            fallback_avatar = execute_query_one(
                """
                SELECT id, object_key
                FROM files
                WHERE ref_type = 'user' AND ref_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (str(user_id),)
            )
            if fallback_avatar:
                avatar_file_id = str(fallback_avatar['id'])
                if not avatar_url:
                    avatar_url = fallback_avatar.get('object_key')

        return jsonify({
            'data': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user_role_code,
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'avatar_url': avatar_url,
                'avatar_file_id': avatar_file_id,
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
        has_avatar_url, has_avatar_file_id = _get_user_avatar_column_flags()
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
        
        returning_fields = ['id', 'username', 'full_name']
        if has_avatar_url:
            returning_fields.append('avatar_url')
        if has_avatar_file_id:
            returning_fields.append('avatar_file_id')

        insert_query = f"""
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES (%s, %s, crypt(%s, gen_salt('bf')), %s, %s)
            RETURNING {', '.join(returning_fields)}
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
        
        avatar_url = result.get('avatar_url') if has_avatar_url else None
        avatar_file_id = result.get('avatar_file_id') if has_avatar_file_id else None

        return jsonify({
            'message': 'Kullanıcı başarıyla oluşturuldu',
            'data': {
                'id': str(result['id']),
                'username': result['username'],
                'full_name': result['full_name'],
                'avatar_url': avatar_url,
                'avatar_file_id': str(avatar_file_id) if avatar_file_id else None
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
        has_avatar_url, has_avatar_file_id = _get_user_avatar_column_flags()
        
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
        
        if has_avatar_url and 'avatar_url' in data:
            update_fields.append("avatar_url = %s")
            params.append(data['avatar_url'])

        if has_avatar_file_id and 'avatar_file_id' in data:
            update_fields.append("avatar_file_id = %s")
            params.append(data['avatar_file_id'])
        
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
