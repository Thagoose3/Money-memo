/**
 * Main Application Controller for Money Memo (Minimalist & Aesthetic Edition)
 */

const App = {
  currentTab: 'transactions', // 'transactions', 'dashboard', 'simulator', 'categories'
  dashboardViewMode: 'overview', // 'overview' (Monthly charts) or 'daily' (Daily breakdown)
  selectedDate: new Date(), // สำหรับ Dashboard
  currentEntryType: 'expense', // 'expense' or 'income' for transaction form
  selectedCategoryId: null,
  
  // Modals & Pending actions
  editingTransactionId: null,
  deletingTransactionId: null,

  // Chart instances
  categoryChart: null,
  dailyTrendChart: null,

  init() {
    this.initDateTimeInput();
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
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

    // Category Modal Form Submit
    const categoryForm = document.getElementById('new-category-form');
    if (categoryForm) {
      categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateCategory();
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

    // Sample data loader
    const loadSampleBtn = document.getElementById('btn-load-sample');
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        if (confirm('ต้องการโหลดข้อมูลตัวอย่างสำหรับทดลองใช้งานใช่หรือไม่?')) {
          StorageManager.loadSampleData();
          this.renderAll();
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
    } else if (tabName === 'categories') {
      this.renderCategoriesTab();
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

    if (modal) modal.classList.remove('hidden');
  },

  closeEditModal() {
    this.editingTransactionId = null;
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.add('hidden');
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

    if (modal) modal.classList.remove('hidden');
  },

  closeDeleteModal() {
    this.deletingTransactionId = null;
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.add('hidden');
  },

  confirmDeleteTransaction() {
    if (!this.deletingTransactionId) return;

    StorageManager.deleteTransaction(this.deletingTransactionId);
    this.closeDeleteModal();
    this.renderAll();
    this.showToast('ลบรายการเรียบร้อย 🗑️');
  },

  renderCategoriesTab() {
    const expenseContainer = document.getElementById('category-list-expense');
    const incomeContainer = document.getElementById('category-list-income');
    const allCategories = StorageManager.getCategories();
    const allTxs = StorageManager.getTransactions();

    const renderList = (cats, container) => {
      if (!container) return;
      container.innerHTML = cats.map(c => {
        const usageCount = allTxs.filter(t => t.categoryId === c.id).length;
        return `
          <div class="minimal-card p-3 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-slate-50 border border-slate-100">
                ${c.emoji}
              </div>
              <div>
                <p class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  ${c.name}
                  ${c.isDefault ? '<span class="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.2 rounded font-normal">ระบบ</span>' : '<span class="text-[9px] bg-slate-900 text-white px-1 py-0.2 rounded font-bold">สร้างเอง</span>'}
                </p>
                <p class="text-[10px] text-slate-400 mt-0.5">ใช้ไป ${usageCount} รายการ</p>
              </div>
            </div>
            ${!c.isDefault ? `
              <button onclick="App.handleDeleteCategory('${c.id}', ${usageCount})" class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors" title="ลบหมวดหมู่นี้">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            ` : ''}
          </div>
        `;
      }).join('');
    };

    renderList(allCategories.filter(c => c.type === 'expense'), expenseContainer);
    renderList(allCategories.filter(c => c.type === 'income'), incomeContainer);
  },

  openNewCategoryModal() {
    const modal = document.getElementById('new-category-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeNewCategoryModal() {
    const modal = document.getElementById('new-category-modal');
    if (modal) modal.classList.add('hidden');
  },

  handleCreateCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const typeInput = document.querySelector('input[name="new-cat-type"]:checked');
    const emojiInput = document.getElementById('new-cat-emoji');
    const colorInput = document.getElementById('new-cat-color');

    const name = (nameInput?.value || '').trim();
    if (!name) {
      alert('กรุณากรอกชื่อหมวดหมู่');
      nameInput.focus();
      return;
    }

    const type = typeInput ? typeInput.value : 'expense';
    const emoji = (emojiInput?.value || '').trim() || '🏷️';
    const color = colorInput?.value || '#0f172a';

    StorageManager.addCategory({ name, type, emoji, color });

    if (nameInput) nameInput.value = '';
    this.closeNewCategoryModal();
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.renderCategoriesTab();
    this.showToast('สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว 🎉');
  },

  handleDeleteCategory(catId, usageCount) {
    if (usageCount > 0) {
      if (!confirm(`หมวดหมู่นี้มีการใช้งานอยู่ ${usageCount} รายการ คุณแน่ใจหรือไม่ว่าต้องการลบ?`)) {
        return;
      }
    } else {
      if (!confirm('ต้องการลบหมวดหมู่นี้ใช่หรือไม่?')) return;
    }

    const res = StorageManager.deleteCategory(catId);
    if (res.success) {
      this.initCategoryGrid('form-category-grid', this.currentEntryType);
      this.renderCategoriesTab();
      this.showToast('ลบหมวดหมู่เรียบร้อยแล้ว');
    } else {
      alert(res.message);
    }
  },

  renderAll() {
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.renderTransactionList();
    this.renderDashboard();
    this.renderCategoriesTab();
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
