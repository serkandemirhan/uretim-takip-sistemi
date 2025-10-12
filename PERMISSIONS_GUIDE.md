# 🔐 Permission System Guide

ReklamPRO uygulamasında rol bazlı yetkilendirme sistemi.

---

## 📋 Roller ve Yetkiler

### 1. **Yönetici** (yonetici)
**Tam yetki - Her şeye erişebilir**

✅ Jobs: view, create, update, delete
✅ Customers: view, create, update, delete
✅ Files: view, create, update, delete
✅ Machines: view, create, update, delete
✅ Processes: view, create, update, delete
✅ Users: view, create, update, delete
✅ Roles: view, create, update, delete
✅ Reports: view, create, update, delete
✅ Dashboard: view, create, update, delete
✅ Audit Logs: view, create, update, delete
✅ Notifications: view, create, update, delete

**Süreçler:** TÜM SÜREÇLER

---

### 2. **Müşteri Temsilcisi** (musteri_temsilcisi)
**Müşteri ve iş yönetimi**

✅ Jobs: view, create, update
✅ Customers: view, create, update
✅ Files: view, create, update
✅ Dashboard: view
✅ Reports: view

❌ Machines, Users, Roles, Processes: erişim yok

**Süreçler:** Yok

---

### 3. **Proje Tasarımcısı** (tasarimci)
**Tasarım ve dosya yönetimi**

✅ Jobs: view, update
✅ Files: view, create, update, delete
✅ Customers: view
✅ Dashboard: view

❌ Job create, delete yapamaz
❌ Machines, Users, Roles: erişim yok

**Süreçler:** tasarim, prova, revizyon

---

### 4. **Keşifçi** (kesifci)
**Keşif ve raporlama**

✅ Jobs: view, update
✅ Customers: view
✅ Files: view, create
✅ Reports: view, create
✅ Dashboard: view

❌ Delete yetkisi yok

**Süreçler:** kesif, olcum

---

### 5. **Operatör** (operator)
**Üretim süreçleri**

✅ Jobs: view, update
✅ Machines: view
✅ Dashboard: view

❌ Create, delete yetkisi yok
❌ Customers, Files, Reports: erişim yok

**Süreçler:** TÜM SÜREÇLER (makine bazlı olabilir)

---

### 6. **Lamineci** (lamineci)
**Laminasyon işlemleri**

✅ Jobs: view, update
✅ Machines: view
✅ Dashboard: view

**Süreçler:** laminasyon, kaplama

---

### 7. **Depocu** (depocu)
**Depo ve sevkiyat**

✅ Jobs: view
✅ Files: view, create
✅ Dashboard: view

**Süreçler:** depo, sevkiyat

---

### 8. **Satınalma** (satinalma)
**Malzeme takibi**

✅ Jobs: view
✅ Customers: view
✅ Reports: view
✅ Dashboard: view

**Süreçler:** malzeme

---

## 🔧 Backend Kullanımı

### Permission Decorator

```python
from app.middleware.auth_middleware import permission_required

# View permission
@permission_required('jobs', 'view')
def get_jobs():
    ...

# Create permission
@permission_required('customers', 'create')
def create_customer():
    ...

# Update permission
@permission_required('jobs', 'update')
def update_job(job_id):
    ...

# Delete permission
@permission_required('files', 'delete')
def delete_file(file_id):
    ...
```

### Get User Permissions

```python
from app.middleware.auth_middleware import get_user_permissions

permissions = get_user_permissions(user_id)

# Returns:
# {
#     'jobs': {'can_view': True, 'can_create': True, 'can_update': True, 'can_delete': False},
#     'customers': {'can_view': True, 'can_create': False, ...},
#     ...
# }
```

---

## 🌐 Frontend Kullanımı

### Permissions API

**Kullanıcının tüm yetkilerini al:**

```typescript
GET /api/permissions/me

// Response:
{
  "data": {
    "is_admin": false,
    "permissions": {
      "jobs": {
        "can_view": true,
        "can_create": true,
        "can_update": true,
        "can_delete": false
      },
      "customers": { ... },
      ...
    },
    "processes": [
      { "id": "...", "name": "Tasarım", "code": "tasarim" },
      ...
    ]
  }
}
```

**Belirli bir yetki kontrolü:**

```typescript
POST /api/permissions/check
{
  "resource": "jobs",
  "action": "create"
}

// Response:
{
  "allowed": true
}
```

### React Hook Örneği

```typescript
// hooks/usePermissions.ts
import { useEffect, useState } from 'react'
import { permissionsAPI } from '@/lib/api/client'

export function usePermissions() {
  const [permissions, setPermissions] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPermissions() {
      try {
        const response = await permissionsAPI.getMyPermissions()
        setPermissions(response.data)
      } catch (error) {
        console.error('Permissions load error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPermissions()
  }, [])

  const can = (resource: string, action: string) => {
    if (!permissions) return false
    if (permissions.is_admin) return true

    const resourcePerms = permissions.permissions[resource]
    if (!resourcePerms) return false

    return resourcePerms[`can_${action}`] || false
  }

  return { permissions, loading, can }
}
```

### Kullanım Örnekleri

**Button göster/gizle:**

