const { z } = require('zod');
const db = require('../config/db');
const AppError = require('../utils/AppError');

const SETTINGS_KEYS = [
  'catalog_switch_rule',
  'extra_login_check',
  'allow_kit_reorder',
  'shipping_fee',
  'school_name',
  'school_logo',
  'order_number_prefix',
];

function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function getSettings(req, res, next) {
  try {
    const rows = await db('settings').whereIn('setting_key', SETTINGS_KEYS);
    const settings = {};
    rows.forEach((r) => {
      settings[r.setting_key] = parseJson(r.setting_value);
    });
    res.json({ success: true, data: { settings } });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const schema = z.object({
      catalog_switch_rule: z.enum(['after_kit_order', 'after_first_login']).optional(),
      extra_login_check: z.enum(['none', 'zipcode', 'parent_phone']).optional(),
      allow_kit_reorder: z.boolean().optional(),
      shipping_fee: z.coerce.number().nonnegative().optional(),
      school_name: z.string().min(1).optional(),
      school_logo: z.string().nullable().optional(),
      order_number_prefix: z.string().min(1).max(10).optional(),
    });
    const body = schema.parse(req.body);
    for (const [key, value] of Object.entries(body)) {
      await db('settings')
        .insert({
          setting_key: key,
          setting_value: JSON.stringify(value),
        })
        .onConflict('setting_key')
        .merge({
          setting_value: JSON.stringify(value),
          updated_at: db.fn.now(),
        });
    }
    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
