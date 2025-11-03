#!/usr/bin/env python3
"""
ReklamPRO - Automated Screenshot Tool
Uygulama içindeki kritik kullanıcı akışlarını (CRUD) simüle eder ve her adımda ekran görüntüsü alır.
"""

import os
import time
import random
import string
from datetime import datetime
from playwright.sync_api import sync_playwright

# Base URL
BASE_URL = "https://uretim-takip-sistemi.vercel.app"

# Screenshot klasörü
SCREENSHOT_DIR = "screenshots"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
OUTPUT_DIR = os.path.join(SCREENSHOT_DIR, timestamp)

# Login bilgileri (production'da kullanmayın!)
LOGIN_EMAIL = "admin"  # Değiştirin!
LOGIN_PASSWORD = "admin123"   # Değiştirin!

step_counter = 1

def create_output_dir():
    """Output klasörünü oluştur"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"✅ Screenshot klasörü oluşturuldu: {OUTPUT_DIR}")


def random_string(length=6):
    """Rastgele bir string oluşturur."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def random_number(digits=4):
    """Rastgele bir sayı oluşturur."""
    return str(random.randint(10**(digits-1), 10**digits - 1))

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


def take_named_screenshot(page, name):
    """İsmi belirtilen bir screenshot alır."""
    global step_counter
    try:
        filename = f"{step_counter:02d}_{name}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)

        print(f"📸 Ekran görüntüsü alınıyor: {name}")
        time.sleep(2)
        page.screenshot(path=filepath, full_page=True)
        print(f"   ✅ Kaydedildi: {filepath}")
        step_counter += 1
        return True
    except Exception as e:
        print(f"   ❌ Hata: {e}")
        return False

def scenario_customer_management(page):
    """Müşteri oluşturma ve silme senaryosu."""
    print("\n--- Müşteri Yönetimi Senaryosu Başlatılıyor ---")
    page.goto(f"{BASE_URL}/customers", wait_until="networkidle")
    take_named_screenshot(page, "customer_01_list")

    # Müşteri oluşturma
    page.click('button:has-text("Yeni Müşteri")')
    page.wait_for_selector('div "customer_02_create_panel_open")

    customer_name = f"Test Müşteri {random_string()}"
    page.fill('input[placeholder*="ABC Reklam"]', customer_name)
    page.fill('input[placeholder*="ABC"]', f"T{random_number(3)}")
    page.fill('input[placeholder*="Ayşe Yılmaz"]', f"Test Yetkili {random_string(4)}")
    page.fill('input[type="email"]', f"test_{random_string().lower()}@example.com")
    take_named_screenshot(page, "customer_03_create_form_filled")
itwxl state='hidden')

    take_named_screenshot(page, "customer_04_list_after_create")

    # Müşteri silme
    print(f"🗑️ Müşteri siliniyor: {customer_name}")
    row_to_delete = page.locator(f'tr:has-text("{customer_name}")')
    delete_button = row_to_delete.locator('button[aria-label="Müşteriyi sil"]')
    
    page.on("dialog", lambda dialog: dialog.accept())
    delete_button.click()
    
    page.wait_for_load_state("networkidle")
    take_named_screenshot(page, "customer_05_list_after_delete")
    print("--- Müşteri Yönetimi Senaryosu Tamamlandı ---\n")

