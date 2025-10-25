# Supabase Migration Instructions - Stock Reservations System

## 📋 Genel Bakış

Bu migration stock rezervasyon sistemini Supabase veritabanınıza ekler. Proje yöneticileri malzemeleri rezerve edebilir, satın almacılar ihtiyaç analizi yapabilir ve depocular malzeme çıkışı yapabilir.

## 🚀 Kurulum Adımları

### 1. GitHub'dan Son Değişiklikleri Çek

```bash
cd /Users/user/ReklamPRO
git pull origin main
```

### 2. Supabase SQL Editor'a Git

1. Supabase Dashboard'unuzu açın: https://app.supabase.com
2. Projenizi seçin
3. Sol menüden **SQL Editor** seçeneğine tıklayın
4. **New Query** butonuna tıklayın

### 3. Migration SQL'i Çalıştır

1. `supabase_stock_reservations_migration.sql` dosyasını açın
2. Tüm içeriği kopyalayın
3. Supabase SQL Editor'a yapıştırın
4. **Run** (Çalıştır) butonuna tıklayın

### 4. Migration'ın Başarılı Olduğunu Doğrula

SQL Editor'da şu sorguları çalıştırın:

```sql
-- 1. Tablo oluşturuldu mu?
SELECT COUNT(*) FROM stock_reservations;
-- Beklenen: 0 (henüz veri yok ama tablo var)

-- 2. View'lar çalışıyor mu?
SELECT * FROM stock_availability_summary LIMIT 5;

-- 3. Trigger'lar var mı?
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'stock_reservations'::regclass;
-- Beklenen: trigger_update_stock_reserved_quantity

-- 4. İndeksler oluşturuldu mu?
SELECT indexname
FROM pg_indexes
WHERE tablename = 'stock_reservations';
-- Beklenen: 6+ index
```

## 📊 Eklenen Tablolar ve Objeler

### Tablolar
- ✅ `stock_reservations` - Malzeme rezervasyonları (ana tablo)

### Yeni Kolonlar
- ✅ `stock_movements.reservation_id` - Rezervasyona link
- ✅ `stock_movements.job_id` - İşe link
- ✅ `stocks.reserved_quantity` - Rezerve miktar (otomatik)

### Views (Raporlama)
- ✅ `stock_availability_summary` - Stok kullanılabilirlik özeti
- ✅ `upcoming_material_needs` - Yaklaşan malzeme ihtiyaçları
- ✅ `job_material_usage_summary` - İş bazlı plan vs gerçek
- ✅ `critical_stock_alerts` - Kritik stok uyarıları

### Trigger'lar (Otomatik İşlemler)
- ✅ `update_stock_reserved_quantity()` - Rezerve miktarı otomatik hesapla
- ✅ `update_reservation_used_quantity()` - Kullanılan miktarı otomatik güncelle

### RLS Policies (Güvenlik)
- ✅ Read/Write politikaları authenticated kullanıcılar için

## 🔧 Backend Güncellemeleri

API endpoint'leri zaten hazır:

```
GET    /api/stock-reservations              - Tüm rezervasyonlar
GET    /api/stock-reservations/:id          - Tek rezervasyon
POST   /api/stock-reservations/bulk         - Toplu rezervasyon
PATCH  /api/stock-reservations/:id          - Güncelleme
POST   /api/stock-reservations/:id/cancel   - İptal
GET    /api/stock-reservations/job/:id      - İş rezervasyonları
GET    /api/stock-reservations/upcoming-needs - Yaklaşan ihtiyaçlar
```

## 🎨 Frontend Sayfaları

### 1. Proje Yöneticisi
**URL:** `/jobs/[id]/materials`

**Kullanım:**
1. İş detay sayfasında "Malzeme Rezervasyonları" butonuna tıkla
2. "Tüm Malzemeleri Rezerve Et" butonu ile toplu rezervasyon
3. Her malzeme için planlanan kullanım tarihini seç
4. Rezervasyonları iptal edebilir (henüz kullanılmamışsa)

### 2. Satın Almacı
**URL:** `/purchasing/needs-analysis`

**Kullanım:**
1. Sol menüden "İhtiyaç Analizi" seçeneğine tıkla
2. Eksik malzemeleri gör (kırmızı satırlar)
3. Filtreleme: arama, kategori, zaman aralığı
4. "Satın Al" butonu ile RFQ oluştur

### 3. Depocu
**URL:** `/warehouse/job-material-issue`

**Kullanım:**
1. Sol menüden "Mal Çıkışı" seçeneğine tıkla
2. Sol panelden aktif bir iş seç
3. Sağ panelde rezervasyonları gör
4. Miktar gir ve "Çıkart" butonu ile mal çıkışı yap
5. Hızlı butonlar: 25%, 50%, Tamamı

