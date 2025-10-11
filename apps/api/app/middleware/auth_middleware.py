from functools import wraps
from flask import request, jsonify
from app.utils.jwt_helper import decode_token

def token_required(f):
    """Token kontrolü yapan decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Header'dan token al
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # "Bearer <token>"
            except IndexError:
                return jsonify({'error': 'Token formatı hatalı'}), 401
        
        if not token:
            return jsonify({'error': 'Token bulunamadı'}), 401
        
        # Token'ı decode et
        payload = decode_token(token)
        
        if not payload:
            return jsonify({'error': 'Token geçersiz veya süresi dolmuş'}), 401
        
        # Kullanıcı bilgilerini request'e ekle
        request.current_user = payload
        
        return f(*args, **kwargs)
    
    return decorated

def role_required(allowed_roles):
    """Rol kontrolü yapan decorator"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Yetkisiz erişim'}), 403
            
            user_role = request.current_user.get('role')
            
            if user_role not in allowed_roles:
                return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403
            
            return f(*args, **kwargs)
        
        return decorated
    return decorator