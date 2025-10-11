from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.middleware.auth_middleware import token_required, role_required

roles_bp = Blueprint('roles', __name__, url_prefix='/api/roles')


@roles_bp.route('', methods=['GET'])
@token_required
def get_roles():
    """Tüm rolleri listele"""
    try:
        query = """
            SELECT 
                r.id, r.name, r.code, r.description, r.is_active,
                COUNT(ur.user_id) as user_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id
            GROUP BY r.id
            ORDER BY r.name
        """
        
        roles = execute_query(query)
        
        roles_list = []
        for role in roles:
            roles_list.append({
                'id': str(role['id']),
                'name': role['name'],
                'code': role['code'],
                'description': role['description'],
                'is_active': role['is_active'],
                'user_count': role['user_count']
            })
        
        return jsonify({'data': roles_list}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@roles_bp.route('/<role_id>', methods=['GET'])
@token_required
def get_role(role_id):
    """Rol detayı ve yetkileri"""
    try:
        # Rol bilgisi
        role_query = """
            SELECT id, name, code, description, is_active
            FROM roles
            WHERE id = %s
        """
        role = execute_query_one(role_query, (role_id,))
        
        if not role:
            return jsonify({'error': 'Rol bulunamadı'}), 404
        
        # Yetkiler
        permissions_query = """
            SELECT resource, can_view, can_create, can_update, can_delete
            FROM role_permissions
            WHERE role_id = %s
            ORDER BY resource
        """
        permissions = execute_query(permissions_query, (role_id,))
        
        permissions_dict = {}
        for perm in permissions:
            permissions_dict[perm['resource']] = {
                'can_view': perm['can_view'],
                'can_create': perm['can_create'],
                'can_update': perm['can_update'],
                'can_delete': perm['can_delete']
            }
        
        return jsonify({
            'data': {
                'id': str(role['id']),
                'name': role['name'],
                'code': role['code'],
                'description': role['description'],
                'is_active': role['is_active'],
                'permissions': permissions_dict
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@roles_bp.route('', methods=['POST'])
@token_required
@role_required(['yonetici'])
def create_role():
    """Yeni rol oluştur"""
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Ad ve kod gerekli'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Rol oluştur
        cursor.execute("""
            INSERT INTO roles (name, code, description)
            VALUES (%s, %s, %s)
            RETURNING id, name
        """, (
            data.get('name'),
            data.get('code').lower(),
            data.get('description')
        ))
        
        result = cursor.fetchone()
        role_id = result['id']
        
        # Yetkiler ekle
        if data.get('permissions'):
            for resource, perms in data['permissions'].items():
                cursor.execute("""
                    INSERT INTO role_permissions (
                        role_id, resource, can_view, can_create, can_update, can_delete
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    role_id,
                    resource,
                    perms.get('can_view', False),
                    perms.get('can_create', False),
                    perms.get('can_update', False),
                    perms.get('can_delete', False)
                ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Rol başarıyla oluşturuldu',
            'data': {
                'id': str(role_id),
                'name': result['name']
            }
        }), 201
        
    except Exception as e:
        print(f"Error creating role: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@roles_bp.route('/<role_id>', methods=['PATCH'])
@token_required
@role_required(['yonetici'])
def update_role(role_id):
    """Rol güncelle"""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Rol bilgilerini güncelle
        if 'name' in data or 'description' in data:
            update_fields = []
            params = []
            
            if 'name' in data:
                update_fields.append("name = %s")
                params.append(data['name'])
            
            if 'description' in data:
                update_fields.append("description = %s")
                params.append(data['description'])
            
            params.append(role_id)
            
            cursor.execute(f"""
                UPDATE roles
                SET {', '.join(update_fields)}
                WHERE id = %s
            """, tuple(params))
        
        # Yetkileri güncelle
        if data.get('permissions'):
            for resource, perms in data['permissions'].items():
                cursor.execute("""
                    INSERT INTO role_permissions (
                        role_id, resource, can_view, can_create, can_update, can_delete
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (role_id, resource) 
                    DO UPDATE SET
                        can_view = EXCLUDED.can_view,
                        can_create = EXCLUDED.can_create,
                        can_update = EXCLUDED.can_update,
                        can_delete = EXCLUDED.can_delete
                """, (
                    role_id,
                    resource,
                    perms.get('can_view', False),
                    perms.get('can_create', False),
                    perms.get('can_update', False),
                    perms.get('can_delete', False)
                ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Rol başarıyla güncellendi'}), 200
        
    except Exception as e:
        print(f"Error updating role: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@roles_bp.route('/<role_id>', methods=['DELETE'])
@token_required
@role_required(['yonetici'])
def delete_role(role_id):
    """Rol sil"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Kullanıcısı var mı kontrol et
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM user_roles
            WHERE role_id = %s
        """, (role_id,))
        
        result = cursor.fetchone()
        
        if result['count'] > 0:
            conn.close()
            return jsonify({'error': 'Bu role atanmış kullanıcılar var, silinemez'}), 400
        
        cursor.execute("DELETE FROM roles WHERE id = %s RETURNING id", (role_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'Rol bulunamadı'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Rol başarıyla silindi'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@roles_bp.route('/resources', methods=['GET'])
@token_required
def get_resources():
    """Yetkilendirilebilir kaynaklar"""
    resources = [
        {'code': 'jobs', 'name': 'İşler', 'description': 'İş talepleri ve yönetimi'},
        {'code': 'customers', 'name': 'Müşteriler', 'description': 'Müşteri bilgileri'},
        {'code': 'processes', 'name': 'Süreçler', 'description': 'İş süreçleri'},
        {'code': 'machines', 'name': 'Makineler', 'description': 'Makine yönetimi'},
        {'code': 'users', 'name': 'Kullanıcılar', 'description': 'Kullanıcı yönetimi'},
        {'code': 'files', 'name': 'Dosyalar', 'description': 'Dosya yönetimi'},
        {'code': 'reports', 'name': 'Raporlar', 'description': 'Raporlar ve analizler'},
    ]
    
    return jsonify({'data': resources}), 200