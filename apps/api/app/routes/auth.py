from flask import Blueprint, request, jsonify
from passlib.hash import bcrypt
from app.models.database import execute_query_one
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
        query = """
            SELECT id, username, email, password_hash, full_name, role, is_active
            FROM users
            WHERE username = %s AND is_active = true
        """
        user = execute_query_one(query, (username,))
        
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
        
        # JWT token oluştur
        token = generate_token(user['id'], user['username'], user['role'])
        
        return jsonify({
            'message': 'Giriş başarılı',
            'token': token,
            'user': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role']
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
            
            query = """
                SELECT id, username, email, full_name, role, is_active, created_at
                FROM users
                WHERE id = %s
            """
            user = execute_query_one(query, (user_id,))
            
            if not user:
                return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
            
            return jsonify({
                'user': {
                    'id': str(user['id']),
                    'username': user['username'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'role': user['role'],
                    'is_active': user['is_active'],
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None
                }
            }), 200
            
        except Exception as e:
            return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    
    return inner()