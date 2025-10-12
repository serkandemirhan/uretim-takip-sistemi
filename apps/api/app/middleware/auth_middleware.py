from functools import wraps
from flask import request, jsonify
from app.utils.jwt_helper import decode_token
from app.models.database import execute_query_one

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


def permission_required(resource, action='view'):
    """
    Resource bazlı yetki kontrolü yapan decorator

    Args:
        resource: Kaynak adı (jobs, customers, files, vb.)
        action: İşlem tipi (view, create, update, delete)

    Usage:
        @permission_required('jobs', 'create')
        def create_job():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Yetkisiz erişim'}), 403

            user_id = request.current_user.get('user_id')
            user_role = request.current_user.get('role')

            # Admin her şeyi yapabilir (backward compatibility)
            if user_role == 'admin' or user_role == 'yonetici':
                return f(*args, **kwargs)

            # Kullanıcının rollerini al (önce user_roles tablosundan, yoksa users.role kolonundan)
            role_query = """
                SELECT r.id, r.code
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = %s AND r.is_active = TRUE
                LIMIT 1
            """
            role_result = execute_query_one(role_query, (user_id,))

            # Eğer user_roles'de yoksa, users.role kolonuna göre bul (legacy support)
            if not role_result:
                legacy_role_query = """
                    SELECT r.id, r.code
                    FROM users u
                    JOIN roles r ON u.role = r.code
                    WHERE u.id = %s AND r.is_active = TRUE
                    LIMIT 1
                """
                role_result = execute_query_one(legacy_role_query, (user_id,))

            if not role_result:
                return jsonify({'error': 'Kullanıcı rolü bulunamadı'}), 403

            role_id = role_result['id']

            # Permission kontrolü
            permission_column = f'can_{action}'
            permission_query = f"""
                SELECT {permission_column} as has_permission
                FROM role_permissions
                WHERE role_id = %s AND resource = %s
            """

            permission = execute_query_one(permission_query, (role_id, resource))

            if not permission or not permission.get('has_permission'):
                return jsonify({
                    'error': f'{resource} kaynağı için {action} yetkisi yok'
                }), 403

            return f(*args, **kwargs)

        return decorated
    return decorator


def get_user_permissions(user_id):
    """
    Kullanıcının tüm yetkilerini döndürür (helper function)

    Returns:
        dict: {
            'jobs': {'can_view': True, 'can_create': False, ...},
            'customers': {...},
            ...
        }
    """
    query = """
        SELECT rp.resource, rp.can_view, rp.can_create, rp.can_update, rp.can_delete
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = %s
    """

    from app.models.database import execute_query
    permissions = execute_query(query, (user_id,))

    result = {}
    for perm in permissions:
        result[perm['resource']] = {
            'can_view': perm['can_view'],
            'can_create': perm['can_create'],
            'can_update': perm['can_update'],
            'can_delete': perm['can_delete']
        }

    return result