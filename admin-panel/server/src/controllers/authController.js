const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const auth = require('../middleware/auth');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

function setAuthCookie(res, token) {
  res.cookie(auth.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(auth.COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/',
  });
}

function signToken(admin) {
  return jwt.sign(
    { role: admin.role, email: admin.email },
    env.jwtSecret,
    { subject: String(admin.id), expiresIn: env.jwtExpiresIn }
  );
}

function publicAdmin(admin) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await db('admin_users').where({ email }).first();
    if (!user || !user.is_active) {
      throw new AppError('Invalid email or password', 401);
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Logged in',
      data: { admin: publicAdmin(user) },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return next(
        new AppError(
          'Validation failed',
          400,
          err.issues.map((e) => ({ path: e.path.join('.'), message: e.message }))
        )
      );
    }
    return next(err);
  }
}

async function logout(req, res) {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
}

async function me(req, res) {
  res.json({
    success: true,
    data: { admin: req.admin },
  });
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await db('admin_users').where({ id: req.admin.id }).first();
    if (!user) {
      throw new AppError('Admin not found', 404);
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db('admin_users').where({ id: user.id }).update({
      password_hash: passwordHash,
      updated_at: db.fn.now(),
    });

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return next(
        new AppError(
          'Validation failed',
          400,
          err.issues.map((e) => ({ path: e.path.join('.'), message: e.message }))
        )
      );
    }
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  me,
  changePassword,
  loginSchema,
  changePasswordSchema,
};
