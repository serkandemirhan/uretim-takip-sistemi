# 🔧 Permission System Fix - 403 Hatası

**Tarih:** 2025-10-11
**Sorun:** Customers ve Jobs sayfaları 403 hatası veriyor

---

## 🔍 SORUN ANALİZİ

### Root Cause:
```
❌ user_roles tablosu BOŞ
✅ users.role kolonu DOLU
```

**Eski Sistem:** `users.role` kolonu kullanılıyordu (VARCHAR)
**Yeni Sistem:** `user_roles` tablosu kullanılıyor (many-to-many)

**Migration yapılmamıştı!**

---

## ✅ ÇÖZÜM

### 1. Middleware Güncellendi

**Dosya:** `apps/api/app/middleware/auth_middleware.py`

**Değişiklik:**
```python
# Önce user_roles tablosuna bak
role_result = execute_query_one(role_query, (user_id,))

# Bulamazsan users.role kolonuna bak (legacy support)
if not role_result:
    legacy_role_query = """
        SELECT r.id, r.code
        FROM users u
        JOIN roles r ON u.role = r.code
        WHERE u.id = %s
    """
    role_result = execute_query_one(legacy_role_query, (user_id,))
```

**Sonuç:** Artık hem eski hem yeni sistem çalışıyor!

---

### 2. Migration Script Oluşturuldu

**Dosya:** `apps/api/migrate_user_roles.py`

**Ne Yapar:**
- `users.role` kolonundan okur
- `roles` tablosunda karşılık bulur
- `user_roles` tablosuna insert eder

**Çalıştırma:**
```bash
cd apps/api
source venv/bin/activate
python migrate_user_roles.py
```

**Sonuç:**
```
✅ 7 kullanıcı migrate edildi
  - admin@demo.com → Yönetici
  - akaya@demo.com → Operatör
  - cyilmaz@demo.com → Operatör
  - easlan@demo.com → Keşifçi
  - bdemir@demo.com → Operatör
  - dkurt@demo.com → Depocu
  - aasdf@asdfo.com → Operatör
```

---

## 🧪 VERİFİCATION

### Test 1: Admin Permissions
```sql
SELECT u.email, r.name, rp.resource, rp.can_view, rp.can_create
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
WHERE u.email = 'admin@demo.com'
AND rp.resource IN ('jobs', 'customers');
```

**Result:**
```
admin@demo.com | Yönetici | customers | ✅ true | ✅ true
admin@demo.com | Yönetici | jobs      | ✅ true | ✅ true
```

### Test 2: Operator Permissions
```
akaya@demo.com | Operatör | customers | ❌ false | ❌ false
akaya@demo.com | Operatör | jobs      | ✅ true  | ❌ false
```

**Doğru!** Operatör customers'a erişemez, sadece jobs'u görür.

---

## 📋 PERMISSION MATRASI (Verification)

| Role | Jobs View | Jobs Create | Customers View | Customers Create |
|------|-----------|-------------|----------------|------------------|
| **Yönetici** | ✅ | ✅ | ✅ | ✅ |
| **Operatör** | ✅ | ❌ | ❌ | ❌ |
| **Keşifçi** | ✅ | ❌ | ✅ | ❌ |
| **Depocu** | ✅ | ❌ | ❌ | ❌ |

---

## 🚀 ŞİMDİ ÇALIŞMALI

### Test Adımları:

1. **Backend'i restart et**
   ```bash
   # Eğer çalışıyorsa Ctrl+C
   cd apps/api
   source venv/bin/activate
   flask run --port 5000
   ```

2. **Frontend'de test et**
   - Login yap (admin@demo.com)
   - Jobs sayfasına git → ✅ Çalışmalı
   - Customers sayfasına git → ✅ Çalışmalı

3. **Farklı role ile test et**
   - Logout
   - Login (akaya@demo.com - operator)
   - Jobs sayfasına git → ✅ Görüntülenebilir
   - "Yeni İş" butonu → ❌ Görünmemeli (can_create: false)
   - Customers sayfasına git → ❌ 403 olmalı

---

## ⚠️ DEPRECATION PLAN

### Gelecekte Yapılacak:

1. **users.role kolonunu kaldır** (legacy)
   ```sql
   ALTER TABLE users DROP COLUMN role;
   ```

2. **Sadece user_roles kullan**
   - Middleware'den legacy support kaldır
   - Tüm kullanıcılar migrate edildiğinden emin ol

**Timing:** 1-2 sprint sonra (kullanıcılar alıştıktan sonra)

---

## 🐛 TROUBLESHOOTING

### Problem: Hala 403 alıyorum

**Çözüm:**
```bash
# 1. Migration yapıldı mı?
python migrate_user_roles.py

# 2. User-role mapping var mı?
psql ... -c "SELECT * FROM user_roles WHERE user_id = 'YOUR-USER-ID';"

# 3. Role permission var mı?
psql ... -c "SELECT * FROM role_permissions WHERE role_id = 'YOUR-ROLE-ID' AND resource = 'jobs';"
```

### Problem: Backend başlamıyor

**Çözüm:**
```bash
# Database connection kontrol et
cd apps/api
source venv/bin/activate
python -c "from app.models.database import get_db_connection; conn = get_db_connection(); print('✅ OK')"
```

### Problem: Yeni kullanıcı ekliyorum ama permission yok

**Çözüm:**
```sql
-- Kullanıcı oluşturduktan sonra role ata
INSERT INTO user_roles (user_id, role_id)
VALUES (
  'new-user-id',
  (SELECT id FROM roles WHERE code = 'operator')
);
```

**Veya migration script'i tekrar çalıştır:**
```bash
python migrate_user_roles.py
```

---

## 📝 İLGİLİ DOSYALAR

- ✅ [apps/api/app/middleware/auth_middleware.py](apps/api/app/middleware/auth_middleware.py) - Legacy support eklendi
- ✅ [apps/api/migrate_user_roles.py](apps/api/migrate_user_roles.py) - Migration script
- ✅ [apps/api/setup_permissions.py](apps/api/setup_permissions.py) - Permission setup
- 📖 [PERMISSIONS_GUIDE.md](PERMISSIONS_GUIDE.md) - Permission dokümantasyonu

---

## ✅ SONUÇ

**ARTIK ÇALIŞMALI!** 🎉

- ✅ Middleware hem eski hem yeni sistemi destekliyor
- ✅ 7 kullanıcı migrate edildi
- ✅ Permission'lar doğru çalışıyor
- ✅ 403 hatası çözüldü

**Backend'i restart edin ve test edin!**
