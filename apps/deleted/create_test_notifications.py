#!/usr/bin/env python3
"""
Admin kullanıcısı için test notification'ları oluşturur
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Veritabanı bağlantısı
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'reklam_db',
    'user': 'reklam_user',
    'password': 'reklam_pass_123'
}

def create_test_notifications():
    try:
        # Veritabanına bağlan
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cursor = conn.cursor()

        # Admin kullanıcısının ID'sini al
        cursor.execute("SELECT id, username, email FROM users WHERE username = 'admin' LIMIT 1")
        admin = cursor.fetchone()

        if not admin:
            print("❌ Admin kullanıcısı bulunamadı!")
            return

        admin_id = admin['id']
        print(f"✅ Admin kullanıcı bulundu:")
        print(f"   ID: {admin_id}")
        print(f"   Username: {admin['username']}")
        print(f"   Email: {admin['email']}")
        print()

        # Test bildirimleri
        notifications = [
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

        print("📢 Test bildirimleri oluşturuluyor...")
        print()

        # Bildirimleri ekle
        for notif in notifications:
            cursor.execute("""
                INSERT INTO notifications (user_id, title, message, type, ref_type, ref_id, is_read)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (
                admin_id,
                notif['title'],
                notif['message'],
                notif['type'],
                notif['ref_type'],
                notif['ref_id'],
                notif['is_read']
            ))

            result = cursor.fetchone()
            status_icon = "✓" if notif['is_read'] else "●"
            type_emoji = {
                'info': 'ℹ️',
                'success': '✅',
                'warning': '⚠️',
                'error': '❌'
            }

            print(f"{status_icon} {type_emoji.get(notif['type'], '📢')} {notif['title']}")
            print(f"  ID: {result['id']}")
            print(f"  Tip: {notif['type']}")
            print(f"  Mesaj: {notif['message'][:60]}...")
            print(f"  Oluşturulma: {result['created_at']}")
            print()

        conn.commit()

        # Mevcut bildirimleri göster
        cursor.execute("""
            SELECT id, title, message, type, is_read, ref_type, created_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (admin_id,))

        all_notifications = cursor.fetchall()

        print("=" * 70)
        print(f"📊 Toplam bildirim sayısı: {len(all_notifications)}")

        # Okunmamış sayısı
        unread_count = sum(1 for n in all_notifications if not n['is_read'])
        print(f"📬 Okunmamış bildirim: {unread_count}")
        print(f"📭 Okunmuş bildirim: {len(all_notifications) - unread_count}")
        print("=" * 70)

        cursor.close()
        conn.close()

        print()
        print("✅ Test bildirimleri başarıyla oluşturuldu!")
        print()
        print("🔍 Test etmek için:")
        print("   API: GET http://localhost:5001/api/notifications")
        print("   Header: Authorization: Bearer <your_token>")

    except psycopg2.Error as e:
        print(f"❌ Veritabanı hatası: {e}")
    except Exception as e:
        print(f"❌ Hata: {e}")

if __name__ == '__main__':
    create_test_notifications()