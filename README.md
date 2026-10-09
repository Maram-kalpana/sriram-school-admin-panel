# Scholar Store — Admin Panel

Standalone admin app for **Scholar Store** (school uniforms / kits).  
Separate from the student storefront ([school-store-ouwm.vercel.app](https://school-store-ouwm.vercel.app/)).  
This backend **owns the MySQL schema and Knex migrations**.

See [docs/STOREFRONT_CONTRACT.md](docs/STOREFRONT_CONTRACT.md) for the storefront HTTP API and Paytm JS Checkout.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React (JSX) + Vite + React Router + Material UI + Recharts |
| Backend | Node.js + Express (**CommonJS only**, `require` / `module.exports`) |
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
**Seed students:** `10101` P Sandeep/Red, `10102` Kalpana/Red, `10103` Ismail/Yellow, `10104` Mahalaxmi/Green, `10105` Ashok/Blue (Hyderabad, TS)

There is a **single admin** (no Admins or Password pages, no role gates). Change the password in the database if needed.

### 4. Tests

```bash
cd admin-panel/server
npm test
```

## Environment variables

Copy `admin-panel/server/.env.example`. Important keys:

| Variable | Purpose |
| --- | --- |
| `DB_*` | MySQL connection |
| `JWT_SECRET` | Admin cookie JWT |
| `CLIENT_ORIGIN` | CORS origin for the Vite app |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` / `ADMIN_SEED_NAME` | Seeded admin |
| `STOREFRONT_API_KEY` | `x-api-key` for `/api/storefront/*` |
| `UPLOAD_DIR` | Product / logo uploads |
| `SETTINGS_ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256-GCM of Paytm merchant key and SMTP password |
| `API_BASE_URL` | Public API origin; Paytm callback is `{API_BASE_URL}/api/storefront/payments/paytm/callback` |

Paytm MID/key and SMTP are **not** env vars — they are stored in the `settings` table via **Settings** in the admin UI (secrets encrypted).

## SMTP (order / GST daily email)

1. Open **Settings → Email (SMTP)**.
2. Set host, port, secure, user, password, from name/address.
3. Click **Send test email**.
4. On **GST → Daily Email Report**, set admin email, send time, report day, and timezone (`Asia/Kolkata` default). The server runs a cron check every hour and sends when the clock matches.

## Paytm (staging and production)

Credentials live in **Settings → Payments – Paytm** (read at runtime from `settingsService`, never from env).

### Staging

1. Create a Paytm staging merchant at [Paytm for Developers](https://developer.paytm.com/).
2. In admin Settings:
   - Enable Paytm
   - Environment: **Staging** (`https://securegw-stage.paytm.in`)
   - Website name: `WEBSTAGING`
   - Paste MID and Merchant Key
   - Channel ID: `WEB` (or `WAP` for mobile web)
3. Copy the read-only **Callback URL** into the Paytm dashboard.
4. Click **Test connection** (₹1 initiateTransaction signature check).
5. Enable Paytm under **Payment methods** (and optionally reorder vs COD).

### Production

1. Switch Environment to **Production** (`https://securegw.paytm.in`).
2. Website name is typically `DEFAULT` (or the value Paytm assigned).
3. Use live MID / Merchant Key.
4. Set `API_BASE_URL` to the public HTTPS API host so the callback URL is correct.
5. Confirm the Paytm dashboard callback matches that URL.

Storefront checkout: see [docs/STOREFRONT_CONTRACT.md](docs/STOREFRONT_CONTRACT.md#paytm-js-checkout).

## How to test modules

| Area | What to try |
| --- | --- |
| Schema/seed | `npm run migrate && npm run seed` — 5 students, kit, products with HSN/GST, gst_profile (Hyderabad / 36) |
| Auth | Login at `/login`; `/api/auth/me` with cookie; logout |
| Students | Excel import (Upload → Preview → Confirm); re-import does not reset kit status |
| Products | Variant matrix, HSN, GST 0/5/12/18/28, visibility switches |
| Inventory | Restock/adjust with reason; bulk SKU/Qty Excel; low-stock report |
| Kit | Edit items; student picks size / house color; stock warnings |
| Orders | Status + note; cancel restocks; packing slip + pick list; GST invoice PDF |
| Payments | Settings Paytm test; storefront initiate + callback; Orders → Payments tab; refund |
| GST | Documents range, summary, tax mapping, business profile, test email |
| Dashboard | KPI cards and Recharts |
| Storefront API | `x-api-key` on `/api/storefront/login` and `/catalog` |

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
4. Set production secrets: `JWT_SECRET`, `COOKIE_SECURE=true`, `CLIENT_ORIGIN`, `STOREFRONT_API_KEY`, `SETTINGS_ENCRYPTION_KEY`, `API_BASE_URL`.
