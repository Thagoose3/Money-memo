/**
 * Storage & Data Management for Money Memo v2.9 (Hybrid LocalStorage & Firebase Cloud Sync)
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'smart_expense_transactions_v1',
  CATEGORIES: 'smart_expense_categories_v1',
  BUDGET_SIMULATOR: 'smart_expense_budget_sim_v1',
  RECURRING_ITEMS: 'smart_expense_recurring_list_v2',
  DELETED_RECURRING: 'smart_expense_deleted_rec_ids_v1',
  PAY_CYCLE: 'smart_expense_pay_cycle_setting_v1',
  SAVINGS_GOAL: 'smart_expense_monthly_savings_goal_v1'
};

const DEFAULT_SAVINGS_GOAL = 5000;

const DEFAULT_PAY_CYCLE = {
  type: 'calendar', // 'calendar' | 'end_of_month' | 'day_25' | 'day_28' | 'custom'
  customDay: 1
};

const DEFAULT_CATEGORIES = [
  // รายจ่าย (Expenses)
  { id: 'exp_housing', name: 'ค่าเช่าห้อง & ที่พัก', nameEn: 'Housing & Rent', emoji: '🏠', color: '#8b5cf6', type: 'expense', isDefault: true },
  { id: 'exp_bills', name: 'บิล น้ำ/ไฟ/เน็ต', nameEn: 'Utilities & Bills', emoji: '💡', color: '#eab308', type: 'expense', isDefault: true },
  { id: 'exp_food', name: 'อาหาร & เครื่องดื่ม', nameEn: 'Food & Dining', emoji: '🍔', color: '#f97316', type: 'expense', isDefault: true },
  { id: 'exp_transport', name: 'เดินทาง & คมนาคม', nameEn: 'Transportation', emoji: '🚗', color: '#06b6d4', type: 'expense', isDefault: true },
  { id: 'exp_shopping', name: 'ช้อปปิ้ง & เสื้อผ้า', nameEn: 'Shopping & Goods', emoji: '🛍️', color: '#ec4899', type: 'expense', isDefault: true },
  { id: 'exp_ent', name: 'บันเทิง & สตรีมมิ่ง', nameEn: 'Entertainment', emoji: '🎬', color: '#a855f7', type: 'expense', isDefault: true },
  { id: 'exp_pets', name: 'สัตว์เลี้ยง & อาหารสัตว์', nameEn: 'Pets & Supplies', emoji: '🐾', color: '#10b981', type: 'expense', isDefault: true },
  { id: 'exp_health', name: 'สุขภาพ & ประกัน', nameEn: 'Health & Insurance', emoji: '🛡️', color: '#ef4444', type: 'expense', isDefault: true },
  { id: 'exp_edu', name: 'การศึกษา & พัฒนาตน', nameEn: 'Education & Learning', emoji: '📚', color: '#3b82f6', type: 'expense', isDefault: true },
  { id: 'exp_other', name: 'ค่าใช้จ่ายอื่นๆ', nameEn: 'Other Expenses', emoji: '📦', color: '#64748b', type: 'expense', isDefault: true },

  // รายรับ (Incomes)
  { id: 'inc_salary', name: 'เงินเดือน & ค่าจ้าง', nameEn: 'Salary & Wages', emoji: '💼', color: '#10b981', type: 'income', isDefault: true },
  { id: 'inc_bonus', name: 'โบนัส & คอมมิชชั่น', nameEn: 'Bonus & Commission', emoji: '🎁', color: '#14b8a6', type: 'income', isDefault: true },
  { id: 'inc_business', name: 'ธุรกิจ & ค้าขาย', nameEn: 'Business & Sales', emoji: '🛒', color: '#059669', type: 'income', isDefault: true },
  { id: 'inc_invest', name: 'เงินปันผล & ดอกเบี้ย', nameEn: 'Dividends & Interest', emoji: '📈', color: '#6366f1', type: 'income', isDefault: true },
  { id: 'inc_other', name: 'รายรับอื่นๆ', nameEn: 'Other Income', emoji: '💰', color: '#84cc16', type: 'income', isDefault: true }
];

// รายการประจำเริ่มต้น
const DEFAULT_RECURRING_ITEMS = [
  // รายจ่ายประจำ (Expenses)
  { id: 'rec_exp_1', type: 'expense', name: 'ค่าเช่าห้อง / คอนโด', nameEn: 'Apartment Rent', amount: 2800, categoryId: 'exp_housing', paymentMethod: 'โอนเงิน / บัญชีธนาคาร' },
  { id: 'rec_exp_2', type: 'expense', name: 'ค่าน้ำ + ค่าไฟ', nameEn: 'Electricity & Water', amount: 2200, categoryId: 'exp_bills', paymentMethod: 'โอนเงิน / บัญชีธนาคาร' },
  { id: 'rec_exp_3', type: 'expense', name: 'ค่าเน็ตบ้าน + มือถือ', nameEn: 'Internet & Mobile', amount: 300, categoryId: 'exp_bills', paymentMethod: 'พร้อมเพย์ / สแกน QR' },
  { id: 'rec_exp_4', type: 'expense', name: 'ค่าเดินทางประจำ (BTS/น้ำมัน)', nameEn: 'Transport (BTS/Fuel)', amount: 400, categoryId: 'exp_transport', paymentMethod: 'พร้อมเพย์ / สแกน QR' },
  { id: 'rec_exp_5', type: 'expense', name: 'ค่าซักผ้า & ของใช้ในห้อง', nameEn: 'Laundry & Household', amount: 300, categoryId: 'exp_shopping', paymentMethod: 'เงินสด (Cash)' },

  // รายรับประจำ (Incomes)
  { id: 'rec_inc_1', type: 'income', name: 'เงินเดือนประจำ', nameEn: 'Monthly Salary', amount: 18000, categoryId: 'inc_salary', paymentMethod: 'โอนเงิน / บัญชีธนาคาร' },
  { id: 'rec_inc_2', type: 'income', name: 'ค่าจ้างงานเสริมประจำ', nameEn: 'Freelance & Side Gig', amount: 3000, categoryId: 'inc_business', paymentMethod: 'พร้อมเพย์ / สแกน QR' }
];

// ข้อมูลจำลองงบประมาณ
const DEFAULT_BUDGET_SIMULATOR = {
  monthlyIncome: 18000,
  savingsGoal: 5000,
  daysInMonth: 30,
  fixedExpenses: [
    { id: 'sim_fe_1', name: 'ค่าเช่าห้องจำลอง', nameEn: 'Simulated Rent', amount: 2800 },
    { id: 'sim_fe_2', name: 'ค่าน้ำไฟจำลอง', nameEn: 'Simulated Utilities', amount: 2200 },
    { id: 'sim_fe_3', name: 'ค่าเน็ตจำลอง', nameEn: 'Simulated Internet', amount: 300 },
    { id: 'sim_fe_4', name: 'ค่าเดินทางจำลอง', nameEn: 'Simulated Transport', amount: 400 }
  ]
};

const StorageManager = {
  // In-memory cache for blazing fast synchronous lookups & 60fps renders
  _categories: null,
  _catMap: null,
  _recurring: null,
  _transactions: null,
  _budgetSimulator: null,

  // Helper to sync with Cloud (Firebase / Supabase)
  _syncCloud(action, data) {
    if (typeof FirebaseManager !== 'undefined' && FirebaseManager.isLoggedIn()) {
      if (action === 'saveTransaction') FirebaseManager.saveCloudTransaction(data);
      else if (action === 'deleteTransaction') FirebaseManager.deleteCloudTransaction(data);
      else if (action === 'saveCategory') FirebaseManager.saveCloudCategory(data);
      else if (action === 'deleteCategory') FirebaseManager.deleteCloudCategory(data);
      else if (action === 'saveRecurring') FirebaseManager.saveCloudRecurringItem(data);
      else if (action === 'deleteRecurring') FirebaseManager.deleteCloudRecurringItem(data);
      else if (action === 'saveBudgetSimulator') FirebaseManager.saveCloudBudgetSimulator(data);
    } else if (typeof SupabaseManager !== 'undefined' && SupabaseManager.isLoggedIn()) {
      if (action === 'saveTransaction') SupabaseManager.saveCloudTransaction(data);
      else if (action === 'deleteTransaction') SupabaseManager.deleteCloudTransaction(data);
      else if (action === 'saveCategory') SupabaseManager.saveCloudCategory(data);
      else if (action === 'deleteCategory') SupabaseManager.deleteCloudCategory(data);
      else if (action === 'saveRecurring') SupabaseManager.saveCloudRecurringItem(data);
      else if (action === 'deleteRecurring') SupabaseManager.deleteCloudRecurringItem(data);
    }
  },

  _updateCatMap() {
    this._catMap = new Map();
    if (Array.isArray(this._categories)) {
      this._categories.forEach(c => this._catMap.set(c.id, c));
    }
  },

  // --- หมวดหมู่ (Categories) ---
  getCategories() {
    if (this._categories) return this._categories;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!data) {
        this.saveCategories(DEFAULT_CATEGORIES);
        return this._categories;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let needsSave = false;
        parsed.forEach(c => {
          const def = DEFAULT_CATEGORIES.find(d => d.id === c.id);
          if (def) {
            if (!c.nameEn && def.nameEn) {
              c.nameEn = def.nameEn;
              needsSave = true;
            }
            if (c.isDefault === undefined) {
              c.isDefault = true;
              needsSave = true;
            }
          }
        });
        this._categories = parsed;
        this._updateCatMap();
        if (needsSave) {
          this.saveCategories(parsed);
        }
        return this._categories;
      }
      this.saveCategories(DEFAULT_CATEGORIES);
      return this._categories;
    } catch (e) {
      this._categories = DEFAULT_CATEGORIES;
      this._updateCatMap();
      return this._categories;
    }
  },

  getCategoryDisplayName(category) {
    if (!category) return '';
    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';
    if (lang === 'en') {
      if (category.nameEn) return category.nameEn;
      const def = DEFAULT_CATEGORIES.find(d => d.id === category.id);
      if (def && def.nameEn) return def.nameEn;
    }
    return category.name || '';
  },

  getItemDisplayName(item) {
    if (!item) return '';
    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';
    if (lang === 'en') {
      if (item.nameEn) return item.nameEn;
      const def = DEFAULT_RECURRING_ITEMS.find(d => d.id === item.id);
      if (def && def.nameEn) return def.nameEn;
    }
    return item.name || '';
  },

  saveCategories(categories) {
    this._categories = categories;
    this._updateCatMap();
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Error saving categories:', e);
    }
  },

  addCategory(category) {
    const categories = this.getCategories();
    const type = category.type === 'income' ? 'income' : 'expense';
    const name = (category.name || '').trim() || (type === 'income' ? 'รายรับใหม่' : 'รายจ่ายใหม่');
    const nameEn = (category.nameEn || '').trim() || name;
    
    const newCat = {
      id: 'cat_' + (type === 'income' ? 'inc_' : 'exp_') + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name,
      nameEn: nameEn,
      emoji: category.emoji || (type === 'income' ? '💰' : '📦'),
      color: category.color || (type === 'income' ? '#34d399' : '#f87171'),
      type: type,
      isDefault: false
    };

    categories.push(newCat);
    this.saveCategories(categories);
    this._syncCloud('saveCategory', newCat);

    return newCat;
  },

  updateCategory(id, updatedData) {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return { success: false, message: 'Category not found' };

    const type = updatedData.type || categories[index].type || 'expense';

    categories[index] = {
      ...categories[index],
      name: updatedData.name ? updatedData.name.trim() : categories[index].name,
      nameEn: updatedData.nameEn ? updatedData.nameEn.trim() : (categories[index].nameEn || categories[index].name),
      emoji: updatedData.emoji || categories[index].emoji,
      color: updatedData.color || categories[index].color,
      type: type
    };

    this.saveCategories(categories);
    this._syncCloud('saveCategory', categories[index]);

    return { success: true, category: categories[index] };
  },

  deleteCategory(id) {
    let categories = this.getCategories();
    categories = categories.filter(c => c.id !== id);
    this.saveCategories(categories);
    this._syncCloud('deleteCategory', id);

    return { success: true };
  },

  restoreDefaultCategories() {
    this.saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  },

  getCategoryById(id) {
    if (!this._catMap) {
      this.getCategories();
    }
    return (this._catMap && this._catMap.get(id)) || {
      id: 'unknown',
      name: 'ค่าใช้จ่ายทั่วไป',
      nameEn: 'General Expense',
      emoji: '📦',
      color: '#94a3b8',
      type: 'expense',
      isDefault: true
    };
  },

  getCategoryUsageStats(type = 'expense') {
    const transactions = this.getTransactions();
    const usageStats = {};
    transactions.forEach(t => {
      if (t.type === type && t.categoryId) {
        if (!usageStats[t.categoryId]) {
          usageStats[t.categoryId] = { count: 0, lastUsed: 0 };
        }
        usageStats[t.categoryId].count += 1;
        const txTime = t.createdAt || (t.date ? new Date(t.date).getTime() : 0);
        if (txTime > usageStats[t.categoryId].lastUsed) {
          usageStats[t.categoryId].lastUsed = txTime;
        }
      }
    });
    return usageStats;
  },

  getCategoriesSortedByUsage(type = 'expense') {
    const categories = this.getCategories().filter(c => c.type === type);
    const usageStats = this.getCategoryUsageStats(type);

    // Sort categories: highest count first, then most recently used, then original index
    return [...categories].sort((a, b) => {
      const statsA = usageStats[a.id] || { count: 0, lastUsed: 0 };
      const statsB = usageStats[b.id] || { count: 0, lastUsed: 0 };

      if (statsB.count !== statsA.count) {
        return statsB.count - statsA.count; // Most frequently used first
      }
      if (statsB.lastUsed !== statsA.lastUsed) {
        return statsB.lastUsed - statsA.lastUsed; // Most recently used first
      }
      return 0;
    });
  },

  guessCategoryByName(name = '', type = 'expense') {
    const lower = name.toLowerCase();
    if (type === 'income') {
      if (/เงินเดือน|ค่าจ้าง|salary|wage|pay/.test(lower)) return 'inc_salary';
      if (/โบนัส|คอมมิชชั่น|bonus|comm/.test(lower)) return 'inc_bonus';
      if (/ขายของ|ธุรกิจ|ร้าน|ช้อป|freelance|ฟรีแลนซ์|side/.test(lower)) return 'inc_business';
      if (/ปันผล|ดอกเบี้ย|หุ้น|กองทุน|คริปโต|dividend|interest|crypto/.test(lower)) return 'inc_invest';
      return 'inc_other';
    }

    if (/หมา|แมว|สัตว์|เพ็ท|pet|dog|cat/.test(lower)) return 'exp_pets';
    if (/เช่า|ห้อง|คอนโด|ที่พัก|หอพัก|อพาร์ท|บ้าน|rent|housing/.test(lower)) return 'exp_housing';
    if (/น้ำ|ไฟ|เน็ต|โทรศัพท์|มือถือ|บิล|wifi|ais|true|dtac|electric|water|bill/.test(lower)) return 'exp_bills';
    if (/เดินทาง|bts|mrt|รถ|น้ำมัน|แท็กซี่|วิน|ตั๋ว|ผ่อนรถ|gas|fuel|transport|taxi/.test(lower)) return 'exp_transport';
    if (/กิน|อาหาร|ข้าว|กาแฟ|ชา|บุฟเฟต์|สุกี้|หมูกระทะ|food|coffee|drink|lunch|dinner/.test(lower)) return 'exp_food';
    if (/ซักผ้า|ของใช้|ช้อป|ซื้อ|เสื้อผ้า|เครื่องสำอาง|shop|cloth|laundry/.test(lower)) return 'exp_shopping';
    if (/netflix|spotify|youtube|disney|ดูหนัง|เกม|สตรีม|stream|movie|game/.test(lower)) return 'exp_ent';
    if (/ยา|หมอ|สุขภาพ|ประกัน|aia|fwd|วิตามิน|คลินิก|ฟิตเนส|health|insurance|doctor|gym/.test(lower)) return 'exp_health';
    if (/เรียน|หนังสือ|คอร์ส|ติว|การศึกษา|book|course|edu/.test(lower)) return 'exp_edu';
    return 'exp_other';
  },

  // --- รายรับ & รายจ่าย ประจำเดือน (Recurring Items Management) ---
  getDeletedRecurringIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_RECURRING);
      if (!data) return new Set();
      const arr = JSON.parse(data);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  },

  trackDeletedRecurringId(id) {
    if (!id) return;
    try {
      const set = this.getDeletedRecurringIds();
      set.add(id);
      localStorage.setItem(STORAGE_KEYS.DELETED_RECURRING, JSON.stringify(Array.from(set)));
    } catch (e) {}
  },

  getRecurringItems() {
    if (this._recurring) return this._recurring;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECURRING_ITEMS);
      if (data === null) {
        // Only on fresh install if key was never created
        this.saveRecurringItems(DEFAULT_RECURRING_ITEMS);
        return this._recurring;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this._recurring = parsed;
        return this._recurring;
      }
      this._recurring = [];
      return this._recurring;
    } catch (e) {
      console.error('Error loading recurring items:', e);
      this._recurring = [];
      return this._recurring;
    }
  },

  saveRecurringItems(list) {
    this._recurring = Array.isArray(list) ? list : [];
    try {
      localStorage.setItem(STORAGE_KEYS.RECURRING_ITEMS, JSON.stringify(this._recurring));
    } catch (e) {
      console.error('Error saving recurring items:', e);
    }
  },

  addRecurringItem(item) {
    const list = this.getRecurringItems();
    const type = item.type === 'income' ? 'income' : 'expense';
    const name = (item.name || '').trim() || (type === 'income' ? 'รายรับประจำใหม่' : 'รายจ่ายประจำใหม่');
    const nameEn = (item.nameEn || '').trim() || name;
    
    const newItem = {
      id: 'rec_' + (type === 'income' ? 'inc_' : 'exp_') + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: type,
      name: name,
      nameEn: nameEn,
      amount: Math.max(0, parseFloat(item.amount) || 0),
      categoryId: item.categoryId || this.guessCategoryByName(name, type),
      paymentMethod: item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร'
    };
    list.push(newItem);
    this.saveRecurringItems(list);
    this._syncCloud('saveRecurring', newItem);

    return newItem;
  },

  updateRecurringItem(id, updatedData) {
    const list = this.getRecurringItems();
    const index = list.findIndex(e => e.id === id);
    if (index === -1) return { success: false, message: 'ไม่พบรายการ' };

    const type = updatedData.type || list[index].type || 'expense';

    list[index] = {
      ...list[index],
      type: type,
      name: updatedData.name ? updatedData.name.trim() : list[index].name,
      nameEn: updatedData.nameEn ? updatedData.nameEn.trim() : (list[index].nameEn || list[index].name),
      amount: updatedData.amount !== undefined ? Math.max(0, parseFloat(updatedData.amount) || 0) : list[index].amount,
      categoryId: updatedData.categoryId || list[index].categoryId,
      paymentMethod: updatedData.paymentMethod || list[index].paymentMethod
    };

    this.saveRecurringItems(list);
    this._syncCloud('saveRecurring', list[index]);

    return { success: true, item: list[index] };
  },

  deleteRecurringItem(id) {
    let list = this.getRecurringItems();
    list = list.filter(e => e.id !== id);
    this.saveRecurringItems(list);
    this.trackDeletedRecurringId(id);
    this._syncCloud('deleteRecurring', id);

    return { success: true };
  },

  // Invalidate all memory caches when external/cloud data changes
  invalidateCache() {
    this._categories = null;
    this._catMap = null;
    this._recurring = null;
    this._transactions = null;
    this._budgetSimulator = null;
    this._payCycleSetting = null;
    this._savingsGoal = null;
  },

  // Helper to normalize any date input to YYYY-MM-DD
  normalizeDateString(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      const matchIso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (matchIso) {
        return `${matchIso[1]}-${matchIso[2].padStart(2, '0')}-${matchIso[3].padStart(2, '0')}`;
      }
      const matchSlash = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (matchSlash) {
        return `${matchSlash[3]}-${matchSlash[2].padStart(2, '0')}-${matchSlash[1].padStart(2, '0')}`;
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
      }
      return trimmed.slice(0, 10);
    } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${dateVal.getFullYear()}-${pad(dateVal.getMonth() + 1)}-${pad(dateVal.getDate())}`;
    }
    return '';
  },

  // --- รายการบันทึกจริง (Transactions) ---
  getTransactions(forceRefresh = false) {
    if (!forceRefresh && this._transactions) return this._transactions;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        this._transactions = [];
        return this._transactions;
      }
      const parsed = JSON.parse(data);
      this._transactions = Array.isArray(parsed) ? parsed : [];
      return this._transactions;
    } catch (e) {
      this._transactions = [];
      return this._transactions;
    }
  },

  saveTransactions(transactions) {
    this._transactions = transactions;
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions:', e);
    }
  },

  addTransaction(tx) {
    const transactions = this.getTransactions();
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: tx.type === 'income' ? 'income' : 'expense',
      amount: Math.abs(parseFloat(tx.amount)) || 0,
      categoryId: tx.categoryId || (tx.type === 'income' ? 'inc_other' : 'exp_other'),
      date: tx.date || new Date().toISOString().slice(0, 16),
      paymentMethod: tx.paymentMethod || 'เงินสด (Cash)',
      note: (tx.note || '').trim(),
      createdAt: Date.now()
    };
    transactions.unshift(newTx);
    this.saveTransactions(transactions);
    this._syncCloud('saveTransaction', newTx);

    return newTx;
  },

  addTransactionsBatch(txList) {
    if (!Array.isArray(txList) || txList.length === 0) return 0;
    const transactions = this.getTransactions();
    const newItems = txList.map((tx, idx) => ({
      id: 'tx_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 6),
      type: tx.type === 'income' ? 'income' : 'expense',
      amount: Math.abs(parseFloat(tx.amount)) || 0,
      categoryId: tx.categoryId || (tx.type === 'income' ? 'inc_other' : 'exp_other'),
      date: tx.date || new Date().toISOString().slice(0, 16),
      paymentMethod: tx.paymentMethod || 'โอนเงิน / บัญชีธนาคาร',
      note: (tx.note || '').trim(),
      createdAt: Date.now() + idx
    }));
    const merged = [...newItems, ...transactions];
    this.saveTransactions(merged);

    newItems.forEach(item => this._syncCloud('saveTransaction', item));

    return newItems.length;
  },

  updateTransaction(id, updatedData) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return { success: false, message: 'ไม่พบรายการที่ต้องการแก้ไข' };

    transactions[index] = {
      ...transactions[index],
      type: updatedData.type === 'income' ? 'income' : 'expense',
      amount: Math.abs(parseFloat(updatedData.amount)) || 0,
      categoryId: updatedData.categoryId || transactions[index].categoryId,
      date: updatedData.date || transactions[index].date,
      paymentMethod: updatedData.paymentMethod || transactions[index].paymentMethod,
      note: (updatedData.note !== undefined ? updatedData.note : transactions[index].note).trim(),
      updatedAt: Date.now()
    };

    this.saveTransactions(transactions);
    this._syncCloud('saveTransaction', transactions[index]);

    return { success: true, transaction: transactions[index] };
  },

  deleteTransaction(id) {
    let transactions = this.getTransactions();
    const exists = transactions.some(t => t.id === id);
    if (!exists) return { success: false, message: 'ไม่พบรายการที่ต้องการลบ' };

    transactions = transactions.filter(t => t.id !== id);
    this.saveTransactions(transactions);
    this._syncCloud('deleteTransaction', id);

    return { success: true };
  },

  getTransactionById(id) {
    const transactions = this.getTransactions();
    return transactions.find(t => t.id === id) || null;
  },

  // --- ระบบวิเคราะห์งบประมาณจำลอง (Budget Simulator Sandbox) ---
  getBudgetSimulator() {
    if (this._budgetSimulator) return this._budgetSimulator;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGET_SIMULATOR);
      if (!data) {
        this.saveBudgetSimulator(DEFAULT_BUDGET_SIMULATOR);
        return this._budgetSimulator;
      }
      this._budgetSimulator = JSON.parse(data);
      return this._budgetSimulator;
    } catch (e) {
      this._budgetSimulator = DEFAULT_BUDGET_SIMULATOR;
      return this._budgetSimulator;
    }
  },

  saveBudgetSimulator(data) {
    this._budgetSimulator = data;
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGET_SIMULATOR, JSON.stringify(data));
      this._syncCloud('saveBudgetSimulator', data);
    } catch (e) {
      console.error('Error saving budget simulator:', e);
    }
  },

  // --- รอบบัญชี & วันเงินเดือนออก (Payday / Cut-off Cycle) ---
  _payCycleSetting: null,

  getPayCycleSetting() {
    if (this._payCycleSetting) return this._payCycleSetting;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAY_CYCLE);
      if (!data) {
        // Migration support from legacy pay_cycle_preset key
        const legacyPreset = localStorage.getItem('money_memo_pay_cycle_preset');
        if (legacyPreset === '25') {
          this._payCycleSetting = { type: 'day_25', customDay: 25 };
        } else if (legacyPreset === '28') {
          this._payCycleSetting = { type: 'day_28', customDay: 28 };
        } else if (legacyPreset === 'end_of_month' || legacyPreset === 'last_day') {
          this._payCycleSetting = { type: 'end_of_month', customDay: 31 };
        } else {
          this._payCycleSetting = JSON.parse(JSON.stringify(DEFAULT_PAY_CYCLE));
        }
        return this._payCycleSetting;
      }
      this._payCycleSetting = JSON.parse(data);
      return this._payCycleSetting;
    } catch (e) {
      this._payCycleSetting = JSON.parse(JSON.stringify(DEFAULT_PAY_CYCLE));
      return this._payCycleSetting;
    }
  },

  savePayCycleSetting(setting) {
    this._payCycleSetting = setting;
    try {
      localStorage.setItem(STORAGE_KEYS.PAY_CYCLE, JSON.stringify(setting));
    } catch (e) {
      console.error('Error saving pay cycle setting:', e);
    }
  },

  // --- เป้าหมายเงินออมรายเดือน (Monthly Savings Target) ---
  getMonthlySavingsGoal() {
    if (this._savingsGoal !== undefined && this._savingsGoal !== null) return this._savingsGoal;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOAL);
      if (data !== null && data !== undefined) {
        const val = parseFloat(data);
        if (!isNaN(val) && val >= 0) {
          this._savingsGoal = val;
          return this._savingsGoal;
        }
      }
      this._savingsGoal = DEFAULT_SAVINGS_GOAL;
      return this._savingsGoal;
    } catch (e) {
      this._savingsGoal = DEFAULT_SAVINGS_GOAL;
      return this._savingsGoal;
    }
  },

  saveMonthlySavingsGoal(amount) {
    const val = Math.max(0, parseFloat(amount) || 0);
    this._savingsGoal = val;
    try {
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOAL, String(val));
    } catch (e) {
      console.error('Error saving savings goal:', e);
    }
  },

  getCycleDateRange(referenceDate = new Date(), payCycleSetting = null) {
    const setting = payCycleSetting || this.getPayCycleSetting();
    const ref = new Date(referenceDate);
    const Y = ref.getFullYear();
    const M = ref.getMonth(); // 0 to 11
    const pad = (n) => String(n).padStart(2, '0');

    let sDate, eDate;

    if (setting.type === 'end_of_month' || setting.type === 'last_day') {
      // Last day of previous month to last day of current month (e.g. 31 Aug to 30 Sep)
      sDate = new Date(Y, M, 0); // Last day of month M-1
      eDate = new Date(Y, M + 1, 0); // Last day of month M
    } else if (setting.type === 'day_25') {
      sDate = new Date(Y, M - 1, 25);
      eDate = new Date(Y, M, 24);
    } else if (setting.type === 'day_28') {
      sDate = new Date(Y, M - 1, 28);
      eDate = new Date(Y, M, 27);
    } else if (setting.type === 'custom') {
      const customDay = Math.max(1, Math.min(31, parseInt(setting.customDay, 10) || 1));
      if (customDay === 1) {
        sDate = new Date(Y, M, 1);
        eDate = new Date(Y, M + 1, 0);
      } else {
        const prevMonthMax = new Date(Y, M, 0).getDate();
        const actualStartDay = Math.min(customDay, prevMonthMax);
        sDate = new Date(Y, M - 1, actualStartDay);

        const curMonthMax = new Date(Y, M + 1, 0).getDate();
        const actualEndDay = Math.min(customDay - 1, curMonthMax);
        eDate = new Date(Y, M, actualEndDay);
      }
    } else {
      // 'calendar' (1st of current month to last day of current month)
      sDate = new Date(Y, M, 1);
      eDate = new Date(Y, M + 1, 0);
    }

    const startDateStr = `${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}`;
    const endDateStr = `${eDate.getFullYear()}-${pad(eDate.getMonth() + 1)}-${pad(eDate.getDate())}`;

    const thShortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const enShortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const thFullMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const enFullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const labelTh = `${sDate.getDate()} ${thShortMonths[sDate.getMonth()]} - ${eDate.getDate()} ${thShortMonths[eDate.getMonth()]} ${eDate.getFullYear() + 543}`;
    const labelEn = `${sDate.getDate()} ${enShortMonths[sDate.getMonth()]} - ${eDate.getDate()} ${enShortMonths[eDate.getMonth()]} ${eDate.getFullYear()}`;
    const monthTitleTh = `${thFullMonths[M]} ${Y + 543}`;
    const monthTitleEn = `${enFullMonths[M]} ${Y}`;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      sDate,
      eDate,
      labelTh,
      labelEn,
      monthTitleTh,
      monthTitleEn,
      year: Y,
      monthIndex: M,
      isCalendar: setting.type === 'calendar'
    };
  },

  // --- นำเข้า / ส่งออก ข้อมูล พร้อมตัวกรองและหัวตารางสมบูรณ์ ---
  getFilteredTransactions(filters = {}) {
    const transactions = this.getTransactions();

    return transactions.filter(t => {
      // Date filter
      if (filters.dateRange === 'this_month') {
        const now = new Date();
        const d = new Date(t.date);
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      } else if (filters.dateRange === 'last_month') {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const d = new Date(t.date);
        if (d.getFullYear() !== prevMonth.getFullYear() || d.getMonth() !== prevMonth.getMonth()) return false;
      } else if (filters.dateRange === 'custom') {
        if (filters.startDate && t.date.slice(0, 10) < filters.startDate) return false;
        if (filters.endDate && t.date.slice(0, 10) > filters.endDate) return false;
      }

      // Type filter
      if (filters.type && filters.type !== 'all' && t.type !== filters.type) return false;

      // Category filter
      if (filters.categoryId && filters.categoryId !== 'all' && t.categoryId !== filters.categoryId) return false;

      // Payment filter
      if (filters.paymentMethod && filters.paymentMethod !== 'all' && t.paymentMethod !== filters.paymentMethod) return false;

      return true;
    });
  },

  exportFilteredCSV(filters = {}) {
    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';
    const filtered = this.getFilteredTransactions(filters);

    if (filtered.length === 0) {
      alert(lang === 'en' ? 'No transactions match the selected filters' : 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก');
      return false;
    }

    // Sort by date ascending
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    // Headers with bilingual support
    const headerTitle = lang === 'en' ? 'Money Memo Financial Report' : 'รายงานการเงิน Money Memo';
    const exportTime = new Date().toLocaleString(lang === 'en' ? 'en-US' : 'th-TH');

    let filterDesc = '';
    if (filters.dateRange === 'this_month') filterDesc = lang === 'en' ? 'Period: This Month' : 'ช่วงเวลา: เดือนนี้';
    else if (filters.dateRange === 'last_month') filterDesc = lang === 'en' ? 'Period: Last Month' : 'ช่วงเวลา: เดือนที่ผ่านมา';
    else if (filters.dateRange === 'custom') filterDesc = `${lang === 'en' ? 'Period' : 'ช่วงเวลา'}: ${filters.startDate || '-'} to ${filters.endDate || '-'}`;
    else filterDesc = lang === 'en' ? 'Period: All Time' : 'ช่วงเวลา: ทั้งหมด';

    const headers = [
      lang === 'en' ? 'Date & Time' : 'วันที่และเวลา',
      lang === 'en' ? 'Type' : 'ประเภท',
      lang === 'en' ? 'Category' : 'หมวดหมู่',
      lang === 'en' ? 'Amount (THB)' : 'จำนวนเงิน (บาท)',
      lang === 'en' ? 'Payment Method' : 'ช่องทางชำระเงิน',
      lang === 'en' ? 'Note / Memo' : 'บันทึกช่วยจำ'
    ];

    let totalIncome = 0;
    let totalExpense = 0;

    const rows = filtered.map(t => {
      const cat = this.getCategoryById(t.categoryId);
      const catName = this.getCategoryDisplayName(cat);
      const isExp = t.type === 'expense';
      
      if (isExp) totalExpense += t.amount;
      else totalIncome += t.amount;

      const typeStr = isExp ? (lang === 'en' ? 'Expense' : 'รายจ่าย') : (lang === 'en' ? 'Income' : 'รายรับ');
      const formattedDate = t.date.replace('T', ' ');
      const cleanNote = (t.note || '').replace(/"/g, '""');

      return [
        `"${formattedDate}"`,
        `"${typeStr}"`,
        `"${cat.emoji} ${catName}"`,
        t.amount.toFixed(2),
        `"${t.paymentMethod}"`,
        `"${cleanNote}"`
      ].join(',');
    });

    const netBalance = totalIncome - totalExpense;

    // Summary Rows with Headers
    const emptyRow = '"","","","","",""';
    const summaryHeader = `"${lang === 'en' ? '=== SUMMARY ===' : '=== สรุปยอดรวม ==='}","","","","",""`;
    const incomeSummary = `"${lang === 'en' ? 'Total Income' : 'รายรับรวม'}","","","${totalIncome.toFixed(2)}","",""`;
    const expenseSummary = `"${lang === 'en' ? 'Total Expense' : 'รายจ่ายรวม'}","","","${totalExpense.toFixed(2)}","",""`;
    const netSummary = `"${lang === 'en' ? 'Net Balance' : 'คงเหลือสุทธิ'}","","","${netBalance.toFixed(2)}","",""`;

    const csvContent = '\uFEFF' + [
      `"${headerTitle}"`,
      `"${filterDesc} | ${lang === 'en' ? 'Generated on' : 'สร้างเมื่อ'}: ${exportTime} | ${lang === 'en' ? 'Total records' : 'จำนวนรายการ'}: ${filtered.length}"`,
      emptyRow,
      headers.join(','),
      ...rows,
      emptyRow,
      summaryHeader,
      incomeSummary,
      expenseSummary,
      netSummary
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `money_memo_report_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  exportToCSV() {
    return this.exportFilteredCSV({ dateRange: 'all', type: 'all', categoryId: 'all', paymentMethod: 'all' });
  },

  exportToJSON() {
    const backupData = {
      version: '3.9.1',
      exportedAt: new Date().toISOString(),
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      recurringItems: this.getRecurringItems(),
      budgetSimulator: this.getBudgetSimulator(),
      payCycleSetting: this.getPayCycleSetting(),
      savingsGoal: this.getMonthlySavingsGoal()
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `money_memo_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data) throw new Error('Invalid file');

      if (Array.isArray(data)) {
        this.saveTransactions(data);
      } else {
        if (Array.isArray(data.transactions)) this.saveTransactions(data.transactions);
        if (Array.isArray(data.categories)) this.saveCategories(data.categories);
        if (Array.isArray(data.recurringItems)) this.saveRecurringItems(data.recurringItems);
        if (data.budgetSimulator) this.saveBudgetSimulator(data.budgetSimulator);
        if (data.payCycleSetting) this.savePayCycleSetting(data.payCycleSetting);
        if (typeof data.savingsGoal === 'number') this.saveMonthlySavingsGoal(data.savingsGoal);
      }
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message || 'Corrupted JSON file' };
    }
  },

  loadSampleData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const sampleTxs = [
      {
        id: 'sample_1',
        type: 'income',
        amount: 18000,
        categoryId: 'inc_salary',
        date: `${year}-${month}-01T09:00`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'เงินเดือนประจำเดือน / Monthly Salary',
        createdAt: Date.now() - 86400000 * 20
      },
      {
        id: 'sample_2',
        type: 'expense',
        amount: 2800,
        categoryId: 'exp_housing',
        date: `${year}-${month}-02T10:00`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'ค่าเช่าห้อง / Apartment Rent',
        createdAt: Date.now() - 86400000 * 19
      },
      {
        id: 'sample_3',
        type: 'expense',
        amount: 2200,
        categoryId: 'exp_bills',
        date: `${year}-${month}-03T11:20`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'ค่าน้ำ + ค่าไฟ / Utilities',
        createdAt: Date.now() - 86400000 * 18
      },
      {
        id: 'sample_4',
        type: 'expense',
        amount: 300,
        categoryId: 'exp_bills',
        date: `${year}-${month}-05T12:00`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ค่าเน็ตบ้าน + มือถือ / Internet',
        createdAt: Date.now() - 86400000 * 16
      },
      {
        id: 'sample_5',
        type: 'expense',
        amount: 400,
        categoryId: 'exp_transport',
        date: `${year}-${month}-07T08:30`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ค่าเดินทางประจำ / Transport',
        createdAt: Date.now() - 86400000 * 14
      },
      {
        id: 'sample_6',
        type: 'expense',
        amount: 100,
        categoryId: 'exp_food',
        date: `${year}-${month}-10T12:30`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ข้าวกะเพราหมูกรอบ / Crispy Pork Basil Rice',
        createdAt: Date.now() - 86400000 * 11
      }
    ];

    this.saveTransactions(sampleTxs);
    this.saveRecurringItems(DEFAULT_RECURRING_ITEMS);
    this.saveCategories(DEFAULT_CATEGORIES);
  }
};
