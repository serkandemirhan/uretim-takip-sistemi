"""
Permission Setup Script
Eksik resource'ları ekler ve tüm roller için default permissions oluşturur
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from models.database import get_db_connection

def setup_permissions():
    """Eksik resource'ları ve süreç yetkilerini ekle"""

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Tüm rolleri al
    cursor.execute("SELECT id, code, name FROM roles ORDER BY name")
    roles = cursor.fetchall()

    print("📋 Bulunan Roller:")
    for role in roles:
        print(f"  - {role['name']} ({role['code']})")

    # 2. Mevcut ve eksik resource'lar
    existing_resources = ['jobs', 'customers', 'files', 'machines', 'processes', 'users', 'reports']
    new_resources = ['roles', 'dashboard', 'audit_logs', 'notifications']
    all_resources = existing_resources + new_resources

    print(f"\n📦 Toplam Resource: {len(all_resources)}")
    print(f"  Mevcut: {', '.join(existing_resources)}")
    print(f"  Yeni: {', '.join(new_resources)}")

    # 3. Her rol için permission tanımları
    role_permissions_map = {
        'yonetici': {
            # Admin her şeye tam yetki
            'default': {'view': True, 'create': True, 'update': True, 'delete': True}
        },
        'musteri_temsilcisi': {
            'jobs': {'view': True, 'create': True, 'update': True, 'delete': False},
            'customers': {'view': True, 'create': True, 'update': True, 'delete': False},
            'files': {'view': True, 'create': True, 'update': True, 'delete': False},
            'dashboard': {'view': True, 'create': False, 'update': False, 'delete': False},
            'reports': {'view': True, 'create': False, 'update': False, 'delete': False},
            # Diğerleri yok
            'default': {'view': False, 'create': False, 'update': False, 'delete': False}
        },
        'tasarimci': {
            'jobs': {'view': True, 'create': False, 'update': True, 'delete': False},
            'files': {'view': True, 'create': True, 'update': True, 'delete': True},
            'customers': {'view': True, 'create': False, 'update': False, 'delete': False},
            'dashboard': {'view': True, 'create': False, 'update': False, 'delete': False},
            'default': {'view': False, 'create': False, 'update': False, 'delete': False}
        },
        'kesifci': {
            'jobs': {'view': True, 'create': False, 'update': True, 'delete': False},
            'customers': {'view': True, 'create': False, 'update': False, 'delete': False},
            'files': {'view': True, 'create': True, 'update': False, 'delete': False},
            'reports': {'view': True, 'create': True, 'update': False, 'delete': False},
            'dashboard': {'view': True, 'create': False, 'update': False, 'delete': False},
            'default': {'view': False, 'create': False, 'update': False, 'delete': False}
        },
        'operator': {
            'jobs': {'view': True, 'create': False, 'update': True, 'delete': False},
            'machines': {'view': True, 'create': False, 'update': False, 'delete': False},
            'dashboard': {'view': True, 'create': False, 'update': False, 'delete': False},
            'default': {'view': False, 'create': False, 'update': False, 'delete': False}
        },
        'lamineci': {
            'jobs': {'view': True, 'create': False, 'update': True, 'delete': False},
            'machines': {'view': True, 'create': False, 'update': False, 'delete': False},
            'dashboard': {'view': True, 'create': False, 'update': False, 'delete': False},
            'default': {'view': False, 'create': False, 'update': False, 'delete': False}
        },
        'depocu': {
            'jobs': {'view': True, 'create': False, 'update': False, 'delete': False},
            'files': {'view': True, 'create': True, 'update': False, 'delete': False},
            'dashboard': {'view': True, 'create': False, 'update': False, 'delete': False},
            'default': {'view': False, 'create': False, 'update': False, 'delete': False}
        },
        'satinalma': {
            'jobs': {'view': True, 'create': False, 'update': False, 'delete': False},
            'customers': {'view': True, 'create': False, 'update': False, 'delete': False},
            'reports': {'view': True, 'create': False, 'update': False, 'delete': False},
            'dashboard': {'view': True, 'create': False, 'update': False, 'delete': False},
            'default': {'view': False, 'create': False, 'update': False, 'delete': False}
        }
    }

    # 4. Her rol için permissions oluştur/güncelle
    print("\n🔧 Permissions oluşturuluyor...")

    for role in roles:
        role_id = role['id']
        role_code = role['code']
        role_name = role['name']

        print(f"\n  📌 {role_name} ({role_code}):")

        # Bu rol için permission map'i al
        perm_map = role_permissions_map.get(role_code, {})
        default_perm = perm_map.get('default', {'view': False, 'create': False, 'update': False, 'delete': False})

        for resource in all_resources:
            # Resource için özel yetki var mı?
            resource_perm = perm_map.get(resource, default_perm)

            # Mevcut permission kontrolü
            cursor.execute("""
                SELECT id FROM role_permissions
                WHERE role_id = %s AND resource = %s
            """, (role_id, resource))

            existing = cursor.fetchone()

            if existing:
                # Güncelle
                cursor.execute("""
                    UPDATE role_permissions
                    SET can_view = %s, can_create = %s, can_update = %s, can_delete = %s
                    WHERE role_id = %s AND resource = %s
                """, (
                    resource_perm['view'],
                    resource_perm['create'],
                    resource_perm['update'],
                    resource_perm['delete'],
                    role_id,
                    resource
                ))
                action = "güncellendi"
            else:
                # Oluştur
                cursor.execute("""
                    INSERT INTO role_permissions (role_id, resource, can_view, can_create, can_update, can_delete)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    role_id,
                    resource,
                    resource_perm['view'],
                    resource_perm['create'],
                    resource_perm['update'],
                    resource_perm['delete']
                ))
                action = "oluşturuldu"

            # Sadece yetkili olanları göster
            if any(resource_perm.values()):
                perms = []
                if resource_perm['view']: perms.append('view')
                if resource_perm['create']: perms.append('create')
                if resource_perm['update']: perms.append('update')
                if resource_perm['delete']: perms.append('delete')
                print(f"    ✅ {resource}: {', '.join(perms)} ({action})")

    conn.commit()

    # 5. Süreç yetkilerini ayarla
    print("\n\n🔧 Süreç yetkileri ayarlanıyor...")

    # Tüm süreçleri al
    cursor.execute("SELECT id, name, code FROM processes WHERE is_active = TRUE ORDER BY order_index")
    processes = cursor.fetchall()

    print(f"📦 Bulunan Süreçler: {len(processes)}")

    # Süreç yetki haritası
    process_permissions_map = {
        'yonetici': 'all',  # Tüm süreçler
        'tasarimci': ['tasarim', 'prova', 'revizyon'],
        'kesifci': ['kesif', 'olcum'],
        'operator': 'all',  # Tüm süreçler (makine bazlı olabilir)
        'lamineci': ['laminasyon', 'kaplama'],
        'depocu': ['depo', 'sevkiyat'],
        'satinalma': ['malzeme'],
        'musteri_temsilcisi': []  # Süreç yetkisi yok
    }

    for role in roles:
        role_id = role['id']
        role_code = role['code']
        role_name = role['name']

        allowed_processes = process_permissions_map.get(role_code, [])

        if allowed_processes == 'all':
            # Tüm süreçlere yetki ver
            for process in processes:
                cursor.execute("""
                    INSERT INTO role_process_permissions (role_id, process_id, can_view)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (role_id, process_id) DO UPDATE SET can_view = TRUE
                """, (role_id, process['id']))
            print(f"  ✅ {role_name}: TÜM SÜREÇLER")
        elif allowed_processes:
            # Belirli süreçlere yetki ver
            count = 0
            for process in processes:
                process_code = (process['code'] or '').lower()
                if any(allowed in process_code for allowed in allowed_processes):
                    cursor.execute("""
                        INSERT INTO role_process_permissions (role_id, process_id, can_view)
                        VALUES (%s, %s, TRUE)
                        ON CONFLICT (role_id, process_id) DO UPDATE SET can_view = TRUE
                    """, (role_id, process['id']))
                    count += 1
            if count > 0:
                print(f"  ✅ {role_name}: {count} süreç")

    conn.commit()
    cursor.close()
    conn.close()

    print("\n\n✅ Permission setup tamamlandı!")
    print("\n📊 Özet:")
    print(f"  - {len(roles)} rol")
    print(f"  - {len(all_resources)} resource")
    print(f"  - {len(processes)} süreç")
    print(f"  - Toplam ~{len(roles) * len(all_resources)} permission kaydı")

if __name__ == '__main__':
    try:
        setup_permissions()
    except Exception as e:
        print(f"\n❌ Hata: {e}")
        import traceback
        traceback.print_exc()
