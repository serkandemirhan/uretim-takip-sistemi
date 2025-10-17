# Supabase PostgreSQL Database Setup

Ücretsiz production-ready PostgreSQL database için Supabase kullanacağız.

## 🎯 Supabase Nedir?

- ✅ **Ücretsiz PostgreSQL** database (500 MB storage)
- ✅ **Otomatik yedekleme** (backups)
- ✅ **SSL bağlantı** (güvenli)
- ✅ **Connection pooling** (performans)
- ✅ **Database GUI** (Table Editor)
- ✅ **API otomatik oluşturulur** (bonus!)

---

## 📝 Adım Adım Kurulum

### 1. Supabase Hesabı Oluştur

1. https://supabase.com/ adresine git
2. **Start your project** butonuna tıkla
3. GitHub ile giriş yap (önerilen) veya email ile kayıt ol
4. Email doğrulaması yap

**Süre:** 2 dakika

---

### 2. Yeni Proje Oluştur

1. Dashboard'da **New Project** butonuna tıkla
2. Proje bilgilerini gir:

```
Project Name: ReklamPRO
Database Password: [GÜVENLİ BİR ŞİFRE OLUŞTUR - KAYDET!]
Region: Europe West (Frankfurt) - TR'ye en yakın
Pricing Plan: Free
```

1234Abm2044!!

3. **Create new project** butonuna tıkla
4. ⏳ Database hazırlanıyor... (~2 dakika bekle)

**⚠️ Önemli:** Database password'ü kaydet! Bir daha göremezsin.

---

### 3. Database Bağlantı Bilgilerini Al

Proje hazır olduğunda:

1. Sol menüden **Project Settings** (dişli ikonu) → **Database**
2. **Connection String** bölümüne git
3. **URI** sekmesini seç

**Şu bilgileri göreceksin:**

