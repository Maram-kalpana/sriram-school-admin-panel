const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const config = {
  env: env('NODE_ENV', 'development'),
  port: Number(env('PORT', '4000')),
  clientUrl: env('CLIENT_URL', 'http://localhost:5173'),
  cookieSecure: env('COOKIE_SECURE', 'false') === 'true',
  jwt: {
    adminSecret: env('JWT_ADMIN_SECRET', 'dev-admin-secret'),
    studentSecret: env('JWT_STUDENT_SECRET', 'dev-student-secret'),
    adminExpires: env('JWT_ADMIN_EXPIRES', '8h'),
    studentExpires: env('JWT_STUDENT_EXPIRES', '7d'),
  },
  mysql: {
    host: env('MYSQL_HOST', '127.0.0.1'),
    port: Number(env('MYSQL_PORT', '3306')),
    user: env('MYSQL_USER', 'school'),
    password: env('MYSQL_PASSWORD', 'school'),
    database: env('MYSQL_DATABASE', 'school_store'),
  },
  seedAdmin: {
    email: env('ADMIN_EMAIL', 'admin@school.local'),
    password: env('ADMIN_PASSWORD', 'Admin@12345'),
  },
  uploadsDir: path.join(__dirname, '..', 'uploads'),
};

module.exports = { config, env };
