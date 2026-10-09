# Storefront contract (Scholar Store)

The **student storefront** is a separate app (e.g. [school-store-ouwm.vercel.app](https://school-store-ouwm.vercel.app/)).  
It shares this **MySQL** database. The **admin backend owns schema + migrations**.

The storefront may either:

1. Connect to MySQL directly and follow the rules below, or  
2. Call the admin server’s `/api/storefront/*` HTTP API with header `x-api-key: STOREFRONT_API_KEY`.

---

## Login

Find a student by `admission_number` where `is_active = 1`.

Optional second factor from `settings.extra_login_check`:

| Value | Check |
| --- | --- |
| `none` | Admission number only |
| `zipcode` | Must also send matching `zipcode` |
| `parent_phone` | Must also send matching `phone` |

On success, set `last_login_at` (and `first_login_at` if null).

---

## Catalog mode per student

```
if catalog_override = force_kit        → kit
if catalog_override = force_individual → individual
if catalog_override = default:
  if catalog_switch_rule = after_kit_order:
    kit_status = ordered → individual else kit
  if catalog_switch_rule = after_first_login:
    first_login_at set → individual else kit
```

### Kit mode

Show only the active kit (`kits.is_active = 1`) and its `kit_items`.  
Per item: student may pick size (`student_picks_size`) and/or auto-match house color (`auto_match_house_color`).

### Individual mode

Show products where:

- `status = 'active'`
- `visible_individually = 1`
- at least one variant with `is_active = 1` and `stock_qty > 0`

---

## Order placement (single transaction)

Must run in **one DB transaction**:

1. `SELECT ... FOR UPDATE` on each ordered `product_variants` row  
2. Re-check stock; reject if insufficient  
3. Decrement `stock_qty` (never negative)  
4. Insert `stock_movements` with reason `'order'`  
5. Insert `orders` + `order_items` with name/sku/option **snapshots**  
6. Insert `order_status_history` (`placed`)  
7. For kit orders: set `students.kit_status = 'ordered'`

Enforce mode server-side: a student in **kit mode** must not place **individual** orders.

`settings.allow_kit_reorder` controls whether kit can be ordered again after `kit_status = ordered`.

Order numbers: `{order_number_prefix}-{YYYY}-{######}` (e.g. `SS-2026-000123`).

---

## HTTP API (`/api/storefront`)

All routes require header:

```http
x-api-key: <STOREFRONT_API_KEY>
```

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/storefront/login` | Body: `{ admissionNumber, secondFactor? }` |
| `GET` | `/api/storefront/catalog?admissionNumber=` | Kit or product catalog for that student |
| `POST` | `/api/storefront/orders` | Place kit/individual order (transactional) |
| `GET` | `/api/storefront/orders?admissionNumber=` | Student order history |
| `POST` | `/api/storefront/payments/paytm/initiate` | Create/load pending Paytm order; returns `txnToken` (requires `x-api-key`) |
| `POST` | `/api/storefront/payments/paytm/callback` | Paytm server/browser callback (**public**, checksum + status API; rate limited) |
| `GET` | `/api/storefront/payments/paytm/status/:orderNumber` | Poll payment status after checkout (requires `x-api-key`) |

Error shape (same as admin API):

```json
{ "success": false, "message": "...", "errors": [] }
```

---

## Paytm JS Checkout

Paytm credentials are configured in the **admin Settings** UI (not env). Staging host: `securegw-stage.paytm.in`. Production host: `securegw.paytm.in`.

### 1. Create a pending order and get a token

`POST /api/storefront/payments/paytm/initiate` with `x-api-key` and either:

- `{ orderNumber }` / `{ orderId }` for an existing pending order, or
- the same body as `POST /api/storefront/orders` plus Paytm as the method (the API creates the order, **reserves stock**, `payment_status: pending`).

Response:

```json
{
  "success": true,
  "data": {
    "txnToken": "…",
    "mid": "YOUR_MID",
    "orderId": "SS-2026-000001-1710000000000",
    "amount": "2499.00",
    "orderNumber": "SS-2026-000001",
    "host": "securegw-stage.paytm.in"
  }
}
```

### 2. Open Paytm Checkout JS

Load the merchant script (staging or production host from `data.host`):

```text
https://{host}/merchantpgpui/checkoutjs/merchants/{MID}.js
```

Then invoke checkout with the `txnToken`, Paytm `orderId`, `mid`, and amount. Example:

```js
function onScriptLoad({ txnToken, orderId, mid, amount }) {
  const config = {
    root: '',
    flow: 'DEFAULT',
    data: { orderId, token: txnToken, tokenType: 'TXN_TOKEN', amount },
    merchant: { mid },
    handler: {
      transactionStatus() {
        /* optional UI; never mark paid from this callback alone */
      },
      notifyMerchant(eventName) {
        if (eventName === 'APP_CLOSED') {
          /* user dismissed checkout */
        }
      },
    },
  };
  if (window.Paytm && window.Paytm.CheckoutJS) {
    window.Paytm.CheckoutJS.init(config).then(() => {
      window.Paytm.CheckoutJS.invoke();
    });
  }
}
```

Do **not** treat the browser `transactionStatus` handler as proof of payment. The admin API verifies `CHECKSUMHASH` and then calls Paytm **Transaction Status** (`/v3/order/status`) before setting `payment_status = paid`.

### 3. After redirect / close, poll status

```http
GET /api/storefront/payments/paytm/status/{orderNumber}
x-api-key: <STOREFRONT_API_KEY>
```

Poll until `paymentStatus` is `paid` or `failed`. On success the order is `confirmed`, an invoice number is assigned, and reserved stock is finalized. Unpaid Paytm orders older than 30 minutes are expired by cron (stock reservation released).

COD / pay-at-school orders skip Paytm: stock is finalized immediately when the order is placed.