## 📈 Sistem Akışı

```
1. PROJE YÖNETİCİSİ
   └─> İş onaylar
   └─> Malzemeleri rezerve eder (tarih ile)
   └─> stock_reservations tablosuna kayıt

2. SATIN ALMACI
   └─> İhtiyaç Analizi sayfasını açar
   └─> Eksik malzemeleri görür
   └─> RFQ oluşturur
   └─> Sipariş verir → on_order_quantity artar

3. DEPOCU (Mal Gelişi)
   └─> Tedarikçiden mal gelir
   └─> Stock movements: IN
   └─> current_quantity artar

4. DEPOCU (Mal Çıkışı)
   └─> Mal Çıkışı sayfasını açar
   └─> İş seçer, rezervasyonları görür
   └─> Mal çıkışı yapar
   └─> stock_movements: OUT + reservation_id
   └─> Trigger otomatik çalışır:
       - used_quantity artar
       - Status güncellenir (partially_used / fully_used)
       - current_quantity azalır
```

## ⚠️ Önemli Notlar

### 1. Row Level Security (RLS)
Migration RLS politikalarını ekler. Eğer daha sıkı güvenlik istiyorsanız:

```sql
-- Sadece yöneticiler rezervasyon oluşturabilsin
DROP POLICY "Allow authenticated users to create reservations" ON stock_reservations;

CREATE POLICY "Only managers can create reservations"
ON stock_reservations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' IN ('yonetici', 'musteri_temsilcisi')
);
```

### 2. Mevcut Verileriniz
Bu migration mevcut verilerinizi etkilemez. Sadece yeni tablolar ve kolonlar ekler.

### 3. `available_quantity` Kolonu
Eğer `stocks` tablosunda `available_quantity` zaten generated column ise, migration otomatik olarak çalışır. Değilse, şu SQL'i ekleyin:

```sql
-- Eğer available_quantity regular bir kolunsa
ALTER TABLE stocks DROP COLUMN IF EXISTS available_quantity;

ALTER TABLE stocks ADD COLUMN available_quantity DECIMAL(15,3)
  GENERATED ALWAYS AS (current_quantity - COALESCE(reserved_quantity, 0)) STORED;
```

### 4. Test Verisi Oluşturma (Opsiyonel)

```sql
-- Örnek rezervasyon oluştur (test için)
INSERT INTO stock_reservations (
  job_id,
  stock_id,
  reserved_quantity,
  planned_usage_date,
  created_by
)
SELECT
  j.id,
  s.id,
  10.5,
  CURRENT_DATE + INTERVAL '7 days',
  u.id
FROM jobs j
CROSS JOIN stocks s
CROSS JOIN users u
WHERE j.status = 'pending'
  AND s.is_active = true
  AND u.email = 'admin@reklampro.com'
LIMIT 1;
```

## 🐛 Sorun Giderme

### Hata: "relation already exists"
```sql
-- Tabloyu temizleyip yeniden oluştur
DROP TABLE IF EXISTS stock_reservations CASCADE;
-- Sonra migration'ı tekrar çalıştır
```

### Hata: "column already exists"
```sql
-- İlgili kolonu sil
ALTER TABLE stocks DROP COLUMN IF EXISTS reserved_quantity;
-- Sonra migration'ı tekrar çalıştır
```

### Trigger Çalışmıyor
```sql
-- Trigger'ları yeniden oluştur
DROP TRIGGER IF EXISTS trigger_update_stock_reserved_quantity ON stock_reservations;
DROP TRIGGER IF EXISTS trigger_update_reservation_used_quantity ON stock_movements;

-- Migration'dan ilgili bölümü tekrar çalıştır
```

## 📞 Yardım

Migration sırasında sorun yaşarsanız:
1. Hata mesajını kopyalayın
2. Migration'ın hangi satırında hata aldığınızı not edin
3. Rollback SQL'i çalıştırıp tekrar deneyin

## ✅ Son Kontroller

Migration tamamlandıktan sonra:

- [ ] `stock_reservations` tablosu oluşturuldu
- [ ] Trigger'lar çalışıyor
- [ ] View'lar sorgulanabiliyor
- [ ] RLS politikaları aktif
- [ ] Frontend sayfaları açılıyor
- [ ] API endpoint'leri çalışıyor

## 🎉 Başarı!

Migration başarılıysa artık:
- Proje yöneticileri malzeme rezerve edebilir
- Satın almacılar ihtiyaç analizi yapabilir
- Depocular mal çıkışı yapabilir
- Sistem otomatik olarak miktarları güncelleyecektir

---

**Son güncelleme:** 25 Ekim 2025
**Gerekli API versiyonu:** Latest (main branch)
**Gerekli Frontend versiyonu:** Latest (main branch)
