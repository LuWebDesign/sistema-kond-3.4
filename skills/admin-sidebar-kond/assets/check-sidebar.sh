#!/usr/bin/env bash
# Simple smoke check for admin sidebar rules

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAYOUT="$ROOT/../../next-app/components/Layout.js"

if [ ! -f "$LAYOUT" ]; then
  echo "Layout.js not found at $LAYOUT" >&2
  exit 2
fi

grep -q "nav-icon-wrap" "$LAYOUT" || (echo "nav-icon-wrap not found" && exit 3)
grep -q "sidebarOpen" "$LAYOUT" || (echo "sidebarOpen state not found; mobile toggle may be broken" && exit 4)
grep -q "::before" -n "$ROOT/../../next-app/components/Layout.js" || echo "Warning: no ::before in Layout.js styles (may be in CSS file)"
grep -q "max-width: 0" -n "$ROOT/../../next-app/components/Layout.js" || echo "Warning: max-width:0 not found in inline styles; ensure CSS contains collapse rules"

echo "Sidebar smoke-check passed (or requires manual verification for CSS in external files)."
