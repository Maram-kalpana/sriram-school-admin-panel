const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query } = require('../db');
const { validate } = require('../middleware/validate');
const { requireSuperAdmin } = require('../middleware/auth');
const { getSettings, setSettings } = require('../services/settings');
const { fail } = require('../errors');

const router = express.Router();

router.get('/stats', async (req, res, next) => {
  try {
    const students = (await query('SELECT COUNT(*) AS c FROM students'))[0];
    const loggedIn = (await query('SELECT COUNT(*) AS c FROM students WHERE first_login_at IS NOT NULL'))[0];
    const kitOrders = (await query(`SELECT COUNT(*) AS c FROM orders WHERE type = 'kit' AND status NOT IN ('cancelled')`))[0];
    const indOrders = (await query(`SELECT COUNT(*) AS c FROM orders WHERE type = 'individual' AND status NOT IN ('cancelled')`))[0];
    const revenue = (await query(`SELECT COALESCE(SUM(total),0) AS c FROM orders WHERE status NOT IN ('cancelled','returned')`))[0];
    const pending = (await query(`SELECT COUNT(*) AS c FROM orders WHERE status IN ('placed','confirmed')`))[0];
    const lowStock = (await query(`SELECT COUNT(*) AS c FROM product_variants WHERE is_active = 1 AND stock_qty > 0 AND stock_qty <= low_stock_threshold`))[0];
    const recent = await query(
      `SELECT o.id, o.order_number, o.type, o.status, o.total, o.created_at, s.student_name, s.admission_number
       FROM orders o JOIN students s ON s.id = o.student_id
       ORDER BY o.id DESC LIMIT 8`
    );
    const perDay = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS orders
       FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
       GROUP BY DATE(created_at) ORDER BY day`
    );
    res.json({
      data: {
        cards: {
          students: students.c,
          logged_in: loggedIn.c,
          kit_orders: kitOrders.c,
          individual_orders: indOrders.c,
          revenue: revenue.c,
          pending_orders: pending.c,
          low_stock: lowStock.c,
        },
        recent,
        perDay,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/settings', async (req, res, next) => {
  try {
    res.json({ data: await getSettings() });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', validate(z.object({
  body: z.object({
    kit_to_individual_rule: z.enum(['after_kit_order', 'after_first_login']).optional(),
    require_second_factor: z.enum(['off', 'zipcode', 'parent_phone']).optional(),
    shipping_flat_fee: z.union([z.string(), z.number()]).optional(),
    school_name: z.string().optional(),
    school_logo: z.string().optional(),
    allow_address_edit: z.union([z.string(), z.boolean()]).optional(),
    allow_kit_reorder: z.union([z.string(), z.boolean()]).optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const body = { ...req.validated.body };
    if (typeof body.allow_address_edit === 'boolean') body.allow_address_edit = String(body.allow_address_edit);
    if (typeof body.allow_kit_reorder === 'boolean') body.allow_kit_reorder = String(body.allow_kit_reorder);
    res.json({ data: await setSettings(body) });
  } catch (err) {
    next(err);
  }
});

router.get('/admins', requireSuperAdmin, async (req, res, next) => {
  try {
    const rows = await query('SELECT id, email, role, is_active, created_at FROM admin_users ORDER BY id');
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/admins', requireSuperAdmin, validate(z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['super_admin', 'staff']),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const { email, password, role } = req.validated.body;
    const hash = await bcrypt.hash(password, 10);
    try {
      const result = await query(
        'INSERT INTO admin_users (email, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
        [email.toLowerCase(), hash, role]
      );
      res.status(201).json({ data: { id: result.insertId, email, role } });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') throw fail('Email already exists');
      throw e;
    }
  } catch (err) {
    next(err);
  }
});

router.patch('/admins/:id', requireSuperAdmin, validate(z.object({
  body: z.object({
    is_active: z.boolean().optional(),
    role: z.enum(['super_admin', 'staff']).optional(),
    password: z.string().min(8).optional(),
  }),
  query: z.any().optional(),
  params: z.object({ id: z.string() }),
})), async (req, res, next) => {
  try {
    const d = req.validated.body;
    const fields = [];
    const params = [];
    if (d.is_active != null) { fields.push('is_active = ?'); params.push(d.is_active ? 1 : 0); }
    if (d.role) { fields.push('role = ?'); params.push(d.role); }
    if (d.password) {
      fields.push('password_hash = ?');
      params.push(await bcrypt.hash(d.password, 10));
    }
    if (!fields.length) throw fail('No changes');
    params.push(req.params.id);
    await query(`UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
