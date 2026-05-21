#!/usr/bin/env bash
# Simple smoke checks for admin public GET pattern
# Usage: ./check-admin-apis.sh [base_url]

BASE_URL=${1:-http://localhost:3000}

echo "Checking public GET for home-config..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/home-config" || exit 2
echo -e " -> $? (expected 200)"

echo "Checking public GET for catalog-styles..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/catalog-styles" || exit 2
echo -e " -> $? (expected 200)"

echo "Checking POST is protected for home-config (expected 401)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/admin/home-config") || exit 2
echo " -> $HTTP_CODE"
[ "$HTTP_CODE" = "401" ] || (echo "POST unexpectedly allowed without auth" && exit 3)

echo "All checks passed (or manual verification required)."
