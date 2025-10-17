#!/usr/bin/env python3
"""
Connection pool leak'lerini otomatik olarak düzelten script.
Tüm conn.close() kullanımlarını release_db_connection(conn) ile değiştirir.
"""

import re
import sys

def fix_connection_leaks(file_path):
    """Bir dosyadaki connection leak'leri düzelt"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. conn.close() -> release_db_connection(conn) değişimi
    content = content.replace('conn.close()', 'release_db_connection(conn)')

    # 2. Import'a release_db_connection ekle (eğer yoksa)
    if 'release_db_connection' not in content:
        # get_db_connection import'unu bul ve release_db_connection ekle
        content = re.sub(
            r'from app\.models\.database import ([^)]+get_db_connection[^)]*)',
            lambda m: f'from app.models.database import {m.group(1)}, release_db_connection'
                      if 'release_db_connection' not in m.group(1)
                      else m.group(0),
            content
        )

    # Değişiklik varsa dosyayı yaz
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

if __name__ == '__main__':
    files_to_fix = [
        '/Users/user/ReklamPRO/apps/api/app/routes/jobs.py',
        '/Users/user/ReklamPRO/apps/api/app/routes/processes.py',
        '/Users/user/ReklamPRO/apps/api/app/routes/customers.py',
        '/Users/user/ReklamPRO/apps/api/app/routes/machines.py',
    ]

    print("🔧 Connection Leak Fixer")
    print("=" * 50)

    fixed_count = 0
    for file_path in files_to_fix:
        try:
            if fix_connection_leaks(file_path):
                print(f"✅ Fixed: {file_path}")
                fixed_count += 1
            else:
                print(f"ℹ️  No changes: {file_path}")
        except FileNotFoundError:
            print(f"⚠️  File not found: {file_path}")
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")

    print("=" * 50)
    print(f"✅ Fixed {fixed_count} files")
    print("\n⚠️  Important: Bu script sadece conn.close() -> release_db_connection(conn) değişimini yapar.")
    print("Try-finally blokları ve exception handling manuel olarak kontrol edilmelidir.")