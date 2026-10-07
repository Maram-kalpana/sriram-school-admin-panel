const express = require('express');
const { z } = require('zod');
const { query } = require('../db');
const { validate } = require('../middleware/validate');
const { requireStudent, signStudent, cookieOpts } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { fail } = require('../errors');
const { getSettings } = require('../services/settings');
const { resolveCatalogMode } = require('../services/catalogMode');
const { placeOrder } = require('../services/checkout');

const router = express.Router();
const loginLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Admission number not found',
});

function publicStudent(s) {
  return {
    id: s.id,
    admission_number: s.admission_number,
    student_name: s.student_name,
    house_color: s.house_color,
    parent_name: s.parent_name,
    address1: s.address1,
    address2: s.address2,
    city: s.city,
    state: s.state,
    zipcode: s.zipcode,
    phone: s.phone,
    kit_status: s.kit_status,
  };
}

function parseImages(p) {
  if (typeof p.images === 'string') {
    try { p.images = JSON.parse(p.images); } catch { p.images = []; }
  }
  return p;
}

router.get('/bootstrap', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({
      data: {
        school_name: settings.school_name,
        school_logo: settings.school_logo,
        require_second_factor: settings.require_second_factor,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimit, validate(z.object({
  body: z.object({
    admission_number: z.string().min(1),
    second_factor: z.string().optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const admission = req.validated.body.admission_number.trim();
    const settings = await getSettings();
    const rows = await query('SELECT * FROM students WHERE admission_number = ? AND is_active = 1', [admission]);
    if (!rows.length) {
      throw fail('Admission number not found', { status: 401, code: 'UNAUTHORIZED' });
    }
    const student = rows[0];
    let factor = settings.require_second_factor || 'off';
    if (factor === 'parent_phone' && !student.phone) factor = 'zipcode';
    if (factor !== 'off') {
      const given = String(req.validated.body.second_factor || '').trim();
      const expected = factor === 'zipcode' ? student.zipcode : student.phone;
      if (!given || given !== String(expected).trim()) {
        throw fail('Admission number not found', { status: 401, code: 'UNAUTHORIZED' });
      }
    }
    const isFirstLoginSession = !student.first_login_at;
    await query(
      `UPDATE students SET last_login_at = NOW(), first_login_at = COALESCE(first_login_at, NOW()) WHERE id = ?`,
      [student.id]
    );
    const token = signStudent({ ...student, isFirstLoginSession });
    res.cookie('student_token', token, cookieOpts(7 * 24 * 60 * 60 * 1000));
    res.json({ data: publicStudent(student) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('student_token', { path: '/' });
  res.json({ data: { ok: true } });
});

router.get('/me', requireStudent, async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({
      data: {
        student: publicStudent(req.student),
        mode: resolveCatalogMode(req.student, settings),
        allow_address_edit: settings.allow_address_edit === 'true',
        shipping_flat_fee: Number(settings.shipping_flat_fee || 0),
        school_name: settings.school_name,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/catalog', requireStudent, async (req, res, next) => {
  try {
    const settings = await getSettings();
    const mode = resolveCatalogMode(req.student, settings);
    const student = publicStudent(req.student);
    let kit = null;
    const kits = await query('SELECT * FROM kits WHERE is_active = 1 ORDER BY id LIMIT 1');
    if (kits.length) {
      const items = await query(
        `SELECT ki.*, p.name, p.description, p.images, p.base_price, p.tax_percent
         FROM kit_items ki JOIN products p ON p.id = ki.product_id WHERE ki.kit_id = ?`,
        [kits[0].id]
      );
      for (const item of items) {
        parseImages(item);
        const variants = await query(
          'SELECT id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_qty, is_active, image FROM product_variants WHERE product_id = ? AND is_active = 1',
          [item.product_id]
        );
        item.variants = variants.map((v) => ({
          ...v,
          in_stock: v.stock_qty > 0,
          locked_color: item.house_color_auto_match
            ? variants.find((x) => String(x.option2_value || x.option1_value || '').toLowerCase() === String(req.student.house_color).toLowerCase()) || null
            : null,
        }));
        if (item.house_color_auto_match) {
          item.auto_variant = item.variants.find((v) => v.locked_color && v.id === v.locked_color.id)?.locked_color || item.variants.find((v) =>
            String(v.option2_value || v.option1_value || '').toLowerCase() === String(req.student.house_color).toLowerCase()
          ) || null;
        }
      }
      kit = { ...kits[0], items };
    }

    let products = [];
    if (mode === 'individual') {
      const rows = await query(
        `SELECT p.*, c.name AS category_name
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.status = 'active' AND p.visible_individually = 1`
      );
      for (const p of rows) {
        parseImages(p);
        const variants = await query(
          `SELECT id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_qty, is_active, image
           FROM product_variants WHERE product_id = ? AND is_active = 1`,
          [p.id]
        );
        const usable = variants.filter((v) => v.stock_qty > 0);
        if (!usable.length) continue;
        p.variants = variants.map((v) => ({ ...v, in_stock: v.stock_qty > 0, disabled: v.stock_qty <= 0 }));
        products.push(p);
      }
    }

    res.json({
      data: {
        student,
        mode,
        kit: mode === 'kit' || settings.allow_kit_reorder === 'true' ? kit : null,
        products: mode === 'individual' ? products : [],
        allow_kit_reorder: settings.allow_kit_reorder === 'true',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/checkout', requireStudent, validate(z.object({
  body: z.object({
    type: z.enum(['kit', 'individual']),
    payment_method: z.enum(['pay_at_school', 'cash_on_delivery', 'razorpay']).optional(),
    notes: z.string().optional(),
    address: z.record(z.any()).optional(),
    items: z.array(z.object({
      product_id: z.number(),
      variant_id: z.number(),
      quantity: z.number().int().min(1).optional(),
    })).min(1),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const body = req.validated.body;
    const result = await placeOrder(req.student, {
      ...body,
      payment_method: body.payment_method || 'pay_at_school',
    });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', requireStudent, async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT * FROM orders WHERE student_id = ? ORDER BY id DESC',
      [req.student.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', requireStudent, async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT * FROM orders WHERE id = ? AND student_id = ?',
      [req.params.id, req.student.id]
    );
    if (!rows.length) throw fail('Order not found', { status: 404, code: 'NOT_FOUND' });
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    const history = await query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id', [req.params.id]);
    const order = rows[0];
    if (typeof order.shipping_address_snapshot === 'string') {
      try { order.shipping_address_snapshot = JSON.parse(order.shipping_address_snapshot); } catch { /* keep */ }
    }
    res.json({ data: { ...order, items, history } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
