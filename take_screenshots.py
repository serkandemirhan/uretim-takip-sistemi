#!/usr/bin/env python3
"""
ReklamPRO - Automated Screenshot Tool
Tüm önemli sayfaların screenshot'larını alır
"""

import os
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

# Base URL
BASE_URL = "https://uretim-takip-sistemi.vercel.app"

# Screenshot klasörü
SCREENSHOT_DIR = "screenshots"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
OUTPUT_DIR = os.path.join(SCREENSHOT_DIR, timestamp)

# Alınacak sayfalar
PAGES = [
    # Dashboard & Ana Sayfalar
    {"path": "/dashboard", "name": "01_dashboard", "auth": True},
    {"path": "/jobs", "name": "02_jobs_list", "auth": True},
    {"path": "/tasks", "name": "03_tasks_kanban", "auth": True},
    {"path": "/tasks/all", "name": "04_tasks_table", "auth": True},

    # İş Yönetimi
    {"path": "/jobs/new", "name": "05_job_create", "auth": True},
    {"path": "/quotations", "name": "06_quotations_list", "auth": True},

    # Stok & Satın Alma
    {"path": "/stocks/inventory", "name": "07_stock_inventory", "auth": True},
    {"path": "/stocks/movements", "name": "08_stock_movements", "auth": True},
    {"path": "/procurement/requests", "name": "09_purchase_requests", "auth": True},

    # Dosya Yönetimi
    {"path": "/files/explorer", "name": "10_files_explorer", "auth": True},

    # Yönetim
    {"path": "/customers", "name": "11_customers", "auth": True},
    {"path": "/users", "name": "12_users", "auth": True},
    {"path": "/processes", "name": "13_processes", "auth": True},
    {"path": "/machines", "name": "14_machines", "auth": True},
    {"path": "/roles", "name": "15_roles", "auth": True},

    # Ayarlar
    {"path": "/settings", "name": "16_settings", "auth": True},
    {"path": "/settings/stock-fields", "name": "17_stock_fields_settings", "auth": True},

    # Auth Sayfaları (Login olmadan)
    {"path": "/login", "name": "00_login", "auth": False},
]

# Login bilgileri (production'da kullanmayın!)
LOGIN_EMAIL = "admin"  # Değiştirin!
LOGIN_PASSWORD = "admin123"   # Değiştirin!


def create_output_dir():
    """Output klasörünü oluştur"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"✅ Screenshot klasörü oluşturuldu: {OUTPUT_DIR}")


def login(page):
    """Login işlemi"""
    try:
        print("🔐 Login yapılıyor...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")

        # Username ve password input'larını doldur
        page.fill('input[id="username"]', LOGIN_EMAIL)
        page.fill('input[id="password"]', LOGIN_PASSWORD)

        # Login butonuna tıkla
        page.click('button[type="submit"]')

        # Dashboard'a yönlendirilmeyi bekle
        page.wait_for_url("**/dashboard", timeout=10000)
        print("✅ Login başarılı!")
        time.sleep(2)  # Sayfa tamamen yüklensin
        return True
    except Exception as e:
        print(f"❌ Login hatası: {e}")
        return False


def take_screenshot(page, page_info):
    """Tek bir sayfanın screenshot'ını al"""
    try:
        url = f"{BASE_URL}{page_info['path']}"
        filename = f"{page_info['name']}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)

        print(f"📸 Screenshot alınıyor: {page_info['name']} ({url})")

        # Sayfaya git
        page.goto(url, wait_until="networkidle", timeout=30000)

        # Sayfa yüklenmesini bekle
        time.sleep(2)

        # Full page screenshot
        page.screenshot(path=filepath, full_page=True)

        print(f"   ✅ Kaydedildi: {filepath}")
        return True

    except Exception as e:
        print(f"   ❌ Hata: {e}")
        return False


def main():
    """Ana fonksiyon"""
    print("=" * 80)
    print("🚀 ReklamPRO Screenshot Tool")
    print("=" * 80)
    print()

    # Output klasörünü oluştur
    create_output_dir()
    print()

    # Playwright başlat
    with sync_playwright() as p:
        # Browser'ı başlat (headless=False görsel takip için)
        browser = p.chromium.launch(headless=True)

        # Context oluştur (viewport ayarla)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )

        page = context.new_page()

        # İstatistikler
        success_count = 0
        fail_count = 0

        # Login gerekli mi?
        needs_auth = any(p["auth"] for p in PAGES)
        logged_in = False

        if needs_auth:
            logged_in = login(page)
            print()

        # Her sayfanın screenshot'ını al
        for page_info in PAGES:
            # Login gerekliyse ve login yapılmamışsa skip
            if page_info["auth"] and not logged_in:
                print(f"⏭️  Atlanıyor (login gerekli): {page_info['name']}")
                continue

            if take_screenshot(page, page_info):
                success_count += 1
            else:
                fail_count += 1

            time.sleep(1)  # Rate limiting

        # Browser'ı kapat
        browser.close()

        # Sonuçları göster
        print()
        print("=" * 80)
        print("📊 SONUÇLAR")
        print("=" * 80)
        print(f"✅ Başarılı: {success_count}")
        print(f"❌ Başarısız: {fail_count}")
        print(f"📁 Klasör: {OUTPUT_DIR}")
        print()
        print("🎉 Tamamlandı!")


if __name__ == "__main__":
    main()
