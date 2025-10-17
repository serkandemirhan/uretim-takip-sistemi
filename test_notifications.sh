#!/bin/bash

# ReklamPRO Test Notifications Script
# Bu script admin kullanıcısı için test notification'ları oluşturur

API_URL="http://localhost:5000"

echo "=========================================="
echo "ReklamPRO Test Notifications"
echo "=========================================="
echo ""

# Adım 1: Login olup token al
echo "1. Admin kullanıcısı ile login olunuyor..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Login başarısız! Hata:"
    echo $LOGIN_RESPONSE | python3 -m json.tool
    exit 1
fi

echo "✅ Login başarılı!"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Adım 2: Test notification'ları oluştur
echo "2. Test notification'ları oluşturuluyor..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/notifications/create-test-notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "Sonuç:"
echo $CREATE_RESPONSE | python3 -m json.tool
echo ""

# Adım 3: Oluşturulan notification'ları listele
echo "3. Tüm notification'lar listeleniyor..."
NOTIFICATIONS_RESPONSE=$(curl -s -X GET "$API_URL/api/notifications" \
  -H "Authorization: Bearer $TOKEN")

echo "Notification'lar:"
echo $NOTIFICATIONS_RESPONSE | python3 -m json.tool
echo ""

# Adım 4: Okunmamış notification sayısı
echo "4. Okunmamış notification sayısı kontrol ediliyor..."
UNREAD_RESPONSE=$(curl -s -X GET "$API_URL/api/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN")

echo "Okunmamış sayısı:"
echo $UNREAD_RESPONSE | python3 -m json.tool
echo ""

echo "=========================================="
echo "Test tamamlandı!"
echo "=========================================="
echo ""
echo "Web arayüzünde kontrol etmek için:"
echo "1. http://localhost:3000 adresine gidin"
echo "2. admin / admin123 ile giriş yapın"
echo "3. Sağ üst köşedeki bildirim ikonuna tıklayın"
