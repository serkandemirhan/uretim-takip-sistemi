#!/bin/bash
# API'yi test et
# Preprod API URL'inizi buraya yazın
API_URL="YOUR_PREPROD_API_URL"  # örn: https://api.yourdomain.com

# 1. Health check
echo "=== Health Check ==="
curl -s "$API_URL/api/health" | jq .

# 2. Login (token al)
echo -e "\n=== Login ==="
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}' | jq -r '.token')

echo "Token: $TOKEN"

# 3. Quotations list
echo -e "\n=== Get Quotations ==="
curl -s -X GET "$API_URL/api/quotations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

# 4. Create Quotation
echo -e "\n=== Create Quotation ==="
curl -s -X POST "$API_URL/api/quotations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Teklif","description":"Test"}' | jq .
