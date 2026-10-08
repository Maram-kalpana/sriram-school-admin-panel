require('dotenv').config();

const shared = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'scholar',
    password: process.env.DB_PASSWORD || 'scholar',
    database: process.env.DB_NAME || 'scholar_store',
    charset: 'utf8mb4',
    timezone: 'Z',
  },
  pool: { min: 0, max: 10 },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

module.exports = {
  development: shared,
  test: {
    ...shared,
    connection: {
      ...shared.connection,
      database: process.env.DB_NAME_TEST || `${process.env.DB_NAME || 'scholar_store'}_test`,
    },
  },
  production: shared,
};
