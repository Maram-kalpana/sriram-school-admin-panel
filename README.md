# Scholar Store — Admin Panel

Standalone admin app for **Scholar Store** (school uniforms / kits).  
Separate from the student storefront ([school-store-ouwm.vercel.app](https://school-store-ouwm.vercel.app/)).  
This backend **owns the MySQL schema and Knex migrations**.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React (JSX) + Vite + React Router + Tailwind + TanStack Table |
| Backend | Node.js + Express (**CommonJS only**) |
| DB | MySQL 8 + Knex (migrations, seeds, queries) |

```
admin-panel/
  server/   Express API, Knex migrations & seeds
  client/   Vite React admin UI (from Step 2)
docs/       Storefront contract (Step 9)
```

## Step 1 — Setup database

### 1. Start MySQL

**Option A — Docker:**

```bash
docker compose up -d
```

**Option B — Local MySQL / XAMPP:** create database `scholar_store` and a user matching `.env`.

### 2. Install & migrate

```bash
cd admin-panel/server
copy .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Health check: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### Seed data

| What | Value |
| --- | --- |
| Super admin | `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` (default `admin@scholarstore.local` / `Admin@12345`) |
| Students | `10101`–`10105` (P Sandeep/Red, Kalpana/Red, Ismail/Yellow, Mahalaxmi/Green, Ashok/Blue) — Hyderabad, TS |
| Catalog | ~10 products with size/color variants + stock |
| Kit | School Kit with kit items |

### Verify schema

```bash
mysql -u scholar -pscholar scholar_store -e "SHOW TABLES;"
mysql -u scholar -pscholar scholar_store -e "SELECT admission_number, student_name, house_color FROM students;"
```

## Step 2 — Auth + admin UI shell

```bash
# Terminal 1 (API) — after migrate/seed from Step 1
cd admin-panel/server
npm run dev

# Terminal 2 (UI)
cd admin-panel/client
npm install
npm run dev
```

Open [http://localhost:5173/login](http://localhost:5173/login)  
Login with seeded admin (`admin@scholarstore.local` / `Admin@12345`).

You should see the sidebar layout. Unauthenticated visits to `/admin` redirect to `/login`.  
Change password: `/admin/change-password`.

API checks:

```bash
curl -i -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@scholarstore.local\",\"password\":\"Admin@12345\"}" -c cookies.txt
curl -i http://localhost:4000/api/auth/me -b cookies.txt
```

## Step 3 — Students + Excel import

With API + client running and DB seeded:

1. Open **Students** in the sidebar.
2. Download the sample template, optionally edit, then **Import Excel**.
3. Confirm the preview counts (new / update / invalid), then **Confirm import**.
4. Re-import the same file — `kit_status` / `catalog_override` must not reset.
5. Open a student drawer: reset kit status, change catalog override, toggle active.
6. Inline-edit phone; bulk activate/deactivate; export CSV.

API:

```bash
curl -b cookies.txt -F file=@students.xlsx http://localhost:4000/api/admin/students/import/preview
curl -b cookies.txt -F file=@students.xlsx http://localhost:4000/api/admin/students/import/commit
```

## Next steps

- **Step 4:** Categories, Products, Variants, Images  
- …through dashboard, storefront API, tests

## Deploy notes (later)

- API needs a Node host (Railway, Render, VPS) with MySQL (PlanetScale, RDS, managed MySQL).
- Run `npm run migrate` then `npm run seed` once against production.
- Admin client (Vite) deploys to Vercel/Netlify; set `CLIENT_ORIGIN` and proxy `/api` to the API host.
