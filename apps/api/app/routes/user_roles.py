from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.middleware.auth_middleware import token_required, role_required

user_roles_bp = Blueprint('user_roles', __name__, url_prefix='/api/user-roles')


@user_roles_bp.route('/user/<user_id>', methods=['GET'])
@token_required
def get_user_roles(user_id):
    """Kullanıcının rollerini getir"""
    try:
        query = """
            SELECT
                ur.id,
                r.id as role_id,
                r.code as role_code,
                r.name as role_name,
                r.description as role_description,
                ur.is_primary,
                ur.assigned_at
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = %s AND r.is_active = true
            ORDER BY ur.is_primary DESC, r.name
        """

        roles = execute_query(query, (user_id,))

        roles_list = []
        for role in roles:
            roles_list.append({
                'id': str(role['id']),
                'role_id': str(role['role_id']),
                'role_code': role['role_code'],
                'role_name': role['role_name'],
                'role_description': role['role_description'],
                'is_primary': role['is_primary'],
                'assigned_at': role['assigned_at'].isoformat() if role['assigned_at'] else None
            })

        return jsonify({'data': roles_list}), 200

    except Exception as e:
        print(f"Error getting user roles: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@user_roles_bp.route('/user/<user_id>', methods=['POST'])
@token_required
@role_required(['yonetici'])
def assign_roles_to_user(user_id):
    """Kullanıcıya rol(ler) ata"""
    try:
        data = request.get_json()
        role_ids = data.get('role_ids', [])
        primary_role_id = data.get('primary_role_id')

        if not role_ids:
            return jsonify({'error': 'En az bir rol seçilmeli'}), 400

        current_user_id = request.current_user['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()

        # Önce mevcut rolleri temizle
        cursor.execute("""
            DELETE FROM user_roles WHERE user_id = %s
        """, (user_id,))

        # Yeni rolleri ekle
        for role_id in role_ids:
            is_primary = (role_id == primary_role_id)
            cursor.execute("""
                INSERT INTO user_roles (user_id, role_id, is_primary, assigned_by)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, role_id) DO UPDATE
                SET is_primary = EXCLUDED.is_primary
            """, (user_id, role_id, is_primary, current_user_id))

        # Eğer primary rol belirtilmediyse, ilk rolü primary yap
        if not primary_role_id and role_ids:
            cursor.execute("""
                UPDATE user_roles
                SET is_primary = true
                WHERE user_id = %s AND role_id = %s
            """, (user_id, role_ids[0]))

        # users tablosundaki role'u de güncelle (backward compatibility için)
        cursor.execute("""
            UPDATE users u
            SET role = (
                SELECT r.code
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = %s AND ur.is_primary = true
                LIMIT 1
            )
            WHERE u.id = %s
        """, (user_id, user_id))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Roller başarıyla atandı'}), 200

    except Exception as e:
        print(f"Error assigning roles: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@user_roles_bp.route('/user/<user_id>/role/<role_id>', methods=['DELETE'])
@token_required
@role_required(['yonetici'])
def remove_role_from_user(user_id, role_id):
    """Kullanıcıdan rol kaldır"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Rolü kaldır
        cursor.execute("""
            DELETE FROM user_roles
            WHERE user_id = %s AND role_id = %s
            RETURNING id, is_primary
        """, (user_id, role_id))

        result = cursor.fetchone()

        if not result:
            conn.close()
            return jsonify({'error': 'Rol ataması bulunamadı'}), 404

        # Eğer primary rol kaldırıldıysa, başka bir rolü primary yap
        if result['is_primary']:
            cursor.execute("""
                UPDATE user_roles
                SET is_primary = true
                WHERE user_id = %s
                AND id = (
                    SELECT id FROM user_roles
                    WHERE user_id = %s
                    ORDER BY assigned_at
                    LIMIT 1
                )
            """, (user_id, user_id))

            # users tablosunu güncelle
            cursor.execute("""
                UPDATE users u
                SET role = (
                    SELECT r.code
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = %s AND ur.is_primary = true
                    LIMIT 1
                )
                WHERE u.id = %s
            """, (user_id, user_id))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Rol başarıyla kaldırıldı'}), 200

    except Exception as e:
        print(f"Error removing role: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@user_roles_bp.route('/user/<user_id>/primary/<role_id>', methods=['PATCH'])
@token_required
@role_required(['yonetici'])
def set_primary_role(user_id, role_id):
    """Primary rolü ayarla"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Önce tüm rolleri non-primary yap
        cursor.execute("""
            UPDATE user_roles
            SET is_primary = false
            WHERE user_id = %s
        """, (user_id,))

        # Seçilen rolü primary yap
        cursor.execute("""
            UPDATE user_roles
            SET is_primary = true
            WHERE user_id = %s AND role_id = %s
            RETURNING id
        """, (user_id, role_id))

        result = cursor.fetchone()

        if not result:
            conn.close()
            return jsonify({'error': 'Rol ataması bulunamadı'}), 404

        # users tablosunu güncelle
        cursor.execute("""
            UPDATE users u
            SET role = (
                SELECT r.code
                FROM roles r
                WHERE r.id = %s
            )
            WHERE u.id = %s
        """, (role_id, user_id))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Primary rol ayarlandı'}), 200

    except Exception as e:
        print(f"Error setting primary role: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
