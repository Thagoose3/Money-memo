/**
 * Storage & Data Management for Smart Expense & Budget App
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'smart_expense_transactions_v1',
  CATEGORIES: 'smart_expense_categories_v1',
  BUDGET_SIMULATOR: 'smart_expense_budget_sim_v1'
};

const DEFAULT_CATEGORIES = [
  // รายจ่าย (Expenses)
  { id: 'exp_food', name: 'อาหาร & เครื่องดื่ม', emoji: '🍔', color: '#f97316', type: 'expense', isDefault: true },
  { id: 'exp_transport', name: 'เดินทาง & คมนาคม', emoji: '🚗', color: '#06b6d4', type: 'expense', isDefault: true },
  { id: 'exp_shopping', name: 'ช้อปปิ้ง & เสื้อผ้า', emoji: '🛍️', color: '#ec4899', type: 'expense', isDefault: true },
  { id: 'exp_bills', name: 'บิล น้ำ/ไฟ/เน็ต', emoji: '💡', color: '#eab308', type: 'expense', isDefault: true },
  { id: 'exp_housing', name: 'ค่าเช่าห้อง & ที่พัก', emoji: '🏠', color: '#8b5cf6', type: 'expense', isDefault: true },
  { id: 'exp_ent', name: 'บันเทิง & สังสรรค์', emoji: '🎮', color: '#a855f7', type: 'expense', isDefault: true },
  { id: 'exp_health', name: 'สุขภาพ & ยารักษา', emoji: '💊', color: '#ef4444', type: 'expense', isDefault: true },
  { id: 'exp_edu', name: 'การศึกษา & ความรู้', emoji: '📚', color: '#3b82f6', type: 'expense', isDefault: true },
  { id: 'exp_other', name: 'ค่าใช้จ่ายอื่นๆ', emoji: '📦', color: '#64748b', type: 'expense', isDefault: true },

  // รายรับ (Incomes)
  { id: 'inc_salary', name: 'เงินเดือน & ค่าจ้าง', emoji: '💼', color: '#10b981', type: 'income', isDefault: true },
  { id: 'inc_bonus', name: 'โบนัส & คอมมิชชั่น', emoji: '🎁', color: '#14b8a6', type: 'income', isDefault: true },
  { id: 'inc_business', name: 'ธุรกิจ & ค้าขาย', emoji: '🛒', color: '#059669', type: 'income', isDefault: true },
  { id: 'inc_invest', name: 'เงินปันผล & ดอกเบี้ย', emoji: '📈', color: '#6366f1', type: 'income', isDefault: true },
  { id: 'inc_other', name: 'รายรับอื่นๆ', emoji: '💰', color: '#84cc16', type: 'income', isDefault: true }
];

const DEFAULT_BUDGET_SIMULATOR = {
  monthlyIncome: 28000,
  savingsGoal: 4000,
  daysInMonth: 30,
  fixedExpenses: [
    { id: 'f1', name: 'ค่าเช่าห้อง / คอนโด', amount: 6500 },
    { id: 'f2', name: 'ค่าน้ำ + ค่าไฟ', amount: 1500 },
    { id: 'f3', name: 'ค่าเน็ตบ้าน + มือถือ', amount: 800 },
    { id: 'f4', name: 'ค่าเดินทางประจำ (BTS/น้ำมัน)', amount: 2000 },
    { id: 'f5', name: 'ค่าซักผ้า & ของใช้ในห้อง', amount: 600 },
    { id: 'f6', name: 'Netflix & Spotify', amount: 450 }
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
      // รวมหมวดหมู่เริ่มต้นหากยังไม่มี
      const defaultIds = new Set(parsed.map(c => c.id));
      const missingDefaults = DEFAULT_CATEGORIES.filter(c => !defaultIds.has(c.id));
      if (missingDefaults.length > 0) {
        const merged = [...parsed, ...missingDefaults];
        this.saveCategories(merged);
        return merged;
      }
      return parsed;
    } catch (e) {
      console.error('Error loading categories:', e);
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

  addCategory(category) {
    const categories = this.getCategories();
    const newCat = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: category.name.trim(),
      emoji: category.emoji.trim() || '🏷️',
      color: category.color || '#3b82f6',
      type: category.type || 'expense',
      isDefault: false
    };
    categories.push(newCat);
    this.saveCategories(categories);
    return newCat;
  },

  deleteCategory(id) {
    let categories = this.getCategories();
    const target = categories.find(c => c.id === id);
    if (!target) return { success: false, message: 'ไม่พบหมวดหมู่ที่ระบุ' };
    if (target.isDefault) {
      return { success: false, message: 'ไม่สามารถลบหมวดหมู่ระบบเริ่มต้นได้' };
    }
    categories = categories.filter(c => c.id !== id);
    this.saveCategories(categories);
    return { success: true };
  },

  getCategoryById(id) {
    const categories = this.getCategories();
    return categories.find(c => c.id === id) || {
      id: 'unknown',
      name: 'ไม่ระบุหมวดหมู่',
      emoji: '❓',
      color: '#94a3b8',
      type: 'expense'
    };
  },

  // --- รายการบันทึก (Transactions) ---
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error loading transactions:', e);
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
    transactions.unshift(newTx); // รายการใหม่อยู่บนสุด
    this.saveTransactions(transactions);
    return newTx;
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
      console.error('Error loading budget simulator:', e);
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

    // สร้าง Header ภาษาไทย
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

    // UTF-8 BOM (\uFEFF) เพื่อให้ Microsoft Excel และโปรแกรมในไทยเปิดได้ไม่เป็นภาษาต่างดาว
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `expense_report_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportToJSON() {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      budgetSimulator: this.getBudgetSimulator()
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `smart_expense_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || (!data.transactions && !Array.isArray(data))) {
        throw new Error('รูปแบบไฟล์ JSON สำรองข้อมูลไม่ถูกต้อง');
      }

      if (Array.isArray(data)) {
        // กรณีเป็น Array รายการตรงๆ
        this.saveTransactions(data);
      } else {
        if (Array.isArray(data.transactions)) this.saveTransactions(data.transactions);
        if (Array.isArray(data.categories)) this.saveCategories(data.categories);
        if (data.budgetSimulator) this.saveBudgetSimulator(data.budgetSimulator);
      }
      return { success: true };
    } catch (e) {
      console.error('Import error:', e);
      return { success: false, message: e.message || 'ไฟล์ JSON เสียหายหรือไม่ถูกต้อง' };
    }
  },

  // โหลดข้อมูลตัวอย่างทดลองใช้งานทันที
  loadSampleData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // วันที่ต่างๆ ในเดือนปัจจุบัน
    const sampleTxs = [
      {
        id: 'sample_1',
        type: 'income',
        amount: 32000,
        categoryId: 'inc_salary',
        date: `${year}-${month}-01T09:00`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'เงินเดือนประจำเดือน',
        createdAt: Date.now() - 86400000 * 20
      },
      {
        id: 'sample_2',
        type: 'income',
        amount: 3500,
        categoryId: 'inc_bonus',
        date: `${year}-${month}-05T14:30`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'งานฟรีแลนซ์พิเศษออกแบบกราฟิก',
        createdAt: Date.now() - 86400000 * 18
      },
      {
        id: 'sample_3',
        type: 'expense',
        amount: 6500,
        categoryId: 'exp_housing',
        date: `${year}-${month}-02T10:00`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'จ่ายค่าเช่าคอนโด',
        createdAt: Date.now() - 86400000 * 19
      },
      {
        id: 'sample_4',
        type: 'expense',
        amount: 1450,
        categoryId: 'exp_bills',
        date: `${year}-${month}-03T11:20`,
        paymentMethod: 'โอนเงิน / บัญชีธนาคาร',
        note: 'ค่าน้ำค่าไฟ ประจำเดือน',
        createdAt: Date.now() - 86400000 * 18
      },
      {
        id: 'sample_5',
        type: 'expense',
        amount: 180,
        categoryId: 'exp_food',
        date: `${year}-${month}-08T12:15`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ก๋วยเตี๋ยวเนื้อ + ชาไทยเย็น',
        createdAt: Date.now() - 86400000 * 14
      },
      {
        id: 'sample_6',
        type: 'expense',
        amount: 350,
        categoryId: 'exp_food',
        date: `${year}-${month}-10T19:00`,
        paymentMethod: 'บัตรเครดิต',
        note: 'กินสุกี้ตี๋น้อยกับเพื่อน',
        createdAt: Date.now() - 86400000 * 12
      },
      {
        id: 'sample_7',
        type: 'expense',
        amount: 450,
        categoryId: 'exp_transport',
        date: `${year}-${month}-12T08:30`,
        paymentMethod: 'บัตรแรบบิท / บัตรเครดิต',
        note: 'เติมเที่ยวบัตรรถไฟฟ้า BTS',
        createdAt: Date.now() - 86400000 * 10
      },
      {
        id: 'sample_8',
        type: 'expense',
        amount: 1290,
        categoryId: 'exp_shopping',
        date: `${year}-${month}-15T16:45`,
        paymentMethod: 'บัตรเครดิต',
        note: 'ซื้อรองเท้าผ้าใบใหม่ช่วงโปรโมชั่น',
        createdAt: Date.now() - 86400000 * 7
      },
      {
        id: 'sample_9',
        type: 'expense',
        amount: 320,
        categoryId: 'exp_ent',
        date: `${year}-${month}-18T15:00`,
        paymentMethod: 'พร้อมเพย์ / สแกน QR',
        note: 'ดูหนังรอบบ่ายวันหยุด',
        createdAt: Date.now() - 86400000 * 4
      },
      {
        id: 'sample_10',
        type: 'expense',
        amount: 250,
        categoryId: 'exp_health',
        date: `${year}-${month}-20T17:30`,
        paymentMethod: 'เงินสด (Cash)',
        note: 'ซื้อวิตามินซีและยาแก้แพ้',
        createdAt: Date.now() - 86400000 * 2
      }
    ];

    this.saveTransactions(sampleTxs);
  }
};
