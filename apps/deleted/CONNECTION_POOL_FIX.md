# Connection Pool Exhausted - Sorun ve Çözüm

## Sorun

```
❌ Failed to get connection from pool: connection pool exhausted
```

Bu hata, PostgreSQL connection pool'unun tüm bağlantılarının tükendiği anlamına gelir. API sürekli olarak veritabanı bağlantısı almaya çalışıyor ama pool'da mevcut bağlantı kalmıyor.

## Sorunun Nedenleri

### 1. **`conn.close()` Yanlış Kullanımı**
Connection pool kullanırken `conn.close()` **YANLIŞ**! Pool'dan alınan bağlantılar `close()` ile kapatılmamalı, `release_db_connection(conn)` ile pool'a geri verilmelidir.

### 2. **Exception Durumunda Connection Leak**
Hata oluştuğunda bağlantılar geri verilmediği için pool'da kalıyorlar.

### 3. **Finally Block Eksikliği**
Try-finally yapısı olmadığı için exception durumunda bağlantılar serbest bırakılmıyordu.

## Düzeltmeler

### notifications.py Dosyası

Tüm endpoint'lerde yapılan değişiklikler:

#### ❌ ÖNCE (Yanlış)
```python
def mark_as_read(notification_id):
    try:
        user_id = request.current_user['user_id']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""UPDATE notifications...""")

        result = cursor.fetchone()
        conn.commit()
        conn.close()  # ❌ YANLIŞ! Pool'a geri vermek yerine kapatıyor

        return jsonify({'message': 'Başarılı'}), 200

    except Exception as e:
        # ❌ Bağlantı serbest bırakılmıyor!
        return jsonify({'error': str(e)}), 500
```

#### ✅ SONRA (Doğru)
```python
def mark_as_read(notification_id):
    conn = None
    cursor = None
    try:
        user_id = request.current_user['user_id']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""UPDATE notifications...""")

        result = cursor.fetchone()
        conn.commit()

        return jsonify({'message': 'Başarılı'}), 200

    except Exception as e:
        if conn:
            conn.rollback()  # ✅ Hata durumunda rollback
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()  # ✅ Cursor'ı kapat
        if conn:
            release_db_connection(conn)  # ✅ Bağlantıyı pool'a geri ver
```

## Düzeltilen Fonksiyonlar

notifications.py içinde düzeltilen tüm fonksiyonlar:

1. ✅ `mark_as_read()` - Tek bildirim okundu işaretle
2. ✅ `mark_all_as_read()` - Tüm bildirimleri okundu işaretle
3. ✅ `delete_notification()` - Bildirim sil
4. ✅ `create_test_notifications_endpoint()` - Test bildirimleri oluştur
5. ✅ `create_notification()` - Internal helper fonksiyon

## Doğru Connection Pool Kullanımı

### Temel Kurallar

1. **Pool'dan Bağlantı Al**
   ```python
   conn = get_db_connection()
   ```

2. **İşlem Yap**
   ```python
   cursor = conn.cursor()
   cursor.execute("SELECT ...")
   conn.commit()
   ```

3. **ASLA `conn.close()` KULLANMA**
   ```python
   # ❌ YANLIŞ
   conn.close()

   # ✅ DOĞRU
   release_db_connection(conn)
   ```

4. **Her Zaman Try-Finally Kullan**
   ```python
   conn = None
   cursor = None
   try:
       conn = get_db_connection()
       # ... işlemler ...
   except Exception as e:
       if conn:
           conn.rollback()
       # hata yönetimi
   finally:
       if cursor:
           cursor.close()
       if conn:
           release_db_connection(conn)
   ```

## Helper Fonksiyonları Kullan

Basit sorgular için `execute_query()` ve `execute_query_one()` fonksiyonlarını kullanın. Bunlar otomatik olarak connection yönetimini yapıyor:

```python
# ✅ İyi - Helper kullanımı
result = execute_query_one("SELECT * FROM users WHERE id = %s", (user_id,))

# ❌ Kötü - Manuel connection yönetimi gereksiz
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
result = cursor.fetchone()
cursor.close()
release_db_connection(conn)
```

## Connection Pool Ayarları

[config.py](apps/api/app/config.py) dosyasında:

```python
DB_POOL_MIN_CONNECTIONS = int(os.getenv('DB_POOL_MIN_CONNECTIONS', '2'))
DB_POOL_MAX_CONNECTIONS = int(os.getenv('DB_POOL_MAX_CONNECTIONS', '10'))
```

Gerekirse `.env` dosyasında artırabilirsiniz:

```bash
DB_POOL_MIN_CONNECTIONS=5
DB_POOL_MAX_CONNECTIONS=20
```

## Pool İstatistiklerini İzleme

Health endpoint'i kullanarak pool durumunu kontrol edin:

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "pool": {
      "min_connections": 2,
      "max_connections": 10,
      "available": 8,
      "in_use": 2,
      "total": 10
    }
  }
}
```

## Diğer Dosyalarda Aynı Sorun

Bu sorun başka dosyalarda da olabilir. Kontrol edilmesi gerekenler:

- `apps/api/app/routes/jobs.py` - Çok sayıda manuel connection kullanımı var
- `apps/api/app/routes/processes.py` - `conn.close()` kullanımları var
- `apps/api/app/routes/customers.py` - Kontrol edilmeli
- `apps/api/app/routes/machines.py` - Kontrol edilmeli

Tüm bu dosyalarda aynı pattern uygulanmalı:
1. `conn.close()` → `release_db_connection(conn)`
2. Try-finally blokları ekle
3. Exception handling'de rollback yap
4. Mümkünse helper fonksiyonları kullan

## Test

API'yi yeniden başlattıktan sonra:

```bash
cd apps/api
python3 app.py
```

Connection leak sorunu düzelmiş olmalı. Artık "connection pool exhausted" hatası almazsınız.