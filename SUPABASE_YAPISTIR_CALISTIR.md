# 🚀 Supabase'e Hızlı Yükleme

Tek SQL dosyası ile tüm veritabanı şemanızı Supabase'e yükleyin!

## Adım 1: Supabase SQL Editor'ü Açın

1. https://app.supabase.com/ adresine gidin
2. Projenizi seçin
3. Sol menüden **SQL Editor** seçeneğine tıklayın
4. **+ New Query** butonuna tıklayın

## Adım 2: SQL Dosyasını Kopyalayın

```bash
# Dosya konumu:
supabase_ready_schema.sql
```

1. Bu dosyayı bir text editör ile açın
2. **Tüm içeriği kopyalayın** (Ctrl+A, Ctrl+C veya Cmd+A, Cmd+C)

## Adım 3: Supabase'e Yapıştırın ve Çalıştırın

1. Supabase SQL Editor'de **boş query alanına yapıştırın**
2. Sağ alt köşedeki **RUN** (veya Ctrl+Enter / Cmd+Enter) butonuna tıklayın
3. Bekleyin... ⏳

## ✅ Başarılı!

Script çalıştıktan sonra:

```sql
-- Tabloları kontrol edin
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## 📊 Oluşturulan Tablolar

Bu script **32 tablo** oluşturur:

### 👤 Kullanıcı Yönetimi
- users (kullanıcılar)
- roles (roller)
- user_roles (kullanıcı-rol ilişkisi)
- role_permissions (rol izinleri)
- role_process_permissions (rol-süreç izinleri)

### 👥 Müşteri Yönetimi
- customers (müşteriler)
- customer_dealers (müşteri bayileri)

### 🔄 İş Yönetimi
- jobs (işler)
- job_steps (iş adımları) - **requirements alanı dahil!** ⭐
- job_step_notes (iş adım notları)

### ⚙️ Süreç Yönetimi
- processes (süreçler)
- process_groups (süreç grupları)
- machines (makineler)
- machine_processes (makine-süreç ilişkisi)

### 📦 Stok Yönetimi
- stocks (stok kartları)
- stock_movements (stok hareketleri)
- units (birimler)
- job_materials (iş-malzeme ilişkisi)

### 🛒 Satın Alma Yönetimi
- purchase_requests (satın alma talepleri)
- purchase_request_items (talep kalemleri)
- purchase_orders (satın alma siparişleri)
- purchase_order_items (sipariş kalemleri)
- purchase_request_purchase_orders (talep-sipariş ilişkisi)
- goods_receipts (mal kabul)
- goods_receipt_lines (mal kabul satırları)

### 💰 Teklif Yönetimi
- quotations (teklifler)
- quotation_items (teklif kalemleri)

### 📁 Diğer
- files (dosyalar)
- notifications (bildirimler)
- audit_logs (denetim kayıtları)
- currency_settings (döviz ayarları)

## ⚠️ Önemli Notlar

### Temiz Başlangıç mı İstiyorsunuz?

Eğer mevcut tabloları silip temizden başlamak isterseniz:

1. SQL dosyasını açın
2. En üstteki `DROP TABLE` satırlarının başındaki `/*` ve `*/` işaretlerini kaldırın
3. Tekrar çalıştırın

**UYARI**: Bu mevcut tüm verileri siler!

### Güvenlik

Script otomatik olarak şunları oluşturur:
- ✅ UUID extension
- ✅ pgcrypto extension (şifreleme için)
- ✅ Tüm gerekli indexler
- ✅ Foreign key constraint'ler
- ✅ Check constraint'ler

## 🔍 Doğrulama

Tablolar başarıyla oluşturulduysa:

```sql
-- Toplam tablo sayısı (32 olmalı)
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- job_steps tablosunda requirements kolonunu kontrol et
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'job_steps'
AND column_name = 'requirements';
```

## 🎯 Sonraki Adımlar

### 1. Backend .env Güncelleyin

`apps/api/.env`:

```env
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
```

### 2. Test Edin

```bash
# Backend'i test edin
cd apps/api
source venv/bin/activate
python app/main.py
```

### 3. Frontend'i Güncelleyin

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## ❓ Sorun mu Yaşıyorsunuz?

### Extension Hatası

```sql
-- Manuel olarak extension'ları aktifleştirin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Permission Hatası

Supabase Dashboard'dan:
1. **Settings** > **Database**
2. **Extensions** tabında gerekli extension'ları aktifleştirin

### RLS (Row Level Security) Hatası

İlk kurulumda RLS'yi devre dışı bırakabilirsiniz:

```sql
-- Tüm tablolar için RLS'yi devre dışı bırak
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END$$;
```

## 🎉 Tamamdır!

Artık Supabase veritabanınız ReklamPRO için hazır!

Sorularınız için: [SUPABASE_SYNC_README.md](SUPABASE_SYNC_README.md)
