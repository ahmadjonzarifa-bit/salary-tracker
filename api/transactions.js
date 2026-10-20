const jwt = require('jsonwebtoken');
const { getDb, ensureDbInitialized } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'retro-pixel-secret-cat-key-2026';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Требуется авторизация (отсутствует токен)');
  }
  const token = authHeader.split(' ')[1];
  return jwt.verify(token, JWT_SECRET);
}

module.exports = async (req, res) => {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const decoded = verifyToken(req);
    const userId = decoded.userId;

    await ensureDbInitialized();
    const sql = getDb();

    // ========================================================================
    // GET: Получить все транзакции пользователя
    // ========================================================================
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT 
          id, 
          type, 
          amount::float as amount, 
          category_id as "categoryId", 
          to_char(date, 'YYYY-MM-DD') as date, 
          note, 
          created_at as "createdAt"
        FROM transactions
        WHERE user_id = ${userId}
        ORDER BY date DESC, created_at DESC;
      `;

      return res.status(200).json({ success: true, transactions: rows });
    }

    // ========================================================================
    // POST: Создать транзакцию или синхронизировать список
    // ========================================================================
    if (req.method === 'POST') {
      const action = req.query.action || (req.body && req.body.action);

      // Массовая синхронизация локальных транзакций в Neon (при первом входе)
      if (action === 'sync') {
        const { transactions } = req.body || {};
        if (Array.isArray(transactions) && transactions.length > 0) {
          for (const tx of transactions) {
            await sql`
              INSERT INTO transactions (id, user_id, type, amount, category_id, date, note)
              VALUES (
                ${tx.id}, 
                ${userId}, 
                ${tx.type}, 
                ${parseFloat(tx.amount)}, 
                ${tx.categoryId || tx.category_id}, 
                ${tx.date}, 
                ${tx.note || ''}
              )
              ON CONFLICT (id) DO UPDATE SET
                type = EXCLUDED.type,
                amount = EXCLUDED.amount,
                category_id = EXCLUDED.category_id,
                date = EXCLUDED.date,
                note = EXCLUDED.note;
            `;
          }
        }
        return res.status(200).json({ success: true, message: 'Данные синхронизированы с Neon' });
      }

      // Создание одной транзакции
      const { id, type, amount, categoryId, category_id, date, note } = req.body || {};
      const catId = categoryId || category_id;
      const numAmount = parseFloat(amount);

      if (!type || isNaN(numAmount) || numAmount <= 0 || !catId || !date) {
        return res.status(400).json({ error: 'Не все обязательные поля заполнены корректно' });
      }

      const txId = id || ('quest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));

      await sql`
        INSERT INTO transactions (id, user_id, type, amount, category_id, date, note)
        VALUES (${txId}, ${userId}, ${type}, ${numAmount}, ${catId}, ${date}, ${note || ''})
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          amount = EXCLUDED.amount,
          category_id = EXCLUDED.category_id,
          date = EXCLUDED.date,
          note = EXCLUDED.note;
      `;

      return res.status(201).json({
        success: true,
        transaction: {
          id: txId,
          type,
          amount: numAmount,
          categoryId: catId,
          date,
          note: note || '',
          createdAt: new Date().toISOString()
        }
      });
    }

    // ========================================================================
    // PUT: Обновить существующую транзакцию
    // ========================================================================
    if (req.method === 'PUT') {
      const id = req.query.id || (req.body && req.body.id);
      const { type, amount, categoryId, category_id, date, note } = req.body || {};
      const catId = categoryId || category_id;
      const numAmount = parseFloat(amount);

      if (!id) {
        return res.status(400).json({ error: 'Укажите ID операции' });
      }

      const updated = await sql`
        UPDATE transactions
        SET 
          type = COALESCE(${type}, type),
          amount = COALESCE(${numAmount}, amount),
          category_id = COALESCE(${catId}, category_id),
          date = COALESCE(${date}, date),
          note = COALESCE(${note}, note)
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, type, amount::float as amount, category_id as "categoryId", to_char(date, 'YYYY-MM-DD') as date, note;
      `;

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Операция не найдена или принадлежит другому пользователю' });
      }

      return res.status(200).json({ success: true, transaction: updated[0] });
    }

    // ========================================================================
    // DELETE: Удалить транзакцию
    // ========================================================================
    if (req.method === 'DELETE') {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ error: 'Укажите ID операции для удаления' });
      }

      const deleted = await sql`
        DELETE FROM transactions
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id;
      `;

      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Операция не найдена' });
      }

      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (error) {
    console.error('Transactions API Error:', error);
    if (error.message && error.message.includes('авторизация')) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Ошибка сервера транзакций' });
  }
};
