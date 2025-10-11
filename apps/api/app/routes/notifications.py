from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection
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
        conn.close()
        
        if not result:
            return jsonify({'error': 'Bildirim bulunamadı'}), 404
        
        return jsonify({'message': 'Bildirim okundu olarak işaretlendi'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@notifications_bp.route('/mark-all-read', methods=['PATCH'])
@token_required
def mark_all_as_read():
    """Tüm bildirimleri okundu olarak işaretle"""
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
        conn.close()
        
        return jsonify({'message': 'Tüm bildirimler okundu olarak işaretlendi'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@token_required
def delete_notification(notification_id):
    """Bildirimi sil"""
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
        conn.close()
        
        if not result:
            return jsonify({'error': 'Bildirim bulunamadı'}), 404
        
        return jsonify({'message': 'Bildirim silindi'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


def create_notification(user_id, title, message, notif_type, ref_type=None, ref_id=None):
    """Yeni bildirim oluştur (internal function)"""
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
        conn.close()
        
        return str(result['id']) if result else None
        
    except Exception as e:
        print(f"Error creating notification: {str(e)}")
        return None