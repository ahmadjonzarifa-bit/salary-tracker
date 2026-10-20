require('dotenv').config();
const { ensureDbInitialized } = require('../api/db');

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not defined.');
    console.error('Usage: set DATABASE_URL=postgres://... && node scripts/init-db.js');
    process.exit(1);
  }

  try {
    await ensureDbInitialized();
    console.log('✓ Successfully connected to Neon and initialized tables (users, transactions)!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Failed to initialize Neon database:', err);
    process.exit(1);
  }
}

main();
