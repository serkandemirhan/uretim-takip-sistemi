# Environment Setup - Dev ve PreProd Profilleri

Bu proje artık iki farklı ortam profilini destekliyor:

## 🔧 Dev Profile (Local Development)

**Ne içerir:**
- PostgreSQL (local)
- MinIO (local file storage)
- Redis (opsiyonel, gelecek kullanım için)

**Kullanım:**

```bash
# 1. Dev ortamını başlat
docker-compose --profile dev up -d

# 2. Backend'i dev config ile çalıştır
cd apps/api
cp ../../.env.dev .env
python -m flask run --port 5000

# 3. Frontend'i çalıştır
cd apps/web
npm run dev
```

**MinIO Console:** http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin123`

**Postgres:** localhost:5432
- Database: `reklam_db`
- User: `reklam_user`
- Password: `reklam_pass_123`

---

## 🚀 PreProd Profile (Production-like)

**Ne içerir:**
- PostgreSQL (local veya remote)
- Cloudflare R2 (production file storage)
- Redis yok (kaldırıldı)

**Kullanım:**

```bash
# 1. Cloudflare R2 kurulumu yap (bir kerelik)
# CLOUDFLARE_R2_SETUP.md dosyasını takip et

# 2. .env.preprod dosyasını düzenle
# R2 credentials'ları ekle

# 3. PreProd ortamını başlat (sadece PostgreSQL)
docker-compose --profile preprod up -d

# NOT: preprod profilinde MinIO/Redis çalışmaz!
# Sadece PostgreSQL başlar, storage için R2 kullanılır

# 4. Backend'i preprod config ile çalıştır
cd apps/api
cp ../../.env.preprod .env
python -m flask run --port 5000

# 5. Frontend'i çalıştır
cd apps/web
npm run dev
```

---

## 📋 Profile Karşılaştırması

| Özellik | Dev | PreProd | Production |
|---------|-----|---------|------------|
| Database | Local PostgreSQL | Local/Remote PostgreSQL | Supabase |
| File Storage | Local MinIO | Cloudflare R2 | Cloudflare R2 |
| Redis | Local (opsiyonel) | ❌ Yok | ❌ Yok |
| MinIO Console | ✅ http://localhost:9001 | ❌ Yok | ❌ Yok |
| HTTPS | ❌ | ✅ (R2) | ✅ |
| Use Case | Local geliştirme | R2 test | Live deployment |

---

## 🎯 Hangi Profili Kullanmalıyım?

### Dev Profile Kullan:
- ✅ Local'de kod yazarken
- ✅ Offline çalışırken
- ✅ MinIO console'da dosyaları görmek istiyorsan
- ✅ Hızlı iterasyon için

### PreProd Profile Kullan:
- ✅ Production'a deploy etmeden önce test ederken
- ✅ R2 entegrasyonunu test ederken
- ✅ Production-like ortamda hata ayıklarken
- ✅ Cloudflare R2'nin nasıl çalıştığını öğrenirken

---

## 🔄 Profil Değiştirme

### Dev → PreProd Geçiş:

```bash
# 1. Dev ortamını durdur
docker-compose --profile dev down

# 2. PreProd ortamını başlat
docker-compose --profile preprod up -d

# 3. .env dosyasını değiştir
cd apps/api
cp ../../.env.preprod .env

# 4. Backend'i yeniden başlat
# Flask veya Gunicorn'u restart et
```

### PreProd → Dev Geçiş:

```bash
# 1. PreProd'u durdur
docker-compose --profile preprod down

# 2. Dev'i başlat
docker-compose --profile dev up -d

# 3. .env dosyasını değiştir
cd apps/api
cp ../../.env.dev .env

# 4. Backend'i yeniden başlat
```

---

## 🛠️ Faydalı Komutlar

### Profil olmadan (sadece PostgreSQL):
```bash
docker-compose up -d
# Sadece postgres çalışır
```

### Dev profili ile (PostgreSQL + MinIO + Redis):
```bash
docker-compose --profile dev up -d
```

### Tüm servisleri durdur:
```bash
docker-compose --profile dev down
# veya
docker-compose --profile preprod down
```

### Logları izle:
```bash
docker-compose --profile dev logs -f
```

### Volume'ları da sil (dikkat! veri kaybı):
```bash
docker-compose --profile dev down -v
```

---

## 📝 Environment Variables

### Dev (.env.dev):
```env
MINIO_ENDPOINT=localhost:9000
MINIO_SECURE=false
```

### PreProd (.env.preprod):
```env
MINIO_ENDPOINT=YOUR-ACCOUNT-ID.r2.cloudflarestorage.com
MINIO_SECURE=true
```

**⚠️ Önemli:** `.env.preprod` dosyasındaki R2 credentials'ları git'e PUSH ETME!

---

## 🔐 Güvenlik

`.gitignore` dosyasına eklenmiş:
```
.env
.env.local
.env.dev
.env.preprod
.env.production
```

**Asla bu dosyaları commit etme!**

---

## ❓ Troubleshooting

### MinIO başlamıyor (Dev)
```bash
# Container'ı kontrol et
docker ps -a | grep minio

# Logları kontrol et
docker logs reklam-minio

# Profil belirtmeyi unutma
docker-compose --profile dev up -d
```

### R2'ye bağlanamıyor (PreProd)
1. `.env.preprod` dosyasındaki credentials doğru mu?
2. `MINIO_ENDPOINT` https:// içermiyor değil mi? (sadece hostname olmalı)
3. Cloudflare R2'de bucket oluşturulmuş mu?
4. API token'ın Read & Write yetkisi var mı?

### PostgreSQL bağlantı hatası
```bash
# PostgreSQL çalışıyor mu?
docker ps | grep postgres

# Bağlantıyı test et
psql -h localhost -U reklam_user -d reklam_db
```

---

## 🎓 Öğrenme Yolu

1. **Gün 1-7:** Dev profile ile geliştirme yap
2. **Gün 8:** Cloudflare R2 hesabı aç, bucket oluştur
3. **Gün 9:** PreProd profile ile R2'yi test et
4. **Gün 10+:** Production'a deploy et (Render/Vercel)

---

## 📚 İlgili Dökümanlar

- [CLOUDFLARE_R2_SETUP.md](CLOUDFLARE_R2_SETUP.md) - R2 kurulum rehberi
- [docker-compose.yml](docker-compose.yml) - Profile tanımları
- [.env.dev](.env.dev) - Dev environment değişkenleri
- [.env.preprod](.env.preprod) - PreProd environment değişkenleri
