/**
 * ФинТрекер 8-BIT - Retro Pixel Salary & Expense Tracker
 * script.js - Полная логика приложения: CRUD, Chart.js дашборд, 8-bit аудио, localStorage
 * Цветовая палитра:
 *   - COLOR 1: #DFE94B (Лайм / Золото)
 *   - COLOR 2: #836CEC (Фиолетовый / Мана)
 */

// ==========================================================================
// Константы и конфигурация
// ==========================================================================
const STORAGE_KEY = 'salary_tracker_retro_v3';
const SETTINGS_KEY = 'salary_tracker_retro_settings_v3';

const COLOR_LIME = '#DFE94B';
const COLOR_PURPLE = '#836CEC';

// 8-bit RPG Палитра категорий
const CATEGORIES = {
  expense: [
    { id: 'exp_groceries', name: 'Провиант (Еда)', icon: 'fa-apple-whole', color: '#DFE94B' },
    { id: 'exp_housing', name: 'Таверна и замок', icon: 'fa-dungeon', color: '#836CEC' },
    { id: 'exp_transport', name: 'Грифон и повозка', icon: 'fa-horse-head', color: '#a38df7' },
    { id: 'exp_cafe', name: 'Пиры и зелья', icon: 'fa-flask', color: '#cbe030' },
    { id: 'exp_health', name: 'Лечение и свитки', icon: 'fa-heart-pulse', color: '#ff4365' },
    { id: 'exp_shopping', name: 'Броня и снаряжение', icon: 'fa-shield-halved', color: '#684ec2' },
    { id: 'exp_entertainment', name: 'Арена и развлечения', icon: 'fa-dice-d20', color: '#f3fa72' },
    { id: 'exp_utilities', name: 'Налог королю (ЖКХ)', icon: 'fa-scroll', color: '#b5a1ff' },
    { id: 'exp_subscriptions', name: 'Магическая связь', icon: 'fa-hat-wizard', color: '#9d84f5' },
    { id: 'exp_other', name: 'Прочие потери', icon: 'fa-skull', color: '#7a70a8' }
  ],
  income: [
    { id: 'inc_salary', name: 'Жалованье гильдии', icon: 'fa-coins', color: '#DFE94B' },
    { id: 'inc_bonus', name: 'Трофей за босса', icon: 'fa-trophy', color: '#f0f769' },
    { id: 'inc_freelance', name: 'Контракты наемника', icon: 'fa-wand-magic-sparkles', color: '#c4d42b' },
    { id: 'inc_investments', name: 'Вклады ростовщика', icon: 'fa-gem', color: '#836CEC' },
    { id: 'inc_cashback', name: 'Дары фортуны', icon: 'fa-clover', color: '#9f8cf5' },
    { id: 'inc_other', name: 'Прочая добыча', icon: 'fa-sack-dollar', color: '#e8f05e' }
  ]
};

const CURRENCIES = {
  RUB: { symbol: '₽', locale: 'ru-RU' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  KZT: { symbol: '₸', locale: 'kk-KZ' },
  UZS: { symbol: 'сум', locale: 'uz-UZ' }
};

// ==========================================================================
// Состояние приложения (State)
// ==========================================================================
let state = {
  transactions: [],
  settings: {
    currency: 'RUB',
    theme: 'dark',
    sound: true
  },
  filters: {
    period: 'all',
    startDate: null,
    endDate: null,
    type: 'all',
    category: 'all',
    search: '',
    sort: 'date_desc'
  },
  editingId: null,
  deletingId: null
};

// Экземпляры графиков Chart.js
let charts = {
  barComparison: null,
  expenseCategory: null,
  incomeCategory: null
};

// ==========================================================================
// 8-BIT Звуковой движок (Web Audio API Synth)
// ==========================================================================
const retroAudio = {
  ctx: null,
  init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    } catch (e) {
      console.warn('Web Audio API не поддерживается:', e);
    }
  },
  play(type = 'coin') {
    if (!state.settings.sound) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === 'coin') {
      // 8-bit Mario Coin Sound
      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'delete') {
      // 8-bit Hit / Damage
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    } else if (type === 'click') {
      // 8-bit UI Blip
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
    } else if (type === 'meow') {
      // 8-bit Cat Meow
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.linearRampToValueAtTime(880, t + 0.1); // A5
      osc.frequency.linearRampToValueAtTime(659.25, t + 0.28); // E5
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }
};

// ==========================================================================
// Инициализация при загрузке
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadTransactions();
  initTheme();
  initSoundButton();
  initCategorySelects();
  initEventListeners();
  initCharts();
  renderApp();
});

