/**
 * Storage & Data Management for Money Memo
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'smart_expense_transactions_v1',
  CATEGORIES: 'smart_expense_categories_v1',
  BUDGET_SIMULATOR: 'smart_expense_budget_sim_v1',
  FIXED_EXPENSES: 'smart_expense_fixed_list_v1'
};

const DEFAULT_CATEGORIES = [
  // รายจ่าย (Expenses)
  { id: 'exp_housing', name: 'ค่าเช่าห้อง & ที่พัก', emoji: '🏠', color: '#8b5cf6', type: 'expense', isDefault: true },
  { id: 'exp_bills', name: 'บิล น้ำ/ไฟ/เน็ต', emoji: '💡', color: '#eab308', type: 'expense', isDefault: true },
  { id: 'exp_food', name: 'อาหาร & เครื่องดื่ม', emoji: '🍔', color: '#f97316', type: 'expense', isDefault: true },
  { id: 'exp_transport', name: 'เดินทาง & คมนาคม', emoji: '🚗', color: '#06b6d4', type: 'expense', isDefault: true },
  { id: 'exp_shopping', name: 'ช้อปปิ้ง & เสื้อผ้า', emoji: '🛍️', color: '#ec4899', type: 'expense', isDefault: true },
  { id: 'exp_ent', name: 'บันเทิง & สตรีมมิ่ง', emoji: '🎬', color: '#a855f7', type: 'expense', isDefault: true },
  { id: 'exp_health', name: 'สุขภาพ & ประกัน', emoji: '🛡️', color: '#ef4444', type: 'expense', isDefault: true },
  { id: 'exp_edu', name: 'การศึกษา & พัฒนาตน', emoji: '📚', color: '#3b82f6', type: 'expense', isDefault: true },
  { id: 'exp_other', name: 'ค่าใช้จ่ายอื่นๆ', emoji: '📦', color: '#64748b', type: 'expense', isDefault: true },

  // รายรับ (Incomes)
  { id: 'inc_salary', name: 'เงินเดือน & ค่าจ้าง', emoji: '💼', color: '#10b981', type: 'income', isDefault: true },
  { id: 'inc_bonus', name: 'โบนัส & คอมมิชชั่น', emoji: '🎁', color: '#14b8a6', type: 'income', isDefault: true },
  { id: 'inc_business', name: 'ธุรกิจ & ค้าขาย', emoji: '🛒', color: '#059669', type: 'income', isDefault: true },
  { id: 'inc_invest', name: 'เงินปันผล & ดอกเบี้ย', emoji: '📈', color: '#6366f1', type: 'income', isDefault: true },
  { id: 'inc_other', name: 'รายรับอื่นๆ', emoji: '💰', color: '#84cc16', type: 'income', isDefault: true }
];

const DEFAULT_FIXED_EXPENSES = [
  { id: 'fe_1', name: 'ค่าเช่าห้อง / คอนโด', amount: 2800, categoryId: 'exp_housing', paymentMethod: 'โอนเงิน / บัญชีธนาคาร' },
  { id: 'fe_2', name: 'ค่าน้ำ + ค่าไฟ', amount: 2200, categoryId: 'exp_bills', paymentMethod: 'โอนเงิน / บัญชีธนาคาร' },
  { id: 'fe_3', name: 'ค่าเน็ตบ้าน + มือถือ', amount: 300, categoryId: 'exp_bills', paymentMethod: 'พร้อมเพย์ / สแกน QR' },
  { id: 'fe_4', name: 'ค่าเดินทางประจำ (BTS/น้ำมัน)', amount: 400, categoryId: 'exp_transport', paymentMethod: 'พร้อมเพย์ / สแกน QR' },
  { id: 'fe_5', name: 'ค่าซักผ้า & ของใช้ในห้อง', amount: 300, categoryId: 'exp_shopping', paymentMethod: 'เงินสด (Cash)' }
];

const DEFAULT_BUDGET_SIMULATOR = {
  monthlyIncome: 18000,
  savingsGoal: 5000,
  daysInMonth: 30
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
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories(categories) {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Error saving categories:', e);
    }
  },

  getCategoryById(id) {
    const categories = this.getCategories();
    return categories.find(c => c.id === id) || {
      id: 'unknown',
      name: 'ค่าใช้จ่ายทั่วไป',
      emoji: '📦',
      color: '#94a3b8',
      type: 'expense'
    };
  },

  guessCategoryByName(name = '') {
    const lower = name.toLowerCase();
    if (/เช่า|ห้อง|คอนโด|ที่พัก|หอพัก|อพาร์ท|บ้าน/.test(lower)) return 'exp_housing';
    if (/น้ำ|ไฟ|เน็ต|โทรศัพท์|มือถือ|บิล|wifi|ais|true|dtac/.test(lower)) return 'exp_bills';
    if (/เดินทาง|bts|mrt|รถ|น้ำมัน|แท็กซี่|วิน|ตั๋ว|ผ่อนรถ/.test(lower)) return 'exp_transport';
    if (/กิน|อาหาร|ข้าว|กาแฟ|ชา|บุฟเฟต์|สุกี้/.test(lower)) return 'exp_food';
    if (/ซักผ้า|ของใช้|ช้อป|ซื้อ|เสื้อผ้า/.test(lower)) return 'exp_shopping';
    if (/netflix|spotify|youtube|disney|ดูหนัง|เกม|สตรีม/.test(lower)) return 'exp_ent';
    if (/ยา|หมอ|สุขภาพ|ประกัน|aia|fwd|วิตามิน|คลินิก|ฟิตเนส/.test(lower)) return 'exp_health';
    if (/เรียน|หนังสือ|คอร์ส|ติว|การศึกษา/.test(lower)) return 'exp_edu';
    return 'exp_other';
  },

  // --- รายจ่ายประจำเดือน (Fixed Expenses Management) ---
  getFixedExpenses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FIXED_EXPENSES);
      if (!data) {
        this.saveFixedExpenses(DEFAULT_FIXED_EXPENSES);
        return DEFAULT_FIXED_EXPENSES;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      // If empty array or corrupted, load defaults
      this.saveFixedExpenses(DEFAULT_FIXED_EXPENSES);
      return DEFAULT_FIXED_EXPENSES;
    } catch (e) {
      console.error('Error loading fixed expenses:', e);
      return DEFAULT_FIXED_EXPENSES;
    }
  },

  saveFixedExpenses(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.FIXED_EXPENSES, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving fixed expenses:', e);
    }
  },

  addFixedExpense(item) {
    const list = this.getFixedExpenses();
    const name = (item.name || '').trim() || 'รายจ่ายประจำใหม่';
    const newItem = {
      id: 'fe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name,
      amount: Math.max(0, parseFloat(item.amount) || 0),
      categoryId: item.categoryId || this.guessCategoryByName(name),
      paymentMethod: item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร'
    };
    list.push(newItem);
    this.saveFixedExpenses(list);
    return newItem;
  },

  updateFixedExpense(id, updatedData) {
    const list = this.getFixedExpenses();
    const index = list.findIndex(e => e.id === id);
    if (index === -1) return { success: false, message: 'ไม่พบรายการ' };

    list[index] = {
      ...list[index],
      name: updatedData.name ? updatedData.name.trim() : list[index].name,
      amount: updatedData.amount !== undefined ? Math.max(0, parseFloat(updatedData.amount) || 0) : list[index].amount,
      categoryId: updatedData.categoryId || list[index].categoryId,
      paymentMethod: updatedData.paymentMethod || list[index].paymentMethod
    };

    this.saveFixedExpenses(list);
    return { success: true, item: list[index] };
  },

  deleteFixedExpense(id) {
    let list = this.getFixedExpenses();
    list = list.filter(e => e.id !== id);
    this.saveFixedExpenses(list);
    return { success: true };
  },

  // --- รายการบันทึก (Transactions) ---
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

  // --- ระบบวิเคราะห์งบประมาณ (Budget Simulator) ---
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
      alert('ไม่มีข้อมูลรายการสำหรับส่งออก');
      return;
    }

    const headers = ['วันที่-เวลา', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน (บาท)', 'ช่องทางชำระเงิน', 'โน้ต/บันทึกช่วยจำ'];
    
    const rows = transactions.map(t => {
      const cat = this.getCategoryById(t.categoryId);
      const typeStr = t.type === 'income' ? 'รายรับ' : 'รายจ่าย';
      const formattedDate = t.date.replace('T', ' ');
      const cleanNote = (t.note || '').replace(/"/g, '""');
      return [
        `"${formattedDate}"`,
        `"${typeStr}"`,
        `"${cat.emoji} ${cat.name}"`,
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
      version: '1.2',
      exportedAt: new Date().toISOString(),
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      fixedExpenses: this.getFixedExpenses(),
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
      if (!data) throw new Error('ไฟล์ไม่ถูกต้อง');

      if (Array.isArray(data)) {
        this.saveTransactions(data);
      } else {
        if (Array.isArray(data.transactions)) this.saveTransactions(data.transactions);
        if (Array.isArray(data.categories)) this.saveCategories(data.categories);
        if (Array.isArray(data.fixedExpenses)) this.saveFixedExpenses(data.fixedExpenses);
        if (data.budgetSimulator) this.saveBudgetSimulator(data.budgetSimulator);
      }
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message || 'ไฟล์ JSON เสียหาย' };
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
        note: 'เงินเดือนประจำเดือน',
        createdAt: Date.now() - 86400000 * 20
      },
      {
        id: 'sample_2',
        type: 'expense',
        amount: 2800,
        categoryId: 'exp_housing',
        date: `${year}-${month}-02T10:00`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'ค่าเช่าห้อง / คอนโด',
        createdAt: Date.now() - 86400000 * 19
      },
      {
        id: 'sample_3',
        type: 'expense',
        amount: 2200,
        categoryId: 'exp_bills',
        date: `${year}-${month}-03T11:20`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'ค่าน้ำ + ค่าไฟ',
        createdAt: Date.now() - 86400000 * 18
      },
      {
        id: 'sample_4',
        type: 'expense',
        amount: 300,
        categoryId: 'exp_bills',
        date: `${year}-${month}-05T12:00`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ค่าเน็ตบ้าน + มือถือ',
        createdAt: Date.now() - 86400000 * 16
      },
      {
        id: 'sample_5',
        type: 'expense',
        amount: 400,
        categoryId: 'exp_transport',
        date: `${year}-${month}-07T08:30`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ค่าเดินทางประจำ (BTS/น้ำมัน)',
        createdAt: Date.now() - 86400000 * 14
      },
      {
        id: 'sample_6',
        type: 'expense',
        amount: 100,
        categoryId: 'exp_food',
        date: `${year}-${month}-10T12:30`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ข้าวกะเพราหมูกรอบ + ไข่ดาว',
        createdAt: Date.now() - 86400000 * 11
      }
    ];

    this.saveTransactions(sampleTxs);
    this.saveFixedExpenses(DEFAULT_FIXED_EXPENSES);
  }
};
