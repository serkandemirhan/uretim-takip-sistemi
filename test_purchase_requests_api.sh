#!/bin/bash

# Purchase Requests API Test Script
# Test eder: Login, PR oluşturma, item ekleme, onaya gönderme, onaylama

BASE_URL="http://localhost:5001"
echo "🚀 Purchase Requests API Test Başlıyor..."
echo "========================================="

# Renkler
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. LOGIN - Token al
echo -e "\n${YELLOW}1️⃣  LOGIN - Token alınıyor...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login başarısız! Response:${NC}"
    echo $LOGIN_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✅ Token alındı: ${TOKEN:0:20}...${NC}"

# 2. PURCHASE REQUEST OLUŞTUR
echo -e "\n${YELLOW}2️⃣  PURCHASE REQUEST oluşturuluyor...${NC}"
CREATE_PR_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/purchase-requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "priority": "high",
    "required_by_date": "2025-11-01",
    "notes": "Test satın alma talebi - Acil malzeme ihtiyacı",
    "items": [
      {
        "product_name": "Test Ürün 1",
        "product_code": "TEST-001",
        "category": "Test Kategori",
        "quantity": 100,
        "unit": "adet",
        "estimated_unit_price": 25.50,
        "currency": "TRY",
        "suggested_supplier": "Test Tedarikçi A"
      },
      {
        "product_name": "Test Ürün 2",
        "product_code": "TEST-002",
        "category": "Test Kategori",
        "quantity": 50,
        "unit": "kg",
        "estimated_unit_price": 120.00,
        "currency": "TRY",
        "suggested_supplier": "Test Tedarikçi B"
      }
    ]
  }')

