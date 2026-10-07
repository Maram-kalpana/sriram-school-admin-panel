const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { fail } = require('../errors');
const { query } = require('../db');

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: maxAgeMs,
  };
}

function signAdmin(admin) {
  return jwt.sign(
    { typ: 'admin', id: admin.id, email: admin.email, role: admin.role },
    config.jwt.adminSecret,
    { expiresIn: config.jwt.adminExpires }
  );
}

function signStudent(student) {
  return jwt.sign(
    {
      typ: 'student',
      id: student.id,
      admission_number: student.admission_number,
      isFirstLoginSession: !!student.isFirstLoginSession,
    },
    config.jwt.studentSecret,
    { expiresIn: config.jwt.studentExpires }
  );
}

function readCookieToken(req, name) {
  if (req.cookies && req.cookies[name]) return req.cookies[name];
  return null;
}

async function requireAdmin(req, res, next) {
  try {
    const token = readCookieToken(req, 'admin_token');
    if (!token) throw fail('Admin authentication required', { status: 401, code: 'UNAUTHORIZED' });
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.adminSecret);
    } catch {
      throw fail('Admin authentication required', { status: 401, code: 'UNAUTHORIZED' });
    }
    if (payload.typ !== 'admin') throw fail('Admin authentication required', { status: 401, code: 'UNAUTHORIZED' });
    const rows = await query('SELECT id, email, role, is_active FROM admin_users WHERE id = ?', [payload.id]);
    if (!rows.length || !rows[0].is_active) {
      throw fail('Admin authentication required', { status: 401, code: 'UNAUTHORIZED' });
    }
    req.admin = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== 'super_admin') {
    return next(fail('Super admin only', { status: 403, code: 'FORBIDDEN' }));
  }
  next();
}

async function requireStudent(req, res, next) {
  try {
    const token = readCookieToken(req, 'student_token');
    if (!token) throw fail('Please log in', { status: 401, code: 'UNAUTHORIZED' });
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.studentSecret);
    } catch {
      throw fail('Please log in', { status: 401, code: 'UNAUTHORIZED' });
    }
    if (payload.typ !== 'student') throw fail('Please log in', { status: 401, code: 'UNAUTHORIZED' });
    const rows = await query('SELECT * FROM students WHERE id = ? AND is_active = 1', [payload.id]);
    if (!rows.length) throw fail('Please log in', { status: 401, code: 'UNAUTHORIZED' });
    req.student = rows[0];
    req.student.isFirstLoginSession = !!payload.isFirstLoginSession;
    next();
  } catch (err) {
    next(err);
  }
}

function originGuard(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const allowed = [config.clientUrl, `http://localhost:${config.port}`, `http://127.0.0.1:${config.port}`];
  const ok = allowed.some((a) => origin.startsWith(a) || referer.startsWith(a));
  if (!origin && !referer) return next();
  if (!ok) return next(fail('Invalid origin', { status: 403, code: 'CSRF' }));
  next();
}

module.exports = {
  cookieOpts,
  signAdmin,
  signStudent,
  requireAdmin,
  requireSuperAdmin,
  requireStudent,
  originGuard,
};
