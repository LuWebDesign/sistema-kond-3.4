#!/usr/bin/env bash
# check-website.sh — smoke checks for /admin/website API routes
# Run with the dev server up: bash skills/admin-website-kond/assets/check-website.sh
# Optional: BASE_URL=https://your-deployment.vercel.app bash check-website.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $label — expected HTTP $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== /admin/website API smoke checks ==="
echo "Base URL: $BASE_URL"
echo ""

# home-config: GET should be public (200), PUT without cookie should be 401
echo "--- home-config ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/home-config")
check "GET /api/admin/home-config is public (200)" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Content-Type: application/json" \
  -d '{"config":{}}' \
  "$BASE_URL/api/admin/home-config")
check "PUT /api/admin/home-config without cookie is 401" "401" "$STATUS"

# catalog-styles: GET public (200), PUT without cookie 401
echo "--- catalog-styles ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/catalog-styles")
check "GET /api/admin/catalog-styles is public (200)" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Content-Type: application/json" \
  -d '{"config":{}}' \
  "$BASE_URL/api/admin/catalog-styles")
check "PUT /api/admin/catalog-styles without cookie is 401" "401" "$STATUS"

# payment-config: GET protected (401), PUT protected (401)
echo "--- payment-config ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/payment-config")
check "GET /api/admin/payment-config without cookie is 401" "401" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Content-Type: application/json" \
  -d '{"config":{}}' \
  "$BASE_URL/api/admin/payment-config")
check "PUT /api/admin/payment-config without cookie is 401" "401" "$STATUS"

# home-data: GET public (used by destacados)
echo "--- home-data ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/home-data")
check "GET /api/home-data is public (200)" "200" "$STATUS"

# categorias: GET public (used by secciones and categorias subpages)
echo "--- categorias ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/categorias")
check "GET /api/categorias is public (200)" "200" "$STATUS"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
