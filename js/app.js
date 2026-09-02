/**
 * Main Application Controller for Money Memo v2.5 (Minimal Pastel & Mobile Optimized)
 */

const App = {
  currentTab: 'transactions', // 'transactions', 'dashboard', 'simulator', 'recurring', 'categories'
  dashboardViewMode: 'custom', // 'custom' (Monthly / Pay cycle), 'daily' (Daily breakdown), 'yearly' (Annual overview)
  selectedDate: new Date(), // สำหรับ Dashboard
  currentEntryType: 'expense', // 'expense' or 'income' for transaction form
  selectedCategoryId: null,
  currentPayCyclePreset: 28,
  
  // Tab 4 (Recurring Items) state
  inlineRecurringType: 'expense', // 'expense' or 'income'
  recurringCardFilter: 'all', // 'all', 'expense', 'income'
  editingRecurringId: null,

  // Tab 5 (Category Manager) state
  categoryManagerType: 'expense', // 'expense' or 'income'
  editingCategoryId: null,
  deletingCategoryId: null,

  // Modals & Pending actions
  editingTransactionId: null,
  deletingTransactionId: null,

  // Chart instances
  categoryChart: null,
  dailyTrendChart: null,
  yearlyMonthlyBarChart: null,
  yearlyCategoryChart: null,

  // Custom Date Range & Pay Cycle
  customStartDate: '',
  customEndDate: '',

  init() {
    I18n.init();
    if (typeof FirebaseManager !== 'undefined') {
      FirebaseManager.init();
    } else if (typeof SupabaseManager !== 'undefined') {
      SupabaseManager.init();
    }
    this.initDateTimeInput();
    this.initCustomDateInputs();
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.bindEvents();
    this.renderMonthSelector();
    this.renderAll();
    BudgetSimulator.init();
  },

  initDateTimeInput() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const curDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const curTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const dateInput = document.getElementById('tx-date');
    const timeInput = document.getElementById('tx-time');
    if (dateInput) dateInput.value = curDate;
    if (timeInput) timeInput.value = curTime;
  },

  initCustomDateInputs() {
    const startInput = document.getElementById('dash-custom-start-date');
    const endInput = document.getElementById('dash-custom-end-date');

    this.currentPayCyclePreset = 28;
    this.updateCustomDateRangeFromSelectedDate();

    if (startInput) {
      startInput.addEventListener('change', (e) => {
        this.customStartDate = e.target.value;
        this.currentPayCyclePreset = 'custom';
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }

    if (endInput) {
      endInput.addEventListener('change', (e) => {
        this.customEndDate = e.target.value;
        this.currentPayCyclePreset = 'custom';
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }
  },

  updateCustomDateRangeFromSelectedDate() {
    const pad = (n) => String(n).padStart(2, '0');
    const Y = this.selectedDate.getFullYear();
    const M = this.selectedDate.getMonth(); // 0-11

    let sDate, eDate;
    const preset = this.currentPayCyclePreset || 28;

    if (preset === 28) {
      sDate = new Date(Y, M - 1, 28);
      eDate = new Date(Y, M, 27);
    } else if (preset === 25) {
      sDate = new Date(Y, M - 1, 25);
      eDate = new Date(Y, M, 24);
    } else if (preset === 1) {
      sDate = new Date(Y, M, 1);
      eDate = new Date(Y, M + 1, 0);
    } else if (preset === 'last30') {
      const now = new Date(this.selectedDate);
      sDate = new Date(now.getTime() - 30 * 86400000);
      eDate = now;
    } else if (preset === 'last7') {
      const now = new Date(this.selectedDate);
      sDate = new Date(now.getTime() - 7 * 86400000);
      eDate = now;
    } else {
      if (this.customStartDate && this.customEndDate) {
        const partsS = this.customStartDate.split('-');
        const partsE = this.customEndDate.split('-');
        const sDay = parseInt(partsS[2], 10) || 1;
        const eDay = parseInt(partsE[2], 10) || 28;
        sDate = new Date(Y, M - 1, sDay);
        eDate = new Date(Y, M, eDay);
      } else {
        sDate = new Date(Y, M - 1, 28);
        eDate = new Date(Y, M, 27);
      }
    }

    this.customStartDate = `${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}`;
    this.customEndDate = `${eDate.getFullYear()}-${pad(eDate.getMonth() + 1)}-${pad(eDate.getDate())}`;

    const startInput = document.getElementById('dash-custom-start-date');
    const endInput = document.getElementById('dash-custom-end-date');
    if (startInput) startInput.value = this.customStartDate;
    if (endInput) endInput.value = this.customEndDate;
  },

  applyPayCyclePreset(preset) {
    this.currentPayCyclePreset = preset;
    this.updateCustomDateRangeFromSelectedDate();
    this.renderMonthSelector();
    this.renderDashboard();
  },

  navigateDashboardMonth(direction) {
    if (this.dashboardViewMode === 'yearly') {
      this.selectedDate.setFullYear(this.selectedDate.getFullYear() + direction);
    } else {
      this.selectedDate.setMonth(this.selectedDate.getMonth() + direction);
      if (this.dashboardViewMode === 'custom') {
        this.updateCustomDateRangeFromSelectedDate();
      }
    }
    this.renderMonthSelector();
    this.renderDashboard();
  },

  goToCurrentMonth() {
    this.selectedDate = new Date();
    if (this.dashboardViewMode === 'custom') {
      this.updateCustomDateRangeFromSelectedDate();
    }
    this.renderMonthSelector();
    this.renderDashboard();
  },

  bindEvents() {
    // Tab switching (Both Desktop top pills and Mobile bottom bar)
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

    // Quick Amount Chips in Form
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

    // Category Modal Form Submit (Add / Edit)
    const addCatForm = document.getElementById('add-category-form');
    if (addCatForm) {
      addCatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveNewCategory();
      });
    }

    // Recurring Inline Add Form Submit
    const inlineRecForm = document.getElementById('recurring-inline-add-form');
    if (inlineRecForm) {
      inlineRecForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveInlineRecurring();
      });
    }

    // Recurring Modal Form Submit
    const modalRecForm = document.getElementById('recurring-modal-form');
    if (modalRecForm) {
      modalRecForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveModalRecurring();
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

    // Month / Year Navigation in Dashboard
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const currentMonthBtn = document.getElementById('current-month-btn');

    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        if (this.dashboardViewMode === 'yearly') {
          this.selectedDate.setFullYear(this.selectedDate.getFullYear() - 1);
        } else if (this.dashboardViewMode === 'custom') {
          this.shiftCustomDateRange(-1);
          return;
        } else {
          this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
        }
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        if (this.dashboardViewMode === 'yearly') {
          this.selectedDate.setFullYear(this.selectedDate.getFullYear() + 1);
        } else if (this.dashboardViewMode === 'custom') {
          this.shiftCustomDateRange(1);
          return;
        } else {
          this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
        }
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }
    if (currentMonthBtn) {
      currentMonthBtn.addEventListener('click', () => {
        this.selectedDate = new Date();
        if (this.dashboardViewMode === 'custom') {
          this.applyPayCyclePreset(this.currentPayCyclePreset || 28);
          return;
        }
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }

    // Dashboard View Mode Toggle (Monthly Pay Cycle / Daily / Yearly)
    const viewModeCustom = document.getElementById('view-mode-custom');
    const viewModeDaily = document.getElementById('view-mode-daily');
    const viewModeYearly = document.getElementById('view-mode-yearly');
    if (viewModeCustom) viewModeCustom.addEventListener('click', () => this.setDashboardViewMode('custom'));
    if (viewModeDaily) viewModeDaily.addEventListener('click', () => this.setDashboardViewMode('daily'));
    if (viewModeYearly) viewModeYearly.addEventListener('click', () => this.setDashboardViewMode('yearly'));

    // Filter & Search in History
    const searchInput = document.getElementById('tx-search-input');
    const filterType = document.getElementById('tx-filter-type');
    if (searchInput) searchInput.addEventListener('input', () => this.renderTransactionList());
    if (filterType) filterType.addEventListener('change', () => this.renderTransactionList());

    // Sample data loader
    const loadSampleBtn = document.getElementById('btn-load-sample');
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        const lang = I18n.getLanguage();
        const confirmMsg = lang === 'en' ? 'Load sample demo data for testing?' : 'ต้องการโหลดข้อมูลตัวอย่างสำหรับทดลองใช้งานใช่หรือไม่?';
        if (confirm(confirmMsg)) {
          StorageManager.loadSampleData();
          this.renderAll();
          BudgetSimulator.render();
          this.showToast(I18n.t('toast_sample_loaded'));
        }
      });
    }

    // Export / Import
    const exportJsonBtn = document.getElementById('btn-export-json');
    const importFile = document.getElementById('import-json-file');

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
            this.showToast(I18n.t('toast_restored'));
          } else {
            alert((I18n.getLanguage() === 'en' ? 'Error importing file: ' : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ') + res.message);
          }
          importFile.value = '';
        };
        reader.readAsText(file);
      });
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Sync both desktop tabs and mobile bottom bar
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

    // Scroll to top gently on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'dashboard') {
      this.renderDashboard();
    } else if (tabName === 'transactions') {
      this.renderTransactionList();
      this.renderQuickFixedChips();
    } else if (tabName === 'recurring') {
      this.setInlineRecurringType(this.inlineRecurringType);
      this.renderRecurringTab();
    } else if (tabName === 'simulator') {
      BudgetSimulator.render();
    } else if (tabName === 'categories') {
      this.renderCategoriesTab();
    }
  },

  setEntryType(type) {
    this.currentEntryType = type;
    const typeToggleExp = document.getElementById('type-toggle-expense');
    const typeToggleInc = document.getElementById('type-toggle-income');
    const submitBtn = document.getElementById('tx-submit-btn');

    if (type === 'expense') {
      if (typeToggleExp) {
        typeToggleExp.className = 'py-2 px-3 rounded-xl font-bold text-xs bg-rose-400 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer';
        typeToggleExp.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span> ${I18n.t('type_expense')}`;
      }
      if (typeToggleInc) {
        typeToggleInc.className = 'py-2 px-3 rounded-xl font-medium text-xs text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer';
        typeToggleInc.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${I18n.t('type_income')}`;
      }
      if (submitBtn) {
        submitBtn.className = 'w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer';
        submitBtn.innerHTML = `<span>${I18n.t('btn_save_expense')}</span>`;
      }
    } else {
      if (typeToggleExp) {
        typeToggleExp.className = 'py-2 px-3 rounded-xl font-medium text-xs text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer';
        typeToggleExp.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> ${I18n.t('type_expense')}`;
      }
      if (typeToggleInc) {
        typeToggleInc.className = 'py-2 px-3 rounded-xl font-bold text-xs bg-emerald-400 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer';
        typeToggleInc.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span> ${I18n.t('type_income')}`;
      }
      if (submitBtn) {
        submitBtn.className = 'w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer';
        submitBtn.innerHTML = `<span>${I18n.t('btn_save_income')}</span>`;
      }
    }

    this.initCategoryGrid('form-category-grid', type);
    this.renderQuickFixedChips();
  },

  initCategoryGrid(containerId, type, preselectedId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = StorageManager.getCategories().filter(c => c.type === type);
    
    if (!preselectedId || !categories.some(c => c.id === preselectedId)) {
      this.selectedCategoryId = categories.length > 0 ? categories[0].id : null;
    } else {
      this.selectedCategoryId = preselectedId;
    }

    const lang = I18n.getLanguage();

    const itemsHtml = categories.map(c => {
      const displayName = StorageManager.getCategoryDisplayName(c);
      return `
        <button 
          type="button" 
          data-cat-id="${c.id}"
          class="cat-item-btn p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${c.id === this.selectedCategoryId ? 'selected border-slate-900 bg-slate-50' : 'border-slate-100/80 bg-white hover:bg-slate-50'}"
          onclick="App.selectCategory('${containerId}', '${c.id}')"
          title="${displayName}"
        >
          <span class="text-xl leading-none">${c.emoji}</span>
          <span class="text-[11px] font-medium text-slate-700 text-center truncate max-w-full leading-tight">${displayName}</span>
        </button>
      `;
    }).join('');

    // Append quick "+ เพิ่มหมวด" tile at the end of the grid
    const addText = lang === 'en' ? 'Add Cat' : 'เพิ่มหมวด';
    const addTileHtml = `
      <button 
        type="button" 
        onclick="App.openAddCategoryModal('${type}')"
        class="p-2 rounded-2xl border border-dashed border-slate-300 hover:border-slate-500 bg-white/60 hover:bg-slate-100 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 transition-all cursor-pointer group"
        title="${lang === 'en' ? 'Create new category' : 'สร้างหมวดหมู่ใหม่'}"
      >
        <span class="text-lg leading-none group-hover:scale-110 transition-transform">➕</span>
        <span class="text-[10px] font-bold">${addText}</span>
      </button>
    `;

    container.innerHTML = itemsHtml + addTileHtml;
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

  // ==========================================
  // TAB 5: CATEGORY MANAGER (เพิ่ม/ลด/แก้ไข หมวดหมู่)
  // ==========================================
  setCategoryManagerType(type) {
    this.categoryManagerType = type;
    const expBtn = document.getElementById('cat-tab-expense');
    const incBtn = document.getElementById('cat-tab-income');

    if (type === 'expense') {
      if (expBtn) expBtn.className = 'px-3.5 py-1.5 rounded-xl font-bold bg-rose-400 text-white shadow-xs transition-all cursor-pointer';
      if (incBtn) incBtn.className = 'px-3.5 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-900 transition-all cursor-pointer';
    } else {
      if (expBtn) expBtn.className = 'px-3.5 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-900 transition-all cursor-pointer';
      if (incBtn) incBtn.className = 'px-3.5 py-1.5 rounded-xl font-bold bg-emerald-400 text-white shadow-xs transition-all cursor-pointer';
    }

    this.renderCategoriesTab();
  },

  renderCategoriesTab() {
    const container = document.getElementById('categories-manager-grid');
    const countBadge = document.getElementById('cat-mgr-count-badge');
    if (!container) return;

    const allCategories = StorageManager.getCategories();
    const categories = allCategories.filter(c => c.type === this.categoryManagerType);

    const lang = I18n.getLanguage();

    if (countBadge) {
      countBadge.textContent = lang === 'en' ? `(${categories.length} categories)` : `(ทั้งหมด ${categories.length} หมวดหมู่)`;
    }

    if (categories.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
          <span class="text-3xl block mb-2">🏷️</span>
          <p class="font-bold text-slate-700 text-sm">${lang === 'en' ? 'No categories found' : 'ไม่พบหมวดหมู่ในกลุ่มนี้'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = categories.map(cat => {
      const displayName = StorageManager.getCategoryDisplayName(cat);
      const isExpense = cat.type === 'expense';
      const badgeText = cat.isDefault ? I18n.t('badge_default_cat') : I18n.t('badge_custom_cat');

      return `
        <div class="pastel-card p-4 rounded-3xl flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-2xs border border-slate-100 flex-shrink-0" style="background-color: ${cat.color}15; border-color: ${cat.color}30;">
              ${cat.emoji}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-900 text-sm truncate">${displayName}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${cat.isDefault ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}">
                  ${badgeText}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 truncate">
                <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${cat.color || '#64748b'};"></span>
                <span>${cat.name} ${cat.nameEn && cat.nameEn !== cat.name ? `· ${cat.nameEn}` : ''}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1 flex-shrink-0">
            <button 
              type="button" 
              onclick="App.openEditCategoryModal('${cat.id}')" 
              class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" 
              title="${I18n.t('btn_edit_cat')}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button 
              type="button" 
              onclick="App.openDeleteCategoryModal('${cat.id}')" 
              class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer" 
              title="${I18n.t('btn_delete_cat')}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openAddCategoryModal(defaultType = null) {
    this.editingCategoryId = null;
    const modal = document.getElementById('add-category-modal');
    const titleEl = document.getElementById('category-modal-title');
    const idInput = document.getElementById('new-cat-id');
    const nameInput = document.getElementById('new-cat-name-input');
    const nameEnInput = document.getElementById('new-cat-name-en-input');
    const emojiInput = document.getElementById('new-cat-emoji-input');
    const colorInput = document.getElementById('new-cat-color-input');
    const typeRadios = document.querySelectorAll('input[name="new-cat-type"]');

    const targetType = defaultType || this.currentEntryType || 'expense';

    if (titleEl) titleEl.innerHTML = `<span>🏷️</span> ${I18n.t('modal_add_cat_title')}`;
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (nameEnInput) nameEnInput.value = '';

    typeRadios.forEach(r => {
      r.checked = (r.value === targetType);
    });

    const defaultEmoji = targetType === 'income' ? '💰' : '🐾';
    if (emojiInput) emojiInput.value = defaultEmoji;
    this.updateCategoryEmojiPreview(defaultEmoji);

    const defaultColor = targetType === 'income' ? '#34d399' : '#f87171';
    if (colorInput) colorInput.value = defaultColor;

    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    const firstSwatch = document.querySelector('.color-swatch');
    if (firstSwatch) firstSwatch.classList.add('selected');

    if (modal) modal.classList.add('show');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
  },

  openEditCategoryModal(id) {
    const cat = StorageManager.getCategoryById(id);
    if (!cat) return;

    this.editingCategoryId = id;
    const modal = document.getElementById('add-category-modal');
    const titleEl = document.getElementById('category-modal-title');
    const idInput = document.getElementById('new-cat-id');
    const nameInput = document.getElementById('new-cat-name-input');
    const nameEnInput = document.getElementById('new-cat-name-en-input');
    const emojiInput = document.getElementById('new-cat-emoji-input');
    const colorInput = document.getElementById('new-cat-color-input');
    const typeRadios = document.querySelectorAll('input[name="new-cat-type"]');

    if (titleEl) titleEl.innerHTML = `<span>✏️</span> ${I18n.t('modal_edit_cat_title')}`;
    if (idInput) idInput.value = cat.id;
    if (nameInput) nameInput.value = cat.name || '';
    if (nameEnInput) nameEnInput.value = cat.nameEn || '';
    if (emojiInput) emojiInput.value = cat.emoji || '📦';
    this.updateCategoryEmojiPreview(cat.emoji || '📦');

    if (colorInput) colorInput.value = cat.color || '#64748b';

    typeRadios.forEach(r => {
      r.checked = (r.value === cat.type);
    });

    document.querySelectorAll('.color-swatch').forEach(s => {
      if (s.getAttribute('onclick')?.includes(cat.color)) {
        s.classList.add('selected');
      } else {
        s.classList.remove('selected');
      }
    });

    if (modal) modal.classList.add('show');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
  },

  closeAddCategoryModal() {
    this.editingCategoryId = null;
    const modal = document.getElementById('add-category-modal');
    if (modal) modal.classList.remove('show');
  },

  handleNewCategoryTypeChange(type) {
    const defaultEmoji = type === 'income' ? '💰' : '🐾';
    const emojiInput = document.getElementById('new-cat-emoji-input');
    if (emojiInput) emojiInput.value = defaultEmoji;
    this.updateCategoryEmojiPreview(defaultEmoji);
  },

  setNewCategoryEmoji(emoji) {
    const emojiInput = document.getElementById('new-cat-emoji-input');
    if (emojiInput) emojiInput.value = emoji;
    this.updateCategoryEmojiPreview(emoji);
  },

  updateCategoryEmojiPreview(emoji) {
    const preview = document.getElementById('new-cat-emoji-preview');
    if (preview) preview.textContent = emoji || '📦';
  },

  setNewCategoryColor(color, el) {
    const colorInput = document.getElementById('new-cat-color-input');
    if (colorInput) colorInput.value = color;

    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    if (el) el.classList.add('selected');
  },

  handleSaveNewCategory() {
    const idInput = document.getElementById('new-cat-id');
    const nameInput = document.getElementById('new-cat-name-input');
    const nameEnInput = document.getElementById('new-cat-name-en-input');
    const emojiInput = document.getElementById('new-cat-emoji-input');
    const colorInput = document.getElementById('new-cat-color-input');
    const typeRadio = document.querySelector('input[name="new-cat-type"]:checked');

    const id = (idInput?.value || '').trim();
    const name = (nameInput?.value || '').trim();
    const nameEn = (nameEnInput?.value || '').trim() || name;
    const emoji = (emojiInput?.value || '').trim() || '📦';
    const color = colorInput?.value || '#64748b';
    const type = typeRadio ? typeRadio.value : this.currentEntryType;

    if (!name) {
      alert(I18n.getLanguage() === 'en' ? 'Please enter a category name' : 'กรุณาระบุชื่อหมวดหมู่');
      nameInput.focus();
      return;
    }

    if (id) {
      StorageManager.updateCategory(id, { name, nameEn, emoji, color, type });
      this.showToast(I18n.t('toast_cat_updated'));
    } else {
      const newCat = StorageManager.addCategory({ name, nameEn, emoji, color, type });
      if (type === this.currentEntryType) {
        this.initCategoryGrid('form-category-grid', type, newCat.id);
      }
      this.showToast(I18n.t('toast_cat_added'));
    }

    this.closeAddCategoryModal();
    this.renderAll();
    this.renderCategoriesTab();
    this.setInlineRecurringType(this.inlineRecurringType);
  },

  openDeleteCategoryModal(id) {
    const cat = StorageManager.getCategoryById(id);
    if (!cat) return;

    this.deletingCategoryId = id;
    const modal = document.getElementById('delete-category-modal');
    const preview = document.getElementById('delete-category-modal-preview');

    const displayName = StorageManager.getCategoryDisplayName(cat);

    if (preview) {
      preview.innerHTML = `
        <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left mt-2">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style="background-color: ${cat.color}20;">
            ${cat.emoji}
          </div>
          <div>
            <p class="font-bold text-slate-900 text-xs">${displayName}</p>
            <p class="text-[11px] text-slate-400">${cat.type === 'expense' ? '🔴 Expense' : '🟢 Income'}</p>
          </div>
        </div>
      `;
    }

    if (modal) modal.classList.add('show');
  },

  closeDeleteCategoryModal() {
    this.deletingCategoryId = null;
    const modal = document.getElementById('delete-category-modal');
    if (modal) modal.classList.remove('show');
  },

  confirmDeleteCategory() {
    if (!this.deletingCategoryId) return;

    StorageManager.deleteCategory(this.deletingCategoryId);
    this.closeDeleteCategoryModal();
    this.renderAll();
    this.renderCategoriesTab();
    this.setInlineRecurringType(this.inlineRecurringType);
    this.showToast(I18n.t('toast_cat_deleted'));
  },

  handleRestoreDefaultCategories() {
    const lang = I18n.getLanguage();
    const confirmMsg = lang === 'en' ? 'Restore default standard categories?' : 'คุณต้องการคืนค่าหมวดหมู่มาตรฐานเริ่มต้นใช่หรือไม่?';
    if (confirm(confirmMsg)) {
      StorageManager.restoreDefaultCategories();
      this.renderAll();
      this.renderCategoriesTab();
      this.setInlineRecurringType(this.inlineRecurringType);
      this.showToast(I18n.t('toast_cat_restored'));
    }
  },

  // --- Quick Recurring Chips ---
  renderQuickFixedChips() {
    const container = document.getElementById('quick-fixed-chips-list');
    const titleEl = document.getElementById('quick-chips-title');
    if (!container) return;

    const isExpense = this.currentEntryType === 'expense';
    if (titleEl) {
      titleEl.textContent = isExpense ? I18n.t('quick_chips_expense_title') : I18n.t('quick_chips_income_title');
    }

    const allRecurring = StorageManager.getRecurringItems();
    const filtered = allRecurring.filter(item => item.type === this.currentEntryType);

    if (filtered.length === 0) {
      container.innerHTML = `
        <span class="text-xs text-slate-400">${isExpense ? I18n.t('no_shortcuts_expense') : I18n.t('no_shortcuts_income')}</span>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const cat = StorageManager.getCategoryById(item.categoryId || StorageManager.guessCategoryByName(item.name, item.type));
      const displayName = StorageManager.getItemDisplayName(item);
      return `
        <button 
          type="button" 
          onclick="App.quickFillFromRecurring('${item.id}')"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all group cursor-pointer"
          title="Autofill ${displayName} ฿${item.amount.toLocaleString()}"
        >
          <span>${cat.emoji}</span>
          <span class="truncate max-w-[120px]">${displayName}</span>
          <span class="num-font text-[11px] font-bold ${isExpense ? 'text-rose-500 group-hover:text-rose-300' : 'text-emerald-500 group-hover:text-emerald-300'}">฿${item.amount.toLocaleString()}</span>
        </button>
      `;
    }).join('');
  },

  quickFillFromRecurring(id) {
    const item = StorageManager.getRecurringItems().find(e => e.id === id);
    if (!item) return;

    this.setEntryType(item.type || 'expense');

    const amountInput = document.getElementById('tx-amount');
    const noteInput = document.getElementById('tx-note');
    const paymentInput = document.getElementById('tx-payment-method');

    const displayName = StorageManager.getItemDisplayName(item);

    if (amountInput) {
      amountInput.value = item.amount;
      amountInput.focus();
    }
    if (noteInput) {
      noteInput.value = displayName;
    }
    if (paymentInput && item.paymentMethod) {
      paymentInput.value = item.paymentMethod;
    }

    const catId = item.categoryId || StorageManager.guessCategoryByName(item.name, item.type);
    this.selectCategory('form-category-grid', catId);

    const msg = I18n.getLanguage() === 'en' ? `Autofilled "${displayName}" ฿${item.amount.toLocaleString()}` : `กรอก "${displayName}" ฿${item.amount.toLocaleString()} ลงฟอร์มแล้ว ✨`;
    this.showToast(msg);
  },

  // --- TAB 4: Recurring Transactions Management ---
  setInlineRecurringType(type) {
    this.inlineRecurringType = type;
    const expBtn = document.getElementById('inline-rec-type-exp');
    const incBtn = document.getElementById('inline-rec-type-inc');
    const catSelect = document.getElementById('inline-rec-category');

    if (type === 'expense') {
      if (expBtn) expBtn.className = 'py-1.5 px-3 rounded-xl font-bold text-xs bg-rose-400 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer';
      if (incBtn) incBtn.className = 'py-1.5 px-3 rounded-xl font-medium text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer';
    } else {
      if (expBtn) expBtn.className = 'py-1.5 px-3 rounded-xl font-medium text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer';
      if (incBtn) incBtn.className = 'py-1.5 px-3 rounded-xl font-bold text-xs bg-emerald-400 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer';
    }

    if (catSelect) {
      const categories = StorageManager.getCategories().filter(c => c.type === type);
      catSelect.innerHTML = categories.map(c => {
        const catName = StorageManager.getCategoryDisplayName(c);
        return `<option value="${c.id}">${c.emoji} ${catName}</option>`;
      }).join('');
    }

    this.renderInlinePresets();
  },

  renderInlinePresets() {
    const container = document.getElementById('inline-rec-presets-container');
    if (!container) return;

    const lang = I18n.getLanguage();

    if (this.inlineRecurringType === 'expense') {
      if (lang === 'en') {
        container.innerHTML = `
          <button type="button" onclick="App.presetRecurringItem('Apartment Rent', 2800, 'exp_housing')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🏠 Rent</button>
          <button type="button" onclick="App.presetRecurringItem('Water & Electricity', 2200, 'exp_bills')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 💡 Utilities</button>
          <button type="button" onclick="App.presetRecurringItem('Internet & Mobile', 300, 'exp_bills')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 📱 Internet</button>
          <button type="button" onclick="App.presetRecurringItem('Commute (BTS/Gas)', 400, 'exp_transport')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🚗 Transport</button>
          <button type="button" onclick="App.presetRecurringItem('Netflix / Streaming', 219, 'exp_ent')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🎬 Netflix</button>
          <button type="button" onclick="App.presetRecurringItem('Health Insurance', 1500, 'exp_health')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🛡️ Insurance</button>
        `;
      } else {
        container.innerHTML = `
          <button type="button" onclick="App.presetRecurringItem('ค่าเช่าห้อง / คอนโด', 2800, 'exp_housing')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🏠 ค่าเช่าห้อง</button>
          <button type="button" onclick="App.presetRecurringItem('ค่าน้ำ + ค่าไฟ', 2200, 'exp_bills')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 💡 ค่าน้ำไฟ</button>
          <button type="button" onclick="App.presetRecurringItem('ค่าเน็ตบ้าน + มือถือ', 300, 'exp_bills')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 📱 ค่าเน็ต</button>
          <button type="button" onclick="App.presetRecurringItem('ค่าเดินทางประจำ (BTS/น้ำมัน)', 400, 'exp_transport')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🚗 ค่าเดินทาง</button>
          <button type="button" onclick="App.presetRecurringItem('Netflix / Youtube Premium', 219, 'exp_ent')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🎬 Netflix</button>
          <button type="button" onclick="App.presetRecurringItem('เบี้ยประกันชีวิต / สุขภาพ', 1500, 'exp_health')" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">+ 🛡️ ประกันสุขภาพ</button>
        `;
      }
    } else {
      if (lang === 'en') {
        container.innerHTML = `
          <button type="button" onclick="App.presetRecurringItem('Monthly Salary', 18000, 'inc_salary')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 💼 Salary</button>
          <button type="button" onclick="App.presetRecurringItem('Side Gig / Freelance', 3000, 'inc_business')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 🛒 Side Gig</button>
          <button type="button" onclick="App.presetRecurringItem('Monthly Bonus', 2000, 'inc_bonus')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 🎁 Bonus</button>
          <button type="button" onclick="App.presetRecurringItem('Dividends / Interest', 1000, 'inc_invest')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 📈 Dividends</button>
        `;
      } else {
        container.innerHTML = `
          <button type="button" onclick="App.presetRecurringItem('เงินเดือนประจำ', 18000, 'inc_salary')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 💼 เงินเดือนประจำ</button>
          <button type="button" onclick="App.presetRecurringItem('ค่าจ้างงานเสริมประจำ', 3000, 'inc_business')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 🛒 รายได้งานเสริม</button>
          <button type="button" onclick="App.presetRecurringItem('โบนัส / คอมมิชชั่นประจำ', 2000, 'inc_bonus')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 🎁 โบนัส/คอมมิชชั่น</button>
          <button type="button" onclick="App.presetRecurringItem('เงินปันผล / ดอกเบี้ยประจำ', 1000, 'inc_invest')" class="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer">+ 📈 ปันผลประจำ</button>
        `;
      }
    }
  },

  presetRecurringItem(name, amount, catId) {
    const nameInput = document.getElementById('inline-rec-name');
    const amountInput = document.getElementById('inline-rec-amount');
    const catSelect = document.getElementById('inline-rec-category');

    if (nameInput) nameInput.value = name;
    if (amountInput) {
      amountInput.value = amount;
      amountInput.focus();
    }
    if (catSelect && catId) catSelect.value = catId;

    const msg = I18n.getLanguage() === 'en' ? `Selected "${name}". Adjust amount and click save.` : `เลือกตัวอย่าง "${name}" แล้ว สามารถปรับแก้ตัวเลขแล้วกดบันทึกได้เลย`;
    this.showToast(msg);
  },

  handleSaveInlineRecurring() {
    const nameInput = document.getElementById('inline-rec-name');
    const amountInput = document.getElementById('inline-rec-amount');
    const catSelect = document.getElementById('inline-rec-category');

    const name = (nameInput?.value || '').trim();
    const amount = Math.max(0, parseFloat(amountInput?.value) || 0);
    const categoryId = catSelect?.value || StorageManager.guessCategoryByName(name, this.inlineRecurringType);

    if (!name) {
      alert(I18n.getLanguage() === 'en' ? 'Please enter item name' : 'กรุณากรอกชื่อรายการ');
      nameInput.focus();
      return;
    }
    if (amount <= 0) {
      alert(I18n.getLanguage() === 'en' ? 'Please enter an amount greater than 0' : 'กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท');
      amountInput.focus();
      return;
    }

    StorageManager.addRecurringItem({
      type: this.inlineRecurringType,
      name,
      nameEn: name,
      amount,
      categoryId,
      paymentMethod: 'โอนเงิน / บัญชีธนาคาร'
    });

    if (nameInput) nameInput.value = '';
    if (amountInput) amountInput.value = '';

    this.renderAll();
    const typeLabel = this.inlineRecurringType === 'expense' ? (I18n.getLanguage() === 'en' ? 'Expense' : 'รายจ่ายประจำ') : (I18n.getLanguage() === 'en' ? 'Income' : 'รายรับประจำ');
    this.showToast(I18n.getLanguage() === 'en' ? `Recurring ${typeLabel} "${name}" added!` : `เพิ่ม${typeLabel} "${name}" ฿${amount.toLocaleString()} สำเร็จ 🎉`);
  },

  setRecurringCardFilter(filter) {
    this.recurringCardFilter = filter;
    
    const allBtn = document.getElementById('rec-filter-all');
    const expBtn = document.getElementById('rec-filter-expense');
    const incBtn = document.getElementById('rec-filter-income');

    [allBtn, expBtn, incBtn].forEach(b => {
      if (b) b.className = 'px-3 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-900 cursor-pointer';
    });

    if (filter === 'all' && allBtn) allBtn.className = 'px-3 py-1.5 rounded-xl font-bold bg-white text-slate-900 shadow-2xs cursor-pointer';
    if (filter === 'expense' && expBtn) expBtn.className = 'px-3 py-1.5 rounded-xl font-bold bg-rose-400 text-white shadow-xs cursor-pointer';
    if (filter === 'income' && incBtn) incBtn.className = 'px-3 py-1.5 rounded-xl font-bold bg-emerald-400 text-white shadow-xs cursor-pointer';

    this.renderRecurringTab();
  },

  renderRecurringTab() {
    const container = document.getElementById('recurring-items-cards-list');
    const totalIncomeEl = document.getElementById('rec-tab-total-income');
    const totalExpenseEl = document.getElementById('rec-tab-total-expense');
    const netEl = document.getElementById('rec-tab-net-amount');

    const allItems = StorageManager.getRecurringItems();
    
    let totalIncome = 0;
    let totalExpense = 0;

    allItems.forEach(item => {
      if (item.type === 'income') totalIncome += (item.amount || 0);
      else totalExpense += (item.amount || 0);
    });

    const net = totalIncome - totalExpense;

    if (totalIncomeEl) totalIncomeEl.textContent = '฿' + totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    if (totalExpenseEl) totalExpenseEl.textContent = '฿' + totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    if (netEl) {
      netEl.textContent = (net >= 0 ? '+' : '') + '฿' + net.toLocaleString('th-TH', { minimumFractionDigits: 2 });
      netEl.className = `text-2xl font-extrabold num-font ${net >= 0 ? 'text-slate-900' : 'text-rose-600'}`;
    }

    if (!container) return;

    let filtered = allItems;
    if (this.recurringCardFilter === 'expense') filtered = allItems.filter(e => e.type === 'expense');
    if (this.recurringCardFilter === 'income') filtered = allItems.filter(e => e.type === 'income');

    const lang = I18n.getLanguage();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-10 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
          <span class="text-3xl block mb-1">📌</span>
          <p class="font-bold text-slate-700 text-sm">${I18n.t('rec_empty_list')}</p>
          <p class="text-xs text-slate-400 mt-1">${I18n.t('rec_empty_list_desc')}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const isExp = item.type === 'expense';
      const cat = StorageManager.getCategoryById(item.categoryId || StorageManager.guessCategoryByName(item.name, item.type));
      const displayName = StorageManager.getItemDisplayName(item);
      const catName = StorageManager.getCategoryDisplayName(cat);
      const typeBadge = isExp ? (lang === 'en' ? 'Expense' : 'รายจ่าย') : (lang === 'en' ? 'Income' : 'รายรับ');
      const perMonthText = lang === 'en' ? '/ month' : '/ เดือน';

      return `
        <div class="pastel-card p-4 rounded-3xl flex flex-col justify-between gap-3 group">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-slate-50 border border-slate-100">
                ${cat.emoji}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-slate-900 text-sm">${displayName}</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded-full font-bold ${isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}">
                    ${typeBadge}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[11px] text-slate-500">${catName}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">${item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร'}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-lg font-extrabold num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
                ${isExp ? '-' : '+'}฿${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <span class="text-[10px] text-slate-400 block">${perMonthText}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
            <button 
              type="button"
              onclick="App.quickLogRecurring('${item.id}')"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl ${isExp ? 'bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-700' : 'bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700'} font-semibold transition-all cursor-pointer shadow-2xs"
              title="${lang === 'en' ? 'Log to current month' : 'บันทึกยอดนี้เข้าบัญชีเดือนนี้ทันที'}"
            >
              <span>${I18n.t('btn_quick_log')}</span>
            </button>

            <div class="flex items-center gap-1">
              <button type="button" onclick="App.openEditRecurringModal('${item.id}')" class="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" title="${I18n.t('btn_edit')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button type="button" onclick="App.deleteRecurring('${item.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer" title="${I18n.t('btn_delete')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openAddRecurringModal() {
    this.editingRecurringId = null;
    const titleEl = document.getElementById('recurring-modal-title');
    const idInput = document.getElementById('recurring-modal-id');
    const nameInput = document.getElementById('recurring-modal-name');
    const amountInput = document.getElementById('recurring-modal-amount');
    const paymentSelect = document.getElementById('recurring-modal-payment');
    const typeRadios = document.querySelectorAll('input[name="modal-rec-type"]');

    if (titleEl) titleEl.textContent = I18n.getLanguage() === 'en' ? 'Add Recurring Item' : 'เพิ่มรายการประจำเดือน';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (amountInput) amountInput.value = '';
    
    typeRadios.forEach(r => {
      r.checked = (r.value === this.inlineRecurringType);
    });

    this.handleModalTypeChange(this.inlineRecurringType);

    if (paymentSelect) paymentSelect.value = 'โอนเงิน / บัญชีธนาคาร';

    const modal = document.getElementById('recurring-modal');
    if (modal) modal.classList.add('show');
  },

  handleModalTypeChange(type) {
    const catSelect = document.getElementById('recurring-modal-category');
    if (catSelect) {
      const categories = StorageManager.getCategories().filter(c => c.type === type);
      catSelect.innerHTML = categories.map(c => {
        const catName = StorageManager.getCategoryDisplayName(c);
        return `<option value="${c.id}">${c.emoji} ${catName}</option>`;
      }).join('');
    }
  },

  openEditRecurringModal(id) {
    const item = StorageManager.getRecurringItems().find(e => e.id === id);
    if (!item) return;

    this.editingRecurringId = id;
    const titleEl = document.getElementById('recurring-modal-title');
    const idInput = document.getElementById('recurring-modal-id');
    const nameInput = document.getElementById('recurring-modal-name');
    const amountInput = document.getElementById('recurring-modal-amount');
    const catSelect = document.getElementById('recurring-modal-category');
    const paymentSelect = document.getElementById('recurring-modal-payment');
    const typeRadios = document.querySelectorAll('input[name="modal-rec-type"]');

    if (titleEl) titleEl.textContent = I18n.getLanguage() === 'en' ? 'Edit Recurring Item' : 'แก้ไขรายการประจำเดือน';
    if (idInput) idInput.value = item.id;
    if (nameInput) nameInput.value = StorageManager.getItemDisplayName(item);
    if (amountInput) amountInput.value = item.amount;

    typeRadios.forEach(r => {
      r.checked = (r.value === item.type);
    });

    this.handleModalTypeChange(item.type);
    if (catSelect) {
      catSelect.value = item.categoryId || StorageManager.guessCategoryByName(item.name, item.type);
    }
    if (paymentSelect) paymentSelect.value = item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร';

    const modal = document.getElementById('recurring-modal');
    if (modal) modal.classList.add('show');
  },

  closeRecurringModal() {
    this.editingRecurringId = null;
    const modal = document.getElementById('recurring-modal');
    if (modal) modal.classList.remove('show');
  },

  handleSaveModalRecurring() {
    const nameInput = document.getElementById('recurring-modal-name');
    const amountInput = document.getElementById('recurring-modal-amount');
    const catSelect = document.getElementById('recurring-modal-category');
    const paymentSelect = document.getElementById('recurring-modal-payment');
    const typeRadio = document.querySelector('input[name="modal-rec-type"]:checked');

    const type = typeRadio ? typeRadio.value : 'expense';
    const name = (nameInput?.value || '').trim();
    const amount = Math.max(0, parseFloat(amountInput?.value) || 0);
    const categoryId = catSelect?.value || (type === 'income' ? 'inc_salary' : 'exp_bills');
    const paymentMethod = paymentSelect?.value || 'โอนเงิน / บัญชีธนาคาร';

    if (!name) {
      alert(I18n.getLanguage() === 'en' ? 'Please specify item name' : 'กรุณาระบุชื่อรายการ');
      nameInput.focus();
      return;
    }
    if (amount <= 0) {
      alert(I18n.getLanguage() === 'en' ? 'Please specify amount greater than 0' : 'กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท');
      amountInput.focus();
      return;
    }

    if (this.editingRecurringId) {
      StorageManager.updateRecurringItem(this.editingRecurringId, { type, name, nameEn: name, amount, categoryId, paymentMethod });
      this.showToast(I18n.getLanguage() === 'en' ? `Updated "${name}"!` : `อัปเดต "${name}" เรียบร้อย ✅`);
    } else {
      StorageManager.addRecurringItem({ type, name, nameEn: name, amount, categoryId, paymentMethod });
      this.showToast(I18n.getLanguage() === 'en' ? `Added recurring item "${name}"!` : `เพิ่มรายการประจำ "${name}" เรียบร้อย 🎉`);
    }

    this.closeRecurringModal();
    this.renderAll();
  },

  deleteRecurring(id) {
    const item = StorageManager.getRecurringItems().find(e => e.id === id);
    const displayName = item ? StorageManager.getItemDisplayName(item) : 'this item';
    const confirmMsg = I18n.getLanguage() === 'en' ? `Are you sure you want to delete "${displayName}"?` : `คุณต้องการลบรายการประจำ "${displayName}" ใช่หรือไม่?`;

    if (confirm(confirmMsg)) {
      StorageManager.deleteRecurringItem(id);
      this.renderAll();
      this.showToast(I18n.getLanguage() === 'en' ? `Deleted "${displayName}"` : `ลบ "${displayName}" เรียบร้อยแล้ว`);
    }
  },

  quickLogRecurring(id) {
    const item = StorageManager.getRecurringItems().find(e => e.id === id);
    if (!item) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const displayName = StorageManager.getItemDisplayName(item);

    StorageManager.addTransaction({
      type: item.type || 'expense',
      amount: item.amount,
      categoryId: item.categoryId || StorageManager.guessCategoryByName(item.name, item.type),
      date: dateStr,
      paymentMethod: item.paymentMethod || 'โอนเงิน / บัญชีธนาคาร',
      note: displayName
    });

    this.renderAll();
    this.showToast(I18n.getLanguage() === 'en' ? `Logged "${displayName}" ฿${item.amount.toLocaleString()} ⚡` : `บันทึก "${displayName}" ฿${item.amount.toLocaleString()} ลงบัญชีแล้ว ⚡`);
  },

  // --- Batch Import Modal ---
  openQuickFixedModal() {
    const modal = document.getElementById('quick-fixed-modal');
    const dateInput = document.getElementById('batch-import-date');
    if (dateInput) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    this.renderQuickFixedModalList();
    if (modal) modal.classList.add('show');
  },

  closeQuickFixedModal() {
    const modal = document.getElementById('quick-fixed-modal');
    if (modal) modal.classList.remove('show');
  },

  renderQuickFixedModalList() {
    const container = document.getElementById('batch-fixed-items-list');
    if (!container) return;

    const allItems = StorageManager.getRecurringItems();
    const expCategories = StorageManager.getCategories().filter(c => c.type === 'expense');
    const incCategories = StorageManager.getCategories().filter(c => c.type === 'income');
    const lang = I18n.getLanguage();

    if (allItems.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p class="text-xs font-semibold text-slate-600">${I18n.t('rec_empty_list')}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">${I18n.t('rec_empty_list_desc')}</p>
        </div>
      `;
      this.updateBatchTotal();
      return;
    }

    container.innerHTML = allItems.map((item) => {
      const isExp = item.type === 'expense';
      const categories = isExp ? expCategories : incCategories;
      const currentCatId = item.categoryId || StorageManager.guessCategoryByName(item.name, item.type);
      const displayName = StorageManager.getItemDisplayName(item);
      
      const catOptionsHtml = categories.map(c => `
        <option value="${c.id}" ${c.id === currentCatId ? 'selected' : ''}>${c.emoji} ${StorageManager.getCategoryDisplayName(c)}</option>
      `).join('');

      return `
        <div class="flex items-center gap-2.5 p-2.5 bg-slate-50/90 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 transition-all batch-item-row" data-id="${item.id}" data-type="${item.type}">
          <input 
            type="checkbox" 
            class="batch-item-checkbox rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            checked
            onchange="App.updateBatchTotal()"
          />
          <span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isExp ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
            ${isExp ? (lang === 'en' ? 'EXP' : 'จ่าย') : (lang === 'en' ? 'INC' : 'รับ')}
          </span>
          <div class="flex-1 min-w-0">
            <input 
              type="text" 
              class="batch-item-name w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none"
              value="${displayName}"
              placeholder="Name"
            />
          </div>
          <div class="w-32">
            <select class="batch-item-category w-full bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] text-slate-700 font-medium focus:outline-none">
              ${catOptionsHtml}
            </select>
          </div>
          <div class="relative w-24">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">฿</span>
            <input 
              type="number" 
              class="batch-item-amount w-full bg-white border border-slate-200 rounded-xl pl-6 pr-1.5 py-1 text-xs text-right font-bold text-slate-900 num-font focus:outline-none"
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
    const lang = I18n.getLanguage();

    if (summaryEl) summaryEl.textContent = lang === 'en' ? `(Selected ${selectedCount}/${rows.length})` : `(เลือก ${selectedCount}/${rows.length} รายการ)`;
    if (totalEl) totalEl.textContent = lang === 'en' ? `Selected Total: ฿${total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : `ยอดรวมที่เลือก: ฿${total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
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
      const type = row.getAttribute('data-type') || 'expense';

      if (cb && cb.checked) {
        const name = (nameInput?.value || '').trim();
        const categoryId = catSelect?.value || (type === 'income' ? 'inc_salary' : 'exp_bills');
        const amount = Math.max(0, parseFloat(amountInput?.value) || 0);

        if (amount > 0) {
          txsToSave.push({
            type: type,
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
      alert(I18n.getLanguage() === 'en' ? 'Please select at least 1 item with amount > 0' : 'กรุณาเลือกอย่างน้อย 1 รายการ และมียอดเงินมากกว่า 0 บาท');
      return;
    }

    const count = StorageManager.addTransactionsBatch(txsToSave);
    this.closeQuickFixedModal();
    this.renderAll();
    this.showToast(I18n.getLanguage() === 'en' ? `Imported ${count} items successfully!` : `นำเข้ารายการประจำเดือนสำเร็จ ${count} รายการ 🎉`);
  },

  // --- Transactions Tab Logic ---
  handleSaveTransaction() {
    const amountInput = document.getElementById('tx-amount');
    const dateInput = document.getElementById('tx-date');
    const timeInput = document.getElementById('tx-time');
    const paymentInput = document.getElementById('tx-payment-method');
    const noteInput = document.getElementById('tx-note');

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      alert(I18n.getLanguage() === 'en' ? 'Please enter a valid amount' : 'กรุณาระบุจำนวนเงินที่ถูกต้อง');
      amountInput.focus();
      return;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dVal = dateInput?.value || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const tVal = timeInput?.value || `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const fullDateTime = `${dVal}T${tVal}`;

    const tx = {
      type: this.currentEntryType,
      amount: amount,
      categoryId: this.selectedCategoryId,
      date: fullDateTime,
      paymentMethod: paymentInput ? paymentInput.value : 'เงินสด (Cash)',
      note: noteInput ? noteInput.value : ''
    };

    StorageManager.addTransaction(tx);

    amountInput.value = '';
    if (noteInput) noteInput.value = '';
    this.initDateTimeInput();

    this.renderAll();
    this.showToast(this.currentEntryType === 'expense' ? I18n.t('toast_exp_saved') : I18n.t('toast_inc_saved'));
  },

  renderMonthSelector() {
    const monthEl = document.getElementById('dashboard-current-month');
    if (!monthEl) return;

    const lang = I18n.getLanguage();
    const monthIndex = this.selectedDate.getMonth();
    const year = this.selectedDate.getFullYear();

    if (this.dashboardViewMode === 'custom') {
      if (this.customStartDate && this.customEndDate) {
        const s = new Date(this.customStartDate + 'T00:00:00');
        const e = new Date(this.customEndDate + 'T00:00:00');
        if (lang === 'en') {
          const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthEl.textContent = `${s.getDate()} ${enMonths[s.getMonth()]} - ${e.getDate()} ${enMonths[e.getMonth()]} ${e.getFullYear()}`;
        } else {
          const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
          monthEl.textContent = `${s.getDate()} ${thMonths[s.getMonth()]} - ${e.getDate()} ${thMonths[e.getMonth()]} ${e.getFullYear() + 543}`;
        }
      } else {
        monthEl.textContent = lang === 'en' ? 'Custom Pay Cycle' : 'รอบเงินเดือน / กำหนดเอง';
      }
      return;
    }

    if (this.dashboardViewMode === 'yearly') {
      if (lang === 'en') {
        monthEl.textContent = `Year ${year}`;
      } else {
        const thaiYear = year + 543;
        monthEl.textContent = `ปี ${thaiYear} (${year})`;
      }
      return;
    }

    if (lang === 'en') {
      const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      monthEl.textContent = `${enMonths[monthIndex]} ${year}`;
    } else {
      const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      const thaiYear = year + 543;
      monthEl.textContent = `${thaiMonths[monthIndex]} ${thaiYear} (${year})`;
    }
  },

  setDashboardViewMode(mode) {
    this.dashboardViewMode = mode;
    const viewCustom = document.getElementById('view-mode-custom');
    const viewDaily = document.getElementById('view-mode-daily');
    const viewYearly = document.getElementById('view-mode-yearly');

    const customRangeBar = document.getElementById('dashboard-custom-range-bar');
    const monthlyKpis = document.getElementById('dashboard-monthly-kpi-container');
    const paneOverview = document.getElementById('dashboard-overview-pane');
    const paneDaily = document.getElementById('dashboard-daily-pane');
    const paneYearly = document.getElementById('dashboard-yearly-pane');

    const activeClass = 'px-3 py-1.5 rounded-xl font-bold bg-white text-slate-900 shadow-2xs transition-all cursor-pointer';
    const inactiveClass = 'px-3 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-900 transition-all cursor-pointer';

    if (viewCustom) viewCustom.className = (mode === 'custom') ? activeClass : inactiveClass;
    if (viewDaily) viewDaily.className = (mode === 'daily') ? activeClass : inactiveClass;
    if (viewYearly) viewYearly.className = (mode === 'yearly') ? activeClass : inactiveClass;

    if (mode === 'custom') {
      if (customRangeBar) customRangeBar.classList.remove('hidden');
      if (monthlyKpis) monthlyKpis.classList.remove('hidden');
      if (paneOverview) paneOverview.classList.remove('hidden');
      if (paneDaily) paneDaily.classList.add('hidden');
      if (paneYearly) paneYearly.classList.add('hidden');
    } else if (mode === 'daily') {
      if (customRangeBar) customRangeBar.classList.add('hidden');
      if (monthlyKpis) monthlyKpis.classList.remove('hidden');
      if (paneOverview) paneOverview.classList.add('hidden');
      if (paneDaily) paneDaily.classList.remove('hidden');
      if (paneYearly) paneYearly.classList.add('hidden');
    } else if (mode === 'yearly') {
      if (customRangeBar) customRangeBar.classList.add('hidden');
      if (monthlyKpis) monthlyKpis.classList.add('hidden');
      if (paneOverview) paneOverview.classList.add('hidden');
      if (paneDaily) paneDaily.classList.add('hidden');
      if (paneYearly) paneYearly.classList.remove('hidden');
    }

    this.renderMonthSelector();
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

  getCustomRangeTransactions() {
    const allTxs = StorageManager.getTransactions();
    const start = this.customStartDate;
    const end = this.customEndDate;
    if (!start || !end) return allTxs;

    return allTxs.filter(t => {
      const dStr = (t.date || '').slice(0, 10);
      return dStr >= start && dStr <= end;
    });
  },

  getYearlyTransactions() {
    const allTxs = StorageManager.getTransactions();
    const year = this.selectedDate.getFullYear();
    return allTxs.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year;
    });
  },

  renderDashboard() {
    if (this.dashboardViewMode === 'yearly') {
      this.renderYearlyDashboard();
      return;
    }

    const isCustom = (this.dashboardViewMode === 'custom');
    const txs = isCustom ? this.getCustomRangeTransactions() : this.getMonthlyTransactions();
    
    let totalIncome = 0;
    let totalExpense = 0;

    txs.forEach(t => {
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

    const incSubEl = document.querySelector('[data-i18n="kpi_total_income_sub"]');
    const expSubEl = document.querySelector('[data-i18n="kpi_total_expense_sub"]');

    if (incEl) incEl.textContent = '฿' + totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (expEl) expEl.textContent = '฿' + totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (netEl) {
      netEl.textContent = (netBalance >= 0 ? '+' : '') + '฿' + netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      netEl.className = `text-2xl sm:text-3xl font-extrabold num-font ${netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`;
    }
    
    if (isCustom) {
      if (incSubEl) incSubEl.textContent = I18n.t('kpi_custom_income_sub');
      if (expSubEl) expSubEl.textContent = I18n.t('kpi_custom_expense_sub');
    } else {
      if (incSubEl) incSubEl.textContent = I18n.t('kpi_total_income_sub');
      if (expSubEl) expSubEl.textContent = I18n.t('kpi_total_expense_sub');
    }

    if (netStatusEl) {
      if (netBalance > 0) {
        netStatusEl.textContent = I18n.t('status_surplus');
        netStatusEl.className = 'text-[11px] text-emerald-600 font-semibold mt-0.5';
      } else if (netBalance === 0) {
        netStatusEl.textContent = I18n.t('status_balanced');
        netStatusEl.className = 'text-[11px] text-slate-400 font-medium mt-0.5';
      } else {
        netStatusEl.textContent = I18n.t('status_deficit');
        netStatusEl.className = 'text-[11px] text-rose-600 font-semibold mt-0.5';
      }
    }

    if (this.dashboardViewMode === 'overview' || this.dashboardViewMode === 'custom') {
      this.renderCharts(txs, isCustom);
      this.renderTopCategories(txs, totalExpense);
    } else {
      this.renderDailyBreakdown(txs);
    }
  },

  renderYearlyDashboard() {
    const yearlyTxs = this.getYearlyTransactions();
    const lang = I18n.getLanguage();

    let totalIncome = 0;
    let totalExpense = 0;

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      income: 0,
      expense: 0,
      net: 0,
      count: 0
    }));

    yearlyTxs.forEach(t => {
      const d = new Date(t.date);
      const mIdx = d.getMonth();
      if (t.type === 'income') {
        totalIncome += t.amount;
        monthlyStats[mIdx].income += t.amount;
      } else {
        totalExpense += t.amount;
        monthlyStats[mIdx].expense += t.amount;
      }
      monthlyStats[mIdx].count++;
    });

    monthlyStats.forEach(m => {
      m.net = m.income - m.expense;
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;
    const avgMonthlySpend = totalExpense / 12;

    const incEl = document.getElementById('dash-yearly-income');
    const expEl = document.getElementById('dash-yearly-expense');
    const savEl = document.getElementById('dash-yearly-savings');
    const rateEl = document.getElementById('dash-yearly-rate');
    const avgSpendEl = document.getElementById('dash-yearly-avg-spend');

    if (incEl) incEl.textContent = '฿' + totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    if (expEl) expEl.textContent = '฿' + totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    if (savEl) {
      savEl.textContent = (netSavings >= 0 ? '+' : '') + '฿' + netSavings.toLocaleString('th-TH', { minimumFractionDigits: 2 });
      savEl.className = `text-2xl sm:text-3xl font-extrabold num-font ${netSavings >= 0 ? 'text-slate-900' : 'text-rose-600'}`;
    }
    if (rateEl) {
      rateEl.textContent = savingsRate.toFixed(1) + '%';
      rateEl.className = `text-2xl sm:text-3xl font-extrabold num-font ${savingsRate >= 20 ? 'text-emerald-700' : (savingsRate >= 0 ? 'text-amber-700' : 'text-rose-600')}`;
    }
    if (avgSpendEl) {
      avgSpendEl.textContent = (lang === 'en' ? 'Avg Spend: ฿' : 'เฉลี่ยรายจ่ายเดือนละ ฿') + avgMonthlySpend.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    }

    this.renderYearlyBarChart(monthlyStats);
    this.renderYearlyCategoryChart(yearlyTxs, totalExpense);
    this.renderYearlyTable(monthlyStats);
  },

  renderYearlyBarChart(monthlyStats) {
    const ctx = document.getElementById('chart-yearly-monthly-bar');
    if (!ctx) return;

    if (this.yearlyMonthlyBarChart) this.yearlyMonthlyBarChart.destroy();

    const lang = I18n.getLanguage();
    const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = (lang === 'en') ? enMonths : thMonths;

    const incomeData = monthlyStats.map(m => m.income);
    const expenseData = monthlyStats.map(m => m.expense);

    this.yearlyMonthlyBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: lang === 'en' ? 'Income' : 'รายรับ (Income)',
            data: incomeData,
            backgroundColor: '#34d399',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          },
          {
            label: lang === 'en' ? 'Expense' : 'รายจ่าย (Expense)',
            data: expenseData,
            backgroundColor: '#f87171',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { family: "'Prompt', sans-serif", size: 11, weight: 'bold' }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.parsed.y || 0;
                return ` ${context.dataset.label}: ฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Prompt', sans-serif", size: 11, weight: 'bold' } }
          },
          y: {
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 10 },
              callback: function(value) {
                return '฿' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  },

  renderYearlyCategoryChart(yearlyTxs, totalExpense) {
    const expenseTxs = yearlyTxs.filter(t => t.type === 'expense');
    const catMap = {};
    expenseTxs.forEach(t => {
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
    });

    const catLabels = [];
    const catData = [];
    const catColors = [];
    const PASTEL_PALETTE = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#94a3b8'];

    Object.keys(catMap).forEach((catId, idx) => {
      const cat = StorageManager.getCategoryById(catId);
      const catName = StorageManager.getCategoryDisplayName(cat);
      catLabels.push(`${cat.emoji} ${catName}`);
      catData.push(catMap[catId]);
      catColors.push(cat.color || PASTEL_PALETTE[idx % PASTEL_PALETTE.length]);
    });

    const ctx = document.getElementById('chart-yearly-category-doughnut');
    const emptyState = document.getElementById('chart-yearly-doughnut-empty');

    if (ctx) {
      if (this.yearlyCategoryChart) this.yearlyCategoryChart.destroy();

      if (catData.length === 0) {
        ctx.parentElement.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
      } else {
        ctx.parentElement.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        this.yearlyCategoryChart = new Chart(ctx, {
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

    // Top 5 categories list
    const topListEl = document.getElementById('dash-yearly-top-categories-list');
    if (topListEl) {
      const sorted = Object.entries(catMap)
        .map(([id, amount]) => ({ id, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      if (sorted.length === 0) {
        topListEl.innerHTML = `<p class="text-xs text-slate-400 py-3">${I18n.t('top_categories_empty')}</p>`;
      } else {
        topListEl.innerHTML = sorted.map((item, idx) => {
          const cat = StorageManager.getCategoryById(item.id);
          const catName = StorageManager.getCategoryDisplayName(cat);
          const pct = totalExpense > 0 ? ((item.amount / totalExpense) * 100).toFixed(1) : 0;

          return `
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <div class="flex items-center gap-2">
                  <span class="w-4 text-center text-slate-400 font-bold">${idx + 1}.</span>
                  <span>${cat.emoji}</span>
                  <span class="text-slate-800">${catName}</span>
                </div>
                <div class="text-right num-font">
                  <span class="text-slate-900">฿${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  <span class="text-[10px] text-slate-400 ml-1 font-normal">(${pct}%)</span>
                </div>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="h-1.5 rounded-full transition-all duration-300" style="width: ${pct}%; background-color: ${cat.color || '#f87171'};"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  renderYearlyTable(monthlyStats) {
    const tbody = document.getElementById('yearly-12-months-table-body');
    if (!tbody) return;

    const lang = I18n.getLanguage();
    const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNames = (lang === 'en') ? enMonths : thMonths;

    tbody.innerHTML = monthlyStats.map(m => {
      const isPositive = m.net >= 0;
      const rate = m.income > 0 ? ((m.net / m.income) * 100) : 0;
      const hasActivity = m.count > 0;

      return `
        <tr class="hover:bg-slate-50/70 transition-colors">
          <td class="py-2.5 px-3 font-bold text-slate-800">
            ${monthNames[m.monthIndex]}
            ${hasActivity ? `<span class="text-[9px] text-slate-400 font-normal ml-1">(${m.count})</span>` : ''}
          </td>
          <td class="py-2.5 px-3 text-right num-font font-semibold text-emerald-600">
            ${m.income > 0 ? '฿' + m.income.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
          </td>
          <td class="py-2.5 px-3 text-right num-font font-semibold text-rose-600">
            ${m.expense > 0 ? '฿' + m.expense.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
          </td>
          <td class="py-2.5 px-3 text-right num-font font-bold ${isPositive ? 'text-slate-900' : 'text-rose-600'}">
            ${hasActivity ? (isPositive ? '+' : '') + '฿' + m.net.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
          </td>
          <td class="py-2.5 px-3 text-center">
            ${m.income > 0 
              ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold num-font ${rate >= 20 ? 'bg-emerald-100 text-emerald-700' : (rate >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}">${rate.toFixed(1)}%</span>`
              : `<span class="text-slate-300">-</span>`
            }
          </td>
        </tr>
      `;
    }).join('');
  },

  renderCharts(monthlyTxs, isCustom = false) {
    const expenseTxs = monthlyTxs.filter(t => t.type === 'expense');
    
    const catMap = {};
    expenseTxs.forEach(t => {
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
    });

    const catLabels = [];
    const catData = [];
    const catColors = [];

    const PASTEL_PALETTE = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#94a3b8'];

    Object.keys(catMap).forEach((catId, idx) => {
      const cat = StorageManager.getCategoryById(catId);
      const catName = StorageManager.getCategoryDisplayName(cat);
      catLabels.push(`${cat.emoji} ${catName}`);
      catData.push(catMap[catId]);
      catColors.push(cat.color || PASTEL_PALETTE[idx % PASTEL_PALETTE.length]);
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

    let dayLabels = [];
    let dailySpending = [];
    let dailyIncome = [];

    if (isCustom && this.customStartDate && this.customEndDate) {
      const s = new Date(this.customStartDate + 'T00:00:00');
      const e = new Date(this.customEndDate + 'T00:00:00');
      const dateList = [];

      let cur = new Date(s);
      while (cur <= e && dateList.length <= 90) {
        const pad = (n) => String(n).padStart(2, '0');
        const dStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
        dateList.push({
          dStr: dStr,
          label: `${cur.getDate()}/${cur.getMonth() + 1}`
        });
        cur.setDate(cur.getDate() + 1);
      }

      dayLabels = dateList.map(d => d.label);
      dailySpending = new Array(dateList.length).fill(0);
      dailyIncome = new Array(dateList.length).fill(0);

      const dMap = {};
      dateList.forEach((d, idx) => {
        dMap[d.dStr] = idx;
      });

      monthlyTxs.forEach(t => {
        const dStr = (t.date || '').slice(0, 10);
        if (dMap[dStr] !== undefined) {
          const idx = dMap[dStr];
          if (t.type === 'expense') dailySpending[idx] += t.amount;
          else dailyIncome[idx] += t.amount;
        }
      });
    } else {
      const year = this.selectedDate.getFullYear();
      const month = this.selectedDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      dailySpending = new Array(daysInMonth).fill(0);
      dailyIncome = new Array(daysInMonth).fill(0);

      monthlyTxs.forEach(t => {
        const d = new Date(t.date);
        const dayIndex = d.getDate() - 1;
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          if (t.type === 'expense') dailySpending[dayIndex] += t.amount;
          else dailyIncome[dayIndex] += t.amount;
        }
      });

      dayLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    }

    const ctxTrend = document.getElementById('chart-daily-trend');
    if (ctxTrend) {
      if (this.dailyTrendChart) this.dailyTrendChart.destroy();

      this.dailyTrendChart = new Chart(ctxTrend, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [
            {
              label: I18n.getLanguage() === 'en' ? 'Expense' : 'รายจ่าย (Expense)',
              data: dailySpending,
              backgroundColor: '#f87171',
              borderRadius: 4
            },
            {
              label: I18n.getLanguage() === 'en' ? 'Income' : 'รายรับ (Income)',
              data: dailyIncome,
              backgroundColor: '#34d399',
              borderRadius: 4
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
      container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">${I18n.t('top_categories_empty')}</div>`;
      return;
    }

    container.innerHTML = sortedCats.map(([catId, amount]) => {
      const cat = StorageManager.getCategoryById(catId);
      const catName = StorageManager.getCategoryDisplayName(cat);
      const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5 font-medium text-slate-700">
              <span>${cat.emoji}</span>
              <span>${catName}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-slate-900 num-font">฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              <span class="text-[10px] text-slate-400 ml-1">(${pct}%)</span>
            </div>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div class="h-1.5 rounded-full transition-all duration-300" style="width: ${pct}%; background-color: ${cat.color || '#f87171'};"></div>
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
        <div class="text-center py-10 text-slate-400 bg-white rounded-3xl border border-slate-100">
          <p class="text-xs font-medium text-slate-600">${I18n.t('daily_breakdown_empty')}</p>
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
    const lang = I18n.getLanguage();

    container.innerHTML = sortedDates.map(dateStr => {
      const txs = groups[dateStr];
      const d = new Date(dateStr + 'T00:00:00');
      
      let dayName = '';
      let dayDate = '';

      if (lang === 'en') {
        const enDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dayName = enDayNames[d.getDay()];
        dayDate = `${d.getDate()} ${enMonths[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        const thaiDayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        dayName = thaiDayNames[d.getDay()];
        dayDate = `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
      }

      const dayIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const dayExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      const itemsHtml = txs.map(t => {
        const cat = StorageManager.getCategoryById(t.categoryId);
        const catName = StorageManager.getCategoryDisplayName(cat);
        const timeStr = t.date.length >= 16 ? t.date.slice(11, 16) : '';
        const isExp = t.type === 'expense';

        return `
          <div class="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-2xl transition-colors group">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base bg-slate-50 border border-slate-100">
                ${cat.emoji}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-xs text-slate-800">${catName}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500">${t.paymentMethod}</span>
                  ${timeStr ? `<span class="text-[10px] text-slate-400">${timeStr}</span>` : ''}
                </div>
                ${t.note ? `<p class="text-[11px] text-slate-500 mt-0.5">${t.note}</p>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
                ${isExp ? '-' : '+'}฿${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <div class="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                <button onclick="App.openEditModal('${t.id}')" class="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer" title="${I18n.t('btn_edit')}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onclick="App.openDeleteModal('${t.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer" title="${I18n.t('btn_delete')}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="pastel-card rounded-3xl overflow-hidden">
          <div class="bg-slate-50/70 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">${dayName}</span>
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
        const matchCat = (cat.name || '').toLowerCase().includes(searchVal) || (cat.nameEn || '').toLowerCase().includes(searchVal);
        const matchPayment = (t.paymentMethod || '').toLowerCase().includes(searchVal);
        if (!matchNote && !matchCat && !matchPayment) return false;
      }
      return true;
    });

    const countEl = document.getElementById('tx-history-count');
    if (countEl) countEl.textContent = `(${filtered.length})`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <p class="text-xs font-medium text-slate-600">${I18n.t('history_empty_title')}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">${I18n.t('history_empty_desc')}</p>
        </div>
      `;
      return;
    }

    const lang = I18n.getLanguage();

    container.innerHTML = filtered.map(t => {
      const cat = StorageManager.getCategoryById(t.categoryId);
      const catName = StorageManager.getCategoryDisplayName(cat);
      const isExp = t.type === 'expense';
      const d = new Date(t.date);
      const dateFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      const typeBadge = isExp ? (lang === 'en' ? 'Expense' : 'รายจ่าย') : (lang === 'en' ? 'Income' : 'รายรับ');

      return `
        <div class="bg-white p-3 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all flex items-center justify-between group shadow-2xs">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-2xl flex items-center justify-center text-lg bg-slate-50 border border-slate-100 flex-shrink-0">
              ${cat.emoji}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-800 text-xs">${catName}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-semibold">
                  ${typeBadge}
                </span>
                <span class="text-[10px] text-slate-400">${dateFormatted}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">${t.paymentMethod}</span>
                ${t.note ? `<span class="text-[11px] text-slate-600 font-medium">"${t.note}"</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-base font-extrabold num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
              ${isExp ? '-' : '+'}฿${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
            <div class="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <button onclick="App.openEditModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" title="${I18n.t('btn_edit')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onclick="App.openDeleteModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer" title="${I18n.t('btn_delete')}">
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
    const timeInput = document.getElementById('edit-tx-time');
    const paymentInput = document.getElementById('edit-tx-payment-method');
    const noteInput = document.getElementById('edit-tx-note');
    const typeSelect = document.getElementById('edit-tx-type');

    if (amountInput) amountInput.value = tx.amount;
    if (tx.date) {
      const parts = tx.date.split('T');
      if (dateInput) dateInput.value = parts[0] || '';
      if (timeInput) timeInput.value = parts[1] ? parts[1].substring(0, 5) : '12:00';
    }
    if (paymentInput) paymentInput.value = tx.paymentMethod;
    if (noteInput) noteInput.value = tx.note || '';
    if (typeSelect) {
      typeSelect.value = tx.type;
      typeSelect.onchange = () => {
        this.initCategoryGrid('edit-category-grid', typeSelect.value, tx.categoryId);
      };
    }

    this.initCategoryGrid('edit-category-grid', tx.type, tx.categoryId);

    if (modal) modal.classList.add('show');
  },

  closeEditModal() {
    this.editingTransactionId = null;
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.remove('show');
  },

  handleUpdateTransaction() {
    if (!this.editingTransactionId) return;

    const amount = parseFloat(document.getElementById('edit-tx-amount').value);
    const dateVal = document.getElementById('edit-tx-date')?.value || '';
    const timeVal = document.getElementById('edit-tx-time')?.value || '12:00';
    const date = `${dateVal}T${timeVal}`;
    const type = document.getElementById('edit-tx-type').value;
    const paymentMethod = document.getElementById('edit-tx-payment-method').value;
    const note = document.getElementById('edit-tx-note').value;

    if (isNaN(amount) || amount <= 0) {
      alert(I18n.getLanguage() === 'en' ? 'Please enter a valid amount' : 'กรุณาระบุจำนวนเงินที่ถูกต้อง');
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
    this.showToast(I18n.t('toast_updated'));
  },

  openDeleteModal(id) {
    const tx = StorageManager.getTransactionById(id);
    if (!tx) return;

    this.deletingTransactionId = id;
    const modal = document.getElementById('delete-modal');
    const preview = document.getElementById('delete-modal-preview');

    if (preview) {
      const cat = StorageManager.getCategoryById(tx.categoryId);
      const catName = StorageManager.getCategoryDisplayName(cat);
      const isExp = tx.type === 'expense';
      const lang = I18n.getLanguage();
      const typeBadge = isExp ? (lang === 'en' ? 'Expense' : 'รายจ่าย') : (lang === 'en' ? 'Income' : 'รายรับ');

      preview.innerHTML = `
        <div class="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-left">
          <span class="text-2xl">${cat.emoji}</span>
          <div class="flex-1">
            <p class="font-bold text-slate-800 text-xs">${catName} <span class="text-[10px] font-semibold ${isExp ? 'text-rose-600' : 'text-emerald-600'}">(${typeBadge})</span></p>
            <p class="text-[10px] text-slate-400">${tx.date.replace('T', ' ')} · ${tx.paymentMethod}</p>
            ${tx.note ? `<p class="text-[11px] text-slate-600">"${tx.note}"</p>` : ''}
          </div>
          <div class="font-bold text-sm num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
            ${isExp ? '-' : '+'}฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>
      `;
    }

    if (modal) modal.classList.add('show');
  },

  closeDeleteModal() {
    this.deletingTransactionId = null;
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.remove('show');
  },

  confirmDeleteTransaction() {
    if (!this.deletingTransactionId) return;

    StorageManager.deleteTransaction(this.deletingTransactionId);
    this.closeDeleteModal();
    this.renderAll();
    this.showToast(I18n.t('toast_deleted'));
  },

  // --- Export Filter Modal ---
  openExportModal() {
    const modal = document.getElementById('export-modal');
    if (!modal) return;

    this.populateExportCategoryDropdown('all');
    this.updateExportPreview();
    modal.classList.add('show');
  },

  closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.remove('show');
  },

  handleExportDateRangeChange(val) {
    const customContainer = document.getElementById('export-custom-date-container');
    if (customContainer) {
      if (val === 'custom') {
        customContainer.classList.remove('hidden');
      } else {
        customContainer.classList.add('hidden');
      }
    }
    this.updateExportPreview();
  },

  handleExportTypeChange(type) {
    this.populateExportCategoryDropdown(type);
    this.updateExportPreview();
  },

  populateExportCategoryDropdown(type) {
    const catSelect = document.getElementById('export-category');
    if (!catSelect) return;

    let categories = StorageManager.getCategories();
    if (type !== 'all') {
      categories = categories.filter(c => c.type === type);
    }

    const allText = I18n.t('export_all_cats');
    const optionsHtml = `<option value="all">${allText}</option>` + categories.map(c => {
      const catName = StorageManager.getCategoryDisplayName(c);
      return `<option value="${c.id}">${c.emoji} ${catName}</option>`;
    }).join('');

    catSelect.innerHTML = optionsHtml;
  },

  getExportFilters() {
    const dateRange = document.getElementById('export-date-range')?.value || 'this_month';
    const startDate = document.getElementById('export-start-date')?.value || '';
    const endDate = document.getElementById('export-end-date')?.value || '';
    const type = document.getElementById('export-type')?.value || 'all';
    const categoryId = document.getElementById('export-category')?.value || 'all';
    const paymentMethod = document.getElementById('export-payment')?.value || 'all';

    return { dateRange, startDate, endDate, type, categoryId, paymentMethod };
  },

  updateExportPreview() {
    const filters = this.getExportFilters();
    const filtered = StorageManager.getFilteredTransactions(filters);
    const lang = I18n.getLanguage();

    let totalIncome = 0;
    let totalExpense = 0;

    filtered.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const countEl = document.getElementById('export-preview-count');
    const amountsEl = document.getElementById('export-preview-amounts');

    if (countEl) {
      countEl.textContent = lang === 'en' ? `Found ${filtered.length} items` : `พบ ${filtered.length} รายการ`;
    }
    if (amountsEl) {
      const incLabel = lang === 'en' ? 'Income' : 'รายรับ';
      const expLabel = lang === 'en' ? 'Expense' : 'รายจ่าย';
      amountsEl.innerHTML = `<span class="text-emerald-600 font-bold">${incLabel} ฿${totalIncome.toLocaleString()}</span> / <span class="text-rose-600 font-bold">${expLabel} ฿${totalExpense.toLocaleString()}</span>`;
    }
  },

  confirmExportCSV() {
    const filters = this.getExportFilters();
    const success = StorageManager.exportFilteredCSV(filters);
    if (success) {
      this.closeExportModal();
      this.showToast(I18n.t('toast_exported'));
    }
  },

  renderAll() {
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.renderTransactionList();
    this.renderDashboard();
    this.renderRecurringTab();
    this.renderQuickFixedChips();
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
