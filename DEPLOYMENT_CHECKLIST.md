# 🚀 Production Deployment Checklist

Bu checklist projeyi production'a deploy etmek için tüm adımları içerir.

---

## ✅ 1. Supabase Database Setup

### Adımlar:
- [ ] Supabase hesabı oluştur: https://supabase.com/
- [ ] Yeni proje oluştur (Region: Europe West - Frankfurt)
- [ ] Database password'ü güvenli bir yerde sakla
- [ ] Connection string'i al (Settings > Database > Connection String)
- [ ] Database schema'yı import et

### Schema Import:

**Yöntem A: SQL Editor ile (Kolay)**
```bash
# 1. supabase_schema.sql dosyasını aç
# 2. Supabase Dashboard > SQL Editor
# 3. İçeriği kopyala yapıştır ve RUN tıkla
```

**Yöntem B: psql ile**
```bash
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" < supabase_schema.sql
```

### Test:
```bash
# Bağlantıyı test et
psql "your-supabase-connection-string"
postgres=> \dt  # Tabloları listele (14 tablo olmalı)
```

📖 Detaylı rehber: [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

---

## ✅ 2. Cloudflare R2 Storage Setup

### Adımlar:
- [ ] Cloudflare hesabı oluştur: https://dash.cloudflare.com/
- [ ] R2'yi aktif et (kredi kartı gerekebilir, ama 10GB'a kadar ücretsiz)
- [ ] Bucket oluştur: `reklampro-files`
- [ ] R2 API Token oluştur (Object Read & Write izni)
- [ ] Access Key ID, Secret Key, Endpoint'i kaydet

### R2 Token Oluştur:
```
1. R2 Dashboard > Manage R2 API Tokens
2. Create API Token
3. Token type: R2 Token
4. Permissions: Object Read & Write
5. Apply to: reklampro-files bucket
6. ⚠️ Bilgileri HEMEN kaydet!
```

### Test:
```python
import boto3
s3 = boto3.client(
    's3',
    endpoint_url='https://[ACCOUNT-ID].r2.cloudflarestorage.com',
    aws_access_key_id='[ACCESS-KEY]',
    aws_secret_access_key='[SECRET-KEY]',
)
s3.list_buckets()  # Bucket'ı görmeli
```

📖 Detaylı rehber: [CLOUDFLARE_R2_SETUP.md](CLOUDFLARE_R2_SETUP.md)

---

## ✅ 3. Environment Variables

### .env.production Oluştur:
```bash
# 1. Template'i kopyala
cp .env.production.template .env.production

# 2. Değerleri doldur
nano .env.production
```

### Gerekli Değerler:

**Database (Supabase):**
```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@...
```

**Storage (Cloudflare R2):**
```env
MINIO_ENDPOINT=[ACCOUNT-ID].r2.cloudflarestorage.com
MINIO_ACCESS_KEY=[ACCESS-KEY-ID]
MINIO_SECRET_KEY=[SECRET-ACCESS-KEY]
```

**JWT Secret (Güvenli oluştur!):**
```bash
# Secret oluştur
openssl rand -hex 32
# veya
python3 -c "import secrets; print(secrets.token_hex(32))"

# .env.production'a ekle
JWT_SECRET_KEY=[GENERATED-SECRET]
```

### ⚠️ GÜVENLİK:
- [ ] `.env.production` dosyasını **ASLA** git'e commit etme!
- [ ] `.gitignore` dosyasında olduğunu kontrol et
- [ ] Güvenli bir password manager'da sakla

---

## ✅ 4. Backend Deployment (Render.com - Önerilen)

### Hazırlık:
- [ ] GitHub'a push yap (`.env.production` hariç!)
- [ ] Render.com hesabı oluştur: https://render.com/

### Render Setup:
1. **New Web Service** tıkla
2. **Connect GitHub repository** (ReklamPRO)
3. Ayarlar:

```yaml
Name: reklampro-api
Region: Frankfurt (EU Central)
Branch: main
Root Directory: apps/api
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT
Plan: Free (750 saat/ay)
```

4. **Environment Variables** ekle:
   - DATABASE_URL
   - MINIO_ENDPOINT
   - MINIO_ACCESS_KEY
   - MINIO_SECRET_KEY
   - MINIO_BUCKET
   - MINIO_SECURE=true
   - JWT_SECRET_KEY
   - FLASK_ENV=production

5. **Create Web Service** tıkla
6. ⏳ Deploy bitmesini bekle (~5 dakika)

### Test:
```bash
# API URL'i test et
curl https://reklampro-api.onrender.com/health

# Veya tarayıcıda aç
```

