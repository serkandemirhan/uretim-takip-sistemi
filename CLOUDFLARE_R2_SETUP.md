# Cloudflare R2 Kurulum Rehberi

Bu proje artık ücretsiz Cloudflare R2 object storage kullanıyor (MinIO yerine).

## Cloudflare R2 Nedir?

Cloudflare R2, AWS S3 ile uyumlu bir object storage servisidir. En büyük avantajı:
- ✅ **10 GB ücretsiz storage**
- ✅ **Sınırsız ücretsiz egress** (indirme ücretsiz!)
- ✅ **S3-compatible API** (boto3 ile çalışır)

## Kurulum Adımları

### 1. Cloudflare Hesabı Oluştur

1. https://dash.cloudflare.com/ adresine git
2. Ücretsiz hesap oluştur
3. E-posta doğrulaması yap

### 2. R2 Aktif Et

1. Dashboard'da sol menüden **R2** seç
2. **Begin setup** butonuna tıkla
3. Kredi kartı ekle (ücretsiz kullanım için gerekli, ama 10GB'a kadar ücret yok)

### 3. Bucket Oluştur

1. **Create bucket** butonuna tıkla
2. Bucket adı gir: `reklampro-files` (veya istediğin isim)
3. Location seç (örn: Automatic)
4. **Create bucket** ile oluştur

### 4. API Token Al

1. **R2** sayfasında sağ üstten **Manage R2 API Tokens** tıkla
2. **Create API token** butonuna tıkla
3. Token izinleri:
   - **Object Read & Write** seç
   - Sadece `reklampro-files` bucket'ı için kısıtla (opsiyonel)
4. **Create API token** tıkla
5. ⚠️ **Şimdi kaydet! Bir daha göremezsin:**
   - Access Key ID 0024ddcaa483cc29bcd2b96ec0bdf5aa
   - Secret Access Key 76c76683564f8e2adf8ae96e198537d533d3dd919518fe1751b5fd68f80fdb40
   - Endpoint URL (örn: `https://<account-id>.r2.cloudflarestorage.com`)
   https://07c26a9deccd2564ee5db3cc0e062a60.r2.cloudflarestorage.com



### 5. Environment Variables Ayarla

Production ortamında (Render, Railway, vs.) şu env variable'ları ekle:

```bash
# Cloudflare R2 Settings
MINIO_ENDPOINT=https://07c26a9deccd2564ee5db3cc0e062a60.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=<your-access-key-id>
MINIO_SECRET_KEY=<your-secret-access-key>
MINIO_BUCKET=reklampro-files
MINIO_SECURE=true
MINIO_VERIFY_SSL=true
```

**Önemli:**
- `MINIO_ENDPOINT` sadece hostname olmalı (https:// ekleme!)
- Örnek: `abc123def456.r2.cloudflarestorage.com`

### 6. Local Development

Local'de test için MinIO kullanmaya devam edebilirsin:

```bash
# .env dosyasında
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=reklampro-files
MINIO_SECURE=false
```

MinIO'yu local'de çalıştır:
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  minio/minio server /data --console-address ":9001"
```

## Fiyatlandırma (2025)

**Ücretsiz Tier:**
- 10 GB storage
- 1M Class A operations/month (write, list)
- 10M Class B operations/month (read)

**Ücretli (eğer aşarsan):**
- Storage: $0.015/GB/month (AWS'den 10x ucuz!)
- Class A: $4.50 per million operations
- Class B: $0.36 per million operations
- **Egress: $0** (AWS'de pahalı olan kısım!)

## Troubleshooting

### Bağlantı Hatası

```python
botocore.exceptions.EndpointConnectionError
```

**Çözüm:** `MINIO_ENDPOINT`'te `https://` veya trailing slash olmadığından emin ol.

### Access Denied

```python
botocore.exceptions.ClientError: An error occurred (AccessDenied)
```

**Çözüm:**
1. Access Key/Secret Key doğru mu kontrol et
2. Bucket adı doğru mu kontrol et
3. API token'ın Read & Write yetkisi var mı kontrol et

### Bucket Not Found

```python
botocore.exceptions.ClientError: An error occurred (NoSuchBucket)
```

**Çözüm:**
1. Cloudflare dashboard'da bucket'ı oluştur
2. Bucket adı `MINIO_BUCKET` ile aynı olmalı

## Avantajlar

✅ **Ücretsiz:** 10GB storage, sınırsız indirme
✅ **Hızlı:** Cloudflare CDN altyapısı
✅ **Kolay geçiş:** S3-compatible, kod değişikliği minimal
✅ **Deployment kolaylığı:** MinIO container'a gerek yok

## Migration Checklist

- [x] Config.py güncellendi
- [x] docker-compose.yml'den MinIO kaldırıldı
- [x] S3 client R2 için hazır
- [ ] Cloudflare R2 bucket oluştur
- [ ] API token al
- [ ] Production env variables ayarla
- [ ] Test yüklemesi yap

## Yararlı Linkler

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 vs S3 Comparison](https://www.cloudflare.com/products/r2/)
