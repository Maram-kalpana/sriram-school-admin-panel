# Scholar Store — Admin Panel

Standalone admin app for **Scholar Store** (school uniforms / kits).  
Separate from the student storefront ([school-store-ouwm.vercel.app](https://school-store-ouwm.vercel.app/)).  
This backend **owns the MySQL schema and Knex migrations**.

See [docs/STOREFRONT_CONTRACT.md](docs/STOREFRONT_CONTRACT.md) for how the storefront shares the DB / API.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React (JSX) + Vite + React Router + Tailwind + TanStack Table + Recharts |
| Backend | Node.js + Express (**CommonJS only**) |
| DB | MySQL 8 + Knex (migrations, seeds, queries) |

```
admin-panel/
  server/   Express API, Knex migrations & seeds
  client/   Vite React admin UI
docs/       Storefront contract
```

## Local setup

### 1. MySQL

**Docker:**

```bash
docker compose up -d
```

**Or local/XAMPP:** create DB `scholar_store` and user matching `.env`.

### 2. Server

```bash
cd admin-panel/server
copy .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

API: http://localhost:4000/api/health

### 3. Client

```bash
cd admin-panel/client
npm install
npm run dev
```

UI: http://localhost:5173/login  

**Seed admin:** `admin@scholarstore.local` / `Admin@12345` (from env)  
**Seed students:** `10101`–`10105` (Hyderabad, TS)

### 4. Tests

```bash
cd admin-panel/server
npm test
```

## How to test modules

| Step | What to try |
| --- | --- |
| 1 Schema/seed | `npm run migrate && npm run seed` — 5 students, kit, ~10 products |
| 2 Auth | Login at `/login`; hit `/api/auth/me` with cookie; change password |
| 3 Students | Import Excel (preview → commit); re-import does not reset kit status |
| 4 Products | Categories CRUD; add product with variant matrix + images |
| 5 Inventory | Restock/adjust with note; bulk SKU/Qty Excel |
| 6 Kit | Edit School Kit items; see stock warnings |
| 7 Orders | Status changes; cancel restocks; packing slip + pick list |
| 8 Dashboard/Settings | Cards + chart; settings (super_admin); admin users |
| 9 Storefront API | `x-api-key` on `/api/storefront/login` and `/catalog` |

Storefront API example:

```bash
curl -H "x-api-key: dev-storefront-api-key" -H "Content-Type: application/json" ^
  -d "{\"admissionNumber\":\"10101\"}" http://localhost:4000/api/storefront/login
```

## Deploy

1. Provision **MySQL 8**; set `DB_*` env vars.  
2. Deploy **admin-panel/server** on a Node host (Railway, Render, VPS).  
   - Build/start: `npm install && npm run migrate && npm start`  
   - Seed once: `npm run seed`  
3. Deploy **admin-panel/client** to Vercel/Netlify.  
   - Proxy `/api` and `/uploads` to the API origin (or set Axios `baseURL`).  
4. Set production secrets: `JWT_SECRET`, `COOKIE_SECURE=true`, `CLIENT_ORIGIN`, `STOREFRONT_API_KEY`.

## Roles

- **super_admin** — everything (settings, admin users, deletes)  
- **staff** — no settings/admin-user management; cannot delete students/products  