---

## ✅ 5. Frontend Deployment (Vercel - Önerilen)

### Hazırlık:
- [ ] Vercel hesabı oluştur: https://vercel.com/
- [ ] GitHub ile bağlan

### Vercel Setup:
1. **Add New Project** tıkla
2. **Import Git Repository** (ReklamPRO)
3. Ayarlar:

```yaml
Framework Preset: Next.js
Root Directory: apps/web
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

4. **Environment Variables** ekle:
```env
NEXT_PUBLIC_API_URL=https://reklampro-api.onrender.com
```

5. **Deploy** tıkla
6. ⏳ Build bitmesini bekle (~2 dakika)

### Test:
```bash
# Frontend URL'i aç
https://reklampro.vercel.app
```

---

## ✅ 6. Final Testing

### Test Checklist:
- [ ] Frontend açılıyor mu?
- [ ] Login çalışıyor mu?
- [ ] API'ye bağlanıyor mu?
- [ ] Database'den veri çekiliyor mu?
- [ ] Dosya yükleme çalışıyor mu? (R2'ye)
- [ ] Tüm CRUD işlemleri çalışıyor mu?

### Debug:
```bash
# Render logs
# Render Dashboard > reklampro-api > Logs

# Vercel logs
# Vercel Dashboard > reklampro > Deployments > Latest > Logs

# Supabase logs
# Supabase Dashboard > Logs
```

---

## ✅ 7. Domain & SSL (Opsiyonel)

### Custom Domain Ekle:

**Frontend (Vercel):**
1. Vercel Dashboard > Settings > Domains
2. Custom domain ekle: `www.reklampro.com`
3. DNS ayarları yap (Vercel'in talimatlarını takip et)
4. SSL otomatik aktif olur ✅

**Backend (Render):**
1. Render Dashboard > Settings > Custom Domain
2. API domain ekle: `api.reklampro.com`
3. DNS ayarları yap
4. SSL otomatik aktif olur ✅

---

## ✅ 8. Monitoring & Maintenance

### Monitoring:
- [ ] Render dashboard'u kontrol et (uptime, errors)
- [ ] Vercel analytics aktif et
- [ ] Supabase dashboard'u kontrol et (database size, queries)
- [ ] Cloudflare R2 usage kontrol et (storage)

### Backups:
```bash
# Manuel database backup (haftalık önerilen)
pg_dump "[SUPABASE-CONNECTION-STRING]" > backup_$(date +%Y%m%d).sql

# Supabase otomatik backup: 7 gün (ücretsiz planda)
```

### Cost Monitoring:
- Render: 750 saat/ay ücretsiz (sonra $7/ay)
- Vercel: Sınırsız ücretsiz
- Supabase: 500 MB ücretsiz (sonra $25/ay)
- Cloudflare R2: 10 GB ücretsiz (sonra $0.015/GB/ay)

**Tahmini maliyet ilk 6 ay:** $0 🎉

---

## 📋 Quick Reference

### Production URLs:
```
Frontend:  https://reklampro.vercel.app
Backend:   https://reklampro-api.onrender.com
Database:  Supabase (aws-0-eu-central-1.pooler.supabase.com)
Storage:   Cloudflare R2
```

### Environment Profiles:
```bash
# Dev (local MinIO + Redis)
docker-compose --profile dev up -d

# PreProd (local DB + R2)
docker-compose --profile preprod up -d

# Production (Supabase + R2)
# .env.production kullan
```

### Useful Commands:
```bash
# Database schema export
cd apps/api
source venv/bin/activate
python export_schema.py

# Database backup
pg_dump "[SUPABASE-URL]" > backup.sql

# Database restore
psql "[SUPABASE-URL]" < backup.sql
```

---

## 🎉 Tebrikler!

Projeniz production'da! 🚀

### Sonraki Adımlar:
- [ ] SSL/HTTPS aktif mi kontrol et
- [ ] SEO ayarları yap
- [ ] Analytics ekle (Google Analytics, Vercel Analytics)
- [ ] Error tracking ekle (Sentry)
- [ ] CI/CD pipeline kur (GitHub Actions)
- [ ] Kullanıcı testleri yap
- [ ] İlk gerçek müşterini ekle! 🎊

---

## 📚 Dokümantasyon

- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Dev/PreProd/Prod ortamları
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Database kurulumu
- [CLOUDFLARE_R2_SETUP.md](CLOUDFLARE_R2_SETUP.md) - Storage kurulumu
- [README.md](README.md) - Proje genel bakış

---

**Son güncelleme:** 2025-10-11
