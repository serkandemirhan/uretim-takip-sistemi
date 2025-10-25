# Supabase Migration - 2 Parts (Fixes Transaction Issues)

## 🔧 Problem Çözümü

Tek bir transaction içinde view'lar yeni kolonları göremiyordu. Bu yüzden migration'ı 2 parçaya böldük.

## 📝 Adım Adım Kurulum

### ADIM 1: Tabloları ve Kolonları Oluştur

1. Supabase Dashboard → SQL Editor → New Query
2. `supabase_migration_part1.sql` dosyasını aç
3. İçeriğini kopyala ve SQL Editor'a yapıştır
4. **RUN** butonuna tıkla
5. ✅ Başarılı mesajı görmeli ve en altta kolonları doğrulama sorgusu çalışmalı

**Beklenen Çıktı:**
```
column_name          | data_type
---------------------|----------
reserved_quantity    | numeric
on_order_quantity    | numeric
```

### ADIM 2: Function, Trigger, View ve Policy Oluştur

1. **BEKLE!** Sayfayı yenile veya 10 saniye bekle (kolonların commit edilmesi için)
2. SQL Editor → New Query
3. `supabase_migration_part2.sql` dosyasını aç
4. İçeriğini kopyala ve SQL Editor'a yapıştır
5. **RUN** butonuna tıkla
6. ✅ En altta doğrulama sorgusu çalışmalı

**Beklenen Çıktı:**
```
object_type | count
------------|------
Tables      | 1
Views       | 4
Functions   | 2
Triggers    | 2
```

## ✅ Doğrulama

Her iki migration da başarılıysa şu sorguları çalıştır:

```sql
-- 1. Tablo var mı?
SELECT COUNT(*) FROM stock_reservations;
-- Beklenen: 0 (henüz veri yok)

-- 2. Kolonlar var mı?
SELECT reserved_quantity, on_order_quantity
FROM stocks
LIMIT 1;
-- Beklenen: 0.000, 0.000

-- 3. View çalışıyor mu?
SELECT * FROM stock_availability_summary LIMIT 5;
-- Beklenen: Stok listesi

-- 4. Trigger var mı?
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'stock_reservations'::regclass;
-- Beklenen: trigger_update_stock_reserved_quantity
```

## 🎯 Ne Eklendi?

### Part 1 (Tablolar)
- ✅ `stock_reservations` tablosu
- ✅ `stocks.reserved_quantity` kolonu
- ✅ `stocks.on_order_quantity` kolonu
- ✅ `stock_movements.reservation_id` kolonu
- ✅ `stock_movements.job_id` kolonu
- ✅ `purchase_requests.title` kolonu
- ✅ `purchase_requests.description` kolonu
- ✅ RLS aktif edildi

### Part 2 (Fonksiyonlar ve View'lar)
- ✅ 2 adet trigger function
- ✅ 2 adet trigger
- ✅ 4 adet view (raporlama için)
- ✅ 4 adet RLS policy

## ❌ Sorun Giderme

### Hata: "column already exists"
```sql
-- Önce mevcut kolonu sil
ALTER TABLE stocks DROP COLUMN IF EXISTS reserved_quantity;
ALTER TABLE stocks DROP COLUMN IF EXISTS on_order_quantity;
-- Sonra Part 1'i tekrar çalıştır
```

### Hata: "relation already exists"
```sql
-- Tabloyu sil
DROP TABLE IF EXISTS stock_reservations CASCADE;
-- Sonra Part 1'i tekrar çalıştır
```

### Hata: "view already exists"
```sql
-- View'ları sil
DROP VIEW IF EXISTS stock_availability_summary CASCADE;
DROP VIEW IF EXISTS upcoming_material_needs CASCADE;
DROP VIEW IF EXISTS job_material_usage_summary CASCADE;
DROP VIEW IF EXISTS critical_stock_alerts CASCADE;
-- Sonra Part 2'yi tekrar çalıştır
```

## 🔄 Tam Rollback (Her Şeyi Sil)

```sql
BEGIN;
DROP VIEW IF EXISTS critical_stock_alerts CASCADE;
DROP VIEW IF EXISTS job_material_usage_summary CASCADE;
DROP VIEW IF EXISTS upcoming_material_needs CASCADE;
DROP VIEW IF EXISTS stock_availability_summary CASCADE;
DROP TRIGGER IF EXISTS trigger_update_reservation_used_quantity ON stock_movements;
DROP TRIGGER IF EXISTS trigger_update_stock_reserved_quantity ON stock_reservations;
DROP FUNCTION IF EXISTS update_reservation_used_quantity();
DROP FUNCTION IF EXISTS update_stock_reserved_quantity();
ALTER TABLE stock_movements DROP COLUMN IF EXISTS reservation_id;
ALTER TABLE stock_movements DROP COLUMN IF EXISTS job_id;
ALTER TABLE stocks DROP COLUMN IF EXISTS reserved_quantity;
ALTER TABLE stocks DROP COLUMN IF EXISTS on_order_quantity;
DROP TABLE IF EXISTS stock_reservations CASCADE;
COMMIT;
```

## 📚 Sonraki Adımlar

Migration başarılıysa:
1. Frontend'i test et: `npm run dev`
2. API'yi test et: `/api/stock-reservations`
3. Proje yöneticisi olarak giriş yap
4. Bir job oluştur ve malzeme rezerve et
5. Satın almacı ekranını kontrol et: `/purchasing/needs-analysis`
6. Depocu ekranını kontrol et: `/warehouse/job-material-issue`

## 🎉 Başarı!

Her iki migration da hatasız çalıştıysa sistem hazır!

- Proje yöneticileri malzeme rezerve edebilir
- Satın almacılar ihtiyaç analizi yapabilir
- Depocular mal çıkışı yapabilir
- Sistem otomatik olarak miktarları güncelleyecektir

---

**Oluşturulma Tarihi:** 25 Ekim 2025
**Gerekli Dosyalar:** `supabase_migration_part1.sql`, `supabase_migration_part2.sql`
