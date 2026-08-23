/**
 * Budget Simulator & Financial Analyzer Engine
 */

const BudgetSimulator = {
  data: {
    monthlyIncome: 28000,
    savingsGoal: 4000,
    daysInMonth: 30,
    fixedExpenses: []
  },

  init() {
    this.data = StorageManager.getBudgetSimulator();
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
        if (confirm('คุณต้องการรีเซ็ตการตั้งค่างบประมาณกลับเป็นค่าเริ่มต้นหรือไม่?')) {
          this.data = JSON.parse(JSON.stringify(DEFAULT_BUDGET_SIMULATOR));
          StorageManager.saveBudgetSimulator(this.data);
          this.render();
        }
      });
    }
  },

  addFixedExpenseRow(name = '', amount = 0) {
    const newId = 'fe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    this.data.fixedExpenses.push({
      id: newId,
      name: name || 'ค่าใช้จ่ายประจำใหม่',
      amount: amount
    });
    this.saveAndRecalculate();
    this.renderExpenseRows();
    
    // Focus new input
    setTimeout(() => {
      const row = document.querySelector(`[data-expense-id="${newId}"] input[type="text"]`);
      if (row) row.focus();
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

  saveAndRecalculate() {
    StorageManager.saveBudgetSimulator(this.data);
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

    if (this.data.fixedExpenses.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          ยังไม่มีรายการรายจ่ายประจำเดือน กดปุ่ม "+ เพิ่มรายจ่ายประจำ" ด้านล่างเพื่อเพิ่ม
        </div>
      `;
      return;
    }

    container.innerHTML = this.data.fixedExpenses.map((item, index) => `
      <div class="flex items-center gap-2 bg-slate-50/80 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200 transition-all" data-expense-id="${item.id}">
        <span class="text-xs font-semibold text-slate-400 w-5 text-center">${index + 1}</span>
        <input 
          type="text" 
          class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder-slate-400"
          value="${item.name}" 
          placeholder="ชื่อรายจ่าย (เช่น ค่าเช่าห้อง, ค่าน้ำไฟ)"
          onchange="BudgetSimulator.updateFixedExpenseRow('${item.id}', 'name', this.value)"
        />
        <div class="relative w-36">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">฿</span>
          <input 
            type="number" 
            class="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-sm text-right font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 num-font"
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
          class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="ลบแถวนี้"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `).join('');
  },

  calculateAndRenderResults() {
    const income = this.data.monthlyIncome || 0;
    const savings = this.data.savingsGoal || 0;
    const days = this.data.daysInMonth || 30;

    const totalFixed = (this.data.fixedExpenses || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalCommitted = totalFixed + savings;
    const remainingForLiving = Math.max(0, income - totalCommitted);
    const deficit = (totalCommitted > income) ? (totalCommitted - income) : 0;

    const dailyAllowance = days > 0 ? (remainingForLiving / days) : 0;
    const weeklyAllowance = dailyAllowance * 7;

    // เปอร์เซ็นต์สัดส่วน
    const fixedPct = income > 0 ? ((totalFixed / income) * 100) : 0;
    const savingsPct = income > 0 ? ((savings / income) * 100) : 0;
    const livingPct = income > 0 ? ((remainingForLiving / income) * 100) : 0;

    // อัปเดตตัวเลขบน UI
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

    // แถบ Progress Bar 50-30-20
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

    // วิเคราะห์สุขภาพทางการเงินและคำแนะนำ (Financial Health Insights)
    if (healthBadgeEl && healthTipEl) {
      if (deficit > 0) {
        healthBadgeEl.className = 'px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-1.5';
        healthBadgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> งบประมาณติดลบ (Deficit ⚠️)';
        healthTipEl.innerHTML = `⚠️ รายจ่ายประจำ + เงินออม เกินรายได้ไป <strong>฿${deficit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> คุณจำเป็นต้องลดรายจ่ายประจำลง หรือปรับลดเป้าหมายเงินออมก่อน เพื่อให้มีเงินพอใช้ในแต่ละวัน`;
      } else if (dailyAllowance < 150) {
        healthBadgeEl.className = 'px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5';
        healthBadgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> งบค่อนข้างตึงมือ (Tight)';
        healthTipEl.innerHTML = `💡 คุณมีเงินใช้เฉลี่ยวันละ <strong>฿${dailyAllowance.toFixed(0)}</strong> ซึ่งอาจจะตึงตัวสำหรับค่าอาหารและการเดินทาง แนะนำลองตรวจสอบรายจ่ายประจำว่ามีส่วนใดลดลงได้ เช่น ค่าแพ็กเกจเน็ต หรือของใช้ที่ไม่จำเป็น`;
      } else if (dailyAllowance >= 150 && dailyAllowance <= 500) {
        healthBadgeEl.className = 'px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1.5';
        healthBadgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-500"></span> สภาพคล่องระดับสมดุล (Healthy Balanced)';
        healthTipEl.innerHTML = `✨ วางแผนได้ดีมาก! คุณมีเงินใช้กินใช้วันละ <strong>฿${dailyAllowance.toFixed(2)}</strong> (สัปดาห์ละ <strong>฿${weeklyAllowance.toFixed(0)}</strong>) และยังสามารถเก็บออมได้ <strong>${savingsPct.toFixed(1)}%</strong> ของรายได้`;
      } else {
        healthBadgeEl.className = 'px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5';
        healthBadgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span> สภาพคล่องยอดเยี่ยม (Excellent!)';
        healthTipEl.innerHTML = `🎉 ยอดเยี่ยมมาก! คุณมีเงินกินใช้สบายๆ ถึงวันละ <strong>฿${dailyAllowance.toFixed(2)}</strong> หากต้องการสร้างความมั่งคั่งเพิ่มขึ้น สามารถเพิ่มสัดส่วนเงินออม/การลงทุนได้อีก!`;
      }
    }
  }
};
