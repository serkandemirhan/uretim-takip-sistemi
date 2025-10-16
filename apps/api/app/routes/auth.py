from flask import Blueprint, request, jsonify
from passlib.hash import bcrypt
from app.models.database import execute_query_one, execute_query
from app.utils.jwt_helper import generate_token

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """Kullanıcı girişi"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Kullanıcı adı ve şifre gerekli'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        # Kullanıcıyı bul
        user_query = """
            SELECT id, username, email, password_hash, full_name, is_active
            FROM users
            WHERE username = %s AND is_active = true
        """
        user = execute_query_one(user_query, (username,))
        
        if not user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 401
        
        # Şifre kontrolü (PostgreSQL'deki crypt fonksiyonu ile)
        password_check_query = """
            SELECT (password_hash = crypt(%s, password_hash)) as password_match
            FROM users
            WHERE username = %s
        """
        password_match = execute_query_one(password_check_query, (password, username))
        
        if not password_match or not password_match['password_match']:
            return jsonify({'error': 'Şifre hatalı'}), 401
        
        # Kullanıcının birincil rolünü getir (yeni multi-role yapısı)
        primary_role_query = """
            SELECT r.code AS role_code, r.name AS role_name
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = %s
            ORDER BY ur.is_primary DESC, r.name
            LIMIT 1
        """
        primary_role = execute_query_one(primary_role_query, (user['id'],))
        user_role_code = primary_role['role_code'] if primary_role else None

        # Legacy destek: eğer primary role yoksa, users tablosundaki role kolonunu kullan (hala mevcutsa)
        if not user_role_code:
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
                legacy_role = execute_query_one(
                    "SELECT role FROM users WHERE id = %s",
                    (user['id'],)
                )
                if legacy_role:
                    user_role_code = legacy_role.get('role')

        # JWT token oluştur
        token = generate_token(user['id'], user['username'], user_role_code)
        
        return jsonify({
            'message': 'Giriş başarılı',
            'token': token,
            'user': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user_role_code
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Token ile kullanıcı bilgisi al"""
    from app.middleware.auth_middleware import token_required
    
    @token_required
    def inner():
        try:
            user_id = request.current_user['user_id']
            
            user_query = """
                SELECT id, username, email, full_name, is_active, created_at
                FROM users
                WHERE id = %s
            """
            user = execute_query_one(user_query, (user_id,))
            
            if not user:
                return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

            roles_query = """
                SELECT
                    r.id AS role_id,
                    r.code AS role_code,
                    r.name AS role_name,
                    ur.is_primary
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = %s
                ORDER BY ur.is_primary DESC, r.name
            """
            roles = execute_query(roles_query, (user_id,))

            role_list = [
                {
                    'id': str(role['role_id']),
                    'code': role['role_code'],
                    'name': role['role_name'],
                    'is_primary': role['is_primary']
                }
                for role in roles or []
            ]

            primary_role = next((role for role in role_list if role['is_primary']), None)

            user_role_code = primary_role['code'] if primary_role else None

            # Legacy destek: eğer primary role yoksa, users tablosundaki role kolonunu kullan (hala mevcutsa)
            if not user_role_code:
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
                    legacy_role = execute_query_one(
                        "SELECT role FROM users WHERE id = %s",
                        (user_id,)
                    )
                    if legacy_role:
                        user_role_code = legacy_role.get('role')
                        primary_role = {
                            'id': None,
                            'code': user_role_code,
                            'name': None,
                            'is_primary': True
                        }
            
            return jsonify({
                'user': {
                    'id': str(user['id']),
                    'username': user['username'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'role': user_role_code,
                    'is_active': user['is_active'],
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                    'primary_role': primary_role,
                    'roles': role_list
                }
            }), 200
            
        except Exception as e:
            return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    
    return inner()
