/**
 * Main Application Controller for Money Memo v2.5 (Minimal Pastel & Mobile Optimized)
 */

const App = {
  currentTab: 'transactions', // 'transactions', 'history', 'dashboard', 'simulator', 'settings'
  dashboardViewMode: 'custom', // 'custom' (Monthly / Pay cycle), 'daily' (Daily breakdown), 'yearly' (Annual overview)
  selectedDate: new Date(), // สำหรับ Dashboard
  currentEntryType: 'expense', // 'expense' or 'income' for transaction form
  selectedCategoryId: null,
  currentPayCyclePreset: 28,

  // Tab 2 (History / Statement Feed) state
  historyDate: new Date(),
  historyCycleMode: 'cycle', // 'cycle' (uses configured pay cycle) or 'calendar' (standard 1st-end)
  historyTypeFilter: 'all', // 'all', 'expense', 'income'
  historyCategoryFilter: 'all', // 'all' or categoryId
  historySearchQuery: '',
  historyDesktopView: 'cards', // 'cards' (daily cards) or 'table' (compact desktop table)
  
  // Recurring & Category state
  inlineRecurringType: 'expense', // 'expense' or 'income'
  recurringCardFilter: 'all', // 'all', 'expense', 'income'
  editingRecurringId: null,
  categoryManagerType: 'expense', // 'expense' or 'income'
  editingCategoryId: null,
  deletingCategoryId: null,

  // Tab 5 (Settings Hub) state
  settingsRecFilter: 'all', // 'all', 'expense', 'income'
  settingsCatType: 'expense', // 'expense' or 'income'
  isSettingsRecOpen: false,
  isSettingsCatOpen: false,

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

  // Tab 1 Overview Hero Date Filter state
  overviewPreset: 'month', // 'month', 'cycle28', 'cycle25', 'last30', 'custom'
  overviewDate: new Date(),
  overviewStartDate: '',
  overviewEndDate: '',

  _renderRaf: null,

  requestRender() {
    if (this._renderRaf) cancelAnimationFrame(this._renderRaf);
    this._renderRaf = requestAnimationFrame(() => {
      this.renderAll();
    });
  },

  init() {
    I18n.init();
    if (typeof FirebaseManager !== 'undefined') {
      FirebaseManager.init();
    } else if (typeof SupabaseManager !== 'undefined') {
      SupabaseManager.init();
    }
    this.initTimeDropdowns();
    this.initDateTimeInput();
    this.initCustomDateInputs();
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.bindEvents();
    this.initKeyboardShortcuts();
    this.initDragAndDropRestore();
    this.initHistoryDesktopView();

    try {
      const savedMode = localStorage.getItem('money_memo_dash_view_mode');
      if (savedMode) {
        this.dashboardViewMode = savedMode;
      }
    } catch(e) {}

    this.setDashboardViewMode(this.dashboardViewMode || 'custom');
    this.renderActiveTab();
    BudgetSimulator.init();

    // Register Service Worker for instant PWA caching & offline support
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
          // Always check for latest updates from GitHub in the background
          reg.update();
        }).catch(err => {
          console.warn('PWA Service Worker registration skipped:', err);
        });
      });
    }
  },

  // ==========================================
  // DESKTOP & POWER-USER SHORTCUTS / MODALS
  // ==========================================
  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // 1. Esc: Close all modals unconditionally
      if (e.key === 'Escape') {
        this.closeAllModals();
        return;
      }

      // 2. Ctrl+Enter or Cmd+Enter: Submit active modal form or main quick form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeModal = document.querySelector('.modal.show, .modal.active, #quick-entry-modal.show, #quick-entry-modal.active, #keyboard-shortcuts-modal:not(.hidden)');
        if (activeModal) {
          const form = activeModal.querySelector('form');
          if (form) {
            e.preventDefault();
            if (typeof form.requestSubmit === 'function') {
              form.requestSubmit();
            } else {
              form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
            return;
          }
        } else if (this.currentTab === 'transactions') {
          const mainForm = document.getElementById('transaction-form');
          if (mainForm) {
            e.preventDefault();
            if (typeof mainForm.requestSubmit === 'function') {
              mainForm.requestSubmit();
            } else {
              mainForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
            return;
          }
        }
      }

      // 3. Ignore single-key shortcuts if user is currently typing in an input element
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      );

      if (isInputActive) return;

      // 4. Ctrl+N or N: Open Quick Entry Modal
      if ((e.ctrlKey && (e.key === 'n' || e.key === 'N')) || (!e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 'n' || e.key === 'N'))) {
        e.preventDefault();
        this.openQuickEntryModal();
        return;
      }

      // 5. Number keys 1-5: Switch Tabs
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === '1') { e.preventDefault(); this.switchTab('transactions'); return; }
        if (e.key === '2') { e.preventDefault(); this.switchTab('history'); return; }
        if (e.key === '3') { e.preventDefault(); this.switchTab('dashboard'); return; }
        if (e.key === '4') { e.preventDefault(); this.switchTab('simulator'); return; }
        if (e.key === '5') { e.preventDefault(); this.switchTab('settings'); return; }

        // 6. '/' Slash: Focus Search in Statement / History
        if (e.key === '/') {
          e.preventDefault();
          if (this.currentTab !== 'history') {
            this.switchTab('history');
          }
          setTimeout(() => {
            const searchInput = document.getElementById('history-search-input') || document.getElementById('tx-search-input');
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }, 50);
          return;
        }

        // 7. '?' Question mark: Toggle Keyboard Shortcuts Modal
        if (e.key === '?') {
          e.preventDefault();
          this.toggleKeyboardShortcutsModal();
          return;
        }
      }
    });
  },

  openKeyboardShortcutsModal() {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    }
  },

  closeKeyboardShortcutsModal() {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  },

  toggleKeyboardShortcutsModal() {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) {
      if (modal.classList.contains('hidden')) {
        this.openKeyboardShortcutsModal();
      } else {
        this.closeKeyboardShortcutsModal();
      }
    }
  },

  closeAllModals() {
    this.closeKeyboardShortcutsModal();
    this.closeQuickEntryModal();
    this.closeTransactionDetailModal();
    this.closeEditModal();
    this.closeDeleteModal();
    this.closeAddCategoryModal();
    this.closeDeleteCategoryModal();
    this.closeRecurringModal();
    this.closeQuickFixedModal();
    this.closeExportModal();
    if (typeof this.closeSavingsGoalModal === 'function') this.closeSavingsGoalModal();
    if (typeof this.closeSurplusSettlementModal === 'function') this.closeSurplusSettlementModal();
    if (typeof this.closeSavingsHistoryModal === 'function') this.closeSavingsHistoryModal();
    if (typeof this.closeSavingsDepositModal === 'function') this.closeSavingsDepositModal();
    if (typeof this.closeSavingsWithdrawModal === 'function') this.closeSavingsWithdrawModal();
    
    // Generic modal class removal
    document.querySelectorAll('.modal.show, .modal.active').forEach(m => m.classList.remove('show', 'active'));
    document.body.style.overflow = '';
  },

  initDragAndDropRestore() {
    const overlay = document.getElementById('drag-drop-overlay');
    if (!overlay) return;

    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100');
      }
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0', 'pointer-events-none');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0', 'pointer-events-none');

      const files = e.dataTransfer ? e.dataTransfer.files : null;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.json')) {
        alert(I18n.getLanguage() === 'en' ? 'Please drop a valid .json backup file.' : 'กรุณาวางไฟล์สำรองข้อมูลนามสกุล .json เท่านั้น');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = StorageManager.importFromJSON(event.target.result);
        if (res.success) {
          this.renderAll(true);
          if (typeof BudgetSimulator !== 'undefined') BudgetSimulator.init();
          this.showToast(I18n.t('toast_restored'));
        } else {
          alert((I18n.getLanguage() === 'en' ? 'Error importing file: ' : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ') + res.message);
        }
      };
      reader.readAsText(file);
    });
  },

  initTimeDropdowns() {
    const pad = (n) => String(n).padStart(2, '0');
    const hours = Array.from({ length: 24 }, (_, i) => pad(i));
    const minutes = Array.from({ length: 60 }, (_, i) => pad(i));

    const hourHtml = hours.map(h => `<option value="${h}">${h}</option>`).join('');
    const minHtml = minutes.map(m => `<option value="${m}">${m}</option>`).join('');

    ['tx-hour', 'edit-tx-hour'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = hourHtml;
    });

    ['tx-minute', 'edit-tx-minute'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = minHtml;
    });
  },

  initDateTimeInput() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const curDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const dateInput = document.getElementById('tx-date');
    const hourSelect = document.getElementById('tx-hour');
    const minSelect = document.getElementById('tx-minute');

    if (dateInput) {
      dateInput.value = curDate;
    }

    const curHour = pad(now.getHours());
    const curMin = pad(now.getMinutes());

    if (hourSelect) {
      hourSelect.value = curHour;
    }

    if (minSelect) {
      minSelect.value = curMin;
    }

    // Clean up stale localStorage time keys so form always defaults to current time
    try {
      localStorage.removeItem('money_memo_last_tx_hour');
      localStorage.removeItem('money_memo_last_tx_min');
      localStorage.removeItem('money_memo_last_tx_date');
    } catch(e) {}
  },

  setCurrentTime() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const hourSelect = document.getElementById('tx-hour');
    const minSelect = document.getElementById('tx-minute');
    const dateInput = document.getElementById('tx-date');
    const curHour = pad(now.getHours());
    const curMin = pad(now.getMinutes());
    const curDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (dateInput) {
      dateInput.value = curDate;
    }
    if (hourSelect) {
      hourSelect.value = curHour;
    }
    if (minSelect) {
      minSelect.value = curMin;
    }

    const lang = I18n.getLanguage();
    const timeMsg = `${curHour}:${curMin}`;
    this.showToast(lang === 'en' ? `🕒 Time updated to ${timeMsg}` : `🕒 ปรับเป็นเวลาปัจจุบัน ${timeMsg} น. แล้ว`);
  },

  initCustomDateInputs() {
    const startInput = document.getElementById('dash-custom-start-date');
    const endInput = document.getElementById('dash-custom-end-date');

    const payCycleSetting = StorageManager.getPayCycleSetting();
    this.currentPayCyclePreset = payCycleSetting.type;

    this.customStartDate = localStorage.getItem('money_memo_dash_start_date') || '';
    this.customEndDate = localStorage.getItem('money_memo_dash_end_date') || '';

    if (!this.customStartDate || !this.customEndDate) {
      this.updateCustomDateRangeFromSelectedDate();
    } else {
      if (startInput) startInput.value = this.customStartDate;
      if (endInput) endInput.value = this.customEndDate;
    }

    if (startInput) {
      startInput.addEventListener('change', (e) => {
        this.customStartDate = e.target.value;
        this.currentPayCyclePreset = 'custom';
        try {
          localStorage.setItem('money_memo_dash_start_date', this.customStartDate);
        } catch(err) {}
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }

    if (endInput) {
      endInput.addEventListener('change', (e) => {
        this.customEndDate = e.target.value;
        this.currentPayCyclePreset = 'custom';
        try {
          localStorage.setItem('money_memo_dash_end_date', this.customEndDate);
        } catch(err) {}
        this.renderMonthSelector();
        this.renderDashboard();
      });
    }
  },

  updateCustomDateRangeFromSelectedDate() {
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const cycle = StorageManager.getCycleDateRange(this.selectedDate, payCycleSetting);

    this.customStartDate = cycle.startDate;
    this.customEndDate = cycle.endDate;

    try {
      localStorage.setItem('money_memo_dash_start_date', this.customStartDate);
      localStorage.setItem('money_memo_dash_end_date', this.customEndDate);
    } catch(e) {}

    const startInput = document.getElementById('dash-custom-start-date');
    const endInput = document.getElementById('dash-custom-end-date');
    if (startInput) startInput.value = this.customStartDate;
    if (endInput) endInput.value = this.customEndDate;
  },

  applyPayCyclePreset(preset) {
    this.currentPayCyclePreset = preset;
    const payCycleSetting = StorageManager.getPayCycleSetting();
    payCycleSetting.type = preset;
    if (preset === 'end_of_month') payCycleSetting.customDay = 31;
    else if (preset === 'calendar') payCycleSetting.customDay = 1;
    else if (preset === 'custom') {
      if (!payCycleSetting.customDay) payCycleSetting.customDay = 15;
    }
    
    StorageManager.savePayCycleSetting(payCycleSetting);

    this.updateCustomDateRangeFromSelectedDate();
    this.renderMonthSelector();
    this.renderDashboard();
    this.renderTab1OverviewHero();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderHistoryTab();
    this.renderSettingsPayCycleSection();
    this.renderSettingsSurplusSection();
  },

  navigateDashboardMonth(direction) {
    if (this.dashboardViewMode === 'yearly') {
      this.selectedDate.setFullYear(this.selectedDate.getFullYear() + direction);
      this.renderMonthSelector();
      this.renderDashboard();
    } else {
      this.shiftCustomDateRange(direction);
    }
  },

  shiftCustomDateRange(direction) {
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const cycle = StorageManager.getCycleDateRange(this.selectedDate, payCycleSetting);
    if (direction < 0) {
      this.selectedDate = new Date(cycle.sDate.getTime() - 86400000);
    } else {
      this.selectedDate = new Date(cycle.eDate.getTime() + 86400000);
    }
    this.updateCustomDateRangeFromSelectedDate();
    this.renderMonthSelector();
    this.renderDashboard();
  },

  goToCurrentMonth() {
    this.selectedDate = new Date();
    this.updateCustomDateRangeFromSelectedDate();
    this.renderMonthSelector();
    this.renderDashboard();
  },

  bindEvents() {
    // Auto-update date & time to current on page focus, visibility change, or pageshow (especially for mobile devices & PWAs)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.initDateTimeInput();
      }
    });
    window.addEventListener('focus', () => {
      this.initDateTimeInput();
    });
    window.addEventListener('pageshow', () => {
      this.initDateTimeInput();
    });

    // Tab switching (Both Desktop top pills and Mobile bottom bar)
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab-target');
        this.switchTab(target);
      });
    });

    // Transaction form: Income/Expense/Savings Toggle
    const typeToggleExp = document.getElementById('type-toggle-expense');
    const typeToggleInc = document.getElementById('type-toggle-income');
    const typeToggleSav = document.getElementById('type-toggle-savings');
    if (typeToggleExp) typeToggleExp.addEventListener('click', () => this.setEntryType('expense'));
    if (typeToggleInc) typeToggleInc.addEventListener('click', () => this.setEntryType('income'));
    if (typeToggleSav) typeToggleSav.addEventListener('click', () => this.setEntryType('savings'));

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
    // Handle alias/legacy tab names defensively
    if (tabName === 'recurring') {
      this.switchTab('settings');
      this.toggleSettingsRecurringManager(true);
      return;
    }
    if (tabName === 'categories') {
      this.switchTab('settings');
      this.toggleSettingsCategoryManager(true);
      return;
    }

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

    this.renderActiveTab();
  },

  setEntryType(type) {
    this.currentEntryType = type;
    const typeToggleExp = document.getElementById('type-toggle-expense');
    const typeToggleInc = document.getElementById('type-toggle-income');
    const typeToggleSav = document.getElementById('type-toggle-savings');
    const submitBtn = document.getElementById('tx-submit-btn');
    const quickChipsContainer = document.getElementById('quick-fixed-chips-container');

    const inactiveClass = 'py-2 px-2 sm:px-3 rounded-xl font-medium text-xs text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1 cursor-pointer';

    if (type === 'expense') {
      if (typeToggleExp) {
        typeToggleExp.className = 'py-2 px-2 sm:px-3 rounded-xl font-bold text-xs bg-rose-400 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer';
        typeToggleExp.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span> ${I18n.t('type_expense') || '🔴 รายจ่าย'}`;
      }
      if (typeToggleInc) {
        typeToggleInc.className = inactiveClass;
        typeToggleInc.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${I18n.t('type_income') || '🟢 รายรับ'}`;
      }
      if (typeToggleSav) {
        typeToggleSav.className = inactiveClass;
        typeToggleSav.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> <span>${I18n.t('type_savings') || '💰 เงินออม'}</span>`;
      }
      if (submitBtn) {
        submitBtn.className = 'w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer';
        submitBtn.innerHTML = `<span>${I18n.t('btn_save_expense')}</span>`;
      }
      if (quickChipsContainer) quickChipsContainer.classList.remove('hidden');
    } else if (type === 'income') {
      if (typeToggleExp) {
        typeToggleExp.className = inactiveClass;
        typeToggleExp.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> ${I18n.t('type_expense') || '🔴 รายจ่าย'}`;
      }
      if (typeToggleInc) {
        typeToggleInc.className = 'py-2 px-2 sm:px-3 rounded-xl font-bold text-xs bg-emerald-400 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer';
        typeToggleInc.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span> ${I18n.t('type_income') || '🟢 รายรับ'}`;
      }
      if (typeToggleSav) {
        typeToggleSav.className = inactiveClass;
        typeToggleSav.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> <span>${I18n.t('type_savings') || '💰 เงินออม'}</span>`;
      }
      if (submitBtn) {
        submitBtn.className = 'w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer';
        submitBtn.innerHTML = `<span>${I18n.t('btn_save_income')}</span>`;
      }
      if (quickChipsContainer) quickChipsContainer.classList.remove('hidden');
    } else if (type === 'savings') {
      if (typeToggleExp) {
        typeToggleExp.className = inactiveClass;
        typeToggleExp.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> ${I18n.t('type_expense') || '🔴 รายจ่าย'}`;
      }
      if (typeToggleInc) {
        typeToggleInc.className = inactiveClass;
        typeToggleInc.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${I18n.t('type_income') || '🟢 รายรับ'}`;
      }
      if (typeToggleSav) {
        typeToggleSav.className = 'py-2 px-2 sm:px-3 rounded-xl font-bold text-xs bg-indigo-600 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer';
        typeToggleSav.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span> <span>${I18n.t('type_savings') || '💰 เงินออม'}</span>`;
      }
      if (submitBtn) {
        submitBtn.className = 'w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer';
        submitBtn.innerHTML = `<span>${I18n.t('btn_save_savings') || '➕ บันทึกเงินออม'}</span>`;
      }
      if (quickChipsContainer) quickChipsContainer.classList.add('hidden');
    }

    this.initCategoryGrid('form-category-grid', type);
    this.renderQuickFixedChips();
  },

  initCategoryGrid(containerId, type, preselectedId = null) {
    const gridContainer = document.getElementById(containerId);
    const selectContainer = document.getElementById(containerId.replace('-grid', '-select'));
    const previewContainer = document.getElementById(containerId.replace('-grid', '-dropdown-preview'));

    const categories = StorageManager.getCategoriesSortedByUsage(type);
    const usageStats = StorageManager.getCategoryUsageStats(type);
    
    if (!preselectedId || !categories.some(c => c.id === preselectedId)) {
      this.selectedCategoryId = categories.length > 0 ? categories[0].id : null;
    } else {
      this.selectedCategoryId = preselectedId;
    }

    const lang = I18n.getLanguage();
    const selectedCat = categories.find(c => c.id === this.selectedCategoryId) || categories[0];

    // 1. Render Mobile Dropdown (<select>) if element exists
    if (selectContainer) {
      let optionsHtml = '';
      const usedCategories = categories.filter(c => (usageStats[c.id]?.count || 0) > 0);
      const otherCategories = categories.filter(c => (usageStats[c.id]?.count || 0) === 0);

      if (usedCategories.length > 0 && otherCategories.length > 0) {
        const topLabel = lang === 'en' ? '⭐ Frequently Used' : '⭐ ใช้บ่อย / ล่าสุด';
        const otherLabel = lang === 'en' ? '📂 Other Categories' : '📂 หมวดหมู่อื่นๆ';

        optionsHtml += `<optgroup label="${topLabel}">`;
        usedCategories.forEach(c => {
          const displayName = StorageManager.getCategoryDisplayName(c);
          const count = usageStats[c.id]?.count || 0;
          const countText = count > 1 ? ` (${count} ครั้ง)` : '';
          optionsHtml += `<option value="${c.id}" ${c.id === this.selectedCategoryId ? 'selected' : ''}>${c.emoji} ${displayName}${countText}</option>`;
        });
        optionsHtml += `</optgroup>`;

        optionsHtml += `<optgroup label="${otherLabel}">`;
        otherCategories.forEach(c => {
          const displayName = StorageManager.getCategoryDisplayName(c);
          optionsHtml += `<option value="${c.id}" ${c.id === this.selectedCategoryId ? 'selected' : ''}>${c.emoji} ${displayName}</option>`;
        });
        optionsHtml += `</optgroup>`;
      } else {
        categories.forEach(c => {
          const displayName = StorageManager.getCategoryDisplayName(c);
          const count = usageStats[c.id]?.count || 0;
          const countText = count > 1 ? ` (${count} ครั้ง)` : '';
          optionsHtml += `<option value="${c.id}" ${c.id === this.selectedCategoryId ? 'selected' : ''}>${c.emoji} ${displayName}${countText}</option>`;
        });
      }

      selectContainer.innerHTML = optionsHtml;
      selectContainer.value = this.selectedCategoryId;
    }

    if (previewContainer && selectedCat) {
      previewContainer.textContent = selectedCat.emoji || '📦';
    }

    // 2. Render Desktop Grid
    if (gridContainer) {
      const itemsHtml = categories.map((c, index) => {
        const displayName = StorageManager.getCategoryDisplayName(c);
        const count = usageStats[c.id]?.count || 0;
        const isTopUsed = index < 3 && count > 0;
        return `
          <button 
            type="button" 
            data-cat-id="${c.id}"
            class="cat-item-btn p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${c.id === this.selectedCategoryId ? 'selected border-slate-900 bg-slate-50' : 'border-slate-100/80 bg-white hover:bg-slate-50'}"
            onclick="App.selectCategory('${containerId}', '${c.id}')"
            title="${displayName} ${count > 0 ? `(ใช้ไป ${count} ครั้ง)` : ''}"
          >
            ${isTopUsed ? `<span class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-white" title="ใช้บ่อย"></span>` : ''}
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

      gridContainer.innerHTML = itemsHtml + addTileHtml;
    }
  },

  onCategorySelectDropdown(catId, gridContainerId) {
    this.selectedCategoryId = catId;
    const select = document.getElementById(gridContainerId.replace('-grid', '-select'));
    const preview = document.getElementById(gridContainerId.replace('-grid', '-dropdown-preview'));
    const gridContainer = document.getElementById(gridContainerId);

    const cat = StorageManager.getCategoryById(catId);
    if (preview && cat) {
      preview.textContent = cat.emoji || '📦';
    }

    if (gridContainer) {
      gridContainer.querySelectorAll('.cat-item-btn').forEach(el => {
        if (el.getAttribute('data-cat-id') === catId) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
    }
  },

  selectCategory(containerId, catId) {
    this.selectedCategoryId = catId;
    const container = document.getElementById(containerId);
    const select = document.getElementById(containerId.replace('-grid', '-select'));
    const preview = document.getElementById(containerId.replace('-grid', '-dropdown-preview'));

    if (select) select.value = catId;
    const cat = StorageManager.getCategoryById(catId);
    if (preview && cat) preview.textContent = cat.emoji || '📦';

    if (container) {
      container.querySelectorAll('.cat-item-btn').forEach(el => {
        if (el.getAttribute('data-cat-id') === catId) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
    }
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

    let defaultEmoji = '🐾';
    let defaultColor = '#f87171';
    if (targetType === 'income') {
      defaultEmoji = '💰';
      defaultColor = '#34d399';
    } else if (targetType === 'savings') {
      defaultEmoji = '🏦';
      defaultColor = '#6366f1';
    }

    if (emojiInput) emojiInput.value = defaultEmoji;
    this.updateCategoryEmojiPreview(defaultEmoji);

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
    let defaultEmoji = '🐾';
    if (type === 'income') defaultEmoji = '💰';
    else if (type === 'savings') defaultEmoji = '🏦';
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
            <p class="text-[11px] text-slate-400">${cat.type === 'expense' ? '🔴 Expense' : (cat.type === 'savings' ? '💰 Savings' : '🟢 Income')}</p>
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
    const hourSelect = document.getElementById('tx-hour');
    const minSelect = document.getElementById('tx-minute');
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
    const hVal = hourSelect?.value || pad(now.getHours());
    const mVal = minSelect?.value || pad(now.getMinutes());
    const fullDateTime = `${dVal}T${hVal}:${mVal}`;

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
    this.closeQuickEntryModal();

    this.renderAll();
    const toastMsg = this.currentEntryType === 'expense'
      ? I18n.t('toast_exp_saved')
      : (this.currentEntryType === 'savings' ? I18n.t('toast_savings_saved') : I18n.t('toast_inc_saved'));
    this.showToast(toastMsg);
  },

  renderMonthSelector() {
    const monthEl = document.getElementById('dashboard-current-month');
    if (!monthEl) return;

    const lang = I18n.getLanguage();
    const monthIndex = this.selectedDate.getMonth();
    const year = this.selectedDate.getFullYear();

    if (this.dashboardViewMode === 'custom' || this.dashboardViewMode === 'daily') {
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
        monthEl.textContent = lang === 'en' ? 'Pay Cycle' : 'รอบบัญชีเงินเดือน';
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
    try {
      localStorage.setItem('money_memo_dash_view_mode', mode);
    } catch(e) {}
    const viewCustom = document.getElementById('view-mode-custom');
    const viewDaily = document.getElementById('view-mode-daily');
    const viewYearly = document.getElementById('view-mode-yearly');

    const customRangeInputs = document.getElementById('dashboard-custom-range-inputs');
    const paneOverview = document.getElementById('dashboard-overview-pane');
    const paneDaily = document.getElementById('dashboard-daily-pane');
    const paneYearly = document.getElementById('dashboard-yearly-pane');

    const activeClass = 'flex-1 py-2 px-2.5 rounded-xl font-bold bg-white text-slate-900 shadow-2xs transition-all cursor-pointer text-center';
    const inactiveClass = 'flex-1 py-2 px-2.5 rounded-xl font-medium text-slate-500 hover:text-slate-900 transition-all cursor-pointer text-center';

    if (viewCustom) viewCustom.className = (mode === 'custom') ? activeClass : inactiveClass;
    if (viewDaily) viewDaily.className = (mode === 'daily') ? activeClass : inactiveClass;
    if (viewYearly) viewYearly.className = (mode === 'yearly') ? activeClass : inactiveClass;

    if (mode === 'custom') {
      if (customRangeInputs) customRangeInputs.classList.remove('hidden');
      if (paneOverview) paneOverview.classList.remove('hidden');
      if (paneDaily) paneDaily.classList.add('hidden');
      if (paneYearly) paneYearly.classList.add('hidden');
    } else if (mode === 'daily') {
      if (customRangeInputs) customRangeInputs.classList.remove('hidden');
      if (paneOverview) paneOverview.classList.add('hidden');
      if (paneDaily) paneDaily.classList.remove('hidden');
      if (paneYearly) paneYearly.classList.add('hidden');
    } else if (mode === 'yearly') {
      if (customRangeInputs) customRangeInputs.classList.add('hidden');
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
    let totalSavings = 0;

    txs.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'savings') {
        totalSavings += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    const netBalance = totalIncome - totalExpense - totalSavings;

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
      netEl.className = `text-sm sm:text-xl font-extrabold num-font mt-0.5 ${netBalance >= 0 ? 'text-white' : 'text-rose-300'}`;
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
        netStatusEl.className = 'text-[9px] sm:text-[10px] text-emerald-300 font-bold block mt-0.5';
      } else if (netBalance === 0) {
        netStatusEl.textContent = I18n.t('status_balanced');
        netStatusEl.className = 'text-[9px] sm:text-[10px] text-slate-300 font-medium block mt-0.5';
      } else {
        netStatusEl.textContent = I18n.t('status_deficit');
        netStatusEl.className = 'text-[9px] sm:text-[10px] text-rose-300 font-bold block mt-0.5';
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
    let totalSavings = 0;

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      income: 0,
      expense: 0,
      savings: 0,
      net: 0,
      count: 0
    }));

    yearlyTxs.forEach(t => {
      const d = new Date(t.date);
      const mIdx = d.getMonth();
      if (t.type === 'income') {
        totalIncome += t.amount;
        monthlyStats[mIdx].income += t.amount;
      } else if (t.type === 'savings') {
        totalSavings += t.amount;
        monthlyStats[mIdx].savings = (monthlyStats[mIdx].savings || 0) + t.amount;
      } else {
        totalExpense += t.amount;
        monthlyStats[mIdx].expense += t.amount;
      }
      monthlyStats[mIdx].count++;
    });

    monthlyStats.forEach(m => {
      m.net = m.income - m.expense - (m.savings || 0);
    });

    const netSavings = totalIncome - totalExpense - totalSavings;
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
          else if (t.type === 'income') dailyIncome[idx] += t.amount;
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
          else if (t.type === 'income') dailyIncome[dayIndex] += t.amount;
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
      const daySavings = txs.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0);

      const itemsHtml = txs.map(t => {
        const cat = StorageManager.getCategoryById(t.categoryId);
        const catName = StorageManager.getCategoryDisplayName(cat);
        const timeStr = t.date.length >= 16 ? t.date.slice(11, 16) : '';
        const isExp = t.type === 'expense';
        const isSav = t.type === 'savings';
        const amountColor = isSav ? 'text-indigo-600' : (isExp ? 'text-rose-600' : 'text-emerald-600');
        const amountSign = isSav ? '💰' : (isExp ? '-' : '+');

        return `
          <div class="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-2xl transition-colors group">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base ${isSav ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}">
                ${cat.emoji}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-xs text-slate-800">${catName}</span>
                  ${isSav ? `<span class="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-bold">เงินออม</span>` : ''}
                  <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500">${t.paymentMethod}</span>
                  ${timeStr ? `<span class="text-[10px] text-slate-400">${timeStr}</span>` : ''}
                </div>
                ${t.note ? `<p class="text-[11px] text-slate-500 mt-0.5">${t.note}</p>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm num-font ${amountColor}">
                ${amountSign}฿${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
              ${daySavings > 0 ? `<span class="text-indigo-600">💰฿${daySavings.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>` : ''}
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

  // ==========================================
  // TAB 2: HISTORY & STATEMENT FEED (K PLUS Style)
  // ==========================================
  navigateHistoryMonth(direction) {
    if (!this.historyDate) this.historyDate = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const isCalendarView = (this.historyCycleMode === 'calendar');
    const effectiveCycleSetting = isCalendarView 
      ? { type: 'calendar', customDay: 1 } 
      : payCycleSetting;

    const cycle = StorageManager.getCycleDateRange(this.historyDate, effectiveCycleSetting);
    if (direction < 0) {
      this.historyDate = new Date(cycle.sDate.getTime() - 86400000);
    } else {
      this.historyDate = new Date(cycle.eDate.getTime() + 86400000);
    }
    this.renderHistoryTab();
  },

  resetHistoryToCurrentMonth() {
    this.historyDate = new Date();
    this.renderHistoryTab();
  },

  setHistoryCycleMode(mode) {
    this.historyCycleMode = mode;
    try {
      localStorage.setItem('money_memo_history_cycle_mode', mode);
    } catch(e) {}
    this.renderHistoryTab();
  },

  setHistoryTypeFilter(type) {
    this.historyTypeFilter = type;
    const btnAll = document.getElementById('history-filter-btn-all');
    const btnExp = document.getElementById('history-filter-btn-expense');
    const btnInc = document.getElementById('history-filter-btn-income');
    const btnSav = document.getElementById('history-filter-btn-savings');

    const activeClass = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs transition-all cursor-pointer shrink-0';
    const inactiveClass = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer shrink-0 flex items-center gap-1';

    if (btnAll) btnAll.className = (type === 'all') ? activeClass : 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer shrink-0';
    if (btnExp) {
      btnExp.className = (type === 'expense') ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500 text-white shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1' : inactiveClass;
    }
    if (btnInc) {
      btnInc.className = (type === 'income') ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1' : inactiveClass;
    }
    if (btnSav) {
      btnSav.className = (type === 'savings') ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1' : inactiveClass;
    }

    this.renderHistoryTab();
  },

  setHistoryCategoryFilter(catId) {
    this.historyCategoryFilter = catId;
    this.renderHistoryTab();
  },

  onHistorySearch(query) {
    this.historySearchQuery = (query || '').toLowerCase().trim();
    this.renderHistoryTab();
  },

  initHistoryDesktopView() {
    try {
      const saved = localStorage.getItem('money_memo_history_desktop_view');
      if (saved === 'cards' || saved === 'table') {
        this.historyDesktopView = saved;
      }
    } catch(e) {}
    this.setHistoryDesktopView(this.historyDesktopView || 'cards', false);
  },

  setHistoryDesktopView(mode, render = true) {
    this.historyDesktopView = mode;
    try {
      localStorage.setItem('money_memo_history_desktop_view', mode);
    } catch(e) {}

    const btnCards = document.getElementById('history-view-cards-btn');
    const btnTable = document.getElementById('history-view-table-btn');
    const feedContainer = document.getElementById('history-daily-feed');
    const tableContainer = document.getElementById('history-table-container');

    const activePill = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-900 shadow-2xs transition-all cursor-pointer';
    const inactivePill = 'px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-all cursor-pointer';

    if (btnCards) btnCards.className = (mode === 'cards') ? activePill : inactivePill;
    if (btnTable) btnTable.className = (mode === 'table') ? activePill : inactivePill;

    if (feedContainer && tableContainer) {
      if (mode === 'table') {
        feedContainer.classList.add('hidden');
        tableContainer.classList.remove('hidden');
      } else {
        feedContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
      }
    }

    if (render) {
      this.renderHistoryTab();
    }
  },

  openQuickEntryModal() {
    const modal = document.getElementById('quick-entry-modal');
    if (!modal) return;
    this.initDateTimeInput();
    this.initCategoryGrid('form-category-grid', this.currentEntryType);
    this.renderQuickFixedChips();
    modal.classList.add('show', 'active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const amountInput = document.getElementById('tx-amount');
      if (amountInput) {
        amountInput.focus();
      }
    }, 100);
  },

  closeQuickEntryModal() {
    const modal = document.getElementById('quick-entry-modal');
    if (modal) {
      modal.classList.remove('show', 'active');
      document.body.style.overflow = '';
    }
  },

  quickOpenAddForm() {
    this.openQuickEntryModal();
  },

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

  jumpHistoryToDate(dateStr) {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      this.historyDate = new Date(y, m, 1);
      this.renderHistoryTab();
    }
  },

  renderHistoryTab() {
    if (!this.historyDate) this.historyDate = new Date();

    const year = this.historyDate.getFullYear();
    const month = this.historyDate.getMonth(); // 0-11
    const lang = I18n.getLanguage();

    try {
      const savedMode = localStorage.getItem('money_memo_history_cycle_mode');
      if (savedMode && (savedMode === 'cycle' || savedMode === 'calendar')) {
        this.historyCycleMode = savedMode;
      }
    } catch(e) {}

    const payCycleSetting = StorageManager.getPayCycleSetting();
    let effectiveCycleSetting;
    if (this.historyCycleMode === 'calendar') {
      effectiveCycleSetting = { type: 'calendar', customDay: 1 };
    } else {
      effectiveCycleSetting = payCycleSetting;
    }

    const isCalendarView = (this.historyCycleMode === 'calendar');
    const cycleRange = StorageManager.getCycleDateRange(this.historyDate, effectiveCycleSetting);

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNames = (lang === 'en') ? enMonths : thaiMonths;
    const yearDisplay = (lang === 'en') ? year : (year + 543);

    // 1. Month / Cycle Label
    const monthLabelEl = document.getElementById('history-current-month-label');
    if (monthLabelEl) {
      if (isCalendarView) {
        monthLabelEl.textContent = `${monthNames[month]} ${yearDisplay}`;
      } else {
        monthLabelEl.textContent = (lang === 'en') ? cycleRange.labelEn : cycleRange.labelTh;
      }
    }

    // 1.1 Mode Switcher Pills Active States
    const cycleModeBtn = document.getElementById('history-mode-cycle-btn');
    const calModeBtn = document.getElementById('history-mode-calendar-btn');
    const activePill = 'flex-1 sm:flex-initial px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white text-slate-900 shadow-2xs transition-all cursor-pointer text-center';
    const inactivePill = 'flex-1 sm:flex-initial px-2.5 py-1 rounded-xl text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-all cursor-pointer text-center';

    if (cycleModeBtn) {
      cycleModeBtn.className = (this.historyCycleMode === 'cycle') ? activePill : inactivePill;
    }
    if (calModeBtn) {
      calModeBtn.className = (this.historyCycleMode === 'calendar') ? activePill : inactivePill;
    }

    // 2. Fetch all transactions (fresh from storage) & filter for selected cycle range
    const allTxs = StorageManager.getTransactions(true);
    const monthTxs = allTxs.filter(t => {
      const d = this.normalizeDateString(t.date);
      if (!d) return false;
      return d >= cycleRange.startDate && d <= cycleRange.endDate;
    });

    // 3. Populate Category Filter Dropdown
    const catSelect = document.getElementById('history-category-filter');
    if (catSelect) {
      const currentCatVal = this.historyCategoryFilter || 'all';
      let cats = StorageManager.getCategories();
      if (this.historyTypeFilter !== 'all') {
        cats = cats.filter(c => c.type === this.historyTypeFilter);
      }
      catSelect.innerHTML = `<option value="all">🏷️ ${lang === 'en' ? 'All Categories' : 'ทุกหมวดหมู่'}</option>` + cats.map(c => {
        const cName = StorageManager.getCategoryDisplayName(c);
        return `<option value="${c.id}" ${c.id === currentCatVal ? 'selected' : ''}>${c.emoji || '📦'} ${cName}</option>`;
      }).join('');
    }

    // 4. Flow Summary Capsule Stats (Calculate for active period)
    let totalIncome = 0;
    let totalExpense = 0;
    let totalSavings = 0;
    monthTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'savings') totalSavings += amt;
      else totalExpense += amt;
    });
    const net = totalIncome - totalExpense - totalSavings;

    const bannerCountEl = document.getElementById('history-banner-count');
    const bannerNetEl = document.getElementById('history-banner-net');
    const bannerIncEl = document.getElementById('history-banner-inc');
    const bannerExpEl = document.getElementById('history-banner-exp');

    if (bannerCountEl) bannerCountEl.textContent = lang === 'en' ? `${monthTxs.length} items` : `${monthTxs.length} รายการ`;
    if (bannerNetEl) {
      bannerNetEl.textContent = `${net < 0 ? '-' : (net > 0 ? '+' : '')}฿${Math.abs(net).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
      bannerNetEl.className = `font-black ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`;
    }
    if (bannerIncEl) bannerIncEl.textContent = `+฿${totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    if (bannerExpEl) bannerExpEl.textContent = `-฿${totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

    // 5. Apply Type, Category, and Search Filters to Feed
    const filteredTxs = monthTxs.filter(t => {
      if (this.historyTypeFilter !== 'all' && t.type !== this.historyTypeFilter) return false;
      if (this.historyCategoryFilter && this.historyCategoryFilter !== 'all' && t.categoryId !== this.historyCategoryFilter) return false;
      if (this.historySearchQuery) {
        const cat = StorageManager.getCategoryById(t.categoryId) || {};
        const matchNote = (t.note || '').toLowerCase().includes(this.historySearchQuery);
        const matchCat = (cat.name || '').toLowerCase().includes(this.historySearchQuery) || (cat.nameEn || '').toLowerCase().includes(this.historySearchQuery);
        const matchPayment = (t.paymentMethod || '').toLowerCase().includes(this.historySearchQuery);
        const matchAmount = String(t.amount).includes(this.historySearchQuery);
        if (!matchNote && !matchCat && !matchPayment && !matchAmount) return false;
      }
      return true;
    });

    const feedContainer = document.getElementById('history-daily-feed');
    if (!feedContainer) return;

    if (filteredTxs.length === 0) {
      // Find if there are transactions in other months
      let jumpButtonHtml = '';
      if (allTxs.length > 0) {
        const sortedAll = [...allTxs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const latestTx = sortedAll[0];
        const latestNorm = this.normalizeDateString(latestTx.date);
        if (latestNorm) {
          const lParts = latestNorm.split('-');
          const lYear = parseInt(lParts[0], 10);
          const lMonth = parseInt(lParts[1], 10) - 1;
          const lMonthName = (lang === 'en') ? enMonths[lMonth] : thaiMonths[lMonth];
          const lYearDisp = (lang === 'en') ? lYear : (lYear + 543);
          jumpButtonHtml = `
            <div class="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center gap-1.5">
              <span class="text-xs text-slate-500 font-medium">
                ${lang === 'en' ? `💡 Found recent transactions in ${lMonthName} ${lYearDisp}` : `💡 พบรายการบันทึกล่าสุดในเดือน ${lMonthName} ${lYearDisp}`}
              </span>
              <button 
                type="button" 
                onclick="App.jumpHistoryToDate('${latestNorm}')" 
                class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200/60 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <span>📅</span>
                <span>${lang === 'en' ? `Go to ${lMonthName} ${lYearDisp}` : `ไปดูเดือน ${lMonthName} ${lYearDisp}`}</span>
              </button>
            </div>
          `;
        }
      }

      feedContainer.innerHTML = `
        <div class="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 p-6 space-y-2 shadow-2xs">
          <span class="text-4xl block mb-1">📋</span>
          <p class="font-bold text-slate-700 text-sm">${lang === 'en' ? 'No transactions found for this period' : 'ไม่พบรายการบันทึกในงวดนี้'}</p>
          <p class="text-xs text-slate-400">${lang === 'en' ? 'Try changing the month navigator or add a new entry' : 'ลองกดเลื่อนเดือนด้านบน หรือกดบันทึกรายการใหม่'}</p>
          <div class="flex items-center justify-center gap-2 pt-1">
            <button type="button" onclick="App.quickOpenAddForm()" class="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xs hover:bg-slate-800 transition-all cursor-pointer active:scale-95">
              <span>➕ บันทึกรายการใหม่</span>
            </button>
          </div>
          ${jumpButtonHtml}
        </div>
      `;

      const tableTbody = document.getElementById('history-table-tbody');
      if (tableTbody) {
        tableTbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-10 text-slate-400">
              ${lang === 'en' ? 'No transactions found for this period' : 'ไม่พบรายการบันทึกในงวดนี้'}
            </td>
          </tr>
        `;
      }
      return;
    }

    // 6. Group by YYYY-MM-DD
    const groups = {};
    filteredTxs.forEach(t => {
      const dateKey = this.normalizeDateString(t.date);
      if (!dateKey) return;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const yest = new Date(now.getTime() - 86400000);
    const yesterdayKey = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const enMonthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    feedContainer.innerHTML = sortedDates.map(dateKey => {
      const dayTxs = groups[dateKey];
      const parts = dateKey.split('-');
      let formattedDateStr = dateKey;
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const dt = parseInt(parts[2], 10);
        formattedDateStr = (lang === 'en')
          ? `${dt} ${enMonthsShort[m] || ''} ${y}`
          : `${dt} ${thaiMonthsShort[m] || ''} ${y + 543}`;
      }

      let dayTitle = '';
      if (dateKey === todayKey) {
        dayTitle = lang === 'en' ? 'Today' : 'วันนี้';
      } else if (dateKey === yesterdayKey) {
        dayTitle = lang === 'en' ? 'Yesterday' : 'เมื่อวาน';
      }

      const fullDayHeader = dayTitle ? `${dayTitle} (${formattedDateStr})` : formattedDateStr;

      const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const dayNet = dayIncome - dayExpense;

      const itemsHtml = dayTxs.map(t => {
        const cat = StorageManager.getCategoryById(t.categoryId) || { emoji: '📦', name: 'ทั่วไป', nameEn: 'General' };
        const catName = StorageManager.getCategoryDisplayName(cat) || 'ทั่วไป';
        const emoji = cat.emoji || '📦';
        const isExp = t.type === 'expense';
        const isSav = t.type === 'savings';
        const timeStr = t.date && t.date.length >= 16 ? t.date.slice(11, 16) : '';
        const typeBadge = isExp 
          ? (lang === 'en' ? 'Expense' : 'รายจ่าย') 
          : (isSav ? (lang === 'en' ? 'Savings' : 'เงินออม') : (lang === 'en' ? 'Income' : 'รายรับ'));
        const amountNum = Number(t.amount) || 0;

        const iconContainerClass = isExp 
          ? 'bg-rose-50 text-rose-600 border border-rose-100' 
          : (isSav ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100');
        const amountColor = isExp ? 'text-rose-600' : (isSav ? 'text-indigo-600' : 'text-emerald-600');
        const badgeColor = isExp ? 'text-rose-500' : (isSav ? 'text-indigo-500' : 'text-emerald-500');
        const sign = isExp ? '-' : (isSav ? '+' : '+');

        return `
          <div 
            onclick="App.openTransactionDetailModal('${t.id}')"
            class="flex items-center justify-between p-3 sm:p-3.5 hover:bg-slate-50/90 active:bg-slate-100 transition-all cursor-pointer group select-none"
          >
            <!-- Left: Emoji + Category (Note) & Time • Payment -->
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-2xs ${iconContainerClass}">
                ${cat.emoji || (isSav ? '💰' : '📦')}
              </div>
              <div class="min-w-0 flex-1 pr-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[220px]">${catName}</span>
                  ${t.note ? `<span class="text-xs text-slate-500 font-medium truncate max-w-[160px] sm:max-w-[240px]">(${t.note})</span>` : ''}
                </div>
                <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 font-medium">
                  ${timeStr ? `<span>${timeStr} น.</span> <span>•</span>` : ''}
                  <span class="text-slate-500">${t.paymentMethod || '-'}</span>
                </div>
              </div>
            </div>

            <!-- Right: Amount & Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <div class="text-right">
                <span class="text-sm sm:text-base font-black num-font ${amountColor}">
                  ${sign}฿${amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span class="block sm:hidden text-[9px] font-bold ${badgeColor}">${typeBadge}</span>
              </div>

              <!-- Desktop Direct Edit/Delete Buttons -->
              <div class="hidden sm:flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1" onclick="event.stopPropagation()">
                <button onclick="App.openEditModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer" title="${I18n.t('btn_edit')}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onclick="App.openDeleteModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer" title="${I18n.t('btn_delete')}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>

              <!-- Mobile Chevron -->
              <svg class="w-4 h-4 text-slate-300 sm:hidden shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="pastel-card rounded-3xl overflow-hidden shadow-2xs border border-slate-200/80">
          <div class="bg-slate-50/90 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-sm">📅</span>
              <span class="text-xs font-bold text-slate-800">${fullDayHeader}</span>
              <span class="text-[10px] text-slate-400 font-semibold">(${dayTxs.length})</span>
            </div>
            <div class="px-2.5 py-0.5 rounded-full text-[11px] font-black num-font ${dayNet >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}">
              รวมวัน: ${dayNet < 0 ? '-' : (dayNet > 0 ? '+' : '')}฿${Math.abs(dayNet).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div class="divide-y divide-slate-100/80">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');

    // 7. Populate Compact Desktop Table View
    const tableTbody = document.getElementById('history-table-tbody');
    if (tableTbody) {
      const sortedTxs = [...filteredTxs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      tableTbody.innerHTML = sortedTxs.map(t => {
        const cat = StorageManager.getCategoryById(t.categoryId) || { emoji: '📦', name: 'ทั่วไป', nameEn: 'General' };
        const catName = StorageManager.getCategoryDisplayName(cat) || 'ทั่วไป';
        const isExp = t.type === 'expense';
        const isSav = t.type === 'savings';
        const amountNum = Number(t.amount) || 0;
        const dStr = this.normalizeDateString(t.date);
        const timeStr = (t.date && t.date.length >= 16) ? t.date.slice(11, 16) : '';
        const typeBadge = isExp 
          ? (lang === 'en' ? 'Expense' : 'รายจ่าย') 
          : (isSav ? (lang === 'en' ? 'Savings' : 'เงินออม') : (lang === 'en' ? 'Income' : 'รายรับ'));
        const badgeClass = isExp 
          ? 'bg-rose-50 text-rose-600 border border-rose-200/60' 
          : (isSav ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60' : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60');
        const numColor = isExp ? 'text-rose-600' : (isSav ? 'text-indigo-600' : 'text-emerald-600');
        const sign = isExp ? '-' : (isSav ? '+' : '+');

        return `
          <tr class="hover-action-trigger hover:bg-slate-50/80 transition-colors cursor-pointer" onclick="App.openTransactionDetailModal('${t.id}')">
            <td class="py-2.5 px-3 whitespace-nowrap">
              <span class="font-bold text-slate-800">${dStr}</span>
              ${timeStr ? `<span class="text-slate-400 ml-1 font-normal">${timeStr} น.</span>` : ''}
            </td>
            <td class="py-2.5 px-3 whitespace-nowrap">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
                ${typeBadge}
              </span>
            </td>
            <td class="py-2.5 px-3 whitespace-nowrap">
              <span class="inline-flex items-center gap-1 font-bold text-slate-800">
                <span>${cat.emoji || (isSav ? '💰' : '📦')}</span>
                <span>${catName}</span>
              </span>
            </td>
            <td class="py-2.5 px-3 max-w-[200px] truncate text-slate-600">
              ${t.note || '-'}
            </td>
            <td class="py-2.5 px-3 whitespace-nowrap text-slate-500">
              ${t.paymentMethod || '-'}
            </td>
            <td class="py-2.5 px-3 text-right whitespace-nowrap font-black num-font ${numColor}">
              ${sign}฿${amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </td>
            <td class="py-2.5 px-3 text-center whitespace-nowrap no-print" onclick="event.stopPropagation()">
              <div class="desktop-row-actions inline-flex items-center gap-1 justify-center">
                <button onclick="App.openTransactionDetailModal('${t.id}')" class="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all cursor-pointer" title="ดูรายละเอียด">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
                <button onclick="App.openEditModal('${t.id}')" class="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all cursor-pointer" title="${I18n.t('btn_edit')}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onclick="App.openDeleteModal('${t.id}')" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="${I18n.t('btn_delete')}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  },

  renderDesktopRecentTransactions() {
    const container = document.getElementById('desktop-recent-transactions-list');
    if (!container) return;

    const allTxs = StorageManager.getTransactions();
    const sorted = [...allTxs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
    const lang = I18n.getLanguage();

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4 space-y-1 bg-slate-50/50">
          <span class="text-2xl block mb-1">📝</span>
          <p class="text-xs font-bold text-slate-600">${lang === 'en' ? 'No transactions yet' : 'ยังไม่มีรายการบันทึก'}</p>
          <p class="text-[10px] text-slate-400">${lang === 'en' ? 'New entries will show up here live' : 'รายการที่บันทึกจะแสดงที่นี่แบบสดๆ'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = sorted.map(t => {
      const cat = StorageManager.getCategoryById(t.categoryId) || { emoji: '📦', name: 'ทั่วไป', nameEn: 'General' };
      const catName = StorageManager.getCategoryDisplayName(cat);
      const isExp = t.type === 'expense';
      const isSav = t.type === 'savings';
      const amountNum = Number(t.amount) || 0;
      const dateStr = this.normalizeDateString(t.date);
      const timeStr = (t.date && t.date.length >= 16) ? t.date.slice(11, 16) : '';
      const iconContainerClass = isExp 
        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
        : (isSav ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100');
      const amountColor = isExp ? 'text-rose-600' : (isSav ? 'text-indigo-600' : 'text-emerald-600');
      const sign = isExp ? '-' : (isSav ? '+' : '+');

      return `
        <div 
          onclick="App.openTransactionDetailModal('${t.id}')"
          class="hover-action-trigger flex items-center justify-between p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer group shadow-2xs"
        >
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${iconContainerClass}">
              ${cat.emoji || (isSav ? '💰' : '📦')}
            </div>
            <div class="min-w-0 flex-1 pr-1">
              <div class="flex items-center gap-1 truncate">
                <span class="font-bold text-slate-800 text-xs truncate">${catName}</span>
                ${t.note ? `<span class="text-[11px] text-slate-400 truncate">(${t.note})</span>` : ''}
              </div>
              <div class="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <span>${dateStr || '-'}</span>
                ${timeStr ? `<span>${timeStr} น.</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <span class="text-xs font-black num-font ${amountColor}">
              ${sign}฿${amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>

            <div class="desktop-row-actions flex items-center ml-1" onclick="event.stopPropagation()">
              <button onclick="App.openEditModal('${t.id}')" class="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all cursor-pointer" title="${I18n.t('btn_edit')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onclick="App.openDeleteModal('${t.id}')" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="${I18n.t('btn_delete')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  updatePrintReportHeader() {
    const stamp = document.getElementById('print-report-date-stamp');
    if (stamp) {
      const now = new Date();
      const dStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const tStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      stamp.textContent = `พิมพ์เมื่อ ${dStr} เวลา ${tStr} น.`;
    }
  },

  printStatementReport() {
    if (this.currentTab !== 'history') {
      this.switchTab('history');
    }
    this.updatePrintReportHeader();
    setTimeout(() => {
      window.print();
    }, 100);
  },

  printDashboardReport() {
    if (this.currentTab !== 'dashboard') {
      this.switchTab('dashboard');
    }
    this.updatePrintReportHeader();
    setTimeout(() => {
      window.print();
    }, 100);
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
        <div 
          onclick="App.openTransactionDetailModal('${t.id}')"
          class="bg-white hover:bg-slate-50/90 active:bg-slate-100 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between cursor-pointer group select-none"
        >
          <!-- Left Side: Emoji Icon + Category Name & Date/Time -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-base sm:text-lg shrink-0 shadow-2xs ${isExp ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}">
              ${cat.emoji}
            </div>
            <div class="min-w-0 flex-1 pr-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[130px] sm:max-w-[200px]">${catName}</span>
                ${t.note ? `<span class="hidden sm:inline text-[11px] text-slate-500 font-medium truncate max-w-[160px]">"${t.note}"</span>` : ''}
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] sm:text-[11px] text-slate-400 font-medium num-font">${dateFormatted}</span>
                <span class="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 font-medium">${t.paymentMethod}</span>
              </div>
            </div>
          </div>

          <!-- Right Side: Amount in Red/Green + Arrow / Action Buttons -->
          <div class="flex items-center gap-2 sm:gap-3 shrink-0 ml-1">
            <div class="text-right">
              <span class="text-xs sm:text-base font-black num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
                ${isExp ? '-' : '+'}฿${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <span class="block sm:hidden text-[9px] font-bold ${isExp ? 'text-rose-500' : 'text-emerald-500'}">${typeBadge}</span>
            </div>

            <!-- Desktop Direct Edit/Delete Buttons -->
            <div class="hidden sm:flex items-center opacity-70 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation()">
              <button onclick="App.openEditModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer" title="${I18n.t('btn_edit')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onclick="App.openDeleteModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer" title="${I18n.t('btn_delete')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>

            <!-- Mobile Arrow Chevron -->
            <svg class="w-4 h-4 text-slate-300 sm:hidden shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      `;
    }).join('');
  },

  openTransactionDetailModal(id) {
    const tx = StorageManager.getTransactionById(id);
    if (!tx) return;

    const modal = document.getElementById('tx-detail-modal');
    const content = document.getElementById('tx-detail-content');
    const actions = document.getElementById('tx-detail-actions');
    if (!modal || !content || !actions) return;

    const cat = StorageManager.getCategoryById(tx.categoryId) || { emoji: '📦', name: 'ทั่วไป', nameEn: 'General' };
    const catName = StorageManager.getCategoryDisplayName(cat) || 'ทั่วไป';
    const isExp = tx.type === 'expense';
    const isSav = tx.type === 'savings';
    const lang = I18n.getLanguage();
    const typeLabel = isExp 
      ? (lang === 'en' ? 'Expense' : 'รายจ่าย') 
      : (isSav ? (lang === 'en' ? 'Savings' : 'เงินออม') : (lang === 'en' ? 'Income' : 'รายรับ'));
    
    const d = new Date(tx.date);
    const dateFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    const timeFormatted = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const heroBoxClass = isExp 
      ? 'bg-rose-50/70 border border-rose-100/70' 
      : (isSav ? 'bg-indigo-50/70 border border-indigo-100/70' : 'bg-emerald-50/70 border border-emerald-100/70');
    const heroBorderClass = isExp ? 'border-rose-200' : (isSav ? 'border-indigo-200' : 'border-emerald-200');
    const badgeClass = isExp ? 'bg-rose-100 text-rose-700' : (isSav ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700');
    const badgeEmoji = isExp ? '🔴' : (isSav ? '💰' : '🟢');
    const amountColor = isExp ? 'text-rose-600' : (isSav ? 'text-indigo-600' : 'text-emerald-600');
    const sign = isExp ? '-' : '+';

    content.innerHTML = `
      <!-- Hero Top inside Modal -->
      <div class="text-center p-4 rounded-3xl ${heroBoxClass}">
        <div class="w-14 h-14 rounded-3xl bg-white flex items-center justify-center text-3xl mx-auto shadow-xs border ${heroBorderClass}">
          ${cat.emoji || (isSav ? '💰' : '📦')}
        </div>
        <div class="mt-2.5">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}">
            <span>${badgeEmoji}</span> ${typeLabel}
          </span>
        </div>
        <p class="text-3xl font-black num-font mt-2 ${amountColor}">
          ${sign}฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </p>
        <p class="text-xs font-bold text-slate-700 mt-1">${catName}</p>
      </div>

      <!-- Info Details Grid -->
      <div class="bg-slate-50/80 rounded-2xl p-3.5 space-y-3 border border-slate-100 text-xs">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
          <span class="text-slate-400 font-medium">${lang === 'en' ? 'Date & Time' : 'วันที่และเวลา'}</span>
          <span class="font-bold text-slate-800 num-font">${dateFormatted} • ${timeFormatted} น.</span>
        </div>

        <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
          <span class="text-slate-400 font-medium">${lang === 'en' ? 'Category' : 'หมวดหมู่'}</span>
          <span class="font-bold text-slate-800 flex items-center gap-1">${cat.emoji} ${catName}</span>
        </div>

        <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
          <span class="text-slate-400 font-medium">${lang === 'en' ? 'Payment Method' : 'ช่องทางชำระเงิน'}</span>
          <span class="font-bold text-slate-800">${tx.paymentMethod || '-'}</span>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-slate-400 font-medium">${lang === 'en' ? 'Note' : 'บันทึกช่วยจำ (Note)'}</span>
          <p class="font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/70 text-xs">
            ${tx.note ? `"${tx.note}"` : `<span class="text-slate-400 italic">${lang === 'en' ? 'No note' : 'ไม่มีบันทึกช่วยจำ'}</span>`}
          </p>
        </div>
      </div>
    `;

    actions.innerHTML = `
      <button 
        type="button" 
        onclick="App.closeTransactionDetailModal(); App.openDeleteModal('${tx.id}');" 
        class="flex-1 py-2.5 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-2xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        <span>${lang === 'en' ? 'Delete' : 'ลบรายการ'}</span>
      </button>

      <button 
        type="button" 
        onclick="App.closeTransactionDetailModal(); App.openEditModal('${tx.id}');" 
        class="flex-1 py-2.5 px-3 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        <span>${lang === 'en' ? 'Edit' : 'แก้ไขรายการ'}</span>
      </button>
    `;

    modal.classList.add('show');
  },

  closeTransactionDetailModal() {
    const modal = document.getElementById('tx-detail-modal');
    if (modal) modal.classList.remove('show');
  },

  openEditModal(id) {
    const tx = StorageManager.getTransactionById(id);
    if (!tx) return;

    this.editingTransactionId = id;

    const modal = document.getElementById('edit-modal');
    const amountInput = document.getElementById('edit-tx-amount');
    const dateInput = document.getElementById('edit-tx-date');
    const hourSelect = document.getElementById('edit-tx-hour');
    const minSelect = document.getElementById('edit-tx-minute');
    const paymentInput = document.getElementById('edit-tx-payment-method');
    const noteInput = document.getElementById('edit-tx-note');
    const typeSelect = document.getElementById('edit-tx-type');

    if (amountInput) amountInput.value = tx.amount;
    if (tx.date) {
      const parts = tx.date.split('T');
      if (dateInput) dateInput.value = parts[0] || '';
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        if (hourSelect) hourSelect.value = timeParts[0] || '12';
        if (minSelect) minSelect.value = timeParts[1] ? timeParts[1].substring(0, 2) : '00';
      }
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
    const hourVal = document.getElementById('edit-tx-hour')?.value || '12';
    const minVal = document.getElementById('edit-tx-minute')?.value || '00';
    const date = `${dateVal}T${hourVal}:${minVal}`;
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
      const isSav = tx.type === 'savings';
      const lang = I18n.getLanguage();
      const typeBadge = isSav ? (lang === 'en' ? 'Savings' : 'เงินออม') : (isExp ? (lang === 'en' ? 'Expense' : 'รายจ่าย') : (lang === 'en' ? 'Income' : 'รายรับ'));
      const badgeColor = isSav ? 'text-indigo-600' : (isExp ? 'text-rose-600' : 'text-emerald-600');
      const numColor = isSav ? 'text-indigo-600' : (isExp ? 'text-rose-600' : 'text-emerald-600');
      const numSign = isSav ? '💰' : (isExp ? '-' : '+');

      preview.innerHTML = `
        <div class="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-left">
          <span class="text-2xl">${cat.emoji}</span>
          <div class="flex-1">
            <p class="font-bold text-slate-800 text-xs">${catName} <span class="text-[10px] font-semibold ${badgeColor}">(${typeBadge})</span></p>
            <p class="text-[10px] text-slate-400">${tx.date.replace('T', ' ')} · ${tx.paymentMethod}</p>
            ${tx.note ? `<p class="text-[11px] text-slate-600">"${tx.note}"</p>` : ''}
          </div>
          <div class="font-bold text-sm num-font ${numColor}">
            ${numSign}฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
    let totalSavings = 0;

    filtered.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'savings') totalSavings += t.amount;
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
      const savLabel = lang === 'en' ? 'Savings' : 'เงินออม';
      amountsEl.innerHTML = `<span class="text-emerald-600 font-bold">${incLabel} ฿${totalIncome.toLocaleString()}</span> / <span class="text-rose-600 font-bold">${expLabel} ฿${totalExpense.toLocaleString()}</span> / <span class="text-indigo-600 font-bold">${savLabel} ฿${totalSavings.toLocaleString()}</span>`;
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

  renderAll(forceAll = false) {
    this.renderActiveTab();
    if (forceAll) {
      if (this.currentTab !== 'transactions') {
        this.renderTab1OverviewHero();
        this.renderTab1DailyBudgetCard();
        this.renderTab1SavingsCard();
        this.renderDesktopRecentTransactions();
      }
      if (this.currentTab !== 'history') this.renderHistoryTab();
      if (this.currentTab !== 'dashboard') this.renderDashboard();
      if (this.currentTab !== 'settings') this.renderSettingsTab();
      if (this.currentTab !== 'simulator' && typeof BudgetSimulator !== 'undefined' && BudgetSimulator.data) {
        BudgetSimulator.render();
      }
    }
  },

  renderActiveTab() {
    if (this.currentTab === 'transactions') {
      this.renderTab1OverviewHero();
      this.renderTab1DailyBudgetCard();
      this.renderTab1SavingsCard();
      this.renderDesktopRecentTransactions();
    } else if (this.currentTab === 'history') {
      this.renderHistoryTab();
    } else if (this.currentTab === 'dashboard') {
      this.renderDashboard();
    } else if (this.currentTab === 'simulator') {
      if (typeof BudgetSimulator !== 'undefined' && BudgetSimulator.data) {
        BudgetSimulator.render();
      }
    } else if (this.currentTab === 'settings') {
      this.renderSettingsTab();
    }
  },

  renderTab1OverviewHero() {
    const heroEl = document.getElementById('tab1-overview-hero');
    if (!heroEl) return;

    const allTxs = StorageManager.getTransactions();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const payCycleSetting = StorageManager.getPayCycleSetting();
    const cycleRange = StorageManager.getCycleDateRange(now, payCycleSetting);

    const currentTxs = allTxs.filter(t => {
      const d = (t.date || '').slice(0, 10);
      return d >= cycleRange.startDate && d <= cycleRange.endDate;
    });

    let income = 0;
    let expense = 0;
    let txSavingsInCycle = 0;
    currentTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else if (t.type === 'savings') txSavingsInCycle += amt;
      else expense += amt;
    });

    // Check Previous Cycle Surplus & Settlement Rollover
    const prevSurplusData = StorageManager.getPreviousCycleSurplus(now, payCycleSetting);
    let rolloverSurplus = 0;
    if (prevSurplusData.hasSurplus && prevSurplusData.settlement) {
      if (prevSurplusData.settlement.action === 'rollover' || prevSurplusData.settlement.action === 'split') {
        rolloverSurplus = Number(prevSurplusData.settlement.rolloverAmount) || 0;
      }
    }

    const effectiveIncome = income + rolloverSurplus;

    // Filter manual savings deposits in the current pay cycle that deduct from daily budget
    const allDeposits = StorageManager.getSavingsDeposits();
    let manualSavingsDeductedInCycle = txSavingsInCycle;
    allDeposits.forEach(d => {
      const dStr = StorageManager.normalizeDateString(d.date);
      if (dStr >= cycleRange.startDate && dStr <= cycleRange.endDate && d.deductFromDailyBudget) {
        const amt = Number(d.amount) || 0;
        if (d.type === 'deposit') {
          manualSavingsDeductedInCycle += amt;
        } else if (d.type === 'withdraw') {
          manualSavingsDeductedInCycle -= amt;
        }
      }
    });

    // Available Spending Balance = (Income + Rollover) - Expense - Savings Deposits
    const netAvailable = Math.round((effectiveIncome - expense - manualSavingsDeductedInCycle + Number.EPSILON) * 100) / 100;
    const lang = I18n.getLanguage();

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const periodLabel = (payCycleSetting.type === 'calendar')
      ? ((lang === 'en') ? `${enMonths[currentMonth]} ${currentYear}` : `${thaiMonths[currentMonth]} ${currentYear + 543}`)
      : ((lang === 'en') ? cycleRange.labelEn : cycleRange.labelTh);

    const balanceTitle = manualSavingsDeductedInCycle > 0
      ? (lang === 'en' ? 'Available Balance (After Savings)' : 'คงเหลือพร้อมใช้รอบนี้ (หลังหักเงินออม)')
      : (lang === 'en' ? 'Net Balance This Period' : 'คงเหลือสุทธิรอบนี้');

    heroEl.innerHTML = `
      <div class="pastel-card p-4 sm:p-5 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg relative overflow-hidden border border-slate-800 space-y-3.5">
        <!-- Ambient Glow Background -->
        <div class="absolute -right-8 -bottom-8 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-8 -top-8 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Top Section: Period + Health Badge -->
        <div class="relative z-10 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-indigo-200 tracking-wider flex items-center gap-1.5">
              <span>📅</span> <span>${periodLabel}</span>
            </span>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold ${netAvailable >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
            ${netAvailable >= 0 ? (lang === 'en' ? '🟢 Healthy' : '🟢 สุขภาพการเงินดี') : (lang === 'en' ? '🔴 Deficit' : '🔴 ยอดติดลบ')}
          </span>
        </div>

        <!-- Middle Section: Big Available / Net Balance -->
        <div class="relative z-10">
          <span class="text-[11px] font-semibold text-slate-300 block">${balanceTitle}</span>
          <div class="mt-0.5 flex items-baseline gap-2">
            <span class="text-3xl sm:text-4xl font-black tracking-tight num-font ${netAvailable >= 0 ? 'text-white' : 'text-rose-300'}">
              ${netAvailable < 0 ? '-' : ''}฿${Math.abs(netAvailable).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <!-- Bottom Section: 3 Columns Capsule (Income / Expense / Savings) -->
        <div class="relative z-10 grid grid-cols-3 gap-1 sm:gap-2 bg-white/10 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/10">
          <!-- Col 1: Income -->
          <div class="px-1.5 sm:px-2 py-0.5 min-w-0">
            <div class="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-300 font-bold truncate">
              <span>↑</span> <span>${lang === 'en' ? 'Income' : 'รายรับ'}</span>
            </div>
            <p class="text-xs sm:text-base font-extrabold text-white num-font mt-0.5 truncate">
              ฿${effectiveIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <!-- Col 2: Expense -->
          <div class="px-1.5 sm:px-2 py-0.5 border-l border-white/15 min-w-0">
            <div class="flex items-center gap-1 text-[10px] sm:text-[11px] text-rose-300 font-bold truncate">
              <span>↓</span> <span>${lang === 'en' ? 'Expense' : 'รายจ่าย'}</span>
            </div>
            <p class="text-xs sm:text-base font-extrabold text-white num-font mt-0.5 truncate">
              ฿${expense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <!-- Col 3: Savings -->
          <div class="px-1.5 sm:px-2 py-0.5 border-l border-white/15 min-w-0">
            <div class="flex items-center gap-1 text-[10px] sm:text-[11px] text-indigo-300 font-bold truncate">
              <span>💰</span> <span>${lang === 'en' ? 'Savings' : 'เงินออม'}</span>
            </div>
            <p class="text-xs sm:text-base font-extrabold text-white num-font mt-0.5 truncate">
              ฿${manualSavingsDeductedInCycle.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    `;
  },

  renderTab1DailyBudgetCard() {
    const container = document.getElementById('tab1-daily-budget-card');
    if (!container) return;

    const lang = I18n.getLanguage();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const payCycleSetting = StorageManager.getPayCycleSetting();
    const cycleRange = StorageManager.getCycleDateRange(now, payCycleSetting);

    // Calculate days remaining in the current cycle
    const endParts = cycleRange.endDate.split('-').map(Number);
    const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = endDateObj.getTime() - todayZero.getTime();
    const daysRemaining = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

    // Filter transactions in the current pay cycle
    const allTxs = StorageManager.getTransactions();
    const cycleTxs = allTxs.filter(t => {
      const d = StorageManager.normalizeDateString(t.date);
      return d >= cycleRange.startDate && d <= cycleRange.endDate;
    });

    let totalIncomeInCycle = 0;
    let pastExpenseInCycle = 0;
    let todayExpense = 0;
    let txSavingsInCycle = 0;

    cycleTxs.forEach(t => {
      const dStr = StorageManager.normalizeDateString(t.date);
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncomeInCycle += amount;
      } else if (t.type === 'savings') {
        txSavingsInCycle += amount;
      } else if (t.type === 'expense') {
        if (dStr === todayStr) {
          todayExpense += amount;
        } else if (dStr < todayStr) {
          pastExpenseInCycle += amount;
        }
      }
    });

    // Monthly savings goal
    const savingsGoal = StorageManager.getMonthlySavingsGoal();

    // Determine baseline income: if no actual income logged yet, check recurring income fallback
    let effectiveIncome = totalIncomeInCycle;
    if (effectiveIncome === 0) {
      const recIncome = StorageManager.getRecurringItems()
        .filter(i => i.type === 'income')
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);
      if (recIncome > 0) effectiveIncome = recIncome;
    }

    // Check Previous Cycle Surplus & Settlement Choice
    const prevSurplusData = StorageManager.getPreviousCycleSurplus(now, payCycleSetting);
    let rolloverSurplus = 0;
    let settlementBannerHtml = '';
    let surplusBadgeHtml = '';

    if (prevSurplusData.hasSurplus) {
      const settlement = prevSurplusData.settlement;
      if (!settlement) {
        // Show Prompt Banner on Tab 1
        settlementBannerHtml = `
          <div class="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-teal-500/10 border border-indigo-200/80 space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xl">🎉</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">
                    ${lang === 'en' ? 'Previous Cycle Surplus: ' : 'สิ้นสุดรอบก่อน คุณมีเงินเหลือ '} 
                    <span class="text-emerald-600 font-extrabold num-font">฿${prevSurplusData.netSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </h4>
                  <p class="text-[11px] text-slate-500 font-medium">
                    ${lang === 'en' ? 'Choose how to allocate this surplus for the new cycle:' : 'ต้องการจัดการเงินเหลือส่วนนี้อย่างไรสำหรับรอบใหม่?'}
                  </p>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
              <button 
                type="button" 
                onclick="App.handleApplySurplusSettlement('rollover', ${prevSurplusData.netSurplus}, 0)" 
                class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
              >
                <span>📥</span>
                <span>${lang === 'en' ? `Rollover (+฿${prevSurplusData.netSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : `ยกยอดมากินใช้ (+฿${prevSurplusData.netSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}</span>
              </button>
              <button 
                type="button" 
                onclick="App.handleApplySurplusSettlement('savings', 0, ${prevSurplusData.netSurplus})" 
                class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
              >
                <span>🏦</span>
                <span>${lang === 'en' ? 'Keep in Savings' : 'เก็บเข้าเงินออมทั้งหมด'}</span>
              </button>
              <button 
                type="button" 
                onclick="App.openSurplusSettlementModal()" 
                class="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
              >
                <span>✂️</span>
                <span>${lang === 'en' ? 'Custom Split' : 'แบ่งออม / ยกยอดเอง'}</span>
              </button>
            </div>
          </div>
        `;
      } else {
        if (settlement.action === 'rollover') {
          rolloverSurplus = Number(settlement.rolloverAmount) || prevSurplusData.netSurplus;
          surplusBadgeHtml = `
            <div class="flex items-center justify-between text-[11px] bg-emerald-50 border border-emerald-200/60 text-emerald-800 px-2.5 py-1 rounded-xl">
              <span class="flex items-center gap-1 font-semibold truncate mr-1">
                <span>📥</span> 
                <span>${lang === 'en' ? 'Rolled over from previous cycle: ' : 'มียอดยกมาจากรอบก่อน: '}</span>
                <strong class="font-extrabold num-font">+฿${rolloverSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
              <button type="button" onclick="App.openSurplusSettlementModal()" class="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer shrink-0">
                ${lang === 'en' ? 'Adjust' : 'ปรับเปลี่ยน'}
              </button>
            </div>
          `;
        } else if (settlement.action === 'split') {
          rolloverSurplus = Number(settlement.rolloverAmount) || 0;
          const savAmt = Number(settlement.savingsAmount) || 0;
          surplusBadgeHtml = `
            <div class="flex items-center justify-between text-[11px] bg-indigo-50 border border-indigo-200/60 text-indigo-800 px-2.5 py-1 rounded-xl">
              <span class="flex items-center gap-1 font-semibold truncate mr-1">
                <span>✂️</span> 
                <span>${lang === 'en' ? 'Rollover: ' : 'ยกยอดใช้: '}</span>
                <strong class="font-extrabold num-font text-emerald-700">+฿${rolloverSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                <span class="text-slate-400">|</span>
                <span>${lang === 'en' ? 'Savings: ' : 'เงินออม: '}</span>
                <strong class="font-extrabold num-font text-indigo-700">฿${savAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
              <button type="button" onclick="App.openSurplusSettlementModal()" class="text-[10px] text-indigo-700 font-bold hover:underline cursor-pointer shrink-0">
                ${lang === 'en' ? 'Adjust' : 'ปรับเปลี่ยน'}
              </button>
            </div>
          `;
        } else if (settlement.action === 'savings') {
          const savAmt = Number(settlement.savingsAmount) || prevSurplusData.netSurplus;
          surplusBadgeHtml = `
            <div class="flex items-center justify-between text-[11px] bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl">
              <span class="flex items-center gap-1 font-semibold truncate mr-1">
                <span>🏦</span> 
                <span>${lang === 'en' ? 'Surplus kept in savings: ' : 'ปิดยอดเข้าเงินออมเรียบร้อย: '}</span>
                <strong class="font-extrabold num-font text-slate-900">฿${savAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
              <button type="button" onclick="App.openSurplusSettlementModal()" class="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer shrink-0">
                ${lang === 'en' ? 'Change' : 'เปลี่ยน'}
              </button>
            </div>
          `;
        }
      }
    }

    // Filter manual savings deposits in the current pay cycle that deduct from daily budget
    const allDeposits = StorageManager.getSavingsDeposits();
    let manualSavingsDeductedInCycle = txSavingsInCycle;
    allDeposits.forEach(d => {
      const dStr = StorageManager.normalizeDateString(d.date);
      if (dStr >= cycleRange.startDate && dStr <= cycleRange.endDate && d.deductFromDailyBudget) {
        const amt = Number(d.amount) || 0;
        if (d.type === 'deposit') {
          manualSavingsDeductedInCycle += amt;
        } else if (d.type === 'withdraw') {
          manualSavingsDeductedInCycle -= amt;
        }
      }
    });

    // Total savings deduction for cycle living budget:
    // When a user has a monthly savingsGoal (e.g. 5000) and deposited 2000 into pockets,
    // the 2000 is part of the 5000 goal, so we deduct max(savingsGoal, manualSavingsDeductedInCycle)
    const totalCycleSavingsDeduction = Math.max(savingsGoal, manualSavingsDeductedInCycle);

    // Dynamic available amount for the rest of the cycle (including today & rollover)
    const availableForLiving = Math.max(0, (effectiveIncome + rolloverSurplus) - pastExpenseInCycle - totalCycleSavingsDeduction);
    const dailyQuotaToday = daysRemaining > 0 ? (availableForLiving / daysRemaining) : 0;
    const remainingToday = Math.max(0, dailyQuotaToday - todayExpense);
    const isExceeded = (todayExpense > dailyQuotaToday && dailyQuotaToday > 0) || (dailyQuotaToday === 0 && todayExpense > 0);
    const usedPct = dailyQuotaToday > 0 ? Math.min(100, (todayExpense / dailyQuotaToday) * 100) : (todayExpense > 0 ? 100 : 0);

    let barColor = 'from-emerald-500 to-teal-400';
    if (usedPct >= 100 || isExceeded) {
      barColor = 'from-rose-500 to-pink-500';
    } else if (usedPct >= 75) {
      barColor = 'from-amber-500 to-yellow-400';
    }

    const remainingDaysText = lang === 'en' 
      ? `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left in cycle` 
      : `เหลืออีก ${daysRemaining} วันในรอบ`;

    container.innerHTML = `
      ${settlementBannerHtml}

      <div class="pastel-card p-3.5 sm:p-4 rounded-3xl shadow-2xs border border-slate-200/80 space-y-3 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-base">🎯</span>
            <h3 class="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
              ${lang === 'en' ? 'Daily Spending Allowance' : 'โควตาเงินกินใช้วันนี้'}
            </h3>
            <span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/50">Dynamic</span>
          </div>
          <button 
            type="button" 
            onclick="App.openSavingsGoalModal()" 
            class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200/80 shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            title="ปรับเป้าหมายเงินออมรายเดือน"
          >
            <span>🎯</span>
            <span>${lang === 'en' ? 'Adjust Goal' : 'ปรับเป้าเงินออม'}</span>
          </button>
        </div>

        ${surplusBadgeHtml}

        <!-- Balance + Limit -->
        <div class="flex items-baseline justify-between pt-0.5">
          <div>
            <span class="text-[10px] text-slate-400 font-semibold block">${lang === 'en' ? 'Remaining Today' : 'วันนี้ใช้ได้อีก'}</span>
            <p class="text-xl sm:text-2xl font-extrabold num-font ${isExceeded ? 'text-rose-600' : 'text-slate-900'}">
              ฿${remainingToday.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-400 font-semibold block">${lang === 'en' ? 'Daily Target' : 'งบแนะนำวันนี้'}</span>
            <span class="text-xs sm:text-sm font-bold text-slate-700 num-font">
              ฿${dailyQuotaToday.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${lang === 'en' ? 'day' : 'วัน'}
            </span>
            <span class="text-[10px] text-indigo-600 font-medium block">(${remainingDaysText})</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="space-y-1">
          <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5">
            <div class="bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-500" style="width: ${usedPct}%"></div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>${lang === 'en' ? 'Spent today: ฿' : 'ใช้ไปแล้ววันนี้: ฿'}${todayExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${usedPct.toFixed(0)}%)</span>
            <span>${lang === 'en' ? 'Savings Target: ฿' : 'เป้าหมายเงินออม: ฿'}${savingsGoal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <!-- Sub Context Stats (Income & Past Expenses) -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>${lang === 'en' ? 'Cycle Income: ' : 'รายรับรอบนี้: '}<strong class="text-emerald-600 num-font font-bold">฿${(effectiveIncome + rolloverSurplus).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <span>${lang === 'en' ? 'Target: ' : 'เป้าออมเดือนนี้: '}<strong class="text-indigo-600 num-font font-bold">฿${savingsGoal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> <span class="text-emerald-600 font-semibold">(ออมแล้ว ฿${manualSavingsDeductedInCycle.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></span>
        </div>
      </div>
    `;
  },

  // --- กล่องเงินออมสะสมรวม & ประวัติ (Accumulated Savings Card) ---
  renderTab1SavingsCard() {
    const container = document.getElementById('tab1-savings-card');
    if (!container) return;

    const lang = I18n.getLanguage();
    const now = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const cycleRange = StorageManager.getCycleDateRange(now, payCycleSetting);
    const prevSurplusData = StorageManager.getPreviousCycleSurplus(now, payCycleSetting);
    const accumulatedData = StorageManager.getTotalAccumulatedSavings();
    const allDeposits = StorageManager.getSavingsDeposits();

    const settlement = prevSurplusData.settlement;
    const settledSavingsAmount = settlement ? (Number(settlement.savingsAmount) || 0) : 0;

    // Filter deposits in current cycle (excluding surplus rollover from past cycle for this cycle badge)
    let cycleDepositsTotal = 0;
    allDeposits.forEach(d => {
      const dStr = StorageManager.normalizeDateString(d.date);
      if (dStr >= cycleRange.startDate && dStr <= cycleRange.endDate && !d.isSurplus) {
        const amt = Number(d.amount) || 0;
        if (d.type === 'deposit') cycleDepositsTotal += amt;
        else if (d.type === 'withdraw') cycleDepositsTotal -= amt;
      }
    });

    const allCycleTxs = StorageManager.getTransactions();
    allCycleTxs.forEach(t => {
      const dStr = StorageManager.normalizeDateString(t.date);
      if (dStr >= cycleRange.startDate && dStr <= cycleRange.endDate && t.type === 'savings') {
        cycleDepositsTotal += (Number(t.amount) || 0);
      }
    });

    let surplusStatusBadge = '';
    if (settlement && settlement.action === 'savings') {
      surplusStatusBadge = `
        <div class="flex items-center justify-between text-[11px] bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3 py-1.5 rounded-xl">
          <span class="flex items-center gap-1.5 font-semibold truncate mr-1">
            <span>🏦</span>
            <span>${lang === 'en' ? 'Surplus saved from last cycle: ' : 'เก็บเงินเหลือจากรอบก่อนเข้าเงินออม: '}</span>
            <strong class="font-extrabold num-font text-emerald-700">+฿${settledSavingsAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
          <button type="button" onclick="App.openSurplusSettlementModal()" class="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer shrink-0">
            ${lang === 'en' ? 'Adjust' : 'ปรับเปลี่ยน'}
          </button>
        </div>
      `;
    } else if (prevSurplusData.hasSurplus && !settlement) {
      surplusStatusBadge = `
        <div class="flex items-center justify-between text-[11px] bg-amber-50 border border-amber-200/80 text-amber-800 px-3 py-1.5 rounded-xl">
          <span class="flex items-center gap-1.5 font-semibold truncate mr-1">
            <span>🎉</span>
            <span>${lang === 'en' ? 'Surplus pending settlement: ' : 'มีเงินเหลือรอบก่อนรอกำหนด: '}</span>
            <strong class="font-extrabold num-font text-amber-900">฿${prevSurplusData.netSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
          <button type="button" onclick="App.openSurplusSettlementModal()" class="text-[10px] text-amber-900 hover:underline font-bold cursor-pointer shrink-0">
            ${lang === 'en' ? 'Allocate Now' : 'จัดสรรเงิน'}
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="pastel-card p-3.5 sm:p-4 rounded-3xl shadow-2xs border border-slate-200/80 space-y-3 bg-gradient-to-br from-white via-emerald-50/20 to-slate-50">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">💰</span>
            <div>
              <h3 class="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-tight">
                ${lang === 'en' ? 'Total Savings Balance' : 'เงินออมสะสมรวม (Total Savings)'}
              </h3>
              <span class="text-[10px] text-slate-400 font-medium">${lang === 'en' ? 'Accumulated savings from all periods' : 'ยอดเงินออมสะสมรวมทุกรอบ'}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button 
              type="button" 
              onclick="App.openSavingsHistoryModal()" 
              class="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              title="${lang === 'en' ? 'Savings History' : 'ประวัติการออมเงินทั้งหมด'}"
            >
              <span>📋</span>
              <span>${lang === 'en' ? 'History' : 'ประวัติ'}</span>
            </button>
            <button 
              type="button" 
              onclick="App.openSavingsDepositModal()" 
              class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>+</span>
              <span>${lang === 'en' ? 'Deposit' : 'ฝากเงินออม'}</span>
            </button>
          </div>
        </div>

        ${surplusStatusBadge}

        <!-- Big Savings Number Box -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-slate-50 to-indigo-50/40 border border-slate-100 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 font-semibold block">${lang === 'en' ? 'All-time Accumulated Savings' : 'ยอดเงินออมสะสมทั้งหมดที่มีอยู่'}</span>
            <p class="text-2xl sm:text-3xl font-black num-font text-emerald-600 mt-0.5">
              ฿${accumulatedData.totalAccumulated.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span class="text-[10px] text-emerald-700 font-bold block mt-0.5">
              ${cycleDepositsTotal > 0 ? `+฿${cycleDepositsTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'en' ? 'deposited this cycle' : 'ฝากเพิ่มในรอบนี้'}` : (lang === 'en' ? 'Ready to grow with your discipline' : 'ออมสร้างวินัยการเงิน')}
            </span>
          </div>
          <div class="text-4xl shrink-0 opacity-80">
            🏦
          </div>
        </div>

        <!-- Footnote / Withdraw & Surplus Trigger -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <button 
            type="button" 
            onclick="App.openSurplusSettlementModal()" 
            class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>🎉</span> <span>${lang === 'en' ? 'Manage Surplus / Rollover' : 'จัดการเงินเหลือ/ยอดยก'}</span>
          </button>
          <button 
            type="button" 
            onclick="App.openSavingsWithdrawModal()" 
            class="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
          >
            ${lang === 'en' ? 'Withdraw Savings' : 'ถอนเงินออม'}
          </button>
        </div>
      </div>
    `;
  },

  // --- Savings History Modal ---
  openSavingsHistoryModal() {
    const modal = document.getElementById('savings-history-modal');
    if (!modal) return;
    this.renderSavingsHistoryModal();
    modal.classList.add('show');
  },

  closeSavingsHistoryModal() {
    const modal = document.getElementById('savings-history-modal');
    if (modal) modal.classList.remove('show');
  },

  renderSavingsHistoryModal() {
    const container = document.getElementById('savings-history-items-container');
    const badgeEl = document.getElementById('savings-history-count-badge');
    if (!container) return;

    const lang = I18n.getLanguage();
    const deposits = StorageManager.getSavingsDeposits();
    const allTxs = StorageManager.getTransactions();
    const savingsTxs = allTxs.filter(t => t.type === 'savings').map(t => {
      const cat = StorageManager.getCategoryById(t.categoryId);
      const catName = StorageManager.getCategoryDisplayName(cat);
      return {
        id: t.id,
        date: t.date,
        amount: t.amount,
        note: t.note || (catName ? `${cat?.emoji || '💰'} ${catName}` : (lang === 'en' ? 'Savings Entry' : 'บันทึกเงินออม')),
        type: 'deposit',
        isTransaction: true,
        emoji: cat?.emoji || '💰'
      };
    });

    const combinedList = [...deposits, ...savingsTxs].sort((a, b) => {
      const dateA = StorageManager.normalizeDateString(a.date);
      const dateB = StorageManager.normalizeDateString(b.date);
      return dateB.localeCompare(dateA);
    });

    if (badgeEl) {
      badgeEl.textContent = `${lang === 'en' ? 'Total' : 'ทั้งหมด'} ${combinedList.length} ${lang === 'en' ? 'records' : 'รายการ'}`;
    }

    if (combinedList.length === 0) {
      container.innerHTML = `
        <div class="py-10 text-center text-slate-400 text-xs">
          <span>📭 ${lang === 'en' ? 'No savings records yet' : 'ยังไม่มีประวัติการออมเงิน'}</span>
        </div>
      `;
      return;
    }

    container.innerHTML = combinedList.map(d => {
      const isDeposit = d.type === 'deposit';
      const isSurplus = Boolean(d.isSurplus);
      const isTx = Boolean(d.isTransaction);
      const emoji = d.emoji || (isSurplus ? '🎉' : (isDeposit ? '💰' : '💸'));
      const badgeColor = isSurplus ? 'bg-indigo-100 text-indigo-700' : (isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700');
      const numColor = isDeposit ? 'text-emerald-600' : 'text-rose-600';
      const sign = isDeposit ? '+' : '-';
      const dStr = StorageManager.normalizeDateString(d.date);
      const subNote = isSurplus 
        ? (lang === 'en' ? 'Surplus settlement' : 'เงินเหลือปิดรอบ') 
        : (isTx 
          ? (lang === 'en' ? 'Savings entry' : 'บันทึกเงินออม') 
          : (isDeposit ? (lang === 'en' ? 'Deducted from budget' : 'หักจากคงเหลือสุทธิ') : (lang === 'en' ? 'Transferred back' : 'โอนคืนคงเหลือ')));

      return `
        <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 hover:bg-slate-100/70 transition-all">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl ${badgeColor} flex items-center justify-center text-sm font-bold shrink-0">${emoji}</span>
            <div class="min-w-0">
              <span class="text-xs font-bold text-slate-800 block truncate">${d.note || (isDeposit ? 'ฝากเงินออม' : 'ถอนเงินออม')}</span>
              <span class="text-[10px] text-slate-400">${dStr} · ${subNote}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <div class="text-right">
              <span class="text-xs font-black num-font ${numColor} block">${sign}฿${(Number(d.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span class="text-[9px] text-slate-400">${lang === 'en' ? 'Done' : 'สำเร็จ'}</span>
            </div>
            <button 
              type="button" 
              onclick="App.handleDeleteSavingsDeposit('${d.id}', ${isTx})" 
              class="w-6 h-6 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center text-xs transition-colors cursor-pointer"
              title="${lang === 'en' ? 'Delete this entry' : 'ลบรายการนี้'}"
            >✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // --- Savings Instant Deposit & Withdrawal Handlers ---
  openSavingsDepositModal() {
    const modal = document.getElementById('savings-deposit-modal');
    if (!modal) return;

    const dateInput = document.getElementById('savings-deposit-date');
    const amountInput = document.getElementById('savings-deposit-amount');
    const noteInput = document.getElementById('savings-deposit-note');
    const deductToggle = document.getElementById('savings-deposit-deduct-toggle');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    if (dateInput) {
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    if (amountInput) {
      if (!amountInput.value) amountInput.value = '1000';
      setTimeout(() => amountInput.focus(), 100);
    }
    if (noteInput) noteInput.value = '';
    if (deductToggle) deductToggle.checked = true;

    modal.classList.add('show');
  },

  closeSavingsDepositModal() {
    const modal = document.getElementById('savings-deposit-modal');
    if (modal) modal.classList.remove('show');
  },

  setSavingsDepositPreset(amt) {
    const amountInput = document.getElementById('savings-deposit-amount');
    if (amountInput) {
      amountInput.value = amt;
      amountInput.focus();
    }
  },

  handleSaveSavingsDeposit() {
    const amountInput = document.getElementById('savings-deposit-amount');
    const dateInput = document.getElementById('savings-deposit-date');
    const noteInput = document.getElementById('savings-deposit-note');
    const deductToggle = document.getElementById('savings-deposit-deduct-toggle');
    const lang = I18n.getLanguage();

    const amt = Math.max(0, Math.round(((parseFloat(amountInput?.value) || 0) + Number.EPSILON) * 100) / 100);
    if (amt <= 0) {
      alert(lang === 'en' ? 'Please enter a valid deposit amount' : 'กรุณาระบุจำนวนเงินที่ต้องการออม');
      return;
    }

    const date = dateInput?.value || new Date().toISOString().slice(0, 10);
    const note = (noteInput?.value || '').trim() || (lang === 'en' ? 'Deposit to Savings' : 'ฝากเงินออม');
    const deductFromDailyBudget = deductToggle ? deductToggle.checked : true;

    StorageManager.addSavingsDeposit({
      type: 'deposit',
      amount: amt,
      date,
      note,
      deductFromDailyBudget
    });

    this.closeSavingsDepositModal();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderTab1OverviewHero();
    if (typeof this.renderSavingsHistoryModal === 'function') this.renderSavingsHistoryModal();

    this.showToast(lang === 'en' ? `💰 Saved ฿${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} into savings!` : `💰 ฝากเงิน ฿${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} เข้าเงินออมสะสมเรียบร้อย!`);
  },

  openSavingsWithdrawModal() {
    const modal = document.getElementById('savings-withdraw-modal');
    if (!modal) return;

    const dateInput = document.getElementById('savings-withdraw-date');
    const amountInput = document.getElementById('savings-withdraw-amount');
    const noteInput = document.getElementById('savings-withdraw-note');
    const creditToggle = document.getElementById('savings-withdraw-credit-toggle');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    if (dateInput) {
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    if (amountInput) {
      amountInput.value = '';
      setTimeout(() => amountInput.focus(), 100);
    }
    if (noteInput) noteInput.value = '';
    if (creditToggle) creditToggle.checked = true;

    modal.classList.add('show');
  },

  closeSavingsWithdrawModal() {
    const modal = document.getElementById('savings-withdraw-modal');
    if (modal) modal.classList.remove('show');
  },

  handleSaveSavingsWithdraw() {
    const amountInput = document.getElementById('savings-withdraw-amount');
    const dateInput = document.getElementById('savings-withdraw-date');
    const noteInput = document.getElementById('savings-withdraw-note');
    const creditToggle = document.getElementById('savings-withdraw-credit-toggle');
    const lang = I18n.getLanguage();

    const amt = Math.max(0, Math.round(((parseFloat(amountInput?.value) || 0) + Number.EPSILON) * 100) / 100);
    if (amt <= 0) {
      alert(lang === 'en' ? 'Please enter a valid withdrawal amount' : 'กรุณาระบุจำนวนเงินที่ต้องการถอน');
      return;
    }

    const accumulatedData = StorageManager.getTotalAccumulatedSavings();
    if (amt > accumulatedData.totalAccumulated) {
      alert(lang === 'en' ? 'Insufficient savings balance' : 'ยอดเงินออมสะสมมีไม่เพียงพอสำหรับการถอน');
      return;
    }

    const date = dateInput?.value || new Date().toISOString().slice(0, 10);
    const note = (noteInput?.value || '').trim() || (lang === 'en' ? 'Withdraw Savings' : 'ถอนเงินออม');
    const deductFromDailyBudget = creditToggle ? creditToggle.checked : true;

    StorageManager.addSavingsDeposit({
      type: 'withdraw',
      amount: amt,
      date,
      note,
      deductFromDailyBudget
    });

    this.closeSavingsWithdrawModal();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderTab1OverviewHero();
    if (typeof this.renderSavingsHistoryModal === 'function') this.renderSavingsHistoryModal();

    this.showToast(lang === 'en' ? `💸 Withdrew ฿${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} from savings` : `💸 ถอนเงิน ฿${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} จากเงินออมสะสมแล้ว`);
  },

  handleDeleteSavingsDeposit(id, isTx = false) {
    const lang = I18n.getLanguage();
    if (confirm(lang === 'en' ? 'Delete this savings record?' : 'ลบรายการบันทึกเงินออมนี้หรือไม่?')) {
      if (isTx) {
        StorageManager.deleteTransaction(id);
        this.renderAll();
      } else {
        StorageManager.deleteSavingsDeposit(id);
        this.renderTab1DailyBudgetCard();
        this.renderTab1SavingsCard();
        this.renderTab1OverviewHero();
      }
      this.renderSavingsHistoryModal();
      this.showToast(lang === 'en' ? 'Deleted savings record' : 'ลบรายการบันทึกเงินออมแล้ว');
    }
  },

  // --- Monthly Savings Goal Manager ---
  renderSettingsSavingsGoalSection() {
    const goal = StorageManager.getMonthlySavingsGoal();
    const badgeEl = document.getElementById('settings-savings-goal-badge');
    const inputEl = document.getElementById('settings-savings-goal-input');
    const lang = I18n.getLanguage();

    if (badgeEl) {
      badgeEl.textContent = `฿${goal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'en' ? '/ month' : '/ เดือน'}`;
    }
    if (inputEl) {
      inputEl.value = goal;
    }
  },

  handleSaveSettingsSavingsGoal(amount) {
    const val = Math.max(0, Math.round(((parseFloat(amount) || 0) + Number.EPSILON) * 100) / 100);
    StorageManager.saveMonthlySavingsGoal(val);
    this.renderSettingsSavingsGoalSection();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    const lang = I18n.getLanguage();
    this.showToast(lang === 'en' ? `🎯 Savings target set to ฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `🎯 บันทึกเป้าหมายเงินออม ฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} แล้ว`);
  },

  handleSetSavingsGoalPreset(amount) {
    this.handleSaveSettingsSavingsGoal(amount);
  },

  openSavingsGoalModal() {
    const modal = document.getElementById('savings-goal-modal');
    const input = document.getElementById('modal-savings-goal-input');
    if (!modal) return;
    const goal = StorageManager.getMonthlySavingsGoal();
    if (input) {
      input.value = goal;
      setTimeout(() => input.focus(), 100);
    }
    modal.classList.add('show');
  },

  closeSavingsGoalModal() {
    const modal = document.getElementById('savings-goal-modal');
    if (modal) modal.classList.remove('show');
  },

  handleSaveSavingsGoalFromModal() {
    const input = document.getElementById('modal-savings-goal-input');
    const val = Math.max(0, Math.round(((parseFloat(input?.value) || 0) + Number.EPSILON) * 100) / 100);
    StorageManager.saveMonthlySavingsGoal(val);
    this.closeSavingsGoalModal();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderSettingsSavingsGoalSection();
    const lang = I18n.getLanguage();
    this.showToast(lang === 'en' ? `🎯 Savings target set to ฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `🎯 ปรับเป้าหมายเงินออมเป็น ฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} แล้ว`);
  },

  // --- Surplus Settlement Modal & Actions ---
  openSurplusSettlementModal() {
    const modal = document.getElementById('surplus-settlement-modal');
    if (!modal) return;

    const now = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const prevSurplusData = StorageManager.getPreviousCycleSurplus(now, payCycleSetting);

    const totalSurplus = Math.max(0, prevSurplusData.netSurplus);
    const totalEl = document.getElementById('settlement-modal-total-surplus');
    const labelEl = document.getElementById('settlement-modal-cycle-label');
    const rollInput = document.getElementById('settlement-input-rollover');
    const savInput = document.getElementById('settlement-input-savings');
    const lang = I18n.getLanguage();

    if (totalEl) totalEl.textContent = `฿${totalSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (labelEl) labelEl.textContent = (lang === 'en') ? prevSurplusData.prevCycle.labelEn : prevSurplusData.prevCycle.labelTh;

    const settlement = prevSurplusData.settlement;
    if (settlement) {
      if (rollInput) rollInput.value = settlement.rolloverAmount !== undefined ? settlement.rolloverAmount : 0;
      if (savInput) savInput.value = settlement.savingsAmount !== undefined ? settlement.savingsAmount : 0;
    } else {
      if (rollInput) rollInput.value = totalSurplus;
      if (savInput) savInput.value = 0;
    }

    modal.classList.add('show');
  },

  closeSurplusSettlementModal() {
    const modal = document.getElementById('surplus-settlement-modal');
    if (modal) modal.classList.remove('show');
  },

  setSettlementModalMode(mode) {
    const now = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const prevSurplusData = StorageManager.getPreviousCycleSurplus(now, payCycleSetting);
    const totalSurplus = Math.max(0, Math.round((prevSurplusData.netSurplus + Number.EPSILON) * 100) / 100);

    const rollInput = document.getElementById('settlement-input-rollover');
    const savInput = document.getElementById('settlement-input-savings');

    if (mode === 'all_rollover') {
      if (rollInput) rollInput.value = totalSurplus;
      if (savInput) savInput.value = 0;
    } else if (mode === 'all_savings') {
      if (rollInput) rollInput.value = 0;
      if (savInput) savInput.value = totalSurplus;
    }
  },

  onSettlementInputChange(changedField) {
    const now = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const prevSurplusData = StorageManager.getPreviousCycleSurplus(now, payCycleSetting);
    const totalSurplus = Math.max(0, Math.round((prevSurplusData.netSurplus + Number.EPSILON) * 100) / 100);

    const rollInput = document.getElementById('settlement-input-rollover');
    const savInput = document.getElementById('settlement-input-savings');

    if (changedField === 'rollover' && rollInput && savInput) {
      const rollVal = Math.max(0, Math.min(totalSurplus, parseFloat(rollInput.value) || 0));
      const remainingSav = Math.max(0, Math.round((totalSurplus - rollVal + Number.EPSILON) * 100) / 100);
      savInput.value = remainingSav;
    } else if (changedField === 'savings' && rollInput && savInput) {
      const savVal = Math.max(0, Math.min(totalSurplus, parseFloat(savInput.value) || 0));
      const remainingRoll = Math.max(0, Math.round((totalSurplus - savVal + Number.EPSILON) * 100) / 100);
      rollInput.value = remainingRoll;
    }
  },

  handleApplySurplusSettlement(action, rolloverAmt, savingsAmt) {
    const now = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const currentCycle = StorageManager.getCycleDateRange(now, payCycleSetting);

    const rAmt = Math.max(0, Math.round(((parseFloat(rolloverAmt) || 0) + Number.EPSILON) * 100) / 100);
    const sAmt = Math.max(0, Math.round(((parseFloat(savingsAmt) || 0) + Number.EPSILON) * 100) / 100);

    StorageManager.saveSurplusSettlement(currentCycle.startDate, {
      action,
      rolloverAmount: rAmt,
      savingsAmount: sAmt
    });

    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderTab1OverviewHero();
    this.renderSettingsSurplusSection();

    const lang = I18n.getLanguage();
    if (action === 'rollover') {
      this.showToast(lang === 'en' ? `📥 Rolled over ฿${rAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to daily budget!` : `📥 ยกยอด ฿${rAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} เข้าโควตากินใช้แล้ว!`);
    } else if (action === 'savings') {
      this.showToast(lang === 'en' ? `🏦 Saved ฿${sAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} as net savings!` : `🏦 บันทึกเงิน ฿${sAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} เข้าเงินออมเรียบร้อย!`);
    } else {
      this.showToast(lang === 'en' ? '✨ Surplus allocation saved!' : '✨ บันทึกการจัดสรรเงินเหลือแล้ว!');
    }
  },

  handleSaveSurplusSettlementFromModal() {
    const rollInput = document.getElementById('settlement-input-rollover');
    const savInput = document.getElementById('settlement-input-savings');
    const rollAmt = Math.max(0, Math.round(((parseFloat(rollInput?.value) || 0) + Number.EPSILON) * 100) / 100);
    const savAmt = Math.max(0, Math.round(((parseFloat(savInput?.value) || 0) + Number.EPSILON) * 100) / 100);

    let action = 'split';
    if (rollAmt > 0 && savAmt === 0) action = 'rollover';
    else if (rollAmt === 0 && savAmt > 0) action = 'savings';

    this.handleApplySurplusSettlement(action, rollAmt, savAmt);
    this.closeSurplusSettlementModal();
  },

  handleResetSurplusSettlement() {
    const now = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const currentCycle = StorageManager.getCycleDateRange(now, payCycleSetting);

    StorageManager.removeSurplusSettlement(currentCycle.startDate);
    this.closeSurplusSettlementModal();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderTab1OverviewHero();
    this.renderSettingsSurplusSection();

    const lang = I18n.getLanguage();
    this.showToast(lang === 'en' ? '🔄 Surplus settlement reset' : '🔄 รีเซ็ตการจัดการเงินเหลือแล้ว');
  },

  // ==========================================
  // TAB 5: ⚙️ SETTINGS HUB & DATA MANAGEMENT
  // ==========================================
  renderSettingsTab() {
    this.renderSettingsGoogleAccount();
    this.renderSettingsPayCycleSection();
    this.renderSettingsSavingsGoalSection();
    this.renderSettingsSurplusSection();
    this.renderSettingsRecurringSummary();
    this.renderSettingsCategorySummary();
    this.renderSettingsStorageStats();
  },

  renderSettingsSurplusSection() {
    const badgeEl = document.getElementById('settings-surplus-badge');
    const contentEl = document.getElementById('settings-surplus-content-card');
    if (!contentEl) return;

    const lang = I18n.getLanguage();
    const now = new Date();
    const payCycleSetting = StorageManager.getPayCycleSetting();
    const prevSurplusData = StorageManager.getPreviousCycleSurplus(now, payCycleSetting);
    const settlement = prevSurplusData.settlement;

    if (settlement) {
      if (settlement.action === 'savings') {
        const savAmt = Number(settlement.savingsAmount) || 0;
        if (badgeEl) {
          badgeEl.textContent = lang === 'en' ? '🏦 Kept in Savings' : '🏦 เก็บเข้าเงินออม';
          badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 num-font';
        }
        contentEl.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div>
              <span class="font-bold text-slate-800 block">${lang === 'en' ? 'Allocated as Savings' : 'สถานะ: เก็บเข้าเงินออมทั้งหมด'}</span>
              <span class="text-[11px] text-slate-500">${lang === 'en' ? 'Saved from previous cycle: ' : 'เงินเหลือรอบก่อน: '}<strong class="text-emerald-700 num-font font-bold">฿${savAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div class="flex items-center gap-1.5 self-end sm:self-center">
              <button type="button" onclick="App.openSurplusSettlementModal()" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer">
                ${lang === 'en' ? 'Adjust' : 'ปรับเปลี่ยน'}
              </button>
              <button type="button" onclick="App.handleResetSurplusSettlement()" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer">
                ${lang === 'en' ? 'Reset' : 'รีเซ็ต'}
              </button>
            </div>
          </div>
        `;
      } else if (settlement.action === 'rollover') {
        const rollAmt = Number(settlement.rolloverAmount) || 0;
        if (badgeEl) {
          badgeEl.textContent = lang === 'en' ? '📥 Rolled Over' : '📥 ยกยอดกินใช้';
          badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 num-font';
        }
        contentEl.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div>
              <span class="font-bold text-slate-800 block">${lang === 'en' ? 'Rolled Over to Daily Budget' : 'สถานะ: ยกยอดไปทบเป็นงบกินใช้'}</span>
              <span class="text-[11px] text-slate-500">${lang === 'en' ? 'Rollover amount: ' : 'จำนวนเงินที่ยกยอด: '}<strong class="text-emerald-700 num-font font-bold">+฿${rollAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div class="flex items-center gap-1.5 self-end sm:self-center">
              <button type="button" onclick="App.openSurplusSettlementModal()" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer">
                ${lang === 'en' ? 'Adjust' : 'ปรับเปลี่ยน'}
              </button>
              <button type="button" onclick="App.handleResetSurplusSettlement()" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer">
                ${lang === 'en' ? 'Reset' : 'รีเซ็ต'}
              </button>
            </div>
          </div>
        `;
      } else {
        const rollAmt = Number(settlement.rolloverAmount) || 0;
        const savAmt = Number(settlement.savingsAmount) || 0;
        if (badgeEl) {
          badgeEl.textContent = lang === 'en' ? '✂️ Custom Split' : '✂️ แบ่งสัดส่วน';
          badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 num-font';
        }
        contentEl.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div>
              <span class="font-bold text-slate-800 block">${lang === 'en' ? 'Split between Rollover & Savings' : 'สถานะ: แบ่งยกยอดกินใช้ & เก็บเข้าเงินออม'}</span>
              <span class="text-[11px] text-slate-500">ยกยอด: <strong class="text-emerald-700 num-font font-bold">฿${rollAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | ออม: <strong class="text-indigo-700 num-font font-bold">฿${savAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div class="flex items-center gap-1.5 self-end sm:self-center">
              <button type="button" onclick="App.openSurplusSettlementModal()" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer">
                ${lang === 'en' ? 'Adjust' : 'ปรับเปลี่ยน'}
              </button>
              <button type="button" onclick="App.handleResetSurplusSettlement()" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer">
                ${lang === 'en' ? 'Reset' : 'รีเซ็ต'}
              </button>
            </div>
          </div>
        `;
      }
    } else if (prevSurplusData.hasSurplus) {
      if (badgeEl) {
        badgeEl.textContent = lang === 'en' ? '⚡ Pending' : '⚡ รอดำเนินการ';
        badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 num-font';
      }
      contentEl.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div>
            <span class="font-bold text-slate-800 block">${lang === 'en' ? 'Surplus Available for Allocation' : 'มียอดเงินเหลือจากรอบก่อนหน้าที่ยังไม่ได้จัดสรร'}</span>
            <span class="text-[11px] text-slate-500">${lang === 'en' ? 'Amount: ' : 'ยอดเงินคงเหลือ: '}<strong class="text-emerald-600 num-font font-bold">฿${prevSurplusData.netSurplus.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          </div>
          <button type="button" onclick="App.openSurplusSettlementModal()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer self-end sm:self-center">
            ${lang === 'en' ? 'Allocate Now' : 'จัดสรรเงินเหลือ'}
          </button>
        </div>
      `;
    } else {
      if (badgeEl) {
        badgeEl.textContent = lang === 'en' ? 'No Surplus' : 'ไม่มียอดยก';
        badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 num-font';
      }
      contentEl.innerHTML = `
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>${lang === 'en' ? 'No surplus recorded from the previous cycle, or it was balanced.' : 'รอบก่อนหน้าไม่มีเงินเหลือ หรือถูกจัดสรรสมดุลเรียบร้อยแล้ว'}</span>
          <button type="button" onclick="App.openSurplusSettlementModal()" class="text-xs text-indigo-600 font-bold hover:underline cursor-pointer shrink-0 ml-2">
            ${lang === 'en' ? 'Custom Input' : 'กำหนดยอดเอง'}
          </button>
        </div>
      `;
    }
  },

  renderSettingsPayCycleSection() {
    const setting = StorageManager.getPayCycleSetting();
    const lang = I18n.getLanguage();
    const badgeEl = document.getElementById('settings-paycycle-badge');
    const customDayInput = document.getElementById('settings-custom-cycle-day');
    const previewEl = document.getElementById('settings-paycycle-preview');

    const types = ['end_of_month', 'calendar', 'custom'];
    types.forEach(t => {
      const card = document.getElementById(`paycycle-opt-${t}`);
      if (card) {
        if (setting.type === t) {
          card.className = 'paycycle-card p-3 sm:p-3.5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-xs ring-2 ring-indigo-500/10';
        } else {
          card.className = 'paycycle-card p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs';
        }
      }
    });

    if (customDayInput) {
      customDayInput.value = (setting.type === 'custom') ? (setting.customDay || 15) : (setting.customDay || 15);
    }

    if (badgeEl) {
      if (setting.type === 'end_of_month') {
        badgeEl.textContent = lang === 'en' ? '💼 End of Month' : '💼 วันสิ้นเดือน';
        badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 num-font';
      } else if (setting.type === 'custom') {
        badgeEl.textContent = lang === 'en' ? `⚙️ Day ${setting.customDay || 15}` : `⚙️ ตัดรอบวันที่ ${setting.customDay || 15}`;
        badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 num-font';
      } else {
        badgeEl.textContent = lang === 'en' ? '📆 Calendar (1-End)' : '📆 เดือนปฏิทิน';
        badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 num-font';
      }
    }

    if (previewEl) {
      const now = new Date();
      const cycle = StorageManager.getCycleDateRange(now, setting);
      const rangeLabel = (lang === 'en') ? cycle.labelEn : cycle.labelTh;

      let explanation = '';
      if (setting.type === 'end_of_month') {
        explanation = lang === 'en' ? 'Salary on last day of month is counted in this period' : 'เงินเดือนที่เข้าวันสุดท้ายของเดือนจะถูกนับเป็นรายรับของงวดนี้ทันที';
      } else if (setting.type === 'custom') {
        explanation = lang === 'en' ? `Cut-off every ${setting.customDay || 15}th of month (aligned with daily quota & history)` : `ตัดรอบทุกวันที่ ${setting.customDay || 15} ของเดือน (เชื่อมโยงโควตากินใช้และประวัติรายการ)`;
      } else {
        explanation = lang === 'en' ? 'Standard calendar month (1st to last day)' : 'รอบเดือนปฏิทินมาตรฐาน 1 ถึงวันสิ้นเดือน';
      }

      previewEl.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-base">ℹ️</span>
          <div>
            <span class="font-bold text-slate-800">${lang === 'en' ? 'Active Cycle Range' : 'รอบงวดบัญชีปัจจุบัน'}:</span>
            <strong class="text-indigo-900 ml-1 num-font">${rangeLabel}</strong>
          </div>
        </div>
        <span class="text-[11px] text-slate-500 font-medium sm:text-right">(${explanation})</span>
      `;
    }
  },

  handleSetPayCycleType(type) {
    const setting = StorageManager.getPayCycleSetting();
    setting.type = type;
    if (type === 'end_of_month') {
      setting.customDay = 31;
    } else if (type === 'calendar') {
      setting.customDay = 1;
    } else if (type === 'custom') {
      if (!setting.customDay || setting.customDay === 1 || setting.customDay === 31) {
        const inputVal = parseInt(document.getElementById('settings-custom-cycle-day')?.value, 10);
        setting.customDay = (inputVal >= 1 && inputVal <= 31) ? inputVal : 15;
      }
    }

    StorageManager.savePayCycleSetting(setting);
    this.currentPayCyclePreset = type;

    this.updateCustomDateRangeFromSelectedDate();
    this.renderSettingsPayCycleSection();
    this.renderTab1OverviewHero();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderHistoryTab();
    this.renderMonthSelector();
    this.renderDashboard();
    this.renderSettingsSurplusSection();

    const lang = I18n.getLanguage();
    this.showToast(lang === 'en' ? '🗓️ Payday cycle updated' : '🗓️ บันทึกรอบบัญชีและวันเงินเดือนออกแล้ว');
  },

  handleSetPayCycleCustomDay(day) {
    const d = Math.max(1, Math.min(31, parseInt(day, 10) || 1));
    const setting = {
      type: 'custom',
      customDay: d
    };
    StorageManager.savePayCycleSetting(setting);
    this.currentPayCyclePreset = 'custom';

    const customDayInput = document.getElementById('settings-custom-cycle-day');
    if (customDayInput) customDayInput.value = d;

    this.updateCustomDateRangeFromSelectedDate();
    this.renderSettingsPayCycleSection();
    this.renderTab1OverviewHero();
    this.renderTab1DailyBudgetCard();
    this.renderTab1SavingsCard();
    this.renderHistoryTab();
    this.renderMonthSelector();
    this.renderDashboard();
    this.renderSettingsSurplusSection();

    const lang = I18n.getLanguage();
    this.showToast(lang === 'en' ? `🗓️ Pay cycle set to Day ${d}` : `🗓️ ตั้งวันตัดรอบเป็นวันที่ ${d} ของเดือนแล้ว`);
  },

  renderSettingsGoogleAccount() {
    const cardEl = document.getElementById('settings-google-account-card');
    const badgeEl = document.getElementById('settings-sync-badge');
    if (!cardEl) return;

    const user = (typeof FirebaseManager !== 'undefined' && FirebaseManager.getUser) ? FirebaseManager.getUser() : null;
    const lang = I18n.getLanguage();

    if (user) {
      const avatarUrl = user.photoURL;
      const fullName = user.displayName || user.email.split('@')[0];
      const initial = fullName.charAt(0).toUpperCase();

      if (badgeEl) {
        badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60';
        badgeEl.textContent = lang === 'en' ? '🟢 Cloud Synced' : '🟢 ซิงค์คลาวด์แล้ว';
      }

      cardEl.innerHTML = `
        <div class="flex items-center gap-3">
          ${avatarUrl 
            ? `<img src="${avatarUrl}" alt="${fullName}" class="w-11 h-11 rounded-2xl object-cover shadow-2xs border border-slate-200" />`
            : `<div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-slate-800 text-white font-black text-base flex items-center justify-center shadow-2xs">${initial}</div>`
          }
          <div>
            <div class="flex items-center gap-1.5">
              <h4 class="text-xs sm:text-sm font-extrabold text-slate-900">${fullName}</h4>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/50">Google Account</span>
            </div>
            <p class="text-[11px] text-slate-400 font-medium">${user.email}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button 
            type="button" 
            onclick="FirebaseManager.performTwoWaySync()" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ซิงค์ข้อมูลเดี๋ยวนี้"
          >
            <span>🔄</span>
            <span>${lang === 'en' ? 'Sync Now' : 'ซิงค์ทันที'}</span>
          </button>
          <button 
            type="button" 
            onclick="FirebaseManager.signOut()" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ออกจากระบบ"
          >
            <span>🚪</span>
            <span>${lang === 'en' ? 'Sign Out' : 'ออกจากระบบ'}</span>
          </button>
        </div>
      `;
    } else {
      if (badgeEl) {
        badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500';
        badgeEl.textContent = lang === 'en' ? 'Local Only' : 'ใช้งานแบบออฟไลน์';
      }

      cardEl.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center text-xl shadow-2xs shrink-0">
            👤
          </div>
          <div>
            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900">${lang === 'en' ? 'Guest User (Not logged in)' : 'ยังไม่ได้เข้าสู่ระบบ (Guest)'}</h4>
            <p class="text-[11px] text-slate-400">${lang === 'en' ? 'Sign in with Google to sync your records automatically.' : 'เข้าสู่ระบบด้วย Google เพื่อซิงค์ข้อมูลและเข้าถึงจากทุกอุปกรณ์'}</p>
          </div>
        </div>

        <button 
          type="button" 
          onclick="FirebaseManager.signInWithGoogle()" 
          class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer self-end sm:self-center active:scale-95"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"/>
            <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
          </svg>
          <span>${lang === 'en' ? 'Sign in with Google' : 'เข้าสู่ระบบด้วย Google'}</span>
        </button>
      `;
    }
  },

  renderSettingsRecurringSummary() {
    const badgeEl = document.getElementById('settings-rec-count-badge');
    const items = StorageManager.getRecurringItems();
    const lang = I18n.getLanguage();

    if (badgeEl) {
      badgeEl.textContent = lang === 'en' ? `${items.length} items` : `${items.length} รายการ`;
    }

    if (this.isSettingsRecOpen) {
      this.renderSettingsRecurringList();
    }
  },

  toggleSettingsRecurringManager() {
    this.isSettingsRecOpen = !this.isSettingsRecOpen;
    const drawer = document.getElementById('settings-recurring-drawer');
    const toggleText = document.getElementById('settings-rec-toggle-text');
    const lang = I18n.getLanguage();

    if (drawer) {
      if (this.isSettingsRecOpen) {
        drawer.classList.remove('hidden');
        if (toggleText) toggleText.textContent = lang === 'en' ? 'Hide List' : 'ซ่อนรายการ';
        this.renderSettingsRecurringList();
      } else {
        drawer.classList.add('hidden');
        if (toggleText) toggleText.textContent = lang === 'en' ? 'View All' : 'ดูรายการทั้งหมด';
      }
    }
  },

  setSettingsRecFilter(type) {
    this.settingsRecFilter = type;
    const allBtn = document.getElementById('settings-rec-filter-all');
    const expBtn = document.getElementById('settings-rec-filter-exp');
    const incBtn = document.getElementById('settings-rec-filter-inc');

    [allBtn, expBtn, incBtn].forEach(b => {
      if (b) b.className = 'px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer';
    });

    if (type === 'all' && allBtn) allBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-900 shadow-2xs cursor-pointer';
    if (type === 'expense' && expBtn) expBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-400 text-white shadow-xs cursor-pointer';
    if (type === 'income' && incBtn) incBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-400 text-white shadow-xs cursor-pointer';

    this.renderSettingsRecurringList();
  },

  renderSettingsRecurringList() {
    const container = document.getElementById('settings-recurring-list-container');
    if (!container) return;

    const allItems = StorageManager.getRecurringItems();
    let items = allItems;
    if (this.settingsRecFilter === 'expense') items = allItems.filter(i => i.type === 'expense');
    if (this.settingsRecFilter === 'income') items = allItems.filter(i => i.type === 'income');

    const lang = I18n.getLanguage();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-6 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
          <p class="text-xs font-semibold">${lang === 'en' ? 'No recurring items in this filter' : 'ยังไม่มีรายการประจำในหมวดนี้'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const isExp = item.type === 'expense';
      const cat = StorageManager.getCategoryById(item.categoryId || StorageManager.guessCategoryByName(item.name, item.type));
      const displayName = StorageManager.getItemDisplayName(item);

      return `
        <div class="bg-white p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-xl shrink-0">${cat.emoji}</span>
            <div class="min-w-0">
              <p class="text-xs font-extrabold text-slate-900 truncate">${displayName}</p>
              <p class="text-[10px] text-slate-400 truncate">${StorageManager.getCategoryDisplayName(cat)} · ${item.paymentMethod || 'โอนเงิน'}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-extrabold num-font ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
              ${isExp ? '-' : '+'}฿${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
            <div class="flex items-center gap-1">
              <button type="button" onclick="App.openEditRecurringModal('${item.id}')" class="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" title="${I18n.t('btn_edit')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button type="button" onclick="App.deleteRecurring('${item.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer" title="${I18n.t('btn_delete')}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderSettingsCategorySummary() {
    const badgeEl = document.getElementById('settings-cat-count-badge');
    const categories = StorageManager.getCategories();
    const lang = I18n.getLanguage();

    if (badgeEl) {
      badgeEl.textContent = lang === 'en' ? `${categories.length} categories` : `${categories.length} หมวดหมู่`;
    }

    if (this.isSettingsCatOpen) {
      this.renderSettingsCategoryList();
    }
  },

  toggleSettingsCategoryManager() {
    this.isSettingsCatOpen = !this.isSettingsCatOpen;
    const drawer = document.getElementById('settings-category-drawer');
    const toggleText = document.getElementById('settings-cat-toggle-text');
    const lang = I18n.getLanguage();

    if (drawer) {
      if (this.isSettingsCatOpen) {
        drawer.classList.remove('hidden');
        if (toggleText) toggleText.textContent = lang === 'en' ? 'Hide List' : 'ซ่อนหมวดหมู่';
        this.renderSettingsCategoryList();
      } else {
        drawer.classList.add('hidden');
        if (toggleText) toggleText.textContent = lang === 'en' ? 'View All' : 'ดูหมวดหมู่ทั้งหมด';
      }
    }
  },

  setSettingsCatType(type) {
    this.settingsCatType = type;
    const expBtn = document.getElementById('settings-cat-type-exp');
    const incBtn = document.getElementById('settings-cat-type-inc');
    const savBtn = document.getElementById('settings-cat-type-sav');

    const unselectedCls = 'px-3 py-1.5 rounded-xl font-medium text-xs text-slate-500 hover:text-slate-900 cursor-pointer';

    if (expBtn) expBtn.className = (type === 'expense') ? 'px-3 py-1.5 rounded-xl font-bold text-xs bg-rose-400 text-white shadow-xs cursor-pointer' : unselectedCls;
    if (incBtn) incBtn.className = (type === 'income') ? 'px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-400 text-white shadow-xs cursor-pointer' : unselectedCls;
    if (savBtn) savBtn.className = (type === 'savings') ? 'px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-500 text-white shadow-xs cursor-pointer' : unselectedCls;

    this.renderSettingsCategoryList();
  },

  renderSettingsCategoryList() {
    const container = document.getElementById('settings-categories-grid-container');
    if (!container) return;

    const allCategories = StorageManager.getCategories();
    const categories = allCategories.filter(c => c.type === this.settingsCatType);
    const lang = I18n.getLanguage();

    if (categories.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-6 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
          <p class="text-xs font-semibold">${lang === 'en' ? 'No categories found' : 'ไม่พบหมวดหมู่ในกลุ่มนี้'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = categories.map(cat => {
      const displayName = StorageManager.getCategoryDisplayName(cat);
      const badgeText = cat.isDefault ? I18n.t('badge_default_cat') : I18n.t('badge_custom_cat');

      return `
        <div class="bg-white p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0" style="background-color: ${cat.color}18;">
              ${cat.emoji}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1">
                <span class="font-extrabold text-slate-900 text-xs truncate">${displayName}</span>
                <span class="text-[8px] px-1 py-0.2 rounded font-bold ${cat.isDefault ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}">${badgeText}</span>
              </div>
              <span class="text-[10px] text-slate-400 truncate block">${cat.nameEn || cat.name}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="App.openEditCategoryModal('${cat.id}')" class="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" title="${I18n.t('btn_edit_cat')}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button type="button" onclick="App.openDeleteCategoryModal('${cat.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer" title="${I18n.t('btn_delete_cat')}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderSettingsStorageStats() {
    const container = document.getElementById('settings-storage-stats-container');
    if (!container) return;

    const txs = StorageManager.getTransactions();
    const cats = StorageManager.getCategories();
    const recs = StorageManager.getRecurringItems();
    const lang = I18n.getLanguage();

    let storageSizeKb = 0;
    try {
      let totalLen = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('money_memo_')) {
          totalLen += (localStorage.getItem(k) || '').length * 2; // UTF-16 approx
        }
      }
      storageSizeKb = (totalLen / 1024).toFixed(1);
    } catch(e) {}

    container.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="font-bold text-slate-800">📊 ${lang === 'en' ? 'Records:' : 'จำนวนรายการ:'}</span>
        <span class="num-font font-extrabold text-indigo-600">${txs.length}</span>
        <span class="text-slate-400">·</span>
        <span class="font-bold text-slate-800">🏷️ ${lang === 'en' ? 'Categories:' : 'หมวดหมู่:'}</span>
        <span class="num-font font-extrabold text-indigo-600">${cats.length}</span>
        <span class="text-slate-400">·</span>
        <span class="font-bold text-slate-800">📌 ${lang === 'en' ? 'Recurring:' : 'รายการประจำ:'}</span>
        <span class="num-font font-extrabold text-indigo-600">${recs.length}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-slate-400">📦 Storage: <strong class="num-font text-slate-700 font-bold">${storageSizeKb} KB</strong></span>
        <span class="text-emerald-600 font-bold">🟢 PWA Offline Ready</span>
      </div>
    `;
  },

  handleImportJsonFile(input) {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = StorageManager.importFromJSON(event.target.result);
      if (res.success) {
        this.renderAll(true);
        BudgetSimulator.init();
        this.showToast(I18n.t('toast_restored'));
      } else {
        alert((I18n.getLanguage() === 'en' ? 'Error importing file: ' : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ') + res.message);
      }
      input.value = '';
    };
    reader.readAsText(file);
  },

  handleLoadSampleData() {
    const lang = I18n.getLanguage();
    const confirmMsg = lang === 'en' ? 'Load sample demo data for testing?' : 'ต้องการโหลดข้อมูลตัวอย่างสำหรับทดลองใช้งานใช่หรือไม่?';
    if (confirm(confirmMsg)) {
      StorageManager.loadSampleData();
      this.renderAll(true);
      BudgetSimulator.render();
      this.showToast(I18n.t('toast_sample_loaded'));
    }
  },

  handleClearAllData() {
    const lang = I18n.getLanguage();
    const confirm1 = lang === 'en' 
      ? 'Are you sure you want to clear all local records and settings?' 
      : 'คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลบันทึกและรายการทั้งหมดในเครื่องนี้?';
    if (!confirm(confirm1)) return;

    const confirm2 = lang === 'en'
      ? 'Final confirmation: All local records will be deleted permanently.'
      : 'ยืนยันครั้งสุดท้าย: ข้อมูลในเครื่องจะถูกลบทั้งหมด';
    if (!confirm(confirm2)) return;

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('money_memo_') && !k.includes('language')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      StorageManager.init();
      this.renderAll(true);
      BudgetSimulator.init();
      this.showToast(lang === 'en' ? 'All local data cleared 🗑️' : 'ล้างข้อมูลในเครื่องทั้งหมดเรียบร้อยแล้ว 🗑️');
    } catch(e) {
      console.error(e);
    }
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
