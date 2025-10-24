# 📸 ReklamPRO Screenshot Tool

Tüm önemli sayfaların otomatik screenshot'larını alan Python script'i.

---

## 🚀 Kurulum

### 1. Python Paketlerini Yükle

```bash
pip3 install -r screenshot_requirements.txt
```

### 2. Playwright Browser'ları Yükle

```bash
playwright install chromium
```

---

## ⚙️ Yapılandırma

`take_screenshots.py` dosyasını düzenleyin:

```python
# Login bilgilerinizi girin
LOGIN_EMAIL = "admin@example.com"      # Değiştirin!
LOGIN_PASSWORD = "your_password"       # Değiştirin!
```

**ÖNEMLİ:** Production login bilgilerini kullanmayın! Test kullanıcısı oluşturun.

---

## ▶️ Kullanım

### Tüm Sayfaların Screenshot'ını Al

```bash
cd /Users/user/ReklamPRO
python3 take_screenshots.py
```

### Çıktı

```
screenshots/
  └── 20251024_143000/
      ├── 00_login.png
      ├── 01_dashboard.png
      ├── 02_jobs_list.png
      ├── 03_tasks_kanban.png
      ├── ...
      └── 17_stock_fields_settings.png
```

---

## 📋 Alınan Sayfalar

| # | Sayfa | Path | Auth |
|---|-------|------|------|
| 00 | Login | `/login` | ❌ |
| 01 | Dashboard | `/dashboard` | ✅ |
| 02 | İşler Listesi | `/jobs` | ✅ |
| 03 | Görevlerim (Kanban) | `/tasks` | ✅ |
| 04 | Tüm Görevler (Tablo) | `/tasks/all` | ✅ |
| 05 | Yeni İş Oluştur | `/jobs/new` | ✅ |
| 06 | Teklifler | `/quotations` | ✅ |
| 07 | Stok Envanteri | `/stocks/inventory` | ✅ |
| 08 | Stok Hareketleri | `/stocks/movements` | ✅ |
| 09 | Satın Alma Talepleri | `/procurement/requests` | ✅ |
| 10 | Dosya Yöneticisi | `/files/explorer` | ✅ |
| 11 | Müşteriler | `/customers` | ✅ |
| 12 | Kullanıcılar | `/users` | ✅ |
| 13 | Süreçler | `/processes` | ✅ |
| 14 | Makineler | `/machines` | ✅ |
| 15 | Roller | `/roles` | ✅ |
| 16 | Ayarlar | `/settings` | ✅ |
| 17 | Stok Alanları Ayarları | `/settings/stock-fields` | ✅ |

**Toplam:** 18 sayfa

---

## 🎛️ Özelleştirme

### Sayfa Ekle/Çıkar

`PAGES` listesini düzenleyin:

```python
PAGES = [
    {"path": "/your-page", "name": "99_custom_page", "auth": True},
    # ...
]
```

### Viewport Boyutu Değiştir

```python
context = browser.new_context(
    viewport={"width": 1920, "height": 1080},  # Değiştir
)
```

### Headless Modu Kapat (Görsel Takip)

```python
browser = p.chromium.launch(headless=False)  # True → False
```

---

## 🐛 Sorun Giderme

### Playwright Kurulmadı Hatası

```bash
playwright install
```

### Login Başarısız

1. Login bilgilerini kontrol edin
2. Test kullanıcısı oluşturun
3. 2FA kapalı olmalı

### Screenshot Boş Geliyor

- `time.sleep(2)` süresini artırın (3-5 saniye)
- `wait_until="networkidle"` → `wait_until="load"` deneyin

### Timeout Hatası

```python
page.goto(url, wait_until="networkidle", timeout=60000)  # 30s → 60s
```

---

## 📊 Kullanım Senaryoları

### 1. Dokümantasyon
- README'ye screenshot'lar ekle
- Wiki sayfaları için görseller

### 2. Test
- UI değişikliklerini karşılaştır
- Visual regression testing

### 3. Demo
- Müşterilere sunum için
- Sales pitch materyali

### 4. Backup
- Her major release'de snapshot al
- Version karşılaştırması

---

## 💡 İpuçları

**Hızlı Çekim:**
```python
time.sleep(1)  # 2 → 1 saniye
```

**Yüksek Kalite:**
```python
page.screenshot(path=filepath, full_page=True, type="png", quality=100)
```

**Sadece Viewport:**
```python
page.screenshot(path=filepath, full_page=False)  # True → False
```

**Belirli Element:**
```python
element = page.locator("#content")
element.screenshot(path=filepath)
```

---

## 🔐 Güvenlik Notları

❌ **YAPMAYIN:**
- Production credentials commit etmeyin
- Screenshot'larda hassas veri görünmesin
- Public repo'ya login bilgisi koymayın

✅ **YAPIN:**
- Test kullanıcısı oluşturun
- `.gitignore`'a `screenshots/` ekleyin
- Ortam değişkenleri kullanın

---

## 📝 Notlar

- Screenshot'lar timestamp'li klasörlere kaydedilir
- Her çalıştırmada yeni klasör oluşturulur
- Full page screenshot (tüm sayfa scroll edilir)
- 1920x1080 viewport kullanılır

---

**Hazırlayan:** Claude Code
**Tarih:** 2025-10-24