// ==========================================================================
// LocalStorage и Демо-данные
// ==========================================================================
function loadSettings() {
  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  if (savedSettings) {
    try {
      state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
    } catch (e) {
      console.error('Ошибка настроек:', e);
    }
  }
  document.getElementById('currencySelect').value = state.settings.currency;
  updateCurrencySymbolLabels();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function loadTransactions() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state.transactions = JSON.parse(saved);
      return;
    } catch (e) {
      console.error('Ошибка парсинга:', e);
    }
  }
  generateDemoData();
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function generateDemoData() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  function formatDateStr(year, month, day) {
    const d = new Date(year, month, day);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  state.transactions = [
    // Текущий месяц
    {
      id: generateId(),
      type: 'income',
      amount: 150000,
      categoryId: 'inc_salary',
      date: formatDateStr(y, m, 5),
      note: 'Золото от гильдии за месяц',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'income',
      amount: 40000,
      categoryId: 'inc_freelance',
      date: formatDateStr(y, m, 12),
      note: 'Награда за сайд-квест',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 45000,
      categoryId: 'exp_housing',
      date: formatDateStr(y, m, 2),
      note: 'Аренда жилья в столице',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 18000,
      categoryId: 'exp_groceries',
      date: formatDateStr(y, m, 7),
      note: 'Запас лечебных эликсиров и еды',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 6500,
      categoryId: 'exp_cafe',
      date: formatDateStr(y, m, 9),
      note: 'Отдых в таверне с отрядом',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 8900,
      categoryId: 'exp_transport',
      date: formatDateStr(y, m, 11),
      note: 'Овёс и подковы для грифона',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 14000,
      categoryId: 'exp_shopping',
      date: formatDateStr(y, m, 14),
      note: 'Зачарованный плащ и броня',
      createdAt: new Date().toISOString()
    },

    // Предыдущий месяц
    {
      id: generateId(),
      type: 'income',
      amount: 145000,
      categoryId: 'inc_salary',
      date: formatDateStr(y, m - 1, 5),
      note: 'Основное жалованье',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'income',
      amount: 30000,
      categoryId: 'inc_bonus',
      date: formatDateStr(y, m - 1, 20),
      note: 'Трофей за победу над боссом',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 45000,
      categoryId: 'exp_housing',
      date: formatDateStr(y, m - 1, 2),
      note: 'Плата за таверну',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 21000,
      categoryId: 'exp_groceries',
      date: formatDateStr(y, m - 1, 15),
      note: 'Провизия на дальний поход',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 11000,
      categoryId: 'exp_entertainment',
      date: formatDateStr(y, m - 1, 18),
      note: 'Ставки на арене гладиаторов',
      createdAt: new Date().toISOString()
    },

    // Двумя месяцами ранее
    {
      id: generateId(),
      type: 'income',
      amount: 140000,
      categoryId: 'inc_salary',
      date: formatDateStr(y, m - 2, 5),
      note: 'Жалованье',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 45000,
      categoryId: 'exp_housing',
      date: formatDateStr(y, m - 2, 3),
      note: 'Замок и коммунальные сборы',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      type: 'expense',
      amount: 16500,
      categoryId: 'exp_groceries',
      date: formatDateStr(y, m - 2, 12),
      note: 'Рынок в порту',
      createdAt: new Date().toISOString()
    }
  ];

  saveTransactions();
}

function generateId() {
  return 'quest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
}

// ==========================================================================
// CRUD Операции (Create, Read, Update, Delete)
// ==========================================================================
function createTransaction(data) {
  const newTx = {
    id: generateId(),
    type: data.type,
    amount: parseFloat(data.amount),
    categoryId: data.categoryId,
    date: data.date,
    note: data.note ? data.note.trim() : '',
    createdAt: new Date().toISOString()
  };

  state.transactions.unshift(newTx);
  saveTransactions();
  renderApp();
  retroAudio.play('coin');
  showToast('КВЕСТ ВНЕСЁН В ЖУРНАЛ! +EXP', 'success');
}

function getFilteredTransactions() {
  return state.transactions.filter(tx => {
    if (!isDateInPeriod(tx.date, state.filters)) return false;
    if (state.filters.type !== 'all' && tx.type !== state.filters.type) return false;
    if (state.filters.category !== 'all' && tx.categoryId !== state.filters.category) return false;

    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      const cat = getCategory(tx.type, tx.categoryId);
      const catName = cat ? cat.name.toLowerCase() : '';
      const note = (tx.note || '').toLowerCase();
      if (!catName.includes(q) && !note.includes(q)) return false;
    }

    return true;
  }).sort((a, b) => {
    switch (state.filters.sort) {
      case 'date_asc':
        return new Date(a.date) - new Date(b.date);
      case 'amount_desc':
        return b.amount - a.amount;
      case 'amount_asc':
        return a.amount - b.amount;
      case 'date_desc':
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });
}

