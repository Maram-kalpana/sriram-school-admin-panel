const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query } = require('../db');
const { validate } = require('../middleware/validate');
const { requireAdmin, signAdmin, cookieOpts } = require('../middleware/auth');
const { fail } = require('../errors');

const router = express.Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;
    const rows = await query('SELECT * FROM admin_users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!rows.length || !rows[0].is_active) {
      throw fail('Invalid email or password', { status: 401, code: 'UNAUTHORIZED' });
    }
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) throw fail('Invalid email or password', { status: 401, code: 'UNAUTHORIZED' });
    const token = signAdmin(rows[0]);
    res.cookie('admin_token', token, cookieOpts(8 * 60 * 60 * 1000));
    res.json({ data: { id: rows[0].id, email: rows[0].email, role: rows[0].role } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', { path: '/' });
  res.json({ data: { ok: true } });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ data: req.admin });
});

module.exports = router;
