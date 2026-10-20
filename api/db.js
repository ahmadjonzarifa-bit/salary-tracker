const { neon } = require('@neondatabase/serverless');

function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Please configure it in your Vercel Environment Variables.');
  }
  return neon(databaseUrl);
}

let dbInitialized = false;

async function ensureDbInitialized() {
  if (dbInitialized) return;
  const sql = getDb();

  // Создание таблицы пользователей
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'RUB',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Создание таблицы транзакций
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(10) NOT NULL,
      amount NUMERIC(14, 2) NOT NULL,
      category_id VARCHAR(64) NOT NULL,
      date DATE NOT NULL,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Индекс для ускорения выборки по пользователю
  await sql`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  `;

  dbInitialized = true;
}

module.exports = {
  getDb,
  ensureDbInitialized
};