```
Connection string (URI):
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Connection pooling** için:
```
Host: aws-0-eu-central-1.pooler.supabase.com
Port: 5432
Database: postgres
User: postgres.qgfwskuyqrbalvhexecy
Password: [SENIN ŞİFREN] 2025Abm2044!!2044
```

**Direct connection** için (connection pooling olmadan):
```
Host: db.[PROJECT-REF].supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [5432
```

---

projectURL_https://qgfwskuyqrbalvhexecy.supabase.co
SPI KEY- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZndza3V5cXJiYWx2aGV4ZWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzE0NTEsImV4cCI6MjA3NTcwNzQ1MX0.okk14NAZYbflmy0j_rM6EnuWHC66aEaVf9tvfGzEBas

### 4. Bağlantıyı Test Et

**Seçenek A: psql ile test (önerilen)**

```bash
# Connection string'i kopyala (URI)
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Bağlandıysan:
postgres=> \dt  # Tabloları listele (henüz boş olacak)
postgres=> \q   # Çık
```

**Seçenek B: Python ile test**

```python
import psycopg2

conn = psycopg2.connect(
    host="aws-0-eu-central-1.pooler.supabase.com",
    port=6543,
    database="postgres",
    user="postgres.[PROJECT-REF]",
    password="[SENIN ŞİFREN]"
)
print("✅ Bağlantı başarılı!")
conn.close()
```

---

### 5. .env.production Dosyası Oluştur

Proje kök dizininde:

```bash
# Production Environment - Supabase + Cloudflare R2
# Kullanım: Production deployment için

# Supabase PostgreSQL
DATABASE_HOST=aws-0-eu-central-1.pooler.supabase.com
DATABASE_PORT=6543
DATABASE_NAME=postgres
DATABASE_USER=postgres.[PROJECT-REF]
DATABASE_PASSWORD=[SENIN ŞİFREN]

# Veya direkt DATABASE_URL kullan (daha kolay):
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# JWT
JWT_SECRET_KEY=[GÜVENLİ-BİR-SECRET-OLUŞTUR]
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Cloudflare R2
MINIO_ENDPOINT=[YOUR-ACCOUNT-ID].r2.cloudflarestorage.com
MINIO_ACCESS_KEY=[R2-ACCESS-KEY]
MINIO_SECRET_KEY=[R2-SECRET-KEY]
MINIO_BUCKET=reklampro-files
MINIO_SECURE=true
MINIO_VERIFY_SSL=true

# Flask
FLASK_ENV=production
FLASK_DEBUG=0
FLASK_PORT=5000
```

---

### 6. Database Schema'yı Oluştur

**Seçenek A: SQL Script ile (önerilen)**

```bash
# Eğer SQL migration dosyaları varsa:
cd apps/api
psql "[SUPABASE_CONNECTION_STRING]" < migrations/schema.sql
```

**Seçenek B: Supabase SQL Editor ile**

1. Supabase Dashboard → **SQL Editor**
2. SQL komutlarını yapıştır ve çalıştır
3. Veya Table Editor ile manuel tablo oluştur

**Seçenek C: Python uygulaman ile**

```bash
# Local'den Supabase'e bağlan
export DATABASE_URL="[SUPABASE_CONNECTION_STRING]"
python apps/api/create_tables.py  # Eğer böyle bir script varsa
```

---

### 7. Verileri Migrate Et (Opsiyonel)

Eğer local database'de veri varsa:

```bash
# Local'den export
pg_dump -h localhost -U reklam_user reklam_db > backup.sql

# Supabase'e import
psql "[SUPABASE_CONNECTION_STRING]" < backup.sql
```

---

## 🔒 Güvenlik Ayarları

### SSL Bağlantı (Zorunlu)

Supabase her zaman SSL gerektirir. Python'da:

```python
import psycopg2

conn = psycopg2.connect(
    DATABASE_URL,
    sslmode='require'  # Zorunlu!
)
```

### Connection Pooling vs Direct Connection

**Connection Pooling (Port 6543) - Önerilen:**
- ✅ Serverless ortamlar için (Vercel, Render, Lambda)
- ✅ Çok sayıda kısa bağlantı
- ✅ Otomatik connection yönetimi
- ❌ Transaction pooling mode (bazı SQL komutları çalışmaz)

**Direct Connection (Port 5432):**
- ✅ Tüm PostgreSQL özellikleri
- ✅ Long-running işlemler
- ❌ Connection limit: 60 (ücretsiz planda)

**Önerimiz:** Production'da **6543** (pooling) kullan.

---

## 📊 Database Yönetimi

### Supabase Table Editor

1. Dashboard → **Table Editor**
2. Tabloları görüntüle, düzenle
3. Filtreleme, sıralama
4. Yeni kayıt ekle

### SQL Editor

1. Dashboard → **SQL Editor**
2. SQL sorguları çalıştır
3. Kayıtlı query'ler oluştur

### Database Backups

1. Dashboard → **Project Settings** → **Database**
2. **Backups** sekmesi
3. Otomatik günlük yedekleme (ücretsiz planda 7 gün)
4. Manuel backup:
   ```bash
   pg_dump "[CONNECTION_STRING]" > backup_$(date +%Y%m%d).sql
   ```

---

## 💰 Ücretsiz Limitler

| Özellik | Ücretsiz Plan |
|---------|---------------|
| Database Size | 500 MB |
| Bandwidth | 5 GB/ay |
| Connections | 60 direct, 200 pooled |
| API Requests | 500,000/ay |
| Storage | 1 GB |
| Backups | 7 gün (otomatik) |

---

## 🚀 Production Deployment Checklist

- [ ] Supabase projesi oluşturuldu
- [ ] Database password güvenli bir yerde saklandı
- [ ] Connection string alındı
- [ ] Bağlantı test edildi
- [ ] Database schema oluşturuldu
- [ ] .env.production dosyası hazırlandı
- [ ] SSL bağlantı ayarlandı
- [ ] Connection pooling aktif (port 6543)
- [ ] İlk test verisi eklendi

---

## 🔧 Troubleshooting

### Bağlantı Hatası

```
could not connect to server
```

**Çözüm:**
1. Password doğru mu?
2. Host adı doğru mu? (`.pooler.supabase.com` var mı?)
3. Port doğru mu? (6543 pooling, 5432 direct)
4. SSL enabled mı? (`sslmode=require`)

### Too Many Connections

```
FATAL: remaining connection slots are reserved
```

**Çözüm:**
1. Connection pooling kullan (port 6543)
2. Bağlantıları düzgün kapat (`conn.close()`)
3. Connection pool ayarları yap

### Password Authentication Failed

```
FATAL: password authentication failed
```

**Çözüm:**
1. Dashboard'dan password'ü reset et
2. Yeni password'ü `.env.production`'a ekle
3. Tekrar dene

---

## 📚 Yararlı Linkler

- [Supabase Dashboard](https://app.supabase.com/)
- [Supabase Docs - Database](https://supabase.com/docs/guides/database)
- [Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## 🎓 Sonraki Adımlar

1. ✅ Database kuruldu
2. ⏭️ Backend deployment (Render.com)
3. ⏭️ Frontend deployment (Vercel)
4. ⏭️ Environment variables ayarla
5. ⏭️ Test et ve yayınla!

---

**🎉 Tebrikler! Ücretsiz production-ready PostgreSQL database'iniz hazır!**
