"""
Permissions API
Kullanıcının yetkilerini döndüren endpoint
"""
from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, get_user_permissions
from app.models.database import execute_query

permissions_bp = Blueprint('permissions', __name__, url_prefix='/api/permissions')


@permissions_bp.route('/me', methods=['GET'])
@token_required
def get_my_permissions():
    """
    Mevcut kullanıcının tüm yetkilerini döndürür

    Frontend bu endpoint'i kullanarak:
    - Buttonları gizle/göster yapabilir
    - Route guard yapabilir
    - Conditional rendering yapabilir
    """
    try:
        user_id = request.current_user.get('user_id')
        user_role = request.current_user.get('role')

        # Admin her şeyi yapabilir
        if user_role == 'admin':
            return jsonify({
                'data': {
                    'is_admin': True,
                    'permissions': {},  # Admin için kontrol gereksiz
                    'processes': []  # Admin tüm süreçleri görebilir
                }
            }), 200

        # Kullanıcının resource yetkilerini al
        permissions = get_user_permissions(user_id)

        # Kullanıcının süreç yetkilerini al
        process_query = """
            SELECT p.id, p.name, p.code
            FROM role_process_permissions rpp
            JOIN processes p ON rpp.process_id = p.id
            JOIN user_roles ur ON rpp.role_id = ur.role_id
            WHERE ur.user_id = %s AND rpp.can_view = TRUE AND p.is_active = TRUE
            ORDER BY p.order_index
        """
        processes = execute_query(process_query, (user_id,))

        process_list = [
            {
                'id': str(p['id']),
                'name': p['name'],
                'code': p['code']
            }
            for p in processes
        ]

        return jsonify({
            'data': {
                'is_admin': False,
                'permissions': permissions,
                'processes': process_list
            }
        }), 200

    except Exception as e:
        return jsonify({'error': f'Yetkiler alınamadı: {str(e)}'}), 500


@permissions_bp.route('/check', methods=['POST'])
@token_required
def check_permission():
    """
    Belirli bir yetki kontrolü yapar

    Body:
    {
        "resource": "jobs",
        "action": "create"
    }

    Response:
    {
        "allowed": true/false
    }
    """
    try:
        data = request.get_json()
        resource = data.get('resource')
        action = data.get('action', 'view')

        if not resource:
            return jsonify({'error': 'Resource gerekli'}), 400

        user_id = request.current_user.get('user_id')
        user_role = request.current_user.get('role')

        # Admin her şeyi yapabilir
        if user_role == 'admin':
            return jsonify({'allowed': True}), 200

        permissions = get_user_permissions(user_id)

        # Resource var mı?
        if resource not in permissions:
            return jsonify({'allowed': False}), 200

        # Action var mı?
        action_key = f'can_{action}'
        allowed = permissions[resource].get(action_key, False)

        return jsonify({'allowed': allowed}), 200

    except Exception as e:
        return jsonify({'error': f'Yetki kontrolü yapılamadı: {str(e)}'}), 500
