/**
 * Budget Simulator & Financial Sandbox Engine (Bilingual Support)
 */

const BudgetSimulator = {
  data: {
    monthlyIncome: 18000,
    savingsGoal: 5000,
    daysInMonth: 30,
    fixedExpenses: []
  },

  init() {
    this.data = StorageManager.getBudgetSimulator();
    if (!this.data.fixedExpenses || this.data.fixedExpenses.length === 0) {
      this.data.fixedExpenses = [
        { id: 'sim_fe_1', name: 'ค่าเช่าห้องจำลอง', nameEn: 'Simulated Rent', amount: 2800 },
        { id: 'sim_fe_2', name: 'ค่าน้ำไฟจำลอง', nameEn: 'Simulated Utilities', amount: 2200 },
        { id: 'sim_fe_3', name: 'ค่าเน็ตจำลอง', nameEn: 'Simulated Internet', amount: 300 },
        { id: 'sim_fe_4', name: 'ค่าเดินทางจำลอง', nameEn: 'Simulated Transport', amount: 400 }
      ];
      this.save();
    }
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
      incomeInput.value = this.data.monthlyIncome;
      incomeInput.addEventListener('input', (e) => {
        this.data.monthlyIncome = Math.max(0, parseFloat(e.target.value) || 0);
        this.saveAndRecalculate();
      });
    }

    if (savingsInput) {
      savingsInput.value = this.data.savingsGoal;
      savingsInput.addEventListener('input', (e) => {
        this.data.savingsGoal = Math.max(0, parseFloat(e.target.value) || 0);
        this.saveAndRecalculate();
      });
    }

    if (daysSelect) {
      daysSelect.value = this.data.daysInMonth || 30;
      daysSelect.addEventListener('change', (e) => {
        this.data.daysInMonth = parseInt(e.target.value, 10) || 30;
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
        const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';
        const confirmMsg = lang === 'en' ? 'Reset budget simulation back to default values?' : 'คุณต้องการรีเซ็ตการตั้งค่างบประมาณจำลองกลับเป็นค่าเริ่มต้นหรือไม่?';
        if (confirm(confirmMsg)) {
          this.data = JSON.parse(JSON.stringify(DEFAULT_BUDGET_SIMULATOR));
          this.save();
          this.render();
        }
      });
    }
  },

  addFixedExpenseRow(name = '', amount = 0) {
    const newId = 'sim_fe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    
    this.data.fixedExpenses.push({
      id: newId,
      name: name,
      amount: amount
    });
    this.saveAndRecalculate();
    this.renderExpenseRows();
    
    setTimeout(() => {
      const input = document.querySelector(`[data-expense-id="${newId}"] input[type="text"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  },

  deleteFixedExpenseRow(id) {
    this.data.fixedExpenses = this.data.fixedExpenses.filter(e => e.id !== id);
    this.saveAndRecalculate();
    this.renderExpenseRows();
  },

  updateFixedExpenseRow(id, field, value) {
    const item = this.data.fixedExpenses.find(e => e.id === id);
    if (item) {
      if (field === 'name') item.name = value;
      if (field === 'amount') item.amount = Math.max(0, parseFloat(value) || 0);
      this.saveAndRecalculate();
    }
  },

  save() {
    StorageManager.saveBudgetSimulator(this.data);
  },

  saveAndRecalculate() {
    this.save();
    this.calculateAndRenderResults();
  },

  render() {
    const incomeInput = document.getElementById('sim-monthly-income');
    const savingsInput = document.getElementById('sim-savings-goal');
    const daysSelect = document.getElementById('sim-days-in-month');

    if (incomeInput) incomeInput.value = this.data.monthlyIncome;
    if (savingsInput) savingsInput.value = this.data.savingsGoal;
    if (daysSelect) daysSelect.value = this.data.daysInMonth || 30;

    this.renderExpenseRows();
    this.calculateAndRenderResults();
  },

  renderExpenseRows() {
    const container = document.getElementById('sim-fixed-expenses-list');
    if (!container) return;

    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';

    if (!this.data.fixedExpenses || this.data.fixedExpenses.length === 0) {
      const emptyText = lang === 'en' ? 'No simulated expenses. Click button below to add.' : 'ยังไม่มีรายการรายจ่ายจำลอง กดปุ่มด้านล่างเพื่อเพิ่ม';
      container.innerHTML = `
        <div class="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
          ${emptyText}
        </div>
      `;
      return;
    }

    container.innerHTML = this.data.fixedExpenses.map((item, index) => {
      const itemName = item.name !== undefined ? item.name : (StorageManager.getItemDisplayName(item) || '');
      const placeholderText = lang === 'en' ? 'e.g. Gym, Streaming, Bills...' : 'เช่น ค่าฟิตเนส, ค่าเน็ต, ค่าห้อง...';
      return `
        <div class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/70 p-2 rounded-xl border border-slate-100 transition-all" data-expense-id="${item.id}">
          <span class="text-[10px] font-semibold text-slate-400 w-4 text-center">${index + 1}</span>
          <input 
            type="text" 
            class="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none placeholder-slate-400"
            value="${itemName}" 
            placeholder="${placeholderText}"
            oninput="BudgetSimulator.updateFixedExpenseRow('${item.id}', 'name', this.value)"
          />
          <div class="relative w-28">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">฿</span>
            <input 
              type="number" 
              class="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-xs text-right font-bold text-slate-800 focus:outline-none num-font"
              value="${item.amount ? item.amount : ''}" 
              placeholder="0"
              min="0"
              step="50"
              oninput="BudgetSimulator.updateFixedExpenseRow('${item.id}', 'amount', this.value)"
            />
          </div>
          <button 
            type="button" 
            onclick="BudgetSimulator.deleteFixedExpenseRow('${item.id}')"
            class="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
            title="${lang === 'en' ? 'Delete row' : 'ลบแถวนี้'}"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;
    }).join('');
  },

  calculateAndRenderResults() {
    const income = this.data.monthlyIncome || 0;
    const savings = this.data.savingsGoal || 0;
    const days = this.data.daysInMonth || 30;
    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';

    const totalFixed = (this.data.fixedExpenses || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
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
    
    if (savingsPctEl) {
      const savingsSuffix = lang === 'en' ? 'of income' : 'ของรายได้';
      savingsPctEl.textContent = `(${savingsPct.toFixed(1)}% ${savingsSuffix})`;
    }

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
        healthBadgeEl.textContent = lang === 'en' ? 'Deficit ⚠️' : 'งบจำลองติดลบ ⚠️';
        healthTipEl.innerHTML = lang === 'en' 
          ? `⚠️ Expenses & Savings exceed income by <strong>฿${deficit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>. Consider reducing fixed expenses or savings target.`
          : `⚠️ รายจ่ายจำลอง + เงินออม เกินรายได้ไป <strong>฿${deficit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> แนะนำปรับลดรายจ่ายหรือเป้าเงินออม`;
      } else if (dailyAllowance < 150) {
        healthBadgeEl.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800';
        healthBadgeEl.textContent = lang === 'en' ? 'Tight Budget' : 'ค่อนข้างตึงตัว';
        healthTipEl.innerHTML = lang === 'en'
          ? `💡 Daily allowance is <strong>฿${dailyAllowance.toFixed(0)}</strong>. Try fine-tuning numbers to balance your budget.`
          : `💡 มีเงินกินใช้เฉลี่ยวันละ <strong>฿${dailyAllowance.toFixed(0)}</strong> สามารถทดลองปรับตัวเลขเพื่อค้นหาสมดุล`;
      } else if (dailyAllowance >= 150 && dailyAllowance <= 500) {
        healthBadgeEl.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800';
        healthBadgeEl.textContent = lang === 'en' ? 'Well Balanced' : 'สมดุลดีเยี่ยม';
        healthTipEl.innerHTML = lang === 'en'
          ? `✨ Great plan! Daily allowance is <strong>฿${dailyAllowance.toFixed(2)}</strong> (Weekly: <strong>฿${weeklyAllowance.toFixed(0)}</strong>) with <strong>${savingsPct.toFixed(1)}%</strong> savings rate.`
          : `✨ วางแผนจำลองได้ดีมาก! เงินกินใช้วันละ <strong>฿${dailyAllowance.toFixed(2)}</strong> (สัปดาห์ละ <strong>฿${weeklyAllowance.toFixed(0)}</strong>) และออมได้ <strong>${savingsPct.toFixed(1)}%</strong>`;
      } else {
        healthBadgeEl.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800';
        healthBadgeEl.textContent = lang === 'en' ? 'High Liquidity' : 'สภาพคล่องสูง';
        healthTipEl.innerHTML = lang === 'en'
          ? `🎉 Excellent! Simulated daily allowance is <strong>฿${dailyAllowance.toFixed(2)}</strong>. You can consider boosting your savings target.`
          : `🎉 ยอดเยี่ยม! จำลองว่ามีเงินกินใช้วันละ <strong>฿${dailyAllowance.toFixed(2)}</strong> สามารถเพิ่มเป้าเงินออมได้`;
      }
    }
  }
};
