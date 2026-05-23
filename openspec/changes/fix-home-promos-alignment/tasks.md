## fix/home-promos-alignment

Work units implemented in this apply batch

- [x] 1. Create branch `fix/home-promos-alignment`
- [x] 2. Update `next-app/pages/api/home-data.js` to fix variable naming, select static promo fields, and remove arbitrary .limit(20) seed before filtering
- [x] 3. Update `next-app/components/home/ProductCard.js` to resolve a single promo per product and use it for badge and transfer discount calculation
- [x] 4. Verify `PromoCarousel.js` uses enriched product fields (no code change needed beyond enrichment)
- [x] 5. Run verification: `node verify-setup.js`, `npm ci`, `npm run build`, `npm run test:prod` — build succeeded locally
- [x] 6. Commit with conventional commit message and push branch

Notes:
- Changes are minimal and surgical; no unrelated files modified except this tasks artifact.
