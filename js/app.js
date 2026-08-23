/**
 * Main Application Controller for Money Memo
 */

const App = {
  currentTab: 'transactions', // 'transactions', 'dashboard', 'simulator', 'fixed-expenses'
  dashboardViewMode: 'overview', // 'overview' (Monthly charts) or 'daily' (Daily breakdown)
  selectedDate: new Date(), // สำหรับ Dashboard
  currentEntryType: 'expense', // 'expense' or 'income' for transaction form
  selectedCategoryId: null,
  
  // Modals & Pending actions
  editingTransactionId: null,
  deletingTransactionId: null,
  editingFixedExpenseId: null,

  // Chart instances
  categoryChart: null,
  dailyTrendChart: null,

  init() {
    this.initDateTimeInput();
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.initFixedCategoryDropdowns();
    this.bindEvents();
    this.renderMonthSelector();
    this.renderAll();
    BudgetSimulator.init();
  },

  initDateTimeInput() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const localDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateInput = document.getElementById('tx-date');
    if (dateInput) {
      dateInput.value = localDateTime;
    }
  },

  initFixedCategoryDropdowns() {
    const categories = StorageManager.getCategories().filter(c => c.type === 'expense');
    const inlineSelect = document.getElementById('inline-fixed-category');
    const modalSelect = document.getElementById('fixed-modal-category');

    const optionsHtml = categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');

    if (inlineSelect) inlineSelect.innerHTML = optionsHtml;
    if (modalSelect) modalSelect.innerHTML = optionsHtml;
  },

  bindEvents() {
    // Tab switching
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab-target');
        this.switchTab(target);
      });
    });

    // Transaction form: Income/Expense Toggle
    const typeToggleExp = document.getElementById('type-toggle-expense');
    const typeToggleInc = document.getElementById('type-toggle-income');
    if (typeToggleExp && typeToggleInc) {
      typeToggleExp.addEventListener('click', () => this.setEntryType('expense'));
      typeToggleInc.addEventListener('click', () => this.setEntryType('income'));
    }

    // Quick Amount Chips
    document.querySelectorAll('.amount-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const addVal = parseFloat(e.currentTarget.getAttribute('data-val')) || 0;
        const amountInput = document.getElementById('tx-amount');
        if (amountInput) {
          const currentVal = parseFloat(amountInput.value) || 0;
          amountInput.value = (currentVal + addVal);
          amountInput.focus();
        }
      });
    });

    // Transaction Form Submit
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveTransaction();
      });
    }

    // Fixed Expense Inline Form Submit
    const inlineFixedForm = document.getElementById('fixed-inline-add-form');
    if (inlineFixedForm) {
      inlineFixedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveInlineFixedExpense();
      });
    }

    // Fixed Expense Modal Form Submit
    const fixedModalForm = document.getElementById('fixed-expense-form');
    if (fixedModalForm) {
      fixedModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveModalFixedExpense();
      });
    }

    // Edit Transaction Modal Submit
    const editForm = document.getElementById('edit-transaction-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUpdateTransaction();
      });
    }

    // Month Navigation in Dashboard
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const currentMonthBtn = document.getElementById('current-month-btn');

    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }
    if (currentMonthBtn) {
      currentMonthBtn.addEventListener('click', () => {
        this.selectedDate = new Date();
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }

    // Dashboard View Mode Toggle
    const viewModeOverview = document.getElementById('view-mode-overview');
    const viewModeDaily = document.getElementById('view-mode-daily');
    if (viewModeOverview && viewModeDaily) {
      viewModeOverview.addEventListener('click', () => this.setDashboardViewMode('overview'));
      viewModeDaily.addEventListener('click', () => this.setDashboardViewMode('daily'));
    }

    // Filter & Search in History
    const searchInput = document.getElementById('tx-search-input');
    const filterType = document.getElementById('tx-filter-type');
    if (searchInput) searchInput.addEventListener('input', () => this.renderTransactionList());
    if (filterType) filterType.addEventListener('change', () => this.renderTransactionList());

    // Sample data loader
    const loadSampleBtn = document.getElementById('btn-load-sample');
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        if (confirm('ต้องการโหลดข้อมูลตัวอย่างสำหรับทดลองใช้งานใช่หรือไม่?')) {
          StorageManager.loadSampleData();
          this.renderAll();
          BudgetSimulator.render();
          this.showToast('โหลดข้อมูลตัวอย่างเรียบร้อยแล้ว ✨');
        }
      });
    }

    // Export / Import
    const exportCsvBtn = document.getElementById('btn-export-csv');
    const exportJsonBtn = document.getElementById('btn-export-json');
    const importFile = document.getElementById('import-json-file');

    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => StorageManager.exportToCSV());
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => StorageManager.exportToJSON());
    if (importFile) {
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const res = StorageManager.importFromJSON(event.target.result);
          if (res.success) {
            this.renderAll();
            BudgetSimulator.init();
            this.showToast('กู้คืนข้อมูลสำเร็จเรียบร้อยแล้ว 🎉');
          } else {
            alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ' + res.message);
          }
          importFile.value = '';
        };
        reader.readAsText(file);
      });
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      if (btn.getAttribute('data-tab-target') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-content-pane').forEach(pane => {
      if (pane.id === `tab-pane-${tabName}`) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    if (tabName === 'dashboard') {
      this.renderDashboard();
    } else if (tabName === 'transactions') {
      this.renderTransactionList();
      this.renderQuickFixedChips();
    } else if (tabName === 'fixed-expenses') {
      this.initFixedCategoryDropdowns();
      this.renderFixedExpensesTab();
    } else if (tabName === 'simulator') {
      BudgetSimulator.render();
    }
  },

  setEntryType(type) {
    this.currentEntryType = type;
    const typeToggleExp = document.getElementById('type-toggle-expense');
    const typeToggleInc = document.getElementById('type-toggle-income');
    const submitBtn = document.getElementById('tx-submit-btn');

    if (type === 'expense') {
      typeToggleExp.className = 'py-2 px-3 rounded-lg font-bold text-xs bg-rose-500 text-white shadow-sm transition-all flex items-center justify-center gap-1.5';
      typeToggleExp.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-white"></span> รายจ่าย (Expense)';
      typeToggleInc.className = 'py-2 px-3 rounded-lg font-medium text-xs text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5';
      typeToggleInc.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> รายรับ (Income)';
      if (submitBtn) {
        submitBtn.className = 'w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm';
        submitBtn.innerHTML = '<span>➕ บันทึกรายจ่าย</span>';
      }
    } else {
      typeToggleExp.className = 'py-2 px-3 rounded-lg font-medium text-xs text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5';
      typeToggleExp.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> รายจ่าย (Expense)';
      typeToggleInc.className = 'py-2 px-3 rounded-lg font-bold text-xs bg-emerald-500 text-white shadow-sm transition-all flex items-center justify-center gap-1.5';
      typeToggleInc.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-white"></span> รายรับ (Income)';
      if (submitBtn) {
        submitBtn.className = 'w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm';
        submitBtn.innerHTML = '<span>➕ บันทึกรายรับ</span>';
      }
    }

    this.initCategoryGrid('form-category-grid', type);
  },

  initCategoryGrid(containerId, type, preselectedId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = StorageManager.getCategories().filter(c => c.type === type);
    if (categories.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-4 text-xs text-slate-400">ไม่มีหมวดหมู่ประเภทนี้</div>`;
      return;
    }

    if (!preselectedId || !categories.some(c => c.id === preselectedId)) {
      this.selectedCategoryId = categories[0].id;
    } else {
      this.selectedCategoryId = preselectedId;
    }

    container.innerHTML = categories.map(c => `
      <button 
        type="button" 
        data-cat-id="${c.id}"
        class="cat-item-btn p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${c.id === this.selectedCategoryId ? 'selected border-slate-900 bg-slate-50' : 'border-slate-100 bg-white hover:bg-slate-50'}"
        onclick="App.selectCategory('${containerId}', '${c.id}')"
      >
        <span class="text-xl">${c.emoji}</span>
        <span class="text-[11px] font-medium text-slate-700 text-center truncate max-w-full leading-tight">${c.name}</span>
      </button>
    `).join('');
  },

  selectCategory(containerId, catId) {
    this.selectedCategoryId = catId;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.cat-item-btn').forEach(el => {
      if (el.getAttribute('data-cat-id') === catId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  },

  // --- Quick Fixed Chips (ปุ่มลัดรายจ่ายประจำในหน้าแรก) ---
  renderQuickFixedChips() {
    const container = document.getElementById('quick-fixed-chips-list');
    if (!container) return;

    const fixedExpenses = StorageManager.getFixedExpenses();

    if (fixedExpenses.length === 0) {
      container.innerHTML = `
        <span class="text-xs text-slate-400">ยังไม่มีปุ่มลัด (กด "+ เพิ่มปุ่มลัด" เพื่อตั้งค่า)</span>
      `;
      return;
    }

    container.innerHTML = fixedExpenses.map(item => {
      const cat = StorageManager.getCategoryById(item.categoryId || StorageManager.guessCategoryByName(item.name));
      return `
        <button 
          type="button" 
          onclick="App.quickFillFromFixed('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.amount})"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 shadow-xs transition-all group"
          title="กดเพื่อกรอก ${item.name} ฿${item.amount.toLocaleString()} ลงฟอร์มทันที"
        >
          <span>${cat.emoji}</span>
          <span class="truncate max-w-[120px]">${item.name}</span>
          <span class="num-font text-[11px] font-bold text-slate-500 group-hover:text-slate-300">฿${item.amount.toLocaleString()}</span>
        </button>
      `;
    }).join('');
  },

  quickFillFromFixed(id, name, amount) {
    this.setEntryType('expense');
    const amountInput = document.getElementById('tx-amount');
    const noteInput = document.getElementById('tx-note');
    const paymentInput = document.getElementById('tx-payment-method');

    const fixedItem = StorageManager.getFixedExpenses().find(e => e.id === id);

    if (amountInput) {
      amountInput.value = amount;
      amountInput.focus();
    }
    if (noteInput) {
      noteInput.value = name;
    }
    if (paymentInput && fixedItem && fixedItem.paymentMethod) {
      paymentInput.value = fixedItem.paymentMethod;
    }

    const catId = (fixedItem && fixedItem.categoryId) ? fixedItem.categoryId : StorageManager.guessCategoryByName(name);
    this.selectCategory('form-category-grid', catId);

    this.showToast(`กรอก "${name}" ฿${amount.toLocaleString()} ลงฟอร์มแล้ว ✨`);
  },

  // --- Fixed Expenses Tab Management (แท็บจัดการรายจ่ายประจำเดือน) ---
  presetFixedExpense(name, amount, catId) {
    const nameInput = document.getElementById('inline-fixed-name');
    const amountInput = document.getElementById('inline-fixed-amount');
    const catSelect = document.getElementById('inline-fixed-category');

    if (nameInput) nameInput.value = name;
    if (amountInput) {
      amountInput.value = amount;
      amountInput.focus();
    }
    if (catSelect && catId) catSelect.value = catId;

    this.showToast(`เลือกตัวอย่าง "${name}" แล้ว สามารถปรับแก้ตัวเลขแล้วกดบันทึกได้เลย`);
  },

  handleSaveInlineFixedExpense() {
    const nameInput = document.getElementById('inline-fixed-name');
    const amountInput = document.getElementById('inline-fixed-amount');
    const catSelect = document.getElementById('inline-fixed-category');

    const name = (nameInput?.value || '').trim();
    const amount = Math.max(0, parseFloat(amountInput?.value) || 0);
    const categoryId = catSelect?.value || StorageManager.guessCategoryByName(name);

    if (!name) {
      alert('กรุณากรอกชื่อรายการ');
      nameInput.focus();
      return;
    }
    if (amount <= 0) {
      alert('กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท');
      amountInput.focus();
      return;
    }

    StorageManager.addFixedExpense({
      name,
      amount,
      categoryId,
      paymentMethod: 'โอนเงิน / บัญชีธนาคาร'
    });

    if (nameInput) nameInput.value = '';
    if (amountInput) amountInput.value = '';

    this.renderAll();
    BudgetSimulator.render();
    this.showToast(`เพิ่มรายจ่ายประจำ "${name}" ฿${amount.toLocaleString()} สำเร็จ 🎉`);
  },

  renderFixedExpensesTab() {
    const container = document.getElementById('fixed-expenses-cards-list');
    const totalAmountEl = document.getElementById('fixed-tab-total-amount');
    const totalCountEl = document.getElementById('fixed-tab-total-count');

    const fixedExpenses = StorageManager.getFixedExpenses();
    const totalAmount = fixedExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    if (totalAmountEl) totalAmountEl.textContent = '฿' + totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    if (totalCountEl) totalCountEl.textContent = `${fixedExpenses.length} รายการ`;

    if (!container) return;

    if (fixedExpenses.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
          <span class="text-3xl block mb-1">📌</span>
          <p class="font-bold text-slate-700 text-sm">ยังไม่มีรายการรายจ่ายประจำเดือน</p>
          <p class="text-xs text-slate-400 mt-1">กรอกข้อมูลที่กล่องด้านบน หรือกดเลือกตัวอย่างเพื่อเริ่มเพิ่มรายการ</p>
        </div>
      `;
      return;
    }

    container.innerHTML = fixedExpenses.map(item => {
      const cat = StorageManager.getCategoryById(item.categoryId || StorageManager.guessCategoryByName(item.name));
      return `
        <div class="minimal-card p-4 rounded-2xl flex flex-col justify-between gap-3 group">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-slate-50 border border-slate-100">
                ${cat.emoji}
              </div>
              <div>
                <h4 class="font-bold text-slate-900 text-sm">${item.name}</h4>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[11px] text-slate-500">${cat.name}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">${item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร'}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-lg font-extrabold text-slate-900 num-font">฿${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              <span class="text-[10px] text-slate-400 block">/ เดือน</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button 
              type="button"
              onclick="App.quickLogFixedExpense('${item.id}')"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-semibold transition-all cursor-pointer"
              title="บันทึกยอดนี้เข้าบัญชีเดือนนี้ทันที"
            >
              <span>⚡ บันทึกลงบัญชีทันที</span>
            </button>

            <div class="flex items-center gap-1">
              <button type="button" onclick="App.openEditFixedExpenseModal('${item.id}')" class="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors" title="แก้ไข">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button type="button" onclick="App.deleteFixedExpense('${item.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors" title="ลบ">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openAddFixedExpenseModal() {
    this.editingFixedExpenseId = null;
    const titleEl = document.getElementById('fixed-modal-title');
    const idInput = document.getElementById('fixed-modal-id');
    const nameInput = document.getElementById('fixed-modal-name');
    const amountInput = document.getElementById('fixed-modal-amount');
    const catSelect = document.getElementById('fixed-modal-category');
    const paymentSelect = document.getElementById('fixed-modal-payment');

    if (titleEl) titleEl.textContent = 'เพิ่มรายจ่ายประจำเดือน';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (amountInput) amountInput.value = '';
    
    this.initFixedCategoryDropdowns();
    if (paymentSelect) paymentSelect.value = 'โอนเงิน / บัญชีธนาคาร';

    const modal = document.getElementById('fixed-expense-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  },

  openEditFixedExpenseModal(id) {
    const fixedExpenses = StorageManager.getFixedExpenses();
    const item = fixedExpenses.find(e => e.id === id);
    if (!item) return;

    this.editingFixedExpenseId = id;
    const titleEl = document.getElementById('fixed-modal-title');
    const idInput = document.getElementById('fixed-modal-id');
    const nameInput = document.getElementById('fixed-modal-name');
    const amountInput = document.getElementById('fixed-modal-amount');
    const catSelect = document.getElementById('fixed-modal-category');
    const paymentSelect = document.getElementById('fixed-modal-payment');

    if (titleEl) titleEl.textContent = 'แก้ไขรายจ่ายประจำเดือน';
    if (idInput) idInput.value = item.id;
    if (nameInput) nameInput.value = item.name;
    if (amountInput) amountInput.value = item.amount;

    this.initFixedCategoryDropdowns();
    if (catSelect) {
      catSelect.value = item.categoryId || StorageManager.guessCategoryByName(item.name);
    }
    if (paymentSelect) paymentSelect.value = item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร';

    const modal = document.getElementById('fixed-expense-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  },

  closeFixedExpenseModal() {
    this.editingFixedExpenseId = null;
    const modal = document.getElementById('fixed-expense-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  },

  handleSaveModalFixedExpense() {
    const nameInput = document.getElementById('fixed-modal-name');
    const amountInput = document.getElementById('fixed-modal-amount');
    const catSelect = document.getElementById('fixed-modal-category');
    const paymentSelect = document.getElementById('fixed-modal-payment');

    const name = (nameInput?.value || '').trim();
    const amount = Math.max(0, parseFloat(amountInput?.value) || 0);
    const categoryId = catSelect?.value || 'exp_bills';
    const paymentMethod = paymentSelect?.value || 'โอนเงิน / บัญชีธนาคาร';

    if (!name) {
      alert('กรุณาระบุชื่อรายการ');
      nameInput.focus();
      return;
    }

    if (this.editingFixedExpenseId) {
      StorageManager.updateFixedExpense(this.editingFixedExpenseId, { name, amount, categoryId, paymentMethod });
      this.showToast(`อัปเดต "${name}" เรียบร้อย ✅`);
    } else {
      StorageManager.addFixedExpense({ name, amount, categoryId, paymentMethod });
      this.showToast(`เพิ่มรายจ่ายประจำ "${name}" เรียบร้อย 🎉`);
    }

    this.closeFixedExpenseModal();
    this.renderAll();
    BudgetSimulator.render();
  },

  deleteFixedExpense(id) {
    const item = StorageManager.getFixedExpenses().find(e => e.id === id);
    const name = item ? item.name : 'รายการนี้';

    if (confirm(`คุณต้องการลบรายจ่ายประจำ "${name}" ใช่หรือไม่?`)) {
      StorageManager.deleteFixedExpense(id);
      this.renderAll();
      BudgetSimulator.render();
      this.showToast(`ลบ "${name}" เรียบร้อยแล้ว`);
    }
  },

  quickLogFixedExpense(id) {
    const item = StorageManager.getFixedExpenses().find(e => e.id === id);
    if (!item) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    StorageManager.addTransaction({
      type: 'expense',
      amount: item.amount,
      categoryId: item.categoryId || StorageManager.guessCategoryByName(item.name),
      date: dateStr,
      paymentMethod: item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร',
      note: item.name
    });

    this.renderAll();
    this.showToast(`บันทึก "${item.name}" ฿${item.amount.toLocaleString()} ลงบัญชีแล้ว ⚡`);
  },

  // --- Batch Import Modal (นำเข้ารายจ่ายประจำหลายรายการ) ---
  openQuickFixedModal() {
    const modal = document.getElementById('quick-fixed-modal');
    const dateInput = document.getElementById('batch-import-date');
    if (dateInput) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    this.renderQuickFixedModalList();
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  },

  closeQuickFixedModal() {
    const modal = document.getElementById('quick-fixed-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  },

  renderQuickFixedModalList() {
    const container = document.getElementById('batch-fixed-items-list');
    if (!container) return;

    const fixedExpenses = StorageManager.getFixedExpenses();
    const categories = StorageManager.getCategories().filter(c => c.type === 'expense');

    if (fixedExpenses.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p class="text-xs font-semibold text-slate-600">ยังไม่มีรายการรายจ่ายประจำ</p>
          <p class="text-[11px] text-slate-400 mt-0.5">คุณสามารถตั้งค่ารายการได้ที่แท็บ "รายจ่ายประจำเดือน"</p>
        </div>
      `;
      this.updateBatchTotal();
      return;
    }

    container.innerHTML = fixedExpenses.map((item) => {
      const currentCatId = item.categoryId || StorageManager.guessCategoryByName(item.name);
      
      const catOptionsHtml = categories.map(c => `
        <option value="${c.id}" ${c.id === currentCatId ? 'selected' : ''}>${c.emoji} ${c.name}</option>
      `).join('');

      return `
        <div class="flex items-center gap-2.5 p-2.5 bg-slate-50/80 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition-all batch-item-row" data-id="${item.id}">
          <input 
            type="checkbox" 
            class="batch-item-checkbox rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            checked
            onchange="App.updateBatchTotal()"
          />
          <div class="flex-1 min-w-0">
            <input 
              type="text" 
              class="batch-item-name w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none"
              value="${item.name}"
              placeholder="ชื่อรายการ"
            />
          </div>
          <div class="w-36">
            <select class="batch-item-category w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 font-medium focus:outline-none">
              ${catOptionsHtml}
            </select>
          </div>
          <div class="relative w-28">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">฿</span>
            <input 
              type="number" 
              class="batch-item-amount w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-xs text-right font-bold text-slate-900 num-font focus:outline-none"
              value="${item.amount}"
              step="50"
              oninput="App.updateBatchTotal()"
            />
          </div>
        </div>
      `;
    }).join('');

    this.updateBatchTotal();
  },

  toggleSelectAllFixed(checked) {
    document.querySelectorAll('.batch-item-checkbox').forEach(cb => {
      cb.checked = checked;
    });
    this.updateBatchTotal();
  },

  updateBatchTotal() {
    const rows = document.querySelectorAll('.batch-item-row');
    let total = 0;
    let selectedCount = 0;

    rows.forEach(row => {
      const cb = row.querySelector('.batch-item-checkbox');
      const amountInput = row.querySelector('.batch-item-amount');
      if (cb && cb.checked && amountInput) {
        total += Math.max(0, parseFloat(amountInput.value) || 0);
        selectedCount++;
      }
    });

    const summaryEl = document.getElementById('batch-selected-summary');
    const totalEl = document.getElementById('batch-total-amount');

    if (summaryEl) summaryEl.textContent = `(เลือก ${selectedCount}/${rows.length} รายการ)`;
    if (totalEl) totalEl.textContent = `ยอดรวมที่เลือก: ฿${total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  },

  handleSaveBatchFixedExpenses() {
    const rows = document.querySelectorAll('.batch-item-row');
    const batchDate = document.getElementById('batch-import-date')?.value || new Date().toISOString().slice(0, 16);
    const batchPayment = document.getElementById('batch-import-payment')?.value || 'โอนเงิน / บัญชีธนาคาร';

    const txsToSave = [];

    rows.forEach(row => {
      const cb = row.querySelector('.batch-item-checkbox');
      const nameInput = row.querySelector('.batch-item-name');
      const catSelect = row.querySelector('.batch-item-category');
      const amountInput = row.querySelector('.batch-item-amount');

      if (cb && cb.checked) {
        const name = (nameInput?.value || '').trim();
        const categoryId = catSelect?.value || 'exp_bills';
        const amount = Math.max(0, parseFloat(amountInput?.value) || 0);

        if (amount > 0) {
          txsToSave.push({
            type: 'expense',
            amount: amount,
            categoryId: categoryId,
            date: batchDate,
            paymentMethod: batchPayment,
            note: name
          });
        }
      }
    });

    if (txsToSave.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 รายการ และมียอดเงินมากกว่า 0 บาท');
      return;
    }

    const count = StorageManager.addTransactionsBatch(txsToSave);
    this.closeQuickFixedModal();
    this.renderAll();
    this.showToast(`นำเข้ารายจ่ายประจำเดือนสำเร็จ ${count} รายการ 🎉`);
  },

  // --- Transactions Tab Logic ---
  handleSaveTransaction() {
    const amountInput = document.getElementById('tx-amount');
    const dateInput = document.getElementById('tx-date');
    const paymentInput = document.getElementById('tx-payment-method');
    const noteInput = document.getElementById('tx-note');

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      amountInput.focus();
      return;
    }

    const tx = {
      type: this.currentEntryType,
      amount: amount,
      categoryId: this.selectedCategoryId,
      date: dateInput.value || new Date().toISOString().slice(0, 16),
      paymentMethod: paymentInput ? paymentInput.value : 'เงินสด (Cash)',
      note: noteInput ? noteInput.value : ''
    };

    StorageManager.addTransaction(tx);

    amountInput.value = '';
    if (noteInput) noteInput.value = '';
    this.initDateTimeInput();

    this.renderAll();
    this.showToast(this.currentEntryType === 'expense' ? 'บันทึกรายจ่ายเรียบร้อย 🔴' : 'บันทึกรายรับเรียบร้อย 🟢');
  },

  renderMonthSelector() {
    const monthEl = document.getElementById('dashboard-current-month');
    if (!monthEl) return;

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const monthIndex = this.selectedDate.getMonth();
    const year = this.selectedDate.getFullYear();
    const thaiYear = year + 543;

    monthEl.textContent = `${thaiMonths[monthIndex]} ${thaiYear} (${year})`;
  },

  setDashboardViewMode(mode) {
    this.dashboardViewMode = mode;
    const viewOverview = document.getElementById('view-mode-overview');
    const viewDaily = document.getElementById('view-mode-daily');
    const paneOverview = document.getElementById('dashboard-overview-pane');
    const paneDaily = document.getElementById('dashboard-daily-pane');

    if (mode === 'overview') {
      if (viewOverview) viewOverview.className = 'px-3 py-1 rounded-lg font-bold bg-white text-slate-900 shadow-sm transition-all';
      if (viewDaily) viewDaily.className = 'px-3 py-1 rounded-lg font-medium text-slate-500 hover:text-slate-900 transition-all';
      if (paneOverview) paneOverview.classList.remove('hidden');
      if (paneDaily) paneDaily.classList.add('hidden');
    } else {
      if (viewOverview) viewOverview.className = 'px-3 py-1 rounded-lg font-medium text-slate-500 hover:text-slate-900 transition-all';
      if (viewDaily) viewDaily.className = 'px-3 py-1 rounded-lg font-bold bg-white text-slate-900 shadow-sm transition-all';
      if (paneOverview) paneOverview.classList.add('hidden');
      if (paneDaily) paneDaily.classList.remove('hidden');
    }

    this.renderDashboard();
  },

  getMonthlyTransactions() {
    const allTxs = StorageManager.getTransactions();
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();

    return allTxs.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  },

  renderDashboard() {
    const monthlyTxs = this.getMonthlyTransactions();
    
    let totalIncome = 0;
    let totalExpense = 0;

    monthlyTxs.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    const netBalance = totalIncome - totalExpense;

    const incEl = document.getElementById('dash-total-income');
    const expEl = document.getElementById('dash-total-expense');
    const netEl = document.getElementById('dash-net-balance');
    const netStatusEl = document.getElementById('dash-net-status');

    if (incEl) incEl.textContent = '฿' + totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (expEl) expEl.textContent = '฿' + totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (netEl) {
      netEl.textContent = (netBalance >= 0 ? '+' : '') + '฿' + netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      netEl.className = `text-2xl font-extrabold num-font ${netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`;
    }
    if (netStatusEl) {
      if (netBalance > 0) {
        netStatusEl.textContent = 'คงเหลือสุทธิเป็นบวก (Surplus ✨)';
        netStatusEl.className = 'text-[11px] text-emerald-600 font-medium mt-0.5';
      } else if (netBalance === 0) {
        netStatusEl.textContent = 'รายรับเท่ากับรายจ่ายพอดี (Balanced)';
        netStatusEl.className = 'text-[11px] text-slate-400 font-medium mt-0.5';
      } else {
        netStatusEl.textContent = 'รายจ่ายมากกว่ารายรับ (Deficit ⚠️)';
        netStatusEl.className = 'text-[11px] text-rose-600 font-medium mt-0.5';
      }
    }

    if (this.dashboardViewMode === 'overview') {
      this.renderCharts(monthlyTxs);
      this.renderTopCategories(monthlyTxs, totalExpense);
    } else {
      this.renderDailyBreakdown(monthlyTxs);
    }
  },

  renderCharts(monthlyTxs) {
    const expenseTxs = monthlyTxs.filter(t => t.type === 'expense');
    
    const catMap = {};
    expenseTxs.forEach(t => {
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
    });

    const catLabels = [];
    const catData = [];
    const catColors = [];

    Object.keys(catMap).forEach(catId => {
      const cat = StorageManager.getCategoryById(catId);
      catLabels.push(`${cat.emoji} ${cat.name}`);
      catData.push(catMap[catId]);
      catColors.push(cat.color || '#334155');
    });

    const ctxDoughnut = document.getElementById('chart-category-doughnut');
    const doughnutEmptyState = document.getElementById('chart-doughnut-empty');

    if (ctxDoughnut) {
      if (this.categoryChart) this.categoryChart.destroy();

      if (catData.length === 0) {
        ctxDoughnut.parentElement.classList.add('hidden');
        if (doughnutEmptyState) doughnutEmptyState.classList.remove('hidden');
      } else {
        ctxDoughnut.parentElement.classList.remove('hidden');
        if (doughnutEmptyState) doughnutEmptyState.classList.add('hidden');

        this.categoryChart = new Chart(ctxDoughnut, {
          type: 'doughnut',
          data: {
            labels: catLabels,
            datasets: [{
              data: catData,
              backgroundColor: catColors,
              borderWidth: 2,
              borderColor: '#ffffff',
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 10,
                  font: { family: "'Prompt', sans-serif", size: 11 }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    return ` ฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${percentage}%)`;
                  }
                }
              }
            },
            cutout: '72%'
          }
        });
      }
    }

    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dailySpending = new Array(daysInMonth).fill(0);
    const dailyIncome = new Array(daysInMonth).fill(0);

    monthlyTxs.forEach(t => {
      const d = new Date(t.date);
      const dayIndex = d.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        if (t.type === 'expense') dailySpending[dayIndex] += t.amount;
        else dailyIncome[dayIndex] += t.amount;
      }
    });

    const dayLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);

    const ctxTrend = document.getElementById('chart-daily-trend');
    if (ctxTrend) {
      if (this.dailyTrendChart) this.dailyTrendChart.destroy();

      this.dailyTrendChart = new Chart(ctxTrend, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [
            {
              label: 'รายจ่าย (Expense)',
              data: dailySpending,
              backgroundColor: '#f43f5e',
              borderRadius: 3
            },
            {
              label: 'รายรับ (Income)',
              data: dailyIncome,
              backgroundColor: '#10b981',
              borderRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: "'Inter', sans-serif", size: 10 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: {
                font: { family: "'Inter', sans-serif", size: 10 },
                callback: (val) => '฿' + (val >= 1000 ? (val / 1000) + 'k' : val)
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: "'Prompt', sans-serif", size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ฿${(ctx.parsed.y || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
              }
            }
          }
        }
      });
    }
  },

  renderTopCategories(monthlyTxs, totalExpense) {
    const container = document.getElementById('dash-top-categories-list');
    if (!container) return;

    const expenseTxs = monthlyTxs.filter(t => t.type === 'expense');
    const catMap = {};
    expenseTxs.forEach(t => {
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
    });

    const sortedCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sortedCats.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">ยังไม่มีข้อมูลการใช้จ่ายในเดือนนี้</div>`;
      return;
    }

    container.innerHTML = sortedCats.map(([catId, amount]) => {
      const cat = StorageManager.getCategoryById(catId);
      const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5 font-medium text-slate-700">
              <span>${cat.emoji}</span>
              <span>${cat.name}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-slate-900 num-font">฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              <span class="text-[10px] text-slate-400 ml-1">(${pct}%)</span>
            </div>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div class="h-1.5 rounded-full transition-all duration-300" style="width: ${pct}%; background-color: ${cat.color || '#0f172a'};"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderDailyBreakdown(monthlyTxs) {
    const container = document.getElementById('dashboard-daily-list');
    if (!container) return;

    if (monthlyTxs.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <p class="text-xs font-medium text-slate-600">ไม่มีรายการใช้จ่ายในเดือนนี้</p>
        </div>
      `;
      return;
    }

    const groups = {};
    monthlyTxs.forEach(t => {
      const dateKey = t.date.slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    container.innerHTML = sortedDates.map(dateStr => {
      const txs = groups[dateStr];
      const d = new Date(dateStr + 'T00:00:00');
      
      const thaiDayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const dayName = thaiDayNames[d.getDay()];
      const dayDate = `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;

      const dayIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const dayExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      const itemsHtml = txs.map(t => {
        const cat = StorageManager.getCategoryById(t.categoryId);
        const timeStr = t.date.length >= 16 ? t.date.slice(11, 16) : '';
        const isExp = t.type === 'expense';

        return `
          <div class="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors group">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-slate-50 border border-slate-100">
                ${cat.emoji}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-xs text-slate-800">${cat.name}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">${t.paymentMethod}</span>
                  ${timeStr ? `<span class="text-[10px] text-slate-400">${timeStr} น.</span>` : ''}
                </div>
                ${t.note ? `<p class="text-[11px] text-slate-500 mt-0.5">${t.note}</p>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
                ${isExp ? '-' : '+'}฿${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <div class="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                <button onclick="App.openEditModal('${t.id}')" class="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors" title="แก้ไข">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onclick="App.openDeleteModal('${t.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors" title="ลบ">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="minimal-card rounded-2xl overflow-hidden">
          <div class="bg-slate-50/70 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">${dayName}</span>
              <span class="text-xs font-semibold text-slate-700">${dayDate}</span>
              <span class="text-[10px] text-slate-400">(${txs.length})</span>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold num-font">
              ${dayIncome > 0 ? `<span class="text-emerald-600">+฿${dayIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>` : ''}
              ${dayExpense > 0 ? `<span class="text-rose-600">-฿${dayExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>` : ''}
            </div>
          </div>
          <div class="p-1.5 divide-y divide-slate-50">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');
  },

  renderTransactionList() {
    const container = document.getElementById('transaction-history-list');
    if (!container) return;

    const allTxs = StorageManager.getTransactions();
    const searchVal = (document.getElementById('tx-search-input')?.value || '').toLowerCase().trim();
    const filterType = document.getElementById('tx-filter-type')?.value || 'all';

    let filtered = allTxs.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (searchVal) {
        const cat = StorageManager.getCategoryById(t.categoryId);
        const matchNote = (t.note || '').toLowerCase().includes(searchVal);
        const matchCat = cat.name.toLowerCase().includes(searchVal);
        const matchPayment = (t.paymentMethod || '').toLowerCase().includes(searchVal);
        if (!matchNote && !matchCat && !matchPayment) return false;
      }
      return true;
    });

    const countEl = document.getElementById('tx-history-count');
    if (countEl) countEl.textContent = `(${filtered.length})`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <p class="text-xs font-medium text-slate-600">ยังไม่มีรายการบันทึก</p>
          <p class="text-[11px] text-slate-400 mt-0.5">กดบันทึกรายการ หรือคลิก "โหลดตัวอย่าง" ด้านบน</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(t => {
      const cat = StorageManager.getCategoryById(t.categoryId);
      const isExp = t.type === 'expense';
      const d = new Date(t.date);
      const dateFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

      return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 hover:border-slate-300 transition-all flex items-center justify-between group">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-slate-50 border border-slate-100">
              ${cat.emoji}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-800 text-xs">${cat.name}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-semibold">
                  ${isExp ? 'รายจ่าย' : 'รายรับ'}
                </span>
                <span class="text-[10px] text-slate-400">${dateFormatted}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">${t.paymentMethod}</span>
                ${t.note ? `<span class="text-[11px] text-slate-600">${t.note}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-base font-extrabold num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
              ${isExp ? '-' : '+'}฿${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
            <div class="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <button onclick="App.openEditModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="แก้ไข">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onclick="App.openDeleteModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="ลบ">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openEditModal(id) {
    const tx = StorageManager.getTransactionById(id);
    if (!tx) return;

    this.editingTransactionId = id;

    const modal = document.getElementById('edit-modal');
    const amountInput = document.getElementById('edit-tx-amount');
    const dateInput = document.getElementById('edit-tx-date');
    const paymentInput = document.getElementById('edit-tx-payment-method');
    const noteInput = document.getElementById('edit-tx-note');
    const typeSelect = document.getElementById('edit-tx-type');

    if (amountInput) amountInput.value = tx.amount;
    if (dateInput) dateInput.value = tx.date;
    if (paymentInput) paymentInput.value = tx.paymentMethod;
    if (noteInput) noteInput.value = tx.note || '';
    if (typeSelect) {
      typeSelect.value = tx.type;
      typeSelect.onchange = () => {
        this.initCategoryGrid('edit-category-grid', typeSelect.value, tx.categoryId);
      };
    }

    this.initCategoryGrid('edit-category-grid', tx.type, tx.categoryId);

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  },

  closeEditModal() {
    this.editingTransactionId = null;
    const modal = document.getElementById('edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  },

  handleUpdateTransaction() {
    if (!this.editingTransactionId) return;

    const amount = parseFloat(document.getElementById('edit-tx-amount').value);
    const date = document.getElementById('edit-tx-date').value;
    const type = document.getElementById('edit-tx-type').value;
    const paymentMethod = document.getElementById('edit-tx-payment-method').value;
    const note = document.getElementById('edit-tx-note').value;

    if (isNaN(amount) || amount <= 0) {
      alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }

    StorageManager.updateTransaction(this.editingTransactionId, {
      type,
      amount,
      categoryId: this.selectedCategoryId,
      date,
      paymentMethod,
      note
    });

    this.closeEditModal();
    this.renderAll();
    this.showToast('อัปเดตรายการเรียบร้อยแล้ว ✅');
  },

  openDeleteModal(id) {
    const tx = StorageManager.getTransactionById(id);
    if (!tx) return;

    this.deletingTransactionId = id;
    const modal = document.getElementById('delete-modal');
    const preview = document.getElementById('delete-modal-preview');

    if (preview) {
      const cat = StorageManager.getCategoryById(tx.categoryId);
      const isExp = tx.type === 'expense';
      preview.innerHTML = `
        <div class="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left">
          <span class="text-2xl">${cat.emoji}</span>
          <div class="flex-1">
            <p class="font-bold text-slate-800 text-xs">${cat.name} <span class="text-[10px] font-semibold ${isExp ? 'text-rose-600' : 'text-emerald-600'}">(${isExp ? 'รายจ่าย' : 'รายรับ'})</span></p>
            <p class="text-[10px] text-slate-400">${tx.date.replace('T', ' ')} · ${tx.paymentMethod}</p>
            ${tx.note ? `<p class="text-[11px] text-slate-600">"${tx.note}"</p>` : ''}
          </div>
          <div class="font-bold text-sm num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
            ${isExp ? '-' : '+'}฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>
      `;
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  },

  closeDeleteModal() {
    this.deletingTransactionId = null;
    const modal = document.getElementById('delete-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  },

  confirmDeleteTransaction() {
    if (!this.deletingTransactionId) return;

    StorageManager.deleteTransaction(this.deletingTransactionId);
    this.closeDeleteModal();
    this.renderAll();
    this.showToast('ลบรายการเรียบร้อย 🗑️');
  },

  renderAll() {
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.renderTransactionList();
    this.renderDashboard();
    this.renderFixedExpensesTab();
    this.renderQuickFixedChips();
  },

  showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
    }, 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
