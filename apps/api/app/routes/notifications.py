from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection, release_db_connection
from app.middleware.auth_middleware import token_required

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@token_required
def get_notifications():
    """Kullanıcının bildirimlerini getir"""
    try:
        user_id = request.current_user['user_id']
        
        # Query params
        is_read = request.args.get('is_read')
        limit = request.args.get('limit', 50, type=int)
        
        query = """
            SELECT 
                id, title, message, type, ref_type, ref_id,
                is_read, created_at
            FROM notifications
            WHERE user_id = %s
        """
        
        params = [user_id]
        
        if is_read is not None:
            query += " AND is_read = %s"
            params.append(is_read.lower() == 'true')
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        notifications = execute_query(query, tuple(params))
        
        notifications_list = []
        for notif in notifications:
            notifications_list.append({
                'id': str(notif['id']),
                'title': notif['title'],
                'message': notif['message'],
                'type': notif['type'],
                'ref_type': notif['ref_type'],
                'ref_id': str(notif['ref_id']) if notif['ref_id'] else None,
                'is_read': notif['is_read'],
                'created_at': notif['created_at'].isoformat() if notif['created_at'] else None
            })
        
        return jsonify({'data': notifications_list}), 200
        
    except Exception as e:
        print(f"Error getting notifications: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@notifications_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_count():
    """Okunmamış bildirim sayısı"""
    try:
        user_id = request.current_user['user_id']
        
        query = """
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = %s AND is_read = FALSE
        """
        
        result = execute_query_one(query, (user_id,))
        
        return jsonify({
            'data': {
                'count': result['count'] if result else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@notifications_bp.route('/<notification_id>/read', methods=['PATCH'])
@token_required
def mark_as_read(notification_id):
    """Bildirimi okundu olarak işaretle"""
    conn = None
    cursor = None
    try:
        user_id = request.current_user['user_id']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s AND user_id = %s
            RETURNING id
        """, (notification_id, user_id))

        result = cursor.fetchone()
        conn.commit()

        if not result:
            return jsonify({'error': 'Bildirim bulunamadı'}), 404

        return jsonify({'message': 'Bildirim okundu olarak işaretlendi'}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)


@notifications_bp.route('/mark-all-read', methods=['PATCH'])
@token_required
def mark_all_as_read():
    """Tüm bildirimleri okundu olarak işaretle"""
    conn = None
    cursor = None
    try:
        user_id = request.current_user['user_id']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))

        conn.commit()

        return jsonify({'message': 'Tüm bildirimler okundu olarak işaretlendi'}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@token_required
def delete_notification(notification_id):
    """Bildirimi sil"""
    conn = None
    cursor = None
    try:
        user_id = request.current_user['user_id']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM notifications
            WHERE id = %s AND user_id = %s
            RETURNING id
        """, (notification_id, user_id))

        result = cursor.fetchone()
        conn.commit()

        if not result:
            return jsonify({'error': 'Bildirim bulunamadı'}), 404

        return jsonify({'message': 'Bildirim silindi'}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)


@notifications_bp.route('/create-test-notifications', methods=['POST'])
@token_required
def create_test_notifications_endpoint():
    """Admin için test notification'ları oluştur"""
    conn = None
    cursor = None
    try:
        user_id = request.current_user['user_id']
        user_role = request.current_user.get('role')

        # Sadece admin
        if user_role != 'yonetici':
            return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403

        conn = get_db_connection()
        cursor = conn.cursor()

        # Test notification'ları
        test_notifications = [
            {
                'title': 'Hoş Geldiniz',
                'message': 'ReklamPRO sistemine hoş geldiniz! Notification sistemi başarıyla çalışıyor.',
                'type': 'info',
                'ref_type': None,
                'ref_id': None,
                'is_read': False
            },
            {
                'title': 'İş Tamamlandı',
                'message': 'Test işi başarıyla tamamlandı. Tüm adımlar başarılı.',
                'type': 'success',
                'ref_type': None,
                'ref_id': None,
                'is_read': False
            },
            {
                'title': 'Dikkat Gerekli',
                'message': 'Makine bakım zamanı yaklaşıyor. Lütfen HP Latex 360 için bakım planlayın.',
                'type': 'warning',
                'ref_type': None,
                'ref_id': None,
                'is_read': False
            },
            {
                'title': 'Hata Oluştu',
                'message': 'Test baskı işleminde hata meydana geldi. Lütfen kontrol edin.',
                'type': 'error',
                'ref_type': None,
                'ref_id': None,
                'is_read': False
            },
            {
                'title': 'Yeni İş Atandı',
                'message': 'Size yeni bir iş atandı. Detayları kontrol etmeyi unutmayın.',
                'type': 'info',
                'ref_type': 'job',
                'ref_id': None,
                'is_read': False
            },
            {
                'title': 'Sistem Güncellemesi',
                'message': 'Sistem güncellemesi başarıyla tamamlandı. (Bu okunmuş bir bildirimdir)',
                'type': 'success',
                'ref_type': None,
                'ref_id': None,
                'is_read': True
            }
        ]

        created_ids = []
        for notif in test_notifications:
            cursor.execute("""
                INSERT INTO notifications (user_id, title, message, type, ref_type, ref_id, is_read)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                user_id,
                notif['title'],
                notif['message'],
                notif['type'],
                notif['ref_type'],
                notif['ref_id'],
                notif['is_read']
            ))
            result = cursor.fetchone()
            created_ids.append(str(result['id']))

        conn.commit()

        return jsonify({
            'message': f'{len(created_ids)} test notification oluşturuldu',
            'created_ids': created_ids
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating test notifications: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)


def create_notification(user_id, title, message, notif_type, ref_type=None, ref_id=None):
    """Yeni bildirim oluştur (internal function)"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, type, ref_type, ref_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, title, message, notif_type, ref_type, ref_id))

        result = cursor.fetchone()
        conn.commit()

        return str(result['id']) if result else None

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating notification: {str(e)}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)