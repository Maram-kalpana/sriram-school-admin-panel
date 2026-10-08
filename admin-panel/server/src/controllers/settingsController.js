const { z } = require('zod');
const bcrypt = require('bcryptjs');
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

async function listAdmins(req, res, next) {
  try {
    const rows = await db('admin_users').select('id', 'name', 'email', 'role', 'is_active', 'created_at');
    res.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['super_admin', 'staff']).default('staff'),
    });
    const body = schema.parse(req.body);
    const exists = await db('admin_users').where({ email: body.email }).first();
    if (exists) throw new AppError('Email already exists', 409);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const [id] = await db('admin_users').insert({
      name: body.name,
      email: body.email,
      password_hash: passwordHash,
      role: body.role,
      is_active: true,
    });
    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function updateAdmin(req, res, next) {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      role: z.enum(['super_admin', 'staff']).optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
    });
    const body = schema.parse(req.body);
    const admin = await db('admin_users').where({ id: req.params.id }).first();
    if (!admin) throw new AppError('Admin not found', 404);
    const patch = { updated_at: db.fn.now() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.role !== undefined) patch.role = body.role;
    if (body.isActive !== undefined) patch.is_active = body.isActive;
    if (body.password) patch.password_hash = await bcrypt.hash(body.password, 12);
    await db('admin_users').where({ id: admin.id }).update(patch);
    res.json({ success: true, message: 'Admin updated' });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  listAdmins,
  createAdmin,
  updateAdmin,
};
