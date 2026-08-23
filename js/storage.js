/**
 * Storage & Data Management for Money Memo v2.2 (Bilingual Support)
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'smart_expense_transactions_v1',
  CATEGORIES: 'smart_expense_categories_v1',
  BUDGET_SIMULATOR: 'smart_expense_budget_sim_v1',
  RECURRING_ITEMS: 'smart_expense_recurring_list_v2'
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

// รายการประจำเริ่มต้น (แยก รายจ่าย & รายรับ ชัดเจน)
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

// ข้อมูลจำลองงบประมาณ (อิสระ 100% ไม่ผูกกับรายการจริง)
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
  // --- หมวดหมู่ (Categories) ---
  getCategories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!data) {
        this.saveCategories(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      this.saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  },

  getCategoryDisplayName(category) {
    if (!category) return '';
    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';
    if (lang === 'en' && category.nameEn) {
      return category.nameEn;
    }
    return category.name;
  },

  getItemDisplayName(item) {
    if (!item) return '';
    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';
    if (lang === 'en' && item.nameEn) {
      return item.nameEn;
    }
    return item.name;
  },

  saveCategories(categories) {
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
    
    const newCat = {
      id: 'cat_' + (type === 'income' ? 'inc_' : 'exp_') + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name,
      nameEn: category.nameEn || name,
      emoji: category.emoji || (type === 'income' ? '💰' : '📦'),
      color: category.color || (type === 'income' ? '#10b981' : '#64748b'),
      type: type,
      isDefault: false
    };

    categories.push(newCat);
    this.saveCategories(categories);
    return newCat;
  },

  deleteCategory(id) {
    let categories = this.getCategories();
    categories = categories.filter(c => c.id !== id);
    this.saveCategories(categories);
    return { success: true };
  },

  getCategoryById(id) {
    const categories = this.getCategories();
    return categories.find(c => c.id === id) || {
      id: 'unknown',
      name: 'ค่าใช้จ่ายทั่วไป',
      nameEn: 'General Expense',
      emoji: '📦',
      color: '#94a3b8',
      type: 'expense'
    };
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
  getRecurringItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECURRING_ITEMS);
      if (!data) {
        this.saveRecurringItems(DEFAULT_RECURRING_ITEMS);
        return DEFAULT_RECURRING_ITEMS;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      this.saveRecurringItems(DEFAULT_RECURRING_ITEMS);
      return DEFAULT_RECURRING_ITEMS;
    } catch (e) {
      console.error('Error loading recurring items:', e);
      return DEFAULT_RECURRING_ITEMS;
    }
  },

  saveRecurringItems(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.RECURRING_ITEMS, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving recurring items:', e);
    }
  },

  addRecurringItem(item) {
    const list = this.getRecurringItems();
    const type = item.type === 'income' ? 'income' : 'expense';
    const name = (item.name || '').trim() || (type === 'income' ? 'รายรับประจำใหม่' : 'รายจ่ายประจำใหม่');
    
    const newItem = {
      id: 'rec_' + (type === 'income' ? 'inc_' : 'exp_') + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: type,
      name: name,
      nameEn: item.nameEn || name,
      amount: Math.max(0, parseFloat(item.amount) || 0),
      categoryId: item.categoryId || this.guessCategoryByName(name, type),
      paymentMethod: item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร'
    };
    list.push(newItem);
    this.saveRecurringItems(list);
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
      nameEn: updatedData.nameEn || list[index].nameEn,
      amount: updatedData.amount !== undefined ? Math.max(0, parseFloat(updatedData.amount) || 0) : list[index].amount,
      categoryId: updatedData.categoryId || list[index].categoryId,
      paymentMethod: updatedData.paymentMethod || list[index].paymentMethod
    };

    this.saveRecurringItems(list);
    return { success: true, item: list[index] };
  },

  deleteRecurringItem(id) {
    let list = this.getRecurringItems();
    list = list.filter(e => e.id !== id);
    this.saveRecurringItems(list);
    return { success: true };
  },

  // --- รายการบันทึกจริง (Transactions) ---
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  saveTransactions(transactions) {
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
    return { success: true, transaction: transactions[index] };
  },

  deleteTransaction(id) {
    let transactions = this.getTransactions();
    const exists = transactions.some(t => t.id === id);
    if (!exists) return { success: false, message: 'ไม่พบรายการที่ต้องการลบ' };

    transactions = transactions.filter(t => t.id !== id);
    this.saveTransactions(transactions);
    return { success: true };
  },

  getTransactionById(id) {
    const transactions = this.getTransactions();
    return transactions.find(t => t.id === id) || null;
  },

  // --- ระบบวิเคราะห์งบประมาณจำลอง (Budget Simulator Sandbox - แยกอิสระ 100%) ---
  getBudgetSimulator() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGET_SIMULATOR);
      if (!data) {
        this.saveBudgetSimulator(DEFAULT_BUDGET_SIMULATOR);
        return DEFAULT_BUDGET_SIMULATOR;
      }
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_BUDGET_SIMULATOR;
    }
  },

  saveBudgetSimulator(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGET_SIMULATOR, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving budget simulator:', e);
    }
  },

  // --- นำเข้า / ส่งออก ข้อมูล ---
  exportToCSV() {
    const transactions = this.getTransactions();
    if (transactions.length === 0) {
      alert('ไม่มีข้อมูลรายการสำหรับส่งออก / No data to export');
      return;
    }

    const headers = ['Date-Time', 'Type', 'Category', 'Amount (THB)', 'Payment Method', 'Note'];
    
    const rows = transactions.map(t => {
      const cat = this.getCategoryById(t.categoryId);
      const catName = this.getCategoryDisplayName(cat);
      const typeStr = t.type === 'income' ? 'Income' : 'Expense';
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

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `money_memo_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportToJSON() {
    const backupData = {
      version: '2.2',
      exportedAt: new Date().toISOString(),
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      recurringItems: this.getRecurringItems(),
      budgetSimulator: this.getBudgetSimulator()
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
