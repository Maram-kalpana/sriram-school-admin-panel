const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { config } = require('../src/config');

async function migrate() {
  const admin = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    multipleStatements: true,
  });

  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await admin.query(`USE \`${config.mysql.database}\``);
  await admin.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const [applied] = await admin.query('SELECT filename FROM schema_migrations');
  const done = new Set(applied.map((r) => r.filename));

  for (const file of files) {
    if (done.has(file)) {
      console.log('skip', file);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await admin.query(sql);
    await admin.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    console.log('applied', file);
  }

  await admin.end();
  console.log('migrations complete');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