def scenario_stock_management(page):
    """Stok kartı oluşturma, hareket ekleme ve silme senaryosu."""
    print("\n--- Stok Yönetimi Senaryosu Başlatılıyor ---")
    page.goto(f"{BASE_URL}/stocks/inventory", wait_until="networkidle")
    take_named_screenshot(page, "stock_01_inventory_list")

    # Stok kartı oluşturma
    page.click('button:has-text("Yeni Stok Kartı")')
    page.wait_for_selector('div[role="dialog"]', state='visible', timeout=15000)
    take_named_screenshot(page, "stock_02_create_panel_open")

    product_code = f"TEST-{random_number()}"
    page.fill('input[id="product_name"]', product_name)
    page.fill('input[id="product_code"]', product_code)
    page.select_option('select[id="category"]', label="Baskı Malzemeleri")
    page.select_option('select[id="unit"]', label="Adet")
    page.fill('input[id="min_quantity"]', "10")
    take_named_screenshot(page, "stock_03_create_form_filled")

    page.click('div[role="dialog"] button:has-text("Kaydet")')
    page.wait_for_selector('div[role="dialog"]', state='hidden')
    print(f"✨ Stok kartı oluşturuldu: {product_name}")
    take_named_screenshot(page, "stock_04_list_after_create")

    # Stok hareketi ekleme (Giriş)
    print(f"📦 Stok hareketi ekleniyor: {product_name}")
    page.goto(f"{BASE_URL}/stocks/movements", wait_until="networkidle")
    take_named_screenshot(page, "stock_05_movements_list")

    page.click('button:has-text("Yeni Stok Hareketi")')
    page.wait_for_selector('div[role="dialog"]', state='visible', timeout=15000)
    page.select_option('select[id="movement_type"]', "IN")
    page.click('div[role="combobox"]')
    page.fill('input[placeholder="Stok kartı ara..."]{
    page.fill('input[id="quantity"]', "100")
    page.fill('input[id="unit_price"]', "12.5")
    take_named_screenshot(page, "stock_06_movement_form_filled")

    page.click('div[role="dialog"] button:has-text("Kaydet")')
    page.wait_for_selector('div[role="dialog"]', state='hidden')
    print("✨ Stok girişi yapıldı: +100 Adet")
    take_named_screenshot(page, "stock_07_movements_after_in")

    # Stok kartını silme
    print(f"🗑️ Stok kartı siliniyor: {product_name}")
    page.goto(f"{BASE_URL}/stocks/inventory", wait_until="networkidle")
    row_to_delete = page.locator(f'tr:has-text("{product_code}")')
    row_to_delete.locator('button[aria-label="Sil"]').click()
    page.wait_for_load_state("networkidle")
    take_named_screenshot(page, "stock_08_inventory_after_delete")
    print("--- Stok Yönetimi Senaryosu Tamamlandı ---\n")

def scenario_job_management(page):
    """İş oluşturma ve süreç ekleme senaryosu."""
    print("\n--- İş Yönetimi Senaryosu Başlatılıyor ---")
    page.goto(f"{BASE_URL}/jobs", wait_until="networkidle")
    take_named_screenshot(page, "job_01_list")

    # İş oluşturma
    page.click('button:has-text("Yeni İş")')
    page.wait_for_url("**/jobs/new", timeout=10000)
    take_named_screenshot(page, "job_02_create_page")

    job_title = f"Test İşi - Otomatik {random_string()}"
    page.fill('input[id="title"]', job_title)
    page.click('div[role="combobox"]:has-text("Müşteri Seçin")')
    page.locator('div[role="option"]').first.click()
    page.fill('textarea[id="description"]', "Otomatik test betiği tarafından oluşturulan iş.")
    take_named_screenshot(page, "job_03_create_form_filled")

    page.click('button:has-text("İşi Oluştur")')
    page.wait_for_url("**/jobs/**", timeout=10000)
    print(f"✨ İş oluşturuldu: {job_title}")
    take_named_screenshot(page, "job_04_detail_page")

    # Süreç ekleme
    print("🔄 Süreç ekleniyor...")
    page.click('button:has-text("Süreç Ekle")')
    page.wait_for_selector('div[role="dialog"]', state='visible', timeout=15000)
    take_named_screenshot(page, "job_05_add_process_modal")

    page.click('div[role="dialog"] button:has-text("Baskı")')
    page.click('div[role="dialog"] button:has
    take_named_screenshot(page, "job_06_processes_selected")

    page.click('div[role="dialog"] button:has-text("Seçilenleri Ekle")')
    page.wait_for_selector('div[role="dialog"]', state='hidden')
    print("✨ 3 süreç eklendi: Baskı, Kesim, Montaj")
    take_named_screenshot(page, "job_07_detail_with_processes")
    print("--- İş Yönetimi Senaryosu Tamamlandı ---\n")


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
        browser = p.chromium.launch(headless=True, args=["--start-maximized"])

        # Context oluştur (viewport ayarla)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )

        page = context.new_page()

        if not login(page):
            browser.close()
            return

        # --- Senaryoları Çalıştır ---
        try:
            # Ana sayfaların ekran görüntüleri
            page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
            take_named_screenshot(page, "main_01_dashboard")
            page.goto(f"{BASE_URL}/tasks/all", wait_until="networkidle")
            take_named_screenshot(page, "main_02_tasks_table")

            # Atomik operasyon senaryoları
            scenario_customer_management(page)
            scenario_stock_management(page)
            scenario_job_management(page)

        except Exception as e:
            print(f"❌ Ana senaryo döngüsünde bir hata oluştu: {e}")
        finally:
            # Browser'ı kapat
            browser.close()

        # Browser'ı kapat
        browser.close()

        # Sonuçları göster
        print()
        print("=" * 80)
        print("📊 SONUÇLAR")
        print("=" * 80)
        print(f"📁 Klasör: {OUTPUT_DIR}")
        print()
        print("🎉 Tamamlandı!")


if __name__ == "__main__":
    main()
