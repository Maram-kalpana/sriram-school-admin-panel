const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

async function start() {
  try {
    await db.raw('SELECT 1');
    console.log('MySQL connected');
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Admin API listening on http://localhost:${env.port}`);
  });
}

start();
