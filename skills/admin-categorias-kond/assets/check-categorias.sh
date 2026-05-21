#!/usr/bin/env bash
# Smoke checks for admin categorias pages and API

BASE_DIR=$(cd "$(dirname "$0")/.." && pwd)
ROOT_DIR="$BASE_DIR/../../"

echo "Checking admin categorias pages exist..."
[ -f "$ROOT_DIR/next-app/pages/admin/categorias/index.js" ] || (echo "index.js missing" && exit 2)
[ -f "$ROOT_DIR/next-app/pages/admin/categorias/nueva.js" ] || (echo "nueva.js missing" && exit 2)
[ -f "$ROOT_DIR/next-app/pages/admin/categorias/[id]/editar.js" ] || (echo "editar.js missing" && exit 2)

echo "Checking API guard presence in next-app/pages/api/admin/categorias*"
grep -R "verifyAdminCookie" "$ROOT_DIR/next-app/pages/api/admin/categorias" || echo "Warning: verifyAdminCookie not found; ensure API endpoints are protected"

echo "Checking client pages use withAdminAuth"
grep -R "withAdminAuth" "$ROOT_DIR/next-app/pages/admin/categorias" || echo "Warning: withAdminAuth wrapper not found in categorias pages"

echo "Check done (manual verification recommended for DB constraints and product references)."
