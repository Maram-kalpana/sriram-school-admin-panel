# School Store (admin + student shop)

React **JSX** storefront and `/admin` console, Node.js **CommonJS (`require`)** API, **MySQL 8**.

The original folder was empty, so this repo includes both the student shop and the admin panel.

## Stack

- **client/** — Vite + React 18 (JSX) + React Router
- **server/** — Express, `mysql2`, Zod, bcryptjs, JWT httpOnly cookies
- **docker-compose.yml** — MySQL 8 (optional if you already run MySQL/XAMPP)

## Setup

1. Copy env and edit if needed:

```bash
copy .env.example .env
```

2. Start MySQL (pick one):

```bash
docker compose up -d
```

Or use local MySQL and create database `school_store`, then set `MYSQL_USER` / `MYSQL_PASSWORD` in `.env`.

3. Install and migrate:

```bash
cd server
npm install
npm run migrate
npm run seed
npm test
npm run dev
```

4. In another terminal:

```bash
cd client
npm install
npm run dev
```

- Student shop: http://localhost:5173  
- Admin: http://localhost:5173/admin  

**Seed admin:** `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (defaults `admin@school.local` / `Admin@12345`).  
**Seed students:** admission numbers `10101`–`10105` (P Sandeep/Red, Kalpana/Red, Ismail/Yellow, Mahalaxmi/Green, Ashok/Blue). Login with admission number only.

## How to test (by feature)

| Area | How |
| --- | --- |
| Excel import | Admin → Students → download template, import, confirm preview upsert |
| Catalog mode | Log in as `10101` (kit). Place kit order. Log in again — individual products. |
| Override | Student drawer → Force show / Force hide |
| Stock | Checkout two browsers on last unit — one should get “no longer available” |
| Orders | Admin → change status to cancelled — stock returns |
| 2FA | Settings → require zipcode, then student login asks for PIN |

## Deploy

**API + MySQL** need a Node host (Render, Railway, a VPS). Vercel is a good fit for the **static React app**, not for MySQL.

1. Provision MySQL. Run `npm run migrate` and `npm run seed` on the API host.
2. Set production env: `NODE_ENV=production`, `COOKIE_SECURE=true`, strong JWT secrets, `CLIENT_URL=https://your-app.vercel.app`.
3. API: `cd server && npm start` (or build the client and let Express serve `client/dist` — `app.js` already does this if `dist` exists).
4. **Vercel (frontend):** import `client/`, framework Vite, env none if you reverse-proxy `/api`. Add `vercel.json` rewrites so `/api` and `/uploads` go to your API URL.

Example `client/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://YOUR-API-HOST/api/:path*" },
    { "source": "/uploads/:path*", "destination": "https://YOUR-API-HOST/uploads/:path*" },
    { "source": "/((?!api|uploads).*)", "destination": "/index.html" }
  ]
}
```

Single-service alternative: `cd client && npm run build`, then run only the Node server and point the domain at `PORT`.