```tsx
import { usePermissions } from '@/hooks/usePermissions'

function JobsPage() {
  const { can } = usePermissions()

  return (
    <div>
      {can('jobs', 'create') && (
        <Button onClick={createJob}>Yeni İş Oluştur</Button>
      )}

      {can('jobs', 'delete') && (
        <Button onClick={deleteJob}>Sil</Button>
      )}
    </div>
  )
}
```

**Route Guard:**

```tsx
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'

function ProtectedPage() {
  const { can, loading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !can('users', 'view')) {
      router.push('/dashboard')
    }
  }, [loading, can])

  if (loading) return <div>Yükleniyor...</div>
  if (!can('users', 'view')) return null

  return <div>Users page content...</div>
}
```

---

## 🧪 Test Senaryoları

### 1. Yönetici Testi
```bash
# Login as admin
POST /api/auth/login
{ "email": "admin@example.com", "password": "..." }

# Check permissions
GET /api/permissions/me
# Beklenen: is_admin: true

# Try creating a job
POST /api/jobs
# Beklenen: ✅ Success

# Try deleting a user
DELETE /api/users/{id}
# Beklenen: ✅ Success
```

### 2. Müşteri Temsilcisi Testi
```bash
# Login as customer rep
POST /api/auth/login
{ "email": "rep@example.com", "password": "..." }

# Try creating a job
POST /api/jobs
# Beklenen: ✅ Success (can_create: true)

# Try deleting a job
DELETE /api/jobs/{id}
# Beklenen: ❌ 403 Forbidden (can_delete: false)

# Try viewing users
GET /api/users
# Beklenen: ❌ 403 Forbidden (no permission)
```

### 3. Operatör Testi
```bash
# Login as operator
POST /api/auth/login
{ "email": "operator@example.com", "password": "..." }

# Try viewing jobs
GET /api/jobs
# Beklenen: ✅ Success

# Try creating a customer
POST /api/customers
# Beklenen: ❌ 403 Forbidden (no permission)

# Check process permissions
GET /api/permissions/me
# Beklenen: processes array with all processes
```

---

## 📊 Permission Matrix

| Rol | Jobs | Customers | Files | Machines | Users | Roles | Dashboard |
|-----|------|-----------|-------|----------|-------|-------|-----------|
| **Yönetici** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| **Müş. Tem.** | CRU | CRU | CRU | - | - | - | R |
| **Tasarımcı** | RU | R | CRUD | - | - | - | R |
| **Keşifçi** | RU | R | CR | - | - | - | R |
| **Operatör** | RU | - | - | R | - | - | R |
| **Lamineci** | RU | - | - | R | - | - | R |
| **Depocu** | R | - | CR | - | - | - | R |
| **Satınalma** | R | R | - | - | - | - | R |

**Gösterim:**
- C = Create
- R = Read/View
- U = Update
- D = Delete
- \- = Yetki yok

---

## 🔄 Permission Güncelleme

### Database'den Manuel

```sql
-- Bir rol için yeni permission ekle
INSERT INTO role_permissions (role_id, resource, can_view, can_create, can_update, can_delete)
VALUES (
  (SELECT id FROM roles WHERE code = 'tasarimci'),
  'reports',
  TRUE, FALSE, FALSE, FALSE
);

-- Permission güncelle
UPDATE role_permissions
SET can_create = TRUE
WHERE role_id = (SELECT id FROM roles WHERE code = 'kesifci')
AND resource = 'jobs';
```

### Setup Script ile (Önerilen)

```bash
# Permission setup script'ini çalıştır
cd apps/api
python setup_permissions.py

# Tüm roller için default permissions oluşturur/günceller
```

---

## 🚨 Troubleshooting

### Problem: 403 Forbidden hatası

**Çözüm:**
```bash
# 1. Kullanıcının rolünü kontrol et
GET /api/permissions/me

# 2. Role permission var mı kontrol et
SELECT * FROM role_permissions
WHERE role_id = 'user-role-id'
AND resource = 'jobs';

# 3. User-role ilişkisi var mı?
SELECT * FROM user_roles
WHERE user_id = 'user-id';
```

### Problem: is_admin: false ama admin olmalı

**Çözüm:**
```sql
-- users.role alanını kontrol et (legacy)
SELECT id, email, role FROM users WHERE id = 'user-id';

-- user_roles tablosunu kontrol et (yeni sistem)
SELECT r.code FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'user-id';
```

### Problem: Permission çalışmıyor

**Kontrol listesi:**
1. ✅ Token geçerli mi? (`@token_required`)
2. ✅ `permission_required` decorator import edilmiş mi?
3. ✅ Resource adı doğru mu? (`'jobs'` vs `'job'`)
4. ✅ Action doğru mu? (`'view'` vs `'read'`)
5. ✅ Database'de permission var mı?

---

## 📚 İlgili Dökümanlar

- [setup_permissions.py](apps/api/setup_permissions.py) - Permission setup script
- [auth_middleware.py](apps/api/app/middleware/auth_middleware.py) - Middleware implementasyonu
- [permissions.py](apps/api/app/routes/permissions.py) - Permissions API

---

**Son güncelleme:** 2025-10-11