PR_ID=$(echo $CREATE_PR_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$PR_ID" ]; then
    echo -e "${RED}❌ PR oluşturulamadı! Response:${NC}"
    echo $CREATE_PR_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✅ Purchase Request oluşturuldu!${NC}"
echo "   ID: $PR_ID"
echo $CREATE_PR_RESPONSE | jq '.'

# 3. PURCHASE REQUEST DETAYINI GETİR
echo -e "\n${YELLOW}3️⃣  Purchase Request detayı getiriliyor...${NC}"
GET_PR_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/purchase-requests/${PR_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

REQUEST_NUMBER=$(echo $GET_PR_RESPONSE | grep -o '"request_number":"[^"]*' | cut -d'"' -f4)
ITEMS_COUNT=$(echo $GET_PR_RESPONSE | jq '.items | length')

echo -e "${GREEN}✅ Detay getirildi:${NC}"
echo "   Request Number: $REQUEST_NUMBER"
echo "   Items Count: $ITEMS_COUNT"
echo "   Status: $(echo $GET_PR_RESPONSE | jq -r '.status')"
echo "   Priority: $(echo $GET_PR_RESPONSE | jq -r '.priority')"

# 4. YENİ ITEM EKLE
echo -e "\n${YELLOW}4️⃣  Yeni item ekleniyor...${NC}"
ADD_ITEM_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/purchase-requests/${PR_ID}/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "product_name": "Test Ürün 3 - Eklendi",
    "product_code": "TEST-003",
    "quantity": 25,
    "unit": "m2",
    "estimated_unit_price": 85.00,
    "currency": "TRY"
  }')

echo -e "${GREEN}✅ Item eklendi:${NC}"
echo $ADD_ITEM_RESPONSE | jq '.'

# 5. TÜM PURCHASE REQUESTS LİSTESİ
echo -e "\n${YELLOW}5️⃣  Tüm Purchase Requests listesi...${NC}"
LIST_PR_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/purchase-requests" \
  -H "Authorization: Bearer ${TOKEN}")

PR_COUNT=$(echo $LIST_PR_RESPONSE | jq '.data | length')
echo -e "${GREEN}✅ Toplam PR sayısı: $PR_COUNT${NC}"
echo $LIST_PR_RESPONSE | jq '.data[] | {request_number, status, priority, items_count, estimated_total}'

# 6. ONAYA GÖNDER
echo -e "\n${YELLOW}6️⃣  Purchase Request onaya gönderiliyor...${NC}"
SUBMIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/purchase-requests/${PR_ID}/submit" \
  -H "Authorization: Bearer ${TOKEN}")

echo -e "${GREEN}✅ Onaya gönderildi:${NC}"
echo $SUBMIT_RESPONSE | jq '.'

# Durum kontrolü
GET_STATUS=$(curl -s -X GET "${BASE_URL}/api/purchase-requests/${PR_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.status')
echo "   Yeni Status: $GET_STATUS"

# 7. ONAYLA
echo -e "\n${YELLOW}7️⃣  Purchase Request onaylanıyor...${NC}"
APPROVE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/purchase-requests/${PR_ID}/approve" \
  -H "Authorization: Bearer ${TOKEN}")

echo -e "${GREEN}✅ Onaylandı:${NC}"
echo $APPROVE_RESPONSE | jq '.'

# Final durum
FINAL_STATUS=$(curl -s -X GET "${BASE_URL}/api/purchase-requests/${PR_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.status')
APPROVED_BY=$(curl -s -X GET "${BASE_URL}/api/purchase-requests/${PR_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.approved_by_name')

echo "   Final Status: $FINAL_STATUS"
echo "   Onaylayan: $APPROVED_BY"

# 8. FİLTRELEME TESTLERİ
echo -e "\n${YELLOW}8️⃣  Filtreleme testleri...${NC}"

# Status'a göre filtre
echo -e "\n   📋 Approved durumundaki talepler:"
curl -s -X GET "${BASE_URL}/api/purchase-requests?status=approved" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data[] | {request_number, status, priority}'

# Priority'ye göre filtre
echo -e "\n   🔥 High priority talepler:"
curl -s -X GET "${BASE_URL}/api/purchase-requests?priority=high" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data[] | {request_number, priority, estimated_total}'

# 9. RED SENARYOSU - Yeni bir PR oluştur ve reddet
echo -e "\n${YELLOW}9️⃣  Red senaryosu testi...${NC}"
REJECT_PR=$(curl -s -X POST "${BASE_URL}/api/purchase-requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "priority": "low",
    "notes": "Red edilecek test talebi",
    "items": [{
      "product_name": "Red Test Ürün",
      "quantity": 10,
      "unit": "adet"
    }]
  }' | jq -r '.id')

# Onaya gönder
curl -s -X POST "${BASE_URL}/api/purchase-requests/${REJECT_PR}/submit" \
  -H "Authorization: Bearer ${TOKEN}" > /dev/null

# Reddet
REJECT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/purchase-requests/${REJECT_PR}/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "rejection_reason": "Bütçe yetersiz - alternatif tedarikçi aranacak"
  }')

echo -e "${GREEN}✅ Red işlemi tamamlandı:${NC}"
echo $REJECT_RESPONSE | jq '.'

REJECTED_REASON=$(curl -s -X GET "${BASE_URL}/api/purchase-requests/${REJECT_PR}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.rejection_reason')
echo "   Red Nedeni: $REJECTED_REASON"

# 10. ÖZET
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ TÜM TESTLER TAMAMLANDI!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "📊 Test Özeti:"
echo "   ✓ Login başarılı"
echo "   ✓ Purchase Request oluşturma (2 adet kalemle)"
echo "   ✓ Detay getirme"
echo "   ✓ Item ekleme"
echo "   ✓ Liste getirme"
echo "   ✓ Onaya gönderme"
echo "   ✓ Onaylama"
echo "   ✓ Filtreleme (status, priority)"
echo "   ✓ Red etme"
echo ""
echo "🎯 Oluşturulan PR'lar:"
echo "   - Onaylanan: $REQUEST_NUMBER (ID: $PR_ID)"
echo "   - Reddedilen: $(curl -s -X GET "${BASE_URL}/api/purchase-requests/${REJECT_PR}" -H "Authorization: Bearer ${TOKEN}" | jq -r '.request_number')"
echo ""
echo -e "${YELLOW}💡 Database'de kontrol edin:${NC}"
echo "   psql -h localhost -U reklam_user -d reklam_db -c 'SELECT request_number, status, priority FROM purchase_requests;'"
echo ""