function updateTransaction(id, updatedData) {
  const index = state.transactions.findIndex(t => t.id === id);
  if (index === -1) {
    showToast('СВИТОК НЕ НАЙДЕН!', 'danger');
    return;
  }

  state.transactions[index] = {
    ...state.transactions[index],
    type: updatedData.type,
    amount: parseFloat(updatedData.amount),
    categoryId: updatedData.categoryId,
    date: updatedData.date,
    note: updatedData.note ? updatedData.note.trim() : ''
  };

  saveTransactions();
  renderApp();
  retroAudio.play('coin');
  showToast('ЖУРНАЛ УСПЕШНО ПЕРЕПИСАН!', 'success');
}

function deleteTransaction(id) {
  const beforeLen = state.transactions.length;
  state.transactions = state.transactions.filter(t => t.id !== id);

  if (state.transactions.length < beforeLen) {
    saveTransactions();
    renderApp();
    retroAudio.play('delete');
    showToast('СВИТОК СОЖЖЁН И СТЁРТ!', 'info');
  }
}

// ==========================================================================
// Фильтрация дат
// ==========================================================================
function isDateInPeriod(dateStr, filters) {
  const txDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();

  switch (filters.period) {
    case 'this_month':
      return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
    case 'prev_month': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return txDate.getFullYear() === prev.getFullYear() && txDate.getMonth() === prev.getMonth();
    }
    case 'this_year':
      return txDate.getFullYear() === now.getFullYear();
    case 'custom': {
      if (filters.startDate && new Date(dateStr + 'T00:00:00') < new Date(filters.startDate + 'T00:00:00')) return false;
      if (filters.endDate && new Date(dateStr + 'T23:59:59') > new Date(filters.endDate + 'T23:59:59')) return false;
      return true;
    }
    case 'all':
    default:
      return true;
  }
}

// ==========================================================================
// Утилиты
// ==========================================================================
function getCategory(type, categoryId) {
  const list = CATEGORIES[type] || [];
  let found = list.find(c => c.id === categoryId);
  if (!found) {
    const otherList = type === 'expense' ? CATEGORIES.income : CATEGORIES.expense;
    found = otherList.find(c => c.id === categoryId);
  }
  return found || { name: 'Неизвестно', icon: 'fa-question', color: '#b8b0e0' };
}

function formatCurrency(amount, withSign = false, type = 'neutral') {
  const currencyConf = CURRENCIES[state.settings.currency] || CURRENCIES.RUB;
  const formatted = new Intl.NumberFormat(currencyConf.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(amount));

  let sign = '';
  if (withSign) {
    if (type === 'income') sign = '+';
    if (type === 'expense') sign = '-';
  }

  return `${sign}${formatted} ${currencyConf.symbol}`;
}

function updateCurrencySymbolLabels() {
  const symbol = (CURRENCIES[state.settings.currency] || CURRENCIES.RUB).symbol;
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = symbol;
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

// ==========================================================================
// Отрисовка
// ==========================================================================
function renderApp() {
  const filtered = getFilteredTransactions();
  renderKPI(filtered);
  renderTable(filtered);
  updateCharts(filtered);
}

function renderKPI(filteredTransactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  filteredTransactions.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount++;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
      expenseCount++;
    }
  });

  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Баланс
  const kpiBalance = document.getElementById('kpiBalance');
  kpiBalance.textContent = formatCurrency(balance);
  kpiBalance.style.color = balance >= 0 ? 'var(--text-income)' : 'var(--danger)';

  const kpiBadge = document.getElementById('kpiBalanceBadge');
  if (balance > 0) {
    kpiBadge.textContent = 'КАЗНА ПОЛНА';
    kpiBadge.className = 'badge badge-positive';
  } else if (balance < 0) {
    kpiBadge.textContent = 'ДЕФИЦИТ HP';
    kpiBadge.className = 'badge badge-negative';
  } else {
    kpiBadge.textContent = 'НОЛЬ';
    kpiBadge.className = 'badge';
  }

  // Доходы
  document.getElementById('kpiIncome').textContent = formatCurrency(totalIncome, true, 'income');
  document.getElementById('kpiIncomeCount').textContent = `${incomeCount} квестов`;

  // Расходы
  document.getElementById('kpiExpense').textContent = formatCurrency(totalExpense, true, 'expense');
  document.getElementById('kpiExpenseCount').textContent = `${expenseCount} трат`;

  // Норма сбережений
  const kpiSavings = document.getElementById('kpiSavings');
  kpiSavings.textContent = `${savingsRate}%`;
  kpiSavings.style.color = savingsRate >= 20 ? 'var(--text-income)' : (savingsRate >= 0 ? 'var(--text-expense)' : 'var(--danger)');
}

