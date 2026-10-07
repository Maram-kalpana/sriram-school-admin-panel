# Proposed stack (step 1)

The `school-admin` folder was empty (no existing storefront to wire). This repo is a full-stack school uniform store: student shop + `/admin`.

## Stack (as requested)

| Layer | Choice |
| --- | --- |
| Admin + storefront UI | React 18 **JSX** (Vite), React Router |
| API | Node.js **CommonJS (`require`)** + Express |
| Validation | Zod on every API route |
| Database | **MySQL 8** (`mysql2` pool + transactions). JSON columns instead of Postgres JSONB |
| Auth | bcryptjs + JWT in **httpOnly** cookies (`admin_token`, `student_token`). Origin check on mutating requests |
| Files | Local `/uploads` (product images, Excel). Image URLs stored as JSON arrays |
| Excel | `xlsx` parsed **server-side** |
| Tests | Node `node:test` |

## Layout

- `server/` — Express API, migrations, seed, unit tests
- `client/` — React app: storefront at `/`, admin at `/admin`
- `docker-compose.yml` — MySQL 8 (CLI is not required on the host)

Vite proxies `/api` and `/uploads` to the API (`PORT`, default 4000).

## Next

Step 2: MySQL schema, migrate runner, seed (admin, kit, products, 5 students).
