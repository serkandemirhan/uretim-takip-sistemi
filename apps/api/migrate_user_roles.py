"""
User Roles Migration Script
users.role kolonundan user_roles tablosuna veri taşır
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from models.database import get_db_connection

def migrate_user_roles():
    """users.role -> user_roles migration"""

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Mevcut kullanıcıları al
    cursor.execute("""
        SELECT u.id, u.email, u.role, r.id as role_id, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role = r.code
        WHERE u.role IS NOT NULL
        ORDER BY u.email
    """)

    users = cursor.fetchall()

    print(f"📋 Bulunan kullanıcılar: {len(users)}")

    migrated = 0
    skipped = 0
    errors = 0

    for user in users:
        user_id = user['id']
        user_email = user['email']
        user_role = user['role']
        role_id = user['role_id']
        role_name = user['role_name']

        if not role_id:
            print(f"  ⚠️  {user_email}: Rol bulunamadı ('{user_role}')")
            errors += 1
            continue

        # user_roles'de zaten var mı kontrol et
        cursor.execute("""
            SELECT id FROM user_roles
            WHERE user_id = %s AND role_id = %s
        """, (user_id, role_id))

        existing = cursor.fetchone()

        if existing:
            print(f"  ⏭️  {user_email}: Zaten kayıtlı ({role_name})")
            skipped += 1
            continue

        # Insert into user_roles
        try:
            cursor.execute("""
                INSERT INTO user_roles (user_id, role_id)
                VALUES (%s, %s)
            """, (user_id, role_id))

            print(f"  ✅ {user_email}: {role_name} rolü eklendi")
            migrated += 1
        except Exception as e:
            print(f"  ❌ {user_email}: Hata - {e}")
            errors += 1

    conn.commit()
    cursor.close()
    conn.close()

    print(f"\n📊 Özet:")
    print(f"  ✅ Migrate edildi: {migrated}")
    print(f"  ⏭️  Atlandı (zaten var): {skipped}")
    print(f"  ❌ Hata: {errors}")
    print(f"  📋 Toplam: {len(users)}")

    if migrated > 0:
        print(f"\n🎉 {migrated} kullanıcı başarıyla migrate edildi!")

    if errors > 0:
        print(f"\n⚠️  {errors} kullanıcı için hata oluştu. Kontrol edin.")

if __name__ == '__main__':
    try:
        print("🔄 User roles migration başlıyor...\n")
        migrate_user_roles()
    except Exception as e:
        print(f"\n❌ Migration hatası: {e}")
        import traceback
        traceback.print_exc()
