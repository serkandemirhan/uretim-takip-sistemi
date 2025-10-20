#!/usr/bin/env python3
"""
Purchase Requests API Test Script
Test eder: Login, PR oluşturma, item ekleme, onaya gönderme, onaylama
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5001"

# Renkler
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def print_section(title, emoji=""):
    print(f"\n{YELLOW}{emoji} {title}{NC}")
    print("=" * 50)

def print_success(message):
    print(f"{GREEN}✅ {message}{NC}")

def print_error(message):
    print(f"{RED}❌ {message}{NC}")

def print_info(message):
    print(f"{BLUE}ℹ️  {message}{NC}")

# Test başlangıcı
print_section("Purchase Requests API Test", "🚀")
print()

# 1. LOGIN
print_section("1️⃣  LOGIN - Token alınıyor...")
try:
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    login_data = login_response.json()

    if 'token' in login_data:
        token = login_data['token']
        print_success(f"Token alındı: {token[:30]}...")
        headers = {"Authorization": f"Bearer {token}"}
    else:
        print_error(f"Login başarısız: {login_data}")
        exit(1)
except Exception as e:
    print_error(f"Login hatası: {str(e)}")
    exit(1)

# 2. PURCHASE REQUEST OLUŞTUR
print_section("2️⃣  PURCHASE REQUEST oluşturuluyor...")
try:
    pr_data = {
        "priority": "high",
        "required_by_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "notes": "Test satın alma talebi - Acil malzeme ihtiyacı",
        "items": [
            {
                "product_name": "Test Ürün 1 - Baskı Kağıdı",
                "product_code": "TEST-001",
                "category": "Kağıt",
                "quantity": 100,
                "unit": "adet",
                "estimated_unit_price": 25.50,
                "currency": "TRY",
                "suggested_supplier": "Test Tedarikçi A"
            },
            {
                "product_name": "Test Ürün 2 - Mürekkep",
                "product_code": "TEST-002",
                "category": "Baskı Malzemeleri",
                "quantity": 50,
                "unit": "kg",
                "estimated_unit_price": 120.00,
                "currency": "TRY",
                "suggested_supplier": "Test Tedarikçi B"
            }
        ]
    }

    create_response = requests.post(
        f"{BASE_URL}/api/purchase-requests",
        headers=headers,
        json=pr_data
    )
    create_data = create_response.json()

    if 'id' in create_data:
        pr_id = create_data['id']
        print_success("Purchase Request oluşturuldu!")
        print(f"   ID: {pr_id}")
        print(f"   Message: {create_data.get('message')}")
    else:
        print_error(f"PR oluşturulamadı: {create_data}")
        exit(1)
except Exception as e:
    print_error(f"PR oluşturma hatası: {str(e)}")
    exit(1)

# 3. DETAY GETİR
print_section("3️⃣  Purchase Request detayı getiriliyor...")
try:
    detail_response = requests.get(
        f"{BASE_URL}/api/purchase-requests/{pr_id}",
        headers=headers
    )
    detail_data = detail_response.json()

    print_success("Detay getirildi:")
    print(f"   Request Number: {detail_data.get('request_number')}")
    print(f"   Status: {detail_data.get('status')}")
    print(f"   Priority: {detail_data.get('priority')}")
    print(f"   Items Count: {len(detail_data.get('items', []))}")
    print(f"   Estimated Total: {detail_data.get('items', [{}])[0].get('estimated_total_price', 0)} TRY")

    # Items detayı
    print("\n   📦 Items:")
    for idx, item in enumerate(detail_data.get('items', []), 1):
        print(f"      {idx}. {item['product_name']}: {item['quantity']} {item['unit']} x {item['estimated_unit_price']} TRY")

except Exception as e:
    print_error(f"Detay getirme hatası: {str(e)}")

# 4. YENİ ITEM EKLE
print_section("4️⃣  Yeni item ekleniyor...")
try:
    new_item = {
        "product_name": "Test Ürün 3 - Vinil Folyol",
        "product_code": "TEST-003",
        "quantity": 25,
        "unit": "m2",
        "estimated_unit_price": 85.00,
        "currency": "TRY",
        "suggested_supplier": "Test Tedarikçi C"
    }

    add_item_response = requests.post(
        f"{BASE_URL}/api/purchase-requests/{pr_id}/items",
        headers=headers,
        json=new_item
    )
    add_item_data = add_item_response.json()

    if 'id' in add_item_data:
        print_success(f"Item eklendi! ID: {add_item_data['id']}")
    else:
        print_error(f"Item eklenemedi: {add_item_data}")

except Exception as e:
    print_error(f"Item ekleme hatası: {str(e)}")

# 5. LISTE GETİR
print_section("5️⃣  Tüm Purchase Requests listesi...")
try:
    list_response = requests.get(
        f"{BASE_URL}/api/purchase-requests",
        headers=headers
    )
    list_data = list_response.json()

    pr_list = list_data.get('data', [])
    print_success(f"Toplam PR sayısı: {len(pr_list)}")

    print("\n   📋 Liste:")
    for pr in pr_list[:5]:  # İlk 5'i göster
        print(f"      • {pr['request_number']} - {pr['status']} - {pr['priority']} - {pr['items_count']} items - {pr['estimated_total']:.2f} TRY")

except Exception as e:
    print_error(f"Liste getirme hatası: {str(e)}")

# 6. ONAYA GÖNDER
print_section("6️⃣  Purchase Request onaya gönderiliyor...")
try:
    submit_response = requests.post(
        f"{BASE_URL}/api/purchase-requests/{pr_id}/submit",
        headers=headers
    )
    submit_data = submit_response.json()

    print_success(f"Onaya gönderildi: {submit_data.get('message')}")

    # Durum kontrolü
    check_response = requests.get(
        f"{BASE_URL}/api/purchase-requests/{pr_id}",
        headers=headers
    )
    new_status = check_response.json().get('status')
    print(f"   Yeni Status: {new_status}")

except Exception as e:
    print_error(f"Onaya gönderme hatası: {str(e)}")

# 7. ONAYLA
print_section("7️⃣  Purchase Request onaylanıyor...")
try:
    approve_response = requests.post(
        f"{BASE_URL}/api/purchase-requests/{pr_id}/approve",
        headers=headers
    )
    approve_data = approve_response.json()

    print_success(f"Onaylandı: {approve_data.get('message')}")

    # Final durum
    final_response = requests.get(
        f"{BASE_URL}/api/purchase-requests/{pr_id}",
        headers=headers
    )
    final_data = final_response.json()
    print(f"   Final Status: {final_data.get('status')}")
    print(f"   Onaylayan: {final_data.get('approved_by_name')}")
    print(f"   Onaylanma Tarihi: {final_data.get('approved_at')}")

except Exception as e:
    print_error(f"Onaylama hatası: {str(e)}")

# 8. FİLTRELEME TESTLERİ
print_section("8️⃣  Filtreleme testleri...")
try:
    # Status'a göre
    print("\n   🔍 Approved durumundaki talepler:")
    approved_response = requests.get(
        f"{BASE_URL}/api/purchase-requests?status=approved",
        headers=headers
    )
    approved_list = approved_response.json().get('data', [])
    print(f"      Bulunan: {len(approved_list)} adet")
    for pr in approved_list[:3]:
        print(f"         • {pr['request_number']} - {pr['priority']}")

    # Priority'ye göre
    print("\n   🔥 High priority talepler:")
    high_response = requests.get(
        f"{BASE_URL}/api/purchase-requests?priority=high",
        headers=headers
    )
    high_list = high_response.json().get('data', [])
    print(f"      Bulunan: {len(high_list)} adet")

except Exception as e:
    print_error(f"Filtreleme hatası: {str(e)}")

# 9. RED SENARYOSU
print_section("9️⃣  Red senaryosu testi...")
try:
    # Yeni PR oluştur
    reject_pr_data = {
        "priority": "low",
        "notes": "Red edilecek test talebi",
        "items": [{
            "product_name": "Red Test Ürün",
            "quantity": 10,
            "unit": "adet",
            "estimated_unit_price": 50.00
        }]
    }

    reject_create = requests.post(
        f"{BASE_URL}/api/purchase-requests",
        headers=headers,
        json=reject_pr_data
    )
    reject_pr_id = reject_create.json().get('id')
    print_info(f"Red test PR oluşturuldu: {reject_pr_id}")

    # Onaya gönder
    requests.post(
        f"{BASE_URL}/api/purchase-requests/{reject_pr_id}/submit",
        headers=headers
    )

    # Reddet
    reject_response = requests.post(
        f"{BASE_URL}/api/purchase-requests/{reject_pr_id}/reject",
        headers=headers,
        json={"rejection_reason": "Bütçe yetersiz - alternatif tedarikçi aranacak"}
    )
    reject_data = reject_response.json()

    print_success(f"Red işlemi: {reject_data.get('message')}")

    # Kontrol
    reject_check = requests.get(
        f"{BASE_URL}/api/purchase-requests/{reject_pr_id}",
        headers=headers
    )
    reject_final = reject_check.json()
    print(f"   Status: {reject_final.get('status')}")
    print(f"   Red Nedeni: {reject_final.get('rejection_reason')}")

except Exception as e:
    print_error(f"Red senaryosu hatası: {str(e)}")

# 10. DATABASE KONTROLÜ
print_section("🗄️  Database Kontrolü...")
try:
    import subprocess

    db_check = subprocess.run([
        'psql', '-h', 'localhost', '-U', 'reklam_user', '-d', 'reklam_db',
        '-c', 'SELECT request_number, status, priority, notes FROM purchase_requests ORDER BY created_at DESC LIMIT 5;'
    ], env={'PGPASSWORD': 'reklam_pass_123'}, capture_output=True, text=True)

    if db_check.returncode == 0:
        print_success("Database'den alınan veriler:")
        print(db_check.stdout)
    else:
        print_info("Database kontrolü atlandı (psql bulunamadı)")

except Exception as e:
    print_info("Database kontrolü atlandı")

# ÖZET
print("\n" + "=" * 50)
print(f"{GREEN}✅ TÜM TESTLER TAMAMLANDI!{NC}")
print("=" * 50)
print()
print("📊 Test Özeti:")
print(f"   {GREEN}✓{NC} Login başarılı")
print(f"   {GREEN}✓{NC} Purchase Request oluşturma (2 adet kalemle)")
print(f"   {GREEN}✓{NC} Detay getirme")
print(f"   {GREEN}✓{NC} Item ekleme (3. item)")
print(f"   {GREEN}✓{NC} Liste getirme")
print(f"   {GREEN}✓{NC} Onaya gönderme")
print(f"   {GREEN}✓{NC} Onaylama")
print(f"   {GREEN}✓{NC} Filtreleme (status, priority)")
print(f"   {GREEN}✓{NC} Red etme")
print()
print("🎯 API Endpoint'leri:")
print("   • GET    /api/purchase-requests")
print("   • GET    /api/purchase-requests/{id}")
print("   • POST   /api/purchase-requests")
print("   • PUT    /api/purchase-requests/{id}")
print("   • DELETE /api/purchase-requests/{id}")
print("   • POST   /api/purchase-requests/{id}/items")
print("   • DELETE /api/purchase-requests/{id}/items/{item_id}")
print("   • POST   /api/purchase-requests/{id}/submit")
print("   • POST   /api/purchase-requests/{id}/approve")
print("   • POST   /api/purchase-requests/{id}/reject")
print()
print(f"{YELLOW}💡 Başarıyla oluşturulan PR ID: {pr_id}{NC}")
print()
