# Supabase Sync - Hızlı Başlangıç

## 1. Supabase Projesi Oluşturun

1. https://supabase.com adresine gidin
2. Yeni proje oluşturun
3. Database şifrenizi kaydedin

## 2. Bağlantı Bilgilerini Yapılandırın

```bash
# .env.supabase dosyasını oluşturun
cp .env.supabase.example .env.supabase

# Düzenleyin ve Supabase bilgilerinizi ekleyin
nano .env.supabase
```

**Gerekli bilgiler:**
- `SUPABASE_HOST`: Supabase Dashboard > Settings > Database > Host
- `SUPABASE_PASS`: Proje oluştururken belirlediğiniz şifre

## 3. Sync'i Çalıştırın

```bash
# Environment variables'ı yükle
source .env.supabase

# Sync script'ini çalıştır
./sync_to_supabase.sh
```

## 4. Migration'ı Uygulayın

Script çalıştıktan sonra çıktı klasöründe migration dosyaları oluşur:

```bash
# Örnek çıktı klasörü
cd supabase_sync_20250119_120000/

# Migration'ı Supabase'e yükle (İnkremental - Önerilen)
PGPASSWORD="$SUPABASE_PASS" psql \
  -h "$SUPABASE_HOST" \
  -U postgres \
  -d postgres \
  -f migration.sql
```

## 5. Bağlantıyı Test Edin

```bash
# Supabase'e bağlanın ve tabloları listeleyin
PGPASSWORD="$SUPABASE_PASS" psql \
  -h "$SUPABASE_HOST" \
  -U postgres \
  -d postgres \
  -c "\dt"
```

## Tek Komut (Hepsi Bir Arada)

```bash
# Tüm süreci tek komutla çalıştırın
source .env.supabase && \
./sync_to_supabase.sh && \
LATEST_DIR=$(ls -td supabase_sync_*/ | head -1) && \
PGPASSWORD="$SUPABASE_PASS" psql \
  -h "$SUPABASE_HOST" \
  -U postgres \
  -d postgres \
  -f "${LATEST_DIR}migration.sql"
```

## Sorun mu var?

Detaylı rehber için: [SUPABASE_SYNC_README.md](SUPABASE_SYNC_README.md)

## Önemli Uyarılar

⚠️ **Migration öncesi yedek alın!**
⚠️ **Önce test ortamında deneyin!**
⚠️ **Production'da dikkatli olun!**

## Sonraki Adımlar

Migration başarılıysa:

1. Backend .env güncelleyin (`apps/api/.env`):
```env
DB_HOST=db.xxxxx.supabase.co
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
```

2. Frontend .env.local güncelleyin (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=your_api_url
```

3. Uygulamayı yeniden başlatın ve test edin
