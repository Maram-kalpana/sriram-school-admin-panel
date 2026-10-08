const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const AppError = require('../utils/AppError');

const COOKIE_NAME = 'admin_token';

async function auth(req, res, next) {
  try {
    const token =
      (req.cookies && req.cookies[COOKIE_NAME]) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      throw new AppError('Invalid or expired session', 401);
    }

    const user = await db('admin_users')
      .where({ id: payload.sub, is_active: true })
      .first();

    if (!user) {
      throw new AppError('Admin account not found or inactive', 401);
    }

    req.admin = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

auth.COOKIE_NAME = COOKIE_NAME;

module.exports = auth;
