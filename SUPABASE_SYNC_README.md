# Supabase Senkronizasyon Rehberi

Bu rehber, local PostgreSQL veritabanınızı Supabase'e senkronize etmeniz için gerekli adımları içerir.

## Gereksinimler

- PostgreSQL client tools (`psql`, `pg_dump`)
- Python 3
- Local PostgreSQL veritabanı çalışıyor olmalı
- Supabase projesi oluşturulmuş olmalı

## Hızlı Başlangıç

### 1. Supabase Bağlantı Bilgilerini Alın

Supabase Dashboard'dan:
1. Projenize girin
2. **Settings** > **Database** sayfasına gidin
3. **Connection String** bölümünden bilgileri alın:
   - Host (örn: `db.abcdefghijklm.supabase.co`)
   - Database: `postgres`
   - User: `postgres`
   - Password: [sizin şifreniz]
   - Port: `5432`

### 2. Environment Variables Tanımlayın

```bash
export SUPABASE_HOST="db.xxxxx.supabase.co"
export SUPABASE_PASS="your_super_secret_password"
export SUPABASE_USER="postgres"
export SUPABASE_DB="postgres"
```

veya `.env` dosyası oluşturun:

```bash
cp .env.supabase.example .env.supabase
# .env.supabase dosyasını düzenleyin
source .env.supabase
```

### 3. Sync Script'i Çalıştırın

```bash
./sync_to_supabase.sh
```

## Script Ne Yapar?

1. **Local şemayı dışa aktarır**: Mevcut PostgreSQL şemanızı SQL formatında kaydeder
2. **Supabase mevcut şemayı alır**: Hedef veritabanındaki mevcut yapıyı kontrol eder
3. **Farkları analiz eder**: Eksik tabloları ve kolonları tespit eder
4. **Migration dosyaları oluşturur**:
   - `migration.sql` - Sadece eksikleri ekler (önerilen)
   - `full_migration.sql` - Tüm şemayı sıfırdan oluşturur

## Çıktı Dosyaları

Script çalıştığında `supabase_sync_YYYYMMDD_HHMMSS/` klasörü oluşturur:

```
supabase_sync_20250119_120000/
├── schema.sql                    # Local şema (kaynak)
├── supabase_current_schema.sql   # Supabase mevcut şema
├── migration.sql                 # İnkremental migration (ÖNERİLEN)
├── full_migration.sql            # Tam migration
└── diff_report.txt               # Özet rapor
```

## Migration'ı Uygulama

### Seçenek 1: İnkremental (Önerilen)

Sadece eksik tabloları ve kolonları ekler. Mevcut veriler korunur.

```bash
PGPASSWORD="$SUPABASE_PASS" psql \
  -h "$SUPABASE_HOST" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -f "supabase_sync_YYYYMMDD_HHMMSS/migration.sql"
```

### Seçenek 2: Tam Yükleme

**⚠️ UYARI**: Mevcut tüm tablolar silinir ve yeniden oluşturulur!

```bash
PGPASSWORD="$SUPABASE_PASS" psql \
  -h "$SUPABASE_HOST" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -f "supabase_sync_YYYYMMDD_HHMMSS/full_migration.sql"
```

### Seçenek 3: Manuel Kontrol

```bash
# Migration dosyasını inceleyin
cat supabase_sync_YYYYMMDD_HHMMSS/migration.sql

# Supabase'e bağlanın ve manuel çalıştırın
psql -h "$SUPABASE_HOST" -U "$SUPABASE_USER" -d "$SUPABASE_DB"
```

## Migration Sonrası

### 1. Veritabanı Bağlantısını Test Edin

```bash
PGPASSWORD="$SUPABASE_PASS" psql \
  -h "$SUPABASE_HOST" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -c "\dt"
```

### 2. Frontend .env.local Güncelleyin

`apps/web/.env.local`:

```env
# Supabase bağlantısı
NEXT_PUBLIC_API_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Backend .env Güncelleyin

`apps/api/.env`:

```env
# Supabase PostgreSQL
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
```

## Önemli Notlar

### Güvenlik
- ⚠️ Supabase şifrenizi asla git'e commit etmeyin
- `.env.supabase` dosyasını `.gitignore`'a ekleyin
- Production'da environment variables kullanın

### Yedekleme
```bash
# Migration öncesi yedek alın
PGPASSWORD="$SUPABASE_PASS" pg_dump \
  -h "$SUPABASE_HOST" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -f "backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Test
- Önce test/development ortamında deneyin
- Production'a geçmeden önce tüm fonksiyonları test edin
- Migration sonrası API endpoint'lerini test edin

## Sorun Giderme

### Bağlantı Hatası
```bash
# Supabase'e bağlantıyı test edin
psql -h "$SUPABASE_HOST" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -c "SELECT version();"
```

### Extension Hataları
Bazı extension'lar Supabase'de varsayılan olarak kurulu değildir. Supabase Dashboard'dan:
1. **Database** > **Extensions**
2. Gerekli extension'ları aktifleştirin (`uuid-ossp`, `pgcrypto`)

### Permission Hataları
Supabase'de RLS (Row Level Security) aktifse:
1. **Database** > **Tables**
2. İlgili tablolara gidin
3. **RLS**'yi gerektiği gibi yapılandırın

## Otomatik Senkronizasyon

Düzenli senkronizasyon için cron job ekleyin:

```bash
# Crontab'ı düzenleyin
crontab -e

# Her gün saat 02:00'da çalıştır
0 2 * * * cd /path/to/ReklamPRO && source .env.supabase && ./sync_to_supabase.sh
```

## Yardım

Script hakkında daha fazla bilgi:

```bash
./sync_to_supabase.sh --help
```

Sorunlarınız için:
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
