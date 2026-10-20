const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, ensureDbInitialized } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'retro-pixel-secret-cat-key-2026';

module.exports = async (req, res) => {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureDbInitialized();
    const sql = getDb();
    const action = req.query.action || (req.body && req.body.action);

    // ========================================================================
    // 1. РЕГИСТРАЦИЯ (action === 'register')
    // ========================================================================
    if (req.method === 'POST' && action === 'register') {
      const { email, password, name } = req.body || {};

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Введите корректный email адрес' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен содержать не менее 6 символов' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Проверка на существование пользователя
      const existing = await sql`
        SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1;
      `;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      }

      // Хэширование пароля
      const passwordHash = await bcrypt.hash(password, 10);
      const userName = (name || normalizedEmail.split('@')[0]).trim();

      const [newUser] = await sql`
        INSERT INTO users (email, password_hash, name)
        VALUES (${normalizedEmail}, ${passwordHash}, ${userName})
        RETURNING id, email, name, currency, created_at;
      `;

      // Генерация токена
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          currency: newUser.currency || 'RUB'
        }
      });
    }

    // ========================================================================
    // 2. ВХОД В АККАУНТ (action === 'login')
    // ========================================================================
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: 'Укажите email и пароль' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const [user] = await sql`
        SELECT id, email, password_hash, name, currency FROM users WHERE email = ${normalizedEmail} LIMIT 1;
      `;

      if (!user) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          currency: user.currency || 'RUB'
        }
      });
    }

    // ========================================================================
    // 3. ПРОВЕРКА ТЕКУЩЕЙ СЕССИИ (action === 'me')
    // ========================================================================
    if (req.method === 'GET' && action === 'me') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ error: 'Недействительный или истекший токен' });
      }

      const [user] = await sql`
        SELECT id, email, name, currency, created_at FROM users WHERE id = ${decoded.userId} LIMIT 1;
      `;

      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          currency: user.currency || 'RUB'
        }
      });
    }

    // ========================================================================
    // 4. ОБНОВЛЕНИЕ НАСТРОЕК (action === 'settings')
    // ========================================================================
    if (req.method === 'PUT' && action === 'settings') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const { currency, name } = req.body || {};

      if (currency) {
        await sql`UPDATE users SET currency = ${currency} WHERE id = ${decoded.userId};`;
      }
      if (name) {
        await sql`UPDATE users SET name = ${name} WHERE id = ${decoded.userId};`;
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Неизвестное действие' });
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ error: error.message || 'Ошибка сервера аутентификации' });
  }
};
