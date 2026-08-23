/**
 * Budget Simulator & Financial Analyzer Engine
 */

const BudgetSimulator = {
  simSettings: {
    monthlyIncome: 18000,
    savingsGoal: 5000,
    daysInMonth: 30
  },

  init() {
    this.simSettings = StorageManager.getBudgetSimulator();
    this.render();
    this.bindEvents();
  },

  bindEvents() {
    const incomeInput = document.getElementById('sim-monthly-income');
    const savingsInput = document.getElementById('sim-savings-goal');
    const daysSelect = document.getElementById('sim-days-in-month');
    const addExpenseBtn = document.getElementById('sim-add-expense-btn');
    const resetBtn = document.getElementById('sim-reset-btn');

    if (incomeInput) {
      incomeInput.value = this.simSettings.monthlyIncome;
      incomeInput.addEventListener('input', (e) => {
        this.simSettings.monthlyIncome = Math.max(0, parseFloat(e.target.value) || 0);
        this.saveAndRecalculate();
      });
    }

    if (savingsInput) {
      savingsInput.value = this.simSettings.savingsGoal;
      savingsInput.addEventListener('input', (e) => {
        this.simSettings.savingsGoal = Math.max(0, parseFloat(e.target.value) || 0);
        this.saveAndRecalculate();
      });
    }

    if (daysSelect) {
      daysSelect.value = this.simSettings.daysInMonth || 30;
      daysSelect.addEventListener('change', (e) => {
        this.simSettings.daysInMonth = parseInt(e.target.value, 10) || 30;
        this.saveAndRecalculate();
      });
    }

    if (addExpenseBtn) {
      addExpenseBtn.addEventListener('click', () => {
        this.addFixedExpenseRow('', 0);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('คุณต้องการรีเซ็ตการตั้งค่างบประมาณกลับเป็นค่าเริ่มต้นหรือไม่?')) {
          this.simSettings = JSON.parse(JSON.stringify(DEFAULT_BUDGET_SIMULATOR));
          StorageManager.saveBudgetSimulator(this.simSettings);
          this.render();
        }
      });
    }
  },

  addFixedExpenseRow(name = '', amount = 0) {
    StorageManager.addFixedExpense({ name: name || 'ค่าใช้จ่ายประจำใหม่', amount: amount });
    this.render();
    if (window.App) {
      App.renderAll();
    }
  },

  deleteFixedExpenseRow(id) {
    StorageManager.deleteFixedExpense(id);
    this.render();
    if (window.App) {
      App.renderAll();
    }
  },

  updateFixedExpenseRow(id, field, value) {
    const data = {};
    if (field === 'name') data.name = value;
    if (field === 'amount') data.amount = Math.max(0, parseFloat(value) || 0);
    StorageManager.updateFixedExpense(id, data);
    this.calculateAndRenderResults();
    if (window.App) {
      App.renderQuickFixedChips();
      App.renderFixedExpensesTab();
    }
  },

  saveAndRecalculate() {
    StorageManager.saveBudgetSimulator(this.simSettings);
    this.calculateAndRenderResults();
    if (window.App) {
      App.renderQuickFixedChips();
    }
  },

  render() {
    const incomeInput = document.getElementById('sim-monthly-income');
    const savingsInput = document.getElementById('sim-savings-goal');
    const daysSelect = document.getElementById('sim-days-in-month');

    if (incomeInput) incomeInput.value = this.simSettings.monthlyIncome;
    if (savingsInput) savingsInput.value = this.simSettings.savingsGoal;
    if (daysSelect) daysSelect.value = this.simSettings.daysInMonth || 30;

    this.renderExpenseRows();
    this.calculateAndRenderResults();
  },

  renderExpenseRows() {
    const container = document.getElementById('sim-fixed-expenses-list');
    if (!container) return;

    const fixedExpenses = StorageManager.getFixedExpenses();

    if (fixedExpenses.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
          ยังไม่มีรายการรายจ่ายประจำเดือน กดปุ่มด้านล่างเพื่อเพิ่ม
        </div>
      `;
      return;
    }

    container.innerHTML = fixedExpenses.map((item, index) => `
      <div class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/70 p-2 rounded-xl border border-slate-100 transition-all" data-expense-id="${item.id}">
        <span class="text-[10px] font-semibold text-slate-400 w-4 text-center">${index + 1}</span>
        <input 
          type="text" 
          class="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none placeholder-slate-400"
          value="${item.name}" 
          placeholder="ชื่อรายจ่าย (เช่น ค่าเช่าห้อง, ค่าน้ำไฟ)"
          onchange="BudgetSimulator.updateFixedExpenseRow('${item.id}', 'name', this.value)"
        />
        <div class="relative w-28">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">฿</span>
          <input 
            type="number" 
            class="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-xs text-right font-bold text-slate-800 focus:outline-none num-font"
            value="${item.amount || ''}" 
            placeholder="0"
            min="0"
            step="50"
            oninput="BudgetSimulator.updateFixedExpenseRow('${item.id}', 'amount', this.value)"
          />
        </div>
        <button 
          type="button" 
          onclick="BudgetSimulator.deleteFixedExpenseRow('${item.id}')"
          class="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
          title="ลบแถวนี้"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `).join('');
  },

  calculateAndRenderResults() {
    const income = this.simSettings.monthlyIncome || 0;
    const savings = this.simSettings.savingsGoal || 0;
    const days = this.simSettings.daysInMonth || 30;

    const fixedExpenses = StorageManager.getFixedExpenses();
    const totalFixed = fixedExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalCommitted = totalFixed + savings;
    const remainingForLiving = Math.max(0, income - totalCommitted);
    const deficit = (totalCommitted > income) ? (totalCommitted - income) : 0;

    const dailyAllowance = days > 0 ? (remainingForLiving / days) : 0;
    const weeklyAllowance = dailyAllowance * 7;

    const fixedPct = income > 0 ? ((totalFixed / income) * 100) : 0;
    const savingsPct = income > 0 ? ((savings / income) * 100) : 0;
    const livingPct = income > 0 ? ((remainingForLiving / income) * 100) : 0;

    const totalFixedEl = document.getElementById('sim-calc-total-fixed');
    const remainingEl = document.getElementById('sim-calc-remaining');
    const dailyEl = document.getElementById('sim-calc-daily');
    const weeklyEl = document.getElementById('sim-calc-weekly');
    const savingsPctEl = document.getElementById('sim-savings-pct');
    const healthBadgeEl = document.getElementById('sim-health-badge');
    const healthTipEl = document.getElementById('sim-health-tip');

    if (totalFixedEl) totalFixedEl.textContent = '฿' + totalFixed.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (remainingEl) remainingEl.textContent = '฿' + remainingForLiving.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (dailyEl) dailyEl.textContent = '฿' + dailyAllowance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (weeklyEl) weeklyEl.textContent = '฿' + weeklyAllowance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (savingsPctEl) savingsPctEl.textContent = `(${savingsPct.toFixed(1)}% ของรายได้)`;

    const barFixed = document.getElementById('sim-bar-fixed');
    const barLiving = document.getElementById('sim-bar-living');
    const barSavings = document.getElementById('sim-bar-savings');

    if (barFixed) {
      barFixed.style.width = `${Math.min(100, fixedPct)}%`;
      barFixed.textContent = fixedPct > 8 ? `${fixedPct.toFixed(0)}%` : '';
    }
    if (barLiving) {
      barLiving.style.width = `${Math.min(100, livingPct)}%`;
      barLiving.textContent = livingPct > 8 ? `${livingPct.toFixed(0)}%` : '';
    }
    if (barSavings) {
      barSavings.style.width = `${Math.min(100, savingsPct)}%`;
      barSavings.textContent = savingsPct > 8 ? `${savingsPct.toFixed(0)}%` : '';
    }

    if (healthBadgeEl && healthTipEl) {
      if (deficit > 0) {
        healthBadgeEl.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700';
        healthBadgeEl.textContent = 'งบประมาณติดลบ ⚠️';
        healthTipEl.innerHTML = `⚠️ รายจ่ายประจำ + เงินออม เกินรายได้ไป <strong>฿${deficit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> แนะนำลดรายจ่ายประจำหรือปรับเป้าเงินออม`;
      } else if (dailyAllowance < 150) {
        healthBadgeEl.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800';
        healthBadgeEl.textContent = 'ค่อนข้างตึงตัว';
        healthTipEl.innerHTML = `💡 มีเงินกินใช้เฉลี่ยวันละ <strong>฿${dailyAllowance.toFixed(0)}</strong> แนะนำตรวจสอบรายจ่ายประจำว่ามีส่วนใดลดลงได้`;
      } else if (dailyAllowance >= 150 && dailyAllowance <= 500) {
        healthBadgeEl.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800';
        healthBadgeEl.textContent = 'สมดุลดีเยี่ยม';
        healthTipEl.innerHTML = `✨ วางแผนได้ดีมาก! มีเงินกินใช้วันละ <strong>฿${dailyAllowance.toFixed(2)}</strong> (สัปดาห์ละ <strong>฿${weeklyAllowance.toFixed(0)}</strong>) และออมได้ <strong>${savingsPct.toFixed(1)}%</strong>`;
      } else {
        healthBadgeEl.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800';
        healthBadgeEl.textContent = 'สภาพคล่องสูง';
        healthTipEl.innerHTML = `🎉 ยอดเยี่ยม! มีเงินกินใช้สบายๆ ถึงวันละ <strong>฿${dailyAllowance.toFixed(2)}</strong> สามารถเพิ่มสัดส่วนเงินออมหรือลงทุนได้อีก`;
      }
    }
  }
};
