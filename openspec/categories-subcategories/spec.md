# Spec: categories-subcategories

## Purpose

Define the behavioral requirements for adding two-level category/subcategory support to the product catalog, including DB migration, admin CRUD, a dedicated "Add Product" page, and SEO-friendly public routes.

---

## 1. DB Migration

### Requirement: Create `categorias` Table

The system MUST create a `categorias` table with `id`, `nombre`, `slug`, `parent_id NULLABLE` (self-FK), and `created_at`. Depth MUST be capped at 1 (category → subcategory). The column `categoria_id` (FK → categorias) MUST be added to `productos`; the existing `categoria TEXT` column MUST NOT be dropped.

#### Scenario: Migration runs clean on empty DB

- GIVEN a fresh Supabase staging instance
- WHEN `sql-migrations/2026-05-02-add-categorias.sql` is applied
- THEN `categorias` table exists with correct columns and constraints
- AND `productos.categoria_id` column exists as nullable FK

#### Scenario: Migration is idempotent

- GIVEN the migration was already applied
- WHEN the script is run again
- THEN no error is thrown (uses `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)

---

## 2. Mapping Script

### Requirement: Map Free-Text `categoria` to `categoria_id`

The script `next-app/scripts/map-categoria-to-id.js` MUST perform exact case-sensitive match between `productos.categoria` and `categorias.nombre`. It MUST support `--dry-run` (log only) and `--apply` flags. Unmatched rows MUST be logged to stdout with product id and unmatched value; they MUST NOT be updated.

#### Scenario: Dry-run produces log without writes

- GIVEN products with mixed matching/non-matching `categoria` values
- WHEN the script runs with `--dry-run`
- THEN matched and unmatched counts are printed
- AND no rows in `productos` are modified

#### Scenario: Apply updates only exact matches

- GIVEN products with `categoria = 'Remeras'` and a `categorias` row with `nombre = 'Remeras'`
- WHEN the script runs with `--apply`
- THEN `productos.categoria_id` is set for matched rows
- AND rows with no match remain `NULL` and are logged

#### Scenario: No matching categories found

- GIVEN no `categorias` rows exist
- WHEN the script runs with `--apply`
- THEN zero rows are updated and all products are logged as unmatched

---

## 3. Admin API — Categorías CRUD

### Requirement: CRUD Endpoints for Categorías

The API MUST expose routes under `next-app/pages/api/admin/categorias/`:
- `GET /api/admin/categorias` — list all categories with their subcategories
- `POST /api/admin/categorias` — create category or subcategory
- `PUT /api/admin/categorias/[id]` — update nombre/slug/parent_id
- `DELETE /api/admin/categorias/[id]` — delete if no products reference it

All endpoints MUST require admin session. Responses MUST use explicit column projection (no `select(*)`).

#### Scenario: List returns tree structure

- GIVEN categories `Ropa (id=1)` and `Remeras (id=2, parent_id=1)`
- WHEN `GET /api/admin/categorias` is called with valid admin session
- THEN response includes parent with nested subcategories array

#### Scenario: Delete blocked by product reference

- GIVEN a subcategory has products assigned (`categoria_id = X`)
- WHEN `DELETE /api/admin/categorias/X` is called
- THEN response is `409 Conflict` with message explaining the block

#### Scenario: Unauthenticated request rejected

- GIVEN no admin session
- WHEN any CRUD endpoint is called
- THEN response is `401 Unauthorized`

#### Scenario: Depth guard on create

- GIVEN a subcategory (depth=1) already exists
- WHEN `POST /api/admin/categorias` is called with `parent_id` pointing to that subcategory
- THEN response is `400 Bad Request` with message "max depth exceeded"

---

## 4. Admin — "Agregar Producto" Page

### Requirement: Dedicated Add-Product Page

The page `next-app/pages/admin/productos/new.js` MUST render a form that allows selecting a subcategory (or root category) via a two-level dropdown, in addition to existing product fields. On submit it MUST create the product with `categoria_id` set. The legacy `categoria TEXT` field MUST be pre-filled with the selected category's `nombre` for backward compatibility.

#### Scenario: Subcategory dropdown populated

- GIVEN categories and subcategories exist in DB
- WHEN the admin opens `/admin/productos/new`
- THEN a two-level selector shows parent categories and their subcategories

#### Scenario: Successful product creation

- GIVEN the admin fills all required fields and selects a subcategory
- WHEN the form is submitted
- THEN a new product is created with `categoria_id` and `categoria` (text) set
- AND the admin is redirected to the product list

#### Scenario: Submit without category selection

- GIVEN the admin leaves the category field empty
- WHEN the form is submitted
- THEN a validation error is shown and no product is created

---

## 5. Admin — Categorías Management Pages

### Requirement: Admin UI for Categorías CRUD

Pages under `next-app/pages/admin/categorias/` MUST provide: list view (index), create form, edit form, delete confirmation. Changes MUST invalidate the relevant TanStack Query cache keys (no direct `refetch()`).

#### Scenario: Create subcategory

- GIVEN the admin is on `/admin/categorias/new`
- WHEN they fill `nombre`, `slug`, and select a parent category
- THEN the subcategory is created and the list page shows it nested under the parent

#### Scenario: Edit renames category

- GIVEN a category exists
- WHEN the admin updates `nombre` and saves
- THEN the updated name is reflected in list and product forms

#### Scenario: Delete with confirmation

- GIVEN a category with no product references
- WHEN the admin clicks delete and confirms
- THEN the category is removed and the list is refreshed

---

## 6. Public SEO Routes

### Requirement: Category-Based Product URLs

The route `next-app/pages/productos/[categoria]/[slug].js` MUST render a product detail page. The `categoria` segment MUST match `categorias.slug`. The `slug` segment MUST match `productos.slug`. The page MUST use `getStaticProps` + `getStaticPaths` for SSG. Both `categoria` and `slug` MUST be present in the URL for the page to render.

#### Scenario: Valid category/slug renders product

- GIVEN a product with slug `remera-blanca` under category slug `remeras`
- WHEN `/productos/remeras/remera-blanca` is accessed
- THEN the product detail page renders with correct data

#### Scenario: Unknown slug returns 404

- GIVEN no product matches the slug
- WHEN the route is accessed
- THEN `notFound: true` is returned and a 404 page is shown

#### Scenario: Category mismatch returns 404

- GIVEN a product exists but under a different category slug
- WHEN the URL uses the wrong category segment
- THEN `notFound: true` is returned

---

## 7. Tests

### Requirement: Integration Tests for Category Features

The file `next-app/test-product-categories.test.js` MUST cover: mapping script logic, API CRUD endpoints (happy path + error cases), and category dropdown rendering in the new product page. No strict TDD; tests are written after implementation.

#### Scenario: Mapping script test — exact match

- GIVEN mocked DB rows with matching `categoria` and `categorias.nombre`
- WHEN the mapping function runs
- THEN matched IDs are returned and unmatched are flagged

#### Scenario: API delete conflict test

- GIVEN a category with product references (mocked)
- WHEN the delete handler is invoked
- THEN a 409 response is returned

---

## Constraints

| Constraint | Rule |
|---|---|
| Column `categoria TEXT` | MUST NOT be dropped until migration is validated |
| Query projection | MUST NOT use `select('*')` — always explicit columns |
| Auth | All admin endpoints require valid admin session |
| Depth | `categorias.parent_id` depth limited to 1 level |
| Query invalidation | MUST use `invalidateQueries`, never `refetch()` |
| Mapping | Exact case-sensitive match only; log unmatched |
| SSG | Public product route MUST use `getStaticPaths` + `getStaticProps` |
| Backward compat | `productos.categoria` (text) populated alongside `categoria_id` |
