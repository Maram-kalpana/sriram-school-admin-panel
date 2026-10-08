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

## Next steps

- **Step 2:** Auth, roles, React app shell / login / layout  
- **Step 3:** Students + Excel import  
- …through dashboard, storefront API, tests (see project brief)

## Deploy notes (later)

- API needs a Node host (Railway, Render, VPS) with MySQL (PlanetScale, RDS, managed MySQL).
- Run `npm run migrate` then `npm run seed` once against production.
- Admin client (Vite) deploys to Vercel/Netlify; set `CLIENT_ORIGIN` and proxy `/api` to the API host.