function renderTable(transactions) {
  const tbody = document.getElementById('transactionsTableBody');
  const emptyState = document.getElementById('emptyState');
  const displayedCount = document.getElementById('displayedCount');
  const totalCount = document.getElementById('totalCount');

  displayedCount.textContent = transactions.length;
  totalCount.textContent = state.transactions.length;

  if (transactions.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = transactions.map(tx => {
    const category = getCategory(tx.type, tx.categoryId);
    const isIncome = tx.type === 'income';

    return `
      <tr data-id="${tx.id}">
        <td class="transaction-date">
          [ ${formatDate(tx.date)} ]
        </td>
        <td>
          <span class="category-badge" style="border-color: ${category.color}; color: ${category.color}">
            <i class="fa-solid ${category.icon}"></i>
            <span>${category.name}</span>
          </span>
        </td>
        <td>
          <div class="transaction-note" title="${escapeHtml(tx.note || '—')}">
            ${escapeHtml(tx.note || '—')}
          </div>
        </td>
        <td>
          <span class="transaction-type-badge ${tx.type}">
            ${isIncome ? '+ДОХОД' : '-РАСХОД'}
          </span>
        </td>
        <td>
          <span class="transaction-amount ${tx.type}">
            ${formatCurrency(tx.amount, true, tx.type)}
          </span>
        </td>
        <td class="text-right">
          <div class="row-actions">
            <button class="action-btn edit" data-action="edit" data-id="${tx.id}" title="Править">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${tx.id}" title="Сжечь">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// Интеграция с Chart.js в 8-bit стиле
// ==========================================================================
function initCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2e2359' : '#d2cbfa';
  const textColor = isDark ? '#DFE94B' : '#4e4474';

  // 1. Столбчатый график: Битва доходов (#DFE94B) и расходов (#836CEC)
  const ctxBar = document.getElementById('barComparisonChart').getContext('2d');
  charts.barComparison = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Золото (+)',
          backgroundColor: COLOR_LIME,
          borderColor: '#000000',
          borderWidth: 2,
          borderRadius: 0,
          data: []
        },
        {
          label: 'Мана (-)',
          backgroundColor: COLOR_PURPLE,
          borderColor: '#000000',
          borderWidth: 2,
          borderRadius: 0,
          data: []
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          titleFont: { family: 'Press Start 2P', size: 9 },
          bodyFont: { family: 'VT323', size: 16 },
          backgroundColor: '#000000',
          borderColor: COLOR_LIME,
          borderWidth: 2,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'transparent' },
          ticks: { color: textColor, font: { family: 'VT323', size: 16 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'VT323', size: 15 },
            callback: (val) => formatCurrency(val)
          }
        }
      }
    }
  });

  // 2. Круговая диаграмма расходов
  const ctxExp = document.getElementById('expenseCategoryChart').getContext('2d');
  charts.expenseCategory = new Chart(ctxExp, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 3,
        borderColor: '#000000'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'VT323', size: 16 },
            boxWidth: 14,
            padding: 10
          }
        },
        tooltip: {
          titleFont: { family: 'Press Start 2P', size: 8 },
          bodyFont: { family: 'VT323', size: 15 },
          backgroundColor: '#000000',
          borderColor: COLOR_PURPLE,
          borderWidth: 2,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const val = ctx.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
              return ` ${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // 3. Круговая диаграмма доходов
  const ctxInc = document.getElementById('incomeCategoryChart').getContext('2d');
  charts.incomeCategory = new Chart(ctxInc, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 3,
        borderColor: '#000000'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'VT323', size: 16 },
            boxWidth: 14,
            padding: 10
          }
        },
        tooltip: {
          titleFont: { family: 'Press Start 2P', size: 8 },
          bodyFont: { family: 'VT323', size: 15 },
          backgroundColor: '#000000',
          borderColor: COLOR_LIME,
          borderWidth: 2,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const val = ctx.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
              return ` ${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function updateCharts(filteredTransactions) {
  const monthlyData = {};
  filteredTransactions.forEach(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }).toUpperCase();

    if (!monthlyData[key]) {
      monthlyData[key] = { label, income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      monthlyData[key].income += tx.amount;
    } else {
      monthlyData[key].expense += tx.amount;
    }
  });

  const sortedKeys = Object.keys(monthlyData).sort();
  const barLabels = sortedKeys.map(k => monthlyData[k].label);
  const barIncome = sortedKeys.map(k => monthlyData[k].income);
  const barExpense = sortedKeys.map(k => monthlyData[k].expense);

  if (charts.barComparison) {
    charts.barComparison.data.labels = barLabels.length > 0 ? barLabels : ['НЕТ ДАННЫХ'];
    charts.barComparison.data.datasets[0].data = barIncome;
    charts.barComparison.data.datasets[0].backgroundColor = COLOR_LIME;
    charts.barComparison.data.datasets[0].borderColor = '#000000';
    charts.barComparison.data.datasets[0].borderWidth = 2;
    charts.barComparison.data.datasets[1].data = barExpense;
    charts.barComparison.data.datasets[1].backgroundColor = COLOR_PURPLE;
    charts.barComparison.data.datasets[1].borderColor = '#000000';
    charts.barComparison.data.datasets[1].borderWidth = 2;
    charts.barComparison.update();
  }

  // Расходы (в палитре фиолетовый и вариации)
  const expCats = {};
  filteredTransactions.filter(t => t.type === 'expense').forEach(tx => {
    const cat = getCategory('expense', tx.categoryId);
    if (!expCats[cat.name]) {
      expCats[cat.name] = { amount: 0, color: cat.color };
    }
    expCats[cat.name].amount += tx.amount;
  });

  const expLabels = Object.keys(expCats);
  const expAmounts = expLabels.map(l => expCats[l].amount);
  const expColors = expLabels.map(l => expCats[l].color);

  const noExpenseDataEl = document.getElementById('noExpenseData');
  if (charts.expenseCategory) {
    if (expAmounts.length === 0) {
      noExpenseDataEl.classList.remove('hidden');
      charts.expenseCategory.data.labels = [];
      charts.expenseCategory.data.datasets[0].data = [];
    } else {
      noExpenseDataEl.classList.add('hidden');
      charts.expenseCategory.data.labels = expLabels;
      charts.expenseCategory.data.datasets[0].data = expAmounts;
      charts.expenseCategory.data.datasets[0].backgroundColor = expColors;
    }
    charts.expenseCategory.update();
  }

  // Доходы (в палитре лайм и вариации)
  const incCats = {};
  filteredTransactions.filter(t => t.type === 'income').forEach(tx => {
    const cat = getCategory('income', tx.categoryId);
    if (!incCats[cat.name]) {
      incCats[cat.name] = { amount: 0, color: cat.color };
    }
    incCats[cat.name].amount += tx.amount;
  });

  const incLabels = Object.keys(incCats);
  const incAmounts = incLabels.map(l => incCats[l].amount);
  const incColors = incLabels.map(l => incCats[l].color);

  const noIncomeDataEl = document.getElementById('noIncomeData');
  if (charts.incomeCategory) {
    if (incAmounts.length === 0) {
      noIncomeDataEl.classList.remove('hidden');
      charts.incomeCategory.data.labels = [];
      charts.incomeCategory.data.datasets[0].data = [];
    } else {
      noIncomeDataEl.classList.add('hidden');
      charts.incomeCategory.data.labels = incLabels;
      charts.incomeCategory.data.datasets[0].data = incAmounts;
      charts.incomeCategory.data.datasets[0].backgroundColor = incColors;
    }
    charts.incomeCategory.update();
  }
}

// ==========================================================================
// Селекты категорий
// ==========================================================================
function initCategorySelects() {
  populateFormCategories('expense');
  populateFilterCategories();
}

function populateFormCategories(type, selectedCategoryId = null) {
  const select = document.getElementById('formCategory');
  const list = CATEGORIES[type] || [];

  select.innerHTML = list.map(c => `
    <option value="${c.id}" ${selectedCategoryId === c.id ? 'selected' : ''}>
      ${c.name}
    </option>
  `).join('');
}

function populateFilterCategories() {
  const select = document.getElementById('filterCategory');
  let options = '<option value="all">ВСЕ КАТЕГОРИИ</option>';
  options += '<optgroup label="РАСХОДЫ">';
  CATEGORIES.expense.forEach(c => {
    options += `<option value="${c.id}">${c.name}</option>`;
  });
  options += '</optgroup><optgroup label="ДОХОДЫ">';
  CATEGORIES.income.forEach(c => {
    options += `<option value="${c.id}">${c.name}</option>`;
  });
  options += '</optgroup>';

  select.innerHTML = options;
}

// ==========================================================================
// Обработчики событий
// ==========================================================================
function initEventListeners() {
  // Валюта
  document.getElementById('currencySelect').addEventListener('change', (e) => {
    state.settings.currency = e.target.value;
    saveSettings();
    updateCurrencySymbolLabels();
    renderApp();
    retroAudio.play('click');
    showToast(`ВАЛЮТА: ${state.settings.currency}`, 'info');
  });

  // Переключение звука 8-бит
  document.getElementById('soundToggleBtn').addEventListener('click', toggleSound);

  // Переключение темы
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Меню данных
  const dataMenuBtn = document.getElementById('dataMenuBtn');
  const dropdownWrapper = dataMenuBtn.closest('.dropdown-wrapper');
  dataMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownWrapper.classList.toggle('open');
    retroAudio.play('click');
  });

  document.addEventListener('click', (e) => {
    dropdownWrapper.classList.remove('open');

    // Спавн следа кошачьей лапки при клике на любую кнопку с лапкой
    const pawBtn = e.target.closest('.cat-paw-btn, .cat-lucky-btn');
    if (pawBtn) {
      spawnPawPrint(e.clientX, e.clientY);
    }
  });

  // Кнопка: Лапка Кота Удачи
  const luckyCatBtn = document.getElementById('luckyCatBtn');
  if (luckyCatBtn) {
    luckyCatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      retroAudio.play('meow');
      
      // Запускаем несколько лапок веером
      const rect = luckyCatBtn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      spawnPawPrint(cx, cy);
      setTimeout(() => spawnPawPrint(cx - 30, cy - 20), 100);
      setTimeout(() => spawnPawPrint(cx + 30, cy - 30), 200);

      const meows = [
        'МЯУ! КОТО-ЛАПКА ПРИНОСИТ УДАЧУ В КАЗНУ! 🐾',
        'КУСЬ! +100 К ФИНАНСОВОЙ ГРАМОТНОСТИ! 🐾',
        'МУР-Р! КАЗНА ПОД НАДЕЖНОЙ ОХРАНОЙ КОТИКА! 🐾',
        'ЛАПКА ОДОБРЯЕТ ТВОИ СБЕРЕЖЕНИЯ! 🐾'
      ];
      const randomMeow = meows[Math.floor(Math.random() * meows.length)];
      showToast(randomMeow, 'success');
    });
  }

  // Экспорт / Импорт
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
  document.getElementById('exportJsonBtn').addEventListener('click', exportToJson);
  document.getElementById('importJsonInput').addEventListener('change', importFromJson);

  // Сброс к демо
  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    if (confirm('Сбросить текущие данные и загрузить демо-квест?')) {
      generateDemoData();
      renderApp();
      retroAudio.play('coin');
      showToast('ДЕМО-КВЕСТ ЗАГРУЖЕН!', 'info');
    }
  });

  // Очистка
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (confirm('ВНИМАНИЕ! СТЕРЕТЬ ВСЮ ПАМЯТЬ КАЗНЫ?')) {
      state.transactions = [];
      saveTransactions();
      renderApp();
      retroAudio.play('delete');
      showToast('ПАМЯТЬ СТЁРТА!', 'danger');
    }
  });

  // Фильтр периодов
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const period = btn.getAttribute('data-period');
      state.filters.period = period;
      retroAudio.play('click');

      const customRangeEl = document.getElementById('customDateRange');
      if (period === 'custom') {
        customRangeEl.classList.remove('hidden');
      } else {
        customRangeEl.classList.add('hidden');
        renderApp();
      }
    });
  });

  document.getElementById('applyCustomDateBtn').addEventListener('click', () => {
    state.filters.startDate = document.getElementById('filterStartDate').value || null;
    state.filters.endDate = document.getElementById('filterEndDate').value || null;
    retroAudio.play('click');
    renderApp();
  });

  // Поиск
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value.trim();
    if (state.filters.search) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    renderApp();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.filters.search = '';
    clearSearchBtn.classList.add('hidden');
    renderApp();
  });

  // Селекты фильтров
  document.getElementById('filterType').addEventListener('change', (e) => {
    state.filters.type = e.target.value;
    retroAudio.play('click');
    renderApp();
  });

  document.getElementById('filterCategory').addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    retroAudio.play('click');
    renderApp();
  });

  document.getElementById('filterSort').addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    retroAudio.play('click');
    renderApp();
  });

  // Открытие модалок
  document.getElementById('openAddModalBtn').addEventListener('click', () => openModal());
  document.getElementById('addTransactionSecondaryBtn').addEventListener('click', () => openModal());
  document.getElementById('emptyAddBtn').addEventListener('click', () => openModal());

  // Закрытие
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

  // Переключение Расход / Доход
  document.getElementById('typeExpenseBtn').addEventListener('click', () => setModalType('expense'));
  document.getElementById('typeIncomeBtn').addEventListener('click', () => setModalType('income'));

  // Сабмит формы
  document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);

  // Делегирование таблицы
  document.getElementById('transactionsTableBody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit"]');
    const deleteBtn = e.target.closest('[data-action="delete"]');

    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      openEditModal(id);
    } else if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      openDeleteModal(id);
    }
  });

  // Модалка удаления
  document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (state.deletingId) {
      deleteTransaction(state.deletingId);
      closeDeleteModal();
    }
  });

  // Закрытие по клику вне модалки
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('transactionModal');
    const delModal = document.getElementById('deleteModal');
    if (e.target === modal) closeModal();
    if (e.target === delModal) closeDeleteModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
    }
  });
}

// ==========================================================================
// Модальные окна
// ==========================================================================
function openModal(editData = null) {
  const modal = document.getElementById('transactionModal');
  const form = document.getElementById('transactionForm');
  const title = document.getElementById('modalTitle');
  const idInput = document.getElementById('editTransactionId');

  document.getElementById('amountError').textContent = '';
  document.getElementById('categoryError').textContent = '';
  document.getElementById('dateError').textContent = '';

  retroAudio.play('click');

  if (editData) {
    state.editingId = editData.id;
    idInput.value = editData.id;
    title.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> ПРАВКА СВИТКА';
    setModalType(editData.type, editData.categoryId);
    document.getElementById('formAmount').value = editData.amount;
    document.getElementById('formDate').value = editData.date;
    document.getElementById('formNote').value = editData.note || '';
  } else {
    state.editingId = null;
    idInput.value = '';
    title.innerHTML = '<i class="fa-solid fa-scroll"></i> НОВЫЙ КВЕСТ';
    form.reset();
    setModalType('expense');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('formDate').value = today;
  }

  modal.classList.add('open');
  setTimeout(() => document.getElementById('formAmount').focus(), 100);
}

function closeModal() {
  document.getElementById('transactionModal').classList.remove('open');
  state.editingId = null;
  retroAudio.play('click');
}

function setModalType(type, selectedCategoryId = null) {
  const expenseBtn = document.getElementById('typeExpenseBtn');
  const incomeBtn = document.getElementById('typeIncomeBtn');
  const hiddenType = document.getElementById('formType');

  hiddenType.value = type;
  retroAudio.play('click');

  if (type === 'expense') {
    expenseBtn.className = 'type-toggle-btn active-expense pixel-btn-tab';
    incomeBtn.className = 'type-toggle-btn pixel-btn-tab';
  } else {
    expenseBtn.className = 'type-toggle-btn pixel-btn-tab';
    incomeBtn.className = 'type-toggle-btn active-income pixel-btn-tab';
  }

  populateFormCategories(type, selectedCategoryId);
}

function handleFormSubmit(e) {
  e.preventDefault();

  const amountInput = document.getElementById('formAmount');
  const categorySelect = document.getElementById('formCategory');
  const dateInput = document.getElementById('formDate');
  const noteInput = document.getElementById('formNote');
  const typeInput = document.getElementById('formType');

  let hasError = false;

  const amountVal = parseFloat(amountInput.value);
  if (isNaN(amountVal) || amountVal <= 0) {
    document.getElementById('amountError').textContent = 'ВВЕДИТЕ СУММУ БОЛЬШЕ 0';
    hasError = true;
  } else {
    document.getElementById('amountError').textContent = '';
  }

  if (!categorySelect.value) {
    document.getElementById('categoryError').textContent = 'ВЫБЕРИТЕ КАТЕГОРИЮ';
    hasError = true;
  } else {
    document.getElementById('categoryError').textContent = '';
  }

  if (!dateInput.value) {
    document.getElementById('dateError').textContent = 'УКАЖИТЕ ДАТУ';
    hasError = true;
  } else {
    document.getElementById('dateError').textContent = '';
  }

  if (hasError) return;

  const payload = {
    type: typeInput.value,
    amount: amountVal,
    categoryId: categorySelect.value,
    date: dateInput.value,
    note: noteInput.value
  };

  if (state.editingId) {
    updateTransaction(state.editingId, payload);
  } else {
    createTransaction(payload);
  }

  closeModal();
}

function openEditModal(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (tx) openModal(tx);
}

function openDeleteModal(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  state.deletingId = id;
  const category = getCategory(tx.type, tx.categoryId);
  const previewBox = document.getElementById('deleteDetails');

  previewBox.innerHTML = `
    <div><strong>ТИП:</strong> ${tx.type === 'income' ? 'ЗОЛОТО (+)' : 'МАНА (-)'}</div>
    <div><strong>СУММА:</strong> ${formatCurrency(tx.amount, true, tx.type)}</div>
    <div><strong>ГИЛЬДИЯ:</strong> ${category.name}</div>
    <div><strong>ДАТА:</strong> ${formatDate(tx.date)}</div>
    ${tx.note ? `<div><strong>ОПИСАНИЕ:</strong> ${escapeHtml(tx.note)}</div>` : ''}
  `;

  retroAudio.play('click');
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
  state.deletingId = null;
  retroAudio.play('click');
}

// ==========================================================================
// Звуки 8-BIT
// ==========================================================================
function initSoundButton() {
  const soundIcon = document.getElementById('soundIcon');
  if (state.settings.sound) {
    soundIcon.className = 'fa-solid fa-volume-high';
  } else {
    soundIcon.className = 'fa-solid fa-volume-xmark';
  }
}

function toggleSound() {
  state.settings.sound = !state.settings.sound;
  saveSettings();
  initSoundButton();
  if (state.settings.sound) {
    retroAudio.play('coin');
    showToast('ЗВУК 8-BIT ВКЛЮЧЕН', 'info');
  } else {
    showToast('ЗВУК ВЫКЛЮЧЕН', 'info');
  }
}

// ==========================================================================
// Экспорт и импорт
// ==========================================================================
function exportToCsv() {
  if (state.transactions.length === 0) {
    showToast('ЖУРНАЛ ПУСТ!', 'info');
    return;
  }

  const headers = ['ID', 'Тип', 'Сумма', 'Категория', 'Дата', 'Описание'];
  const rows = state.transactions.map(tx => {
    const cat = getCategory(tx.type, tx.categoryId);
    return [
      tx.id,
      tx.type === 'income' ? 'Доход' : 'Расход',
      tx.amount,
      `"${cat.name.replace(/"/g, '""')}"`,
      tx.date,
      `"${(tx.note || '').replace(/"/g, '""')}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `retro_tracker_${new Date().toISOString().slice(0, 10)}.csv`);
  retroAudio.play('coin');
  showToast('СВИТОК ЭКСПОРТИРОВАН В CSV', 'success');
}

function exportToJson() {
  const data = {
    version: 'retro_8bit_3.0',
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    transactions: state.transactions
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadFile(blob, `retro_save_${new Date().toISOString().slice(0, 10)}.json`);
  retroAudio.play('coin');
  showToast('СЕЙВ СОХРАНЁН В ФАЙЛ JSON', 'success');
}

function importFromJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed.transactions)) {
        state.transactions = parsed.transactions;
        if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
      } else if (Array.isArray(parsed)) {
        state.transactions = parsed;
      } else {
        throw new Error('НЕВЕРНЫЙ СЕЙВ');
      }

      saveTransactions();
      saveSettings();
      renderApp();
      retroAudio.play('coin');
      showToast('СЕЙВ УСПЕШНО ЗАГРУЖЕН!', 'success');
    } catch (err) {
      retroAudio.play('delete');
      showToast('ОШИБКА ЧТЕНИЯ СЕЙВА!', 'danger');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================================================
// Тема
// ==========================================================================
function initTheme() {
  const theme = state.settings.theme || 'dark';
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  state.settings.theme = newTheme;
  saveSettings();
  updateChartTheme();
  renderKPI(getFilteredTransactions());
  retroAudio.play('click');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

function updateChartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2e2359' : '#d2cbfa';
  const textColor = isDark ? '#DFE94B' : '#1b1040';

  if (charts.barComparison) {
    charts.barComparison.options.scales.x.ticks.color = textColor;
    charts.barComparison.options.scales.y.ticks.color = textColor;
    charts.barComparison.options.scales.y.grid.color = gridColor;
    charts.barComparison.data.datasets[0].backgroundColor = COLOR_LIME;
    charts.barComparison.data.datasets[0].borderColor = '#000000';
    charts.barComparison.data.datasets[0].borderWidth = 2;
    charts.barComparison.data.datasets[1].backgroundColor = COLOR_PURPLE;
    charts.barComparison.data.datasets[1].borderColor = '#000000';
    charts.barComparison.data.datasets[1].borderWidth = 2;
    charts.barComparison.update();
  }

  if (charts.expenseCategory) {
    charts.expenseCategory.options.plugins.legend.labels.color = textColor;
    charts.expenseCategory.update();
  }

  if (charts.incomeCategory) {
    charts.incomeCategory.options.plugins.legend.labels.color = textColor;
    charts.incomeCategory.update();
  }
}

// ==========================================================================
// Toast Уведомления
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-coins';
  if (type === 'danger') icon = 'fa-skull';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function spawnPawPrint(x, y) {
  if (!x || !y) return;
  const paw = document.createElement('div');
  paw.className = 'floating-paw';
  paw.innerHTML = '🐾';
  paw.style.left = `${x}px`;
  paw.style.top = `${y}px`;
  document.body.appendChild(paw);
  setTimeout(() => paw.remove(), 800);
}
