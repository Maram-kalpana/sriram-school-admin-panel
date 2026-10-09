const db = require('../config/db');
const env = require('../config/env');
const {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isMaskedPlaceholder,
} = require('../utils/cryptoSecrets');

const SECRET_KEYS = new Set([
  'paytm_merchant_key',
  'smtp_password',
]);

const DEFAULTS = {
  school_name: 'Scholar Store',
  school_logo: null,
  contact_email: '',
  contact_phone: '',
  order_number_prefix: 'SS',
  shipping_fee: 0,
  free_shipping_threshold: null,
  catalog_switch_rule: 'after_kit_order',
  allow_kit_reorder: false,
  extra_login_check: 'none',
  low_stock_default_threshold: 5,
  allow_student_edit_address: false,
  paytm_enabled: false,
  paytm_environment: 'staging',
  paytm_mid: '',
  paytm_merchant_key: '',
  paytm_website: 'WEBSTAGING',
  paytm_industry_type: 'Retail',
  paytm_channel_id: 'WEB',
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_password: '',
  smtp_from_name: 'Scholar Store',
  smtp_from_email: '',
  payment_methods: [
    { id: 'paytm', label: 'Paytm', enabled: false },
    { id: 'cod', label: 'Cash on Delivery / Pay at school', enabled: true },
  ],
  gst_email_to: '',
  gst_email_time: '08:00',
  gst_email_report_day: 'yesterday',
  gst_email_timezone: 'Asia/Kolkata',
};

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5000;

function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function invalidateCache() {
  cache = null;
  cacheAt = 0;
}

async function loadRawMap() {
  const rows = await db('settings').select('setting_key', 'setting_value');
  const map = { ...DEFAULTS };
  rows.forEach((r) => {
    map[r.setting_key] = parseJson(r.setting_value);
  });
  return map;
}

/** Internal: decrypted secrets for server-side use (Paytm, SMTP). */
async function getSettings() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) {
    return { ...cache };
  }
  const map = await loadRawMap();
  SECRET_KEYS.forEach((key) => {
    if (map[key]) {
      try {
        map[key] = decryptSecret(map[key]);
      } catch {
        map[key] = '';
      }
    }
  });
  cache = map;
  cacheAt = now;
  return { ...map };
}

/** Public admin API shape — secrets masked. */
async function getPublicSettings() {
  const map = await loadRawMap();
  const publicMap = { ...map };
  SECRET_KEYS.forEach((key) => {
    publicMap[key] = map[key] ? maskSecret(map[key]) : '';
    publicMap[`${key}_set`] = Boolean(map[key]);
  });
  publicMap.paytm_callback_url = `${env.apiBaseUrl.replace(/\/$/, '')}/api/storefront/payments/paytm/callback`;
  return publicMap;
}

async function setSetting(key, value) {
  let storeValue = value;
  if (SECRET_KEYS.has(key)) {
    if (isMaskedPlaceholder(value) || value === undefined) {
      return; // keep existing
    }
    storeValue = value ? encryptSecret(value) : '';
  }
  await db('settings')
    .insert({
      setting_key: key,
      setting_value: JSON.stringify(storeValue),
    })
    .onConflict('setting_key')
    .merge({
      setting_value: JSON.stringify(storeValue),
      updated_at: db.fn.now(),
    });
  invalidateCache();
}

async function updateSettings(partial) {
  const entries = Object.entries(partial || {});
  for (const [key, value] of entries) {
    if (!(key in DEFAULTS) && !SECRET_KEYS.has(key) && key !== 'payment_methods') {
      // allow known defaults + secrets + payment_methods
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
        // still allow dynamic keys used by the app
      }
    }
    if (SECRET_KEYS.has(key) && (isMaskedPlaceholder(value) || value === '' || value == null)) {
      if (isMaskedPlaceholder(value)) continue;
      if (value === '' || value == null) {
        // explicit clear
        await setSetting(key, '');
        continue;
      }
    }
    await setSetting(key, value);
  }
  return getPublicSettings();
}

async function ensureDefaults() {
  const existing = await db('settings').select('setting_key');
  const have = new Set(existing.map((r) => r.setting_key));
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!have.has(key)) {
      await db('settings').insert({
        setting_key: key,
        setting_value: JSON.stringify(value),
      });
    }
  }
  invalidateCache();
}

module.exports = {
  DEFAULTS,
  SECRET_KEYS,
  getSettings,
  getPublicSettings,
  updateSettings,
  setSetting,
  invalidateCache,
  ensureDefaults,
};
