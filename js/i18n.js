/**
 * Internationalization (i18n) Engine for Money Memo
 * Supports Thai (TH) and English (EN) with live switching
 */

const I18N_STORAGE_KEY = 'money_memo_language_v1';

const TRANSLATIONS = {
  th: {
    // Header
    app_title: 'Money Memo',
    app_subtitle: 'บันทึกรายรับ-รายจ่าย & จัดการรายการประจำเดือน',
    btn_sample: '✨ โหลดตัวอย่าง',
    btn_export_csv: 'CSV / Excel',
    btn_export_json: 'สำรองข้อมูล JSON',
    btn_import_json: 'นำเข้าข้อมูล JSON',

    // Navigation Tabs
    tab_transactions: 'บันทึก & รายการ',
    tab_dashboard: 'แดชบอร์ด',
    tab_simulator: 'จำลองเงินกินใช้',
    tab_recurring: 'รายการประจำเดือน',
    tab_categories: 'จัดการหมวดหมู่',

    // Tab 1: Transactions
    quick_rec_banner_title: 'ดึงรายการประจำเดือนมาบันทึก',
    quick_rec_banner_desc: 'เลือกรายการประจำ (รายจ่ายหรือรายรับ) เพื่อนำเข้าพร้อมกัน หรือกดปุ่มลัดใต้ฟอร์ม',
    btn_batch_import: '📋 นำเข้ารายการประจำ',
    btn_setup_recurring: '⚙️ ตั้งค่ารายการประจำ',
    
    form_new_entry: 'บันทึกรายการใหม่',
    offline_auto_save: 'บันทึกอัตโนมัติ (Offline)',
    type_expense: '🔴 รายจ่าย (Expense)',
    type_income: '🟢 รายรับ (Income)',
    
    quick_chips_expense_title: 'ปุ่มลัดรายจ่ายประจำ:',
    quick_chips_income_title: 'ปุ่มลัดรายรับประจำ:',
    btn_setup_shortcuts: '+ ตั้งค่าปุ่มลัด',
    no_shortcuts_expense: 'ยังไม่มีปุ่มลัดรายจ่าย (กด "+ ตั้งค่าปุ่มลัด" เพื่อเพิ่ม)',
    no_shortcuts_income: 'ยังไม่มีปุ่มลัดรายรับ (กด "+ ตั้งค่าปุ่มลัด" เพื่อเพิ่ม)',

    label_amount: 'จำนวนเงิน (บาท) *',
    label_category: 'เลือกหมวดหมู่ *',
    btn_add_category: '➕ เพิ่มหมวดหมู่',
    btn_manage_categories: '⚙️ จัดการหมวดหมู่',
    label_datetime: 'วันที่และเวลา',
    label_payment: 'ช่องทางชำระเงิน',
    label_note: 'บันทึกช่วยจำ (Note)',
    placeholder_note: 'เช่น ข้าวกะเพรา, ค่าห้องประจำเดือน, เงินเดือน...',
    btn_save_expense: '➕ บันทึกรายจ่าย',
    btn_save_income: '➕ บันทึกรายรับ',

    history_title: 'ประวัติรายการบันทึก',
    placeholder_search: 'ค้นหาโน้ต...',
    filter_all: 'ทั้งหมด',
    filter_expense: 'รายจ่าย',
    filter_income: 'รายรับ',
    history_empty_title: 'ยังไม่มีรายการบันทึก',
    history_empty_desc: 'กดบันทึกรายการ หรือคลิก "โหลดตัวอย่าง" ด้านบน',

    // Tab 2: Dashboard
    btn_prev_month: 'เดือนก่อนหน้า',
    btn_next_month: 'เดือนถัดไป',
    btn_this_month: 'เดือนนี้',
    view_overview: '📊 สรุปภาพรวม',
    view_daily: '📅 แจกแจงรายวัน',
    view_yearly: '📆 สรุปภาพรวมรายปี',

    btn_prev_year: 'ปีก่อนหน้า',
    btn_next_year: 'ปีถัดไป',
    btn_this_year: 'ปีนี้',

    kpi_total_income: 'รายรับรวม (Total Income)',
    kpi_total_income_sub: 'ยอดรับทั้งหมดในเดือนนี้',
    kpi_total_expense: 'รายจ่ายรวม (Total Expense)',
    kpi_total_expense_sub: 'ยอดใช้จ่ายทั้งหมดในเดือนนี้',
    kpi_net_balance: 'คงเหลือสุทธิ (Net Balance)',
    kpi_net_sub: 'คำนวณจาก รายรับ - รายจ่าย',

    yearly_income: 'รายรับรวมทั้งปี (Annual Income)',
    yearly_income_sub: 'ยอดรับทั้งหมดตลอดทั้งปี',
    yearly_expense: 'รายจ่ายรวมทั้งปี (Annual Expense)',
    yearly_expense_sub: 'ยอดใช้จ่ายทั้งหมดตลอดทั้งปี',
    yearly_savings: 'เงินออมคงเหลือทั้งปี (Annual Savings)',
    yearly_savings_sub: 'คำนวณจาก รายรับ - รายจ่าย ทั้งปี',
    yearly_savings_rate: 'อัตราการออมเฉลี่ย (Savings Rate)',
    yearly_savings_rate_sub: 'สัดส่วนเงินเก็บต่อรายได้ทั้งปี',

    status_surplus: 'คงเหลือสุทธิเป็นบวก (Surplus ✨)',
    status_balanced: 'รายรับเท่ากับรายจ่ายพอดี (Balanced)',
    status_deficit: 'รายจ่ายมากกว่ารายรับ (Deficit ⚠️)',

    chart_category_title: 'สัดส่วนรายจ่ายตามหมวดหมู่',
    chart_category_empty: 'ยังไม่มีรายการรายจ่ายในเดือนนี้',
    top_categories_title: 'หมวดหมู่ที่ใช้เงินมากที่สุด (Top 5)',
    top_categories_empty: 'ยังไม่มีข้อมูลการใช้จ่ายในเดือนนี้',
    top_categories_tip: '💡 ตรวจสอบหมวดหมู่หลักเพื่อช่วยลดรายจ่ายที่ไม่จำเป็นในเดือนถัดไป',
    chart_daily_trend_title: 'แนวโน้มการใช้จ่ายรายวัน (Daily Spending Trend)',
    chart_monthly_bar_title: 'เปรียบเทียบรายรับ vs รายจ่าย 12 เดือน (Monthly Comparison)',
    chart_yearly_category_title: 'สัดส่วนรายจ่ายตลอดทั้งปี',
    yearly_table_title: 'ตารางสรุปผลการเงิน 12 เดือน (12-Month Performance)',
    th_month: 'เดือน',
    th_income: 'รายรับ (฿)',
    th_expense: 'รายจ่าย (฿)',
    th_net: 'คงเหลือสุทธิ (฿)',
    th_savings_rate: '% ออมเงิน',
    daily_breakdown_title: 'รายการแจกแจงตามวัน (Daily Breakdown)',
    daily_breakdown_empty: 'ไม่มีรายการใช้จ่ายในเดือนนี้',

    // Tab 3: Budget Simulator
    sim_title: 'เครื่องมือจำลองงบประมาณ (Sandbox)',
    sim_desc: 'ทดลองปรับเปลี่ยนตัวเลขได้อิสระ ไม่ส่งผลกระทบต่อบัญชีจริง',
    sim_btn_reset: 'รีเซ็ตค่าจำลอง',
    sim_label_income: 'รายได้จำลองต่อเดือน (บาท)',
    sim_label_savings: 'เป้าหมายเงินออมจำลอง (บาท)',
    sim_label_days: 'จำนวนวันสำหรับหารเฉลี่ย',
    sim_days_30: '30 วัน (เดือนมาตรฐาน)',
    sim_days_31: '31 วัน (เดือนที่มี 31 วัน)',
    sim_days_28: '28 วัน (กุมภาพันธ์)',
    sim_label_expenses: 'รายจ่ายประจำจำลอง (Simulated Expenses)',
    sim_expenses_hint: 'เพิ่ม/ลบได้อิสระ',
    sim_btn_add_expense: '+ เพิ่มรายจ่ายจำลอง',
    sim_empty_expenses: 'ยังไม่มีรายการรายจ่ายจำลอง กดปุ่มด้านล่างเพื่อเพิ่ม',

    sim_daily_allowance: 'เงินสำหรับกินใช้เฉลี่ยรายวัน (Daily Allowance)',
    sim_per_day: '/ วัน',
    sim_weekly_avg: 'เฉลี่ยสัปดาห์ละ:',
    sim_total_fixed: 'รวมรายจ่ายประจำจำลอง',
    sim_remaining: 'เงินกินใช้คงเหลือทั้งเดือน',
    sim_rule_title: 'สัดส่วนการจัดสรรเงิน (50/30/20 Rule)',
    sim_rule_needs: 'จำเป็น (Needs)',
    sim_rule_needs_target: 'เป้าหมาย ≤ 50%',
    sim_rule_wants: 'กินใช้ (Wants)',
    sim_rule_wants_target: 'เป้าหมาย ~30%',
    sim_rule_savings: 'เงินออม (Savings)',
    sim_rule_savings_target: 'เป้าหมาย ≥ 20%',

    // Tab 4: Recurring Items
    rec_banner_title: 'จัดการรายรับ & รายจ่าย ประจำเดือน (Recurring Manager)',
    rec_banner_desc: 'กำหนดรายการที่ต้องรับหรือจ่ายทุกเดือนที่นี่ รายการเหล่านี้จะกลายเป็น ปุ่มลัด (Quick Chips) แยกตามประเภท (รายรับ/รายจ่าย) ในหน้าบันทึกโดยอัตโนมัติ!',
    btn_open_add_recurring: '➕ เปิดหน้าต่างเพิ่มรายการ',

    rec_kpi_income: 'รายรับประจำรวม (Incomes)',
    rec_kpi_income_sub: 'เงินเดือน & รายได้ประจำ',
    rec_kpi_expense: 'รายจ่ายประจำรวม (Expenses)',
    rec_kpi_expense_sub: 'บิล & ค่าใช้จ่ายฟิกซ์',
    rec_kpi_net: 'คงเหลือประจำสุทธิ (Net)',
    rec_kpi_net_sub: 'รายรับประจำ - รายจ่ายประจำ',

    rec_inline_form_title: 'เพิ่มรายการประจำเดือนใหม่ (รายรับ / รายจ่าย)',
    rec_inline_form_desc: 'เลือกประเภท กรอกข้อมูล แล้วกดบันทึกเป็นปุ่มลัดได้ทันที',
    rec_preset_hint: 'ตัวอย่างรายการยอดนิยม (กดเพื่อกรอกอัตโนมัติ):',
    rec_label_name: 'ชื่อรายการประจำ *',
    rec_label_amount: 'จำนวนเงิน (บาท) *',
    rec_label_cat: 'หมวดหมู่',
    rec_btn_save: '➕ บันทึก',
    rec_list_title: 'รายการประจำเดือนทั้งหมดที่ตั้งค่าไว้',
    rec_filter_all: 'ทั้งหมด',
    rec_filter_expense: '🔴 รายจ่ายประจำ',
    rec_filter_income: '🟢 รายรับประจำ',
    rec_empty_list: 'ยังไม่มีรายการประจำในหมวดนี้',
    rec_empty_list_desc: 'กรอกข้อมูลที่กล่องด้านบน หรือกดเลือกตัวอย่างเพื่อเริ่มเพิ่มรายการ',
    btn_quick_log: '⚡ บันทึกลงบัญชีทันที',
    btn_edit: 'แก้ไข',
    btn_delete: 'ลบ',

    // Tab 5: Category Manager
    cat_mgr_title: 'จัดการหมวดหมู่ (Category Manager)',
    cat_mgr_desc: 'เพิ่ม แก้ไข หรือลบหมวดหมู่รายรับ-รายจ่ายตามความต้องการของคุณ',
    btn_add_new_category: '➕ เพิ่มหมวดหมู่ใหม่',
    btn_restore_default_categories: '🔄 คืนค่าเริ่มต้น',
    cat_mgr_expenses_tab: '🔴 หมวดหมู่รายจ่าย',
    cat_mgr_incomes_tab: '🟢 หมวดหมู่รายรับ',
    badge_default_cat: 'ค่าเริ่มต้น',
    badge_custom_cat: 'กำหนดเอง',
    btn_edit_cat: 'แก้ไข',
    btn_delete_cat: 'ลบ',
    modal_del_cat_title: 'ยืนยันการลบหมวดหมู่?',
    modal_del_cat_desc: 'คุณต้องการลบหมวดหมู่นี้จริงๆ หรือไม่? รายการที่เคยบันทึกไว้ในหมวดนี้จะไม่หาย แต่จะแสดงเป็นหมวดหมู่อื่นๆ',

    // Export Filter Modal
    modal_export_title: 'ส่งออกข้อมูล CSV / Excel (Export Report)',
    modal_export_desc: 'เลือกตัวกรองช่วงเวลา ประเภท และหมวดหมู่ที่ต้องการส่งออกเป็นตาราง Excel',
    export_filter_date: 'ช่วงเวลาที่ต้องการส่งออก',
    export_date_all: 'ทุกช่วงเวลา (All Time)',
    export_date_this_month: 'เฉพาะเดือนนี้ (This Month)',
    export_date_last_month: 'เฉพาะเดือนที่ผ่านมา (Last Month)',
    export_date_custom: 'กำหนดช่วงวันที่เอง (Custom Range)',
    export_from_date: 'ตั้งแต่วันที่',
    export_to_date: 'ถึงวันที่',
    export_filter_type: 'ประเภทรายการ',
    export_filter_category: 'หมวดหมู่',
    export_filter_payment: 'ช่องทางชำระเงิน',
    export_all_cats: 'ทุกหมวดหมู่ (All Categories)',
    export_all_payments: 'ทุกช่องทางชำระเงิน (All Methods)',
    btn_download_export: '📥 ดาวน์โหลดไฟล์ CSV / Excel',

    // Modals
    modal_add_cat_title: 'เพิ่มหมวดหมู่ใหม่',
    modal_edit_cat_title: 'แก้ไขหมวดหมู่',
    modal_add_cat_type: 'ประเภทหมวดหมู่',
    modal_add_cat_emoji: 'ไอคอนอิโมจิ (Emoji) *',
    modal_add_cat_emoji_hint: 'เลือกจากด้านล่างหรือพิมพ์เองได้',
    modal_add_cat_name: 'ชื่อหมวดหมู่ (ภาษาไทย) *',
    modal_add_cat_name_en: 'ชื่อหมวดหมู่ภาษาอังกฤษ (Name in English)',
    modal_add_cat_color: 'สีประจำหมวดหมู่',
    btn_cancel: 'ยกเลิก',
    btn_save_cat: '➕ บันทึกหมวดหมู่',

    modal_batch_title: 'นำเข้ารายการประจำเดือนเข้าบัญชี',
    modal_batch_desc: 'เลือกรายการที่คุณต้องการบันทึกลงบัญชีในเดือนนี้ แก้ไขยอดเงินตามจริง แล้วกดบันทึกพร้อมกันได้ทันที',
    modal_batch_date: 'วันที่บันทึกรายการ',
    modal_batch_payment: 'ช่องทางชำระเงินเริ่มต้น',
    modal_batch_select_all: 'เลือกทั้งหมด',
    modal_batch_btn_save: '➕ บันทึกรายการที่เลือกเข้าบัญชี',

    modal_edit_title: 'แก้ไขข้อมูลรายการ',
    modal_edit_btn_save: 'บันทึกการแก้ไข',

    modal_del_title: 'ยืนยันการลบรายการ?',
    modal_del_desc: 'ข้อมูลนี้จะถูกลบออกจากบันทึกอย่างถาวร',
    modal_del_confirm: 'ยืนยันการลบ',

    // Toasts & Alerts
    toast_saved: 'บันทึกเรียบร้อย',
    toast_exp_saved: 'บันทึกรายจ่ายเรียบร้อย 🔴',
    toast_inc_saved: 'บันทึกรายรับเรียบร้อย 🟢',
    toast_updated: 'อัปเดตรายการเรียบร้อยแล้ว ✅',
    toast_deleted: 'ลบรายการเรียบร้อย 🗑️',
    toast_sample_loaded: 'โหลดข้อมูลตัวอย่างเรียบร้อยแล้ว ✨',
    toast_restored: 'กู้คืนข้อมูลสำเร็จเรียบร้อยแล้ว 🎉',
    toast_cat_added: 'เพิ่มหมวดหมู่สำเร็จ 🎉',
    toast_cat_updated: 'อัปเดตหมวดหมู่สำเร็จ ✅',
    toast_cat_deleted: 'ลบหมวดหมู่เรียบร้อยแล้ว 🗑️',
    toast_cat_restored: 'คืนค่าหมวดหมู่เริ่มต้นเรียบร้อยแล้ว 🔄',
    toast_exported: 'ส่งออกไฟล์เรียบร้อยแล้ว 📥'
  },

  en: {
    // Header
    app_title: 'Money Memo',
    app_subtitle: 'Income & Expense Tracker & Monthly Planner',
    btn_sample: '✨ Load Sample',
    btn_export_csv: 'CSV / Excel',
    btn_export_json: 'Backup JSON',
    btn_import_json: 'Restore JSON',

    // Navigation Tabs
    tab_transactions: 'Records & List',
    tab_dashboard: 'Dashboard',
    tab_simulator: 'Budget Simulator',
    tab_recurring: 'Recurring Items',
    tab_categories: 'Category Manager',

    // Tab 1: Transactions
    quick_rec_banner_title: 'Import Monthly Recurring Items',
    quick_rec_banner_desc: 'Select recurring items (expenses or incomes) to log in bulk or use shortcuts below.',
    btn_batch_import: '📋 Batch Import',
    btn_setup_recurring: '⚙️ Manage Recurring',
    
    form_new_entry: 'New Transaction',
    offline_auto_save: 'Offline Auto-save',
    type_expense: '🔴 Expense',
    type_income: '🟢 Income',
    
    quick_chips_expense_title: 'Recurring Expense Shortcuts:',
    quick_chips_income_title: 'Recurring Income Shortcuts:',
    btn_setup_shortcuts: '+ Manage Shortcuts',
    no_shortcuts_expense: 'No expense shortcuts yet (Click "+ Manage Shortcuts" to add)',
    no_shortcuts_income: 'No income shortcuts yet (Click "+ Manage Shortcuts" to add)',

    label_amount: 'Amount (THB) *',
    label_category: 'Select Category *',
    btn_add_category: '➕ Add Category',
    btn_manage_categories: '⚙️ Manage Categories',
    label_datetime: 'Date & Time',
    label_payment: 'Payment Method',
    label_note: 'Memo / Note',
    placeholder_note: 'e.g., Lunch, Coffee, Apartment Rent, Salary...',
    btn_save_expense: '➕ Save Expense',
    btn_save_income: '➕ Save Income',

    history_title: 'Transaction History',
    placeholder_search: 'Search notes...',
    filter_all: 'All',
    filter_expense: 'Expense',
    filter_income: 'Income',
    history_empty_title: 'No transactions recorded yet',
    history_empty_desc: 'Add a new entry or click "Load Sample" above.',

    // Tab 2: Dashboard
    btn_prev_month: 'Previous Month',
    btn_next_month: 'Next Month',
    btn_this_month: 'This Month',
    view_overview: '📊 Overview',
    view_daily: '📅 Daily Breakdown',

    kpi_total_income: 'Total Income',
    kpi_total_income_sub: 'Total received this month',
    kpi_total_expense: 'Total Expense',
    kpi_total_expense_sub: 'Total spent this month',
    kpi_net_balance: 'Net Balance',
    kpi_net_sub: 'Income minus Expenses',

    status_surplus: 'Positive Net Surplus (Surplus ✨)',
    status_balanced: 'Income equals Expenses (Balanced)',
    status_deficit: 'Spending exceeds Income (Deficit ⚠️)',

    chart_category_title: 'Expenses by Category',
    chart_category_empty: 'No expense records found for this month',
    top_categories_title: 'Top 5 Expense Categories',
    top_categories_empty: 'No spending data in this month',
    top_categories_tip: '💡 Monitor top categories to optimize discretionary spending for next month.',
    chart_daily_trend_title: 'Daily Spending Trend',
    daily_breakdown_title: 'Daily Breakdown',
    daily_breakdown_empty: 'No transactions for this month',

    // Tab 3: Budget Simulator
    sim_title: 'Budget Simulator (Sandbox)',
    sim_desc: 'Simulate and calculate your daily spending allowance without affecting real records.',
    sim_btn_reset: 'Reset Simulation',
    sim_label_income: 'Simulated Monthly Income (THB)',
    sim_label_savings: 'Simulated Savings Goal (THB)',
    sim_label_days: 'Days for Daily Average',
    sim_days_30: '30 Days (Standard month)',
    sim_days_31: '31 Days (31-day month)',
    sim_days_28: '28 Days (February)',
    sim_label_expenses: 'Simulated Fixed Expenses',
    sim_expenses_hint: 'Add/Remove freely',
    sim_btn_add_expense: '+ Add Simulated Expense',
    sim_empty_expenses: 'No simulated fixed expenses. Click button below to add.',

    sim_daily_allowance: 'Daily Living Allowance',
    sim_per_day: '/ day',
    sim_weekly_avg: 'Weekly average:',
    sim_total_fixed: 'Total Fixed Expenses',
    sim_remaining: 'Remaining Monthly Budget',
    sim_rule_title: 'Budget Allocation (50/30/20 Rule)',
    sim_rule_needs: 'Needs (Fixed)',
    sim_rule_needs_target: 'Target ≤ 50%',
    sim_rule_wants: 'Wants (Living)',
    sim_rule_wants_target: 'Target ~30%',
    sim_rule_savings: 'Savings',
    sim_rule_savings_target: 'Target ≥ 20%',

    // Tab 4: Recurring Items
    rec_banner_title: 'Recurring Monthly Manager (Income & Expenses)',
    rec_banner_desc: 'Configure items you receive or pay every month. These automatically become dynamic 1-click shortcuts in your record tab!',
    btn_open_add_recurring: '➕ Add Recurring Item',

    rec_kpi_income: 'Total Recurring Income',
    rec_kpi_income_sub: 'Salary & Monthly Incomes',
    rec_kpi_expense: 'Total Recurring Expenses',
    rec_kpi_expense_sub: 'Bills & Fixed Commitments',
    rec_kpi_net: 'Net Monthly Recurring',
    rec_kpi_net_sub: 'Recurring Income minus Expenses',

    rec_inline_form_title: 'Add New Recurring Item (Income / Expense)',
    rec_inline_form_desc: 'Select type, enter details, and save as a reusable shortcut.',
    rec_preset_hint: 'Popular presets (Click to autofill):',
    rec_label_name: 'Item Name *',
    rec_label_amount: 'Amount (THB) *',
    rec_label_cat: 'Category',
    rec_btn_save: '➕ Save',
    rec_list_title: 'All Saved Recurring Items',
    rec_filter_all: 'All',
    rec_filter_expense: '🔴 Expenses',
    rec_filter_income: '🟢 Incomes',
    rec_empty_list: 'No recurring items in this category',
    rec_empty_list_desc: 'Fill the form above or click presets to get started.',
    btn_quick_log: '⚡ Quick Log',
    btn_edit: 'Edit',
    btn_delete: 'Delete',

    // Tab 5: Category Manager
    cat_mgr_title: 'Category Manager',
    cat_mgr_desc: 'Add, edit, or delete expense and income categories to fit your lifestyle',
    btn_add_new_category: '➕ Add New Category',
    btn_restore_default_categories: '🔄 Restore Defaults',
    cat_mgr_expenses_tab: '🔴 Expense Categories',
    cat_mgr_incomes_tab: '🟢 Income Categories',
    badge_default_cat: 'Default',
    badge_custom_cat: 'Custom',
    btn_edit_cat: 'Edit',
    btn_delete_cat: 'Delete',
    modal_del_cat_title: 'Delete this category?',
    modal_del_cat_desc: 'Are you sure you want to delete this category? Past transactions with this category will remain safe.',

    // Export Filter Modal
    modal_export_title: 'Export Report (CSV / Excel)',
    modal_export_desc: 'Filter by date range, type, category, or payment method before downloading',
    export_filter_date: 'Date Range',
    export_date_all: 'All Time',
    export_date_this_month: 'This Month',
    export_date_last_month: 'Last Month',
    export_date_custom: 'Custom Range',
    export_from_date: 'From Date',
    export_to_date: 'To Date',
    export_filter_type: 'Transaction Type',
    export_filter_category: 'Category',
    export_filter_payment: 'Payment Method',
    export_all_cats: 'All Categories',
    export_all_payments: 'All Payment Methods',
    btn_download_export: '📥 Download CSV / Excel',

    // Modals
    modal_add_cat_title: 'Add New Category',
    modal_edit_cat_title: 'Edit Category',
    modal_add_cat_type: 'Category Type',
    modal_add_cat_emoji: 'Emoji Icon *',
    modal_add_cat_emoji_hint: 'Select below or type your own',
    modal_add_cat_name: 'Category Name (Thai) *',
    modal_add_cat_name_en: 'Category Name in English',
    modal_add_cat_color: 'Category Color',
    btn_cancel: 'Cancel',
    btn_save_cat: '➕ Save Category',

    modal_batch_title: 'Batch Import Monthly Items',
    modal_batch_desc: 'Select recurring items you paid or received this month, adjust exact amounts, and log them all at once.',
    modal_batch_date: 'Transaction Date',
    modal_batch_payment: 'Default Payment Method',
    modal_batch_select_all: 'Select All',
    modal_batch_btn_save: '➕ Log Selected Items',

    modal_edit_title: 'Edit Transaction',
    modal_edit_btn_save: 'Save Changes',

    modal_del_title: 'Delete this transaction?',
    modal_del_desc: 'This item will be permanently deleted from your records.',
    modal_del_confirm: 'Confirm Delete',

    // Toasts & Alerts
    toast_saved: 'Saved successfully',
    toast_exp_saved: 'Expense saved 🔴',
    toast_inc_saved: 'Income saved 🟢',
    toast_updated: 'Updated successfully ✅',
    toast_deleted: 'Deleted successfully 🗑️',
    toast_sample_loaded: 'Sample data loaded ✨',
    toast_restored: 'Data restored successfully 🎉',
    toast_cat_added: 'Category added successfully 🎉',
    toast_cat_updated: 'Category updated successfully ✅',
    toast_cat_deleted: 'Category deleted successfully 🗑️',
    toast_cat_restored: 'Default categories restored 🔄',
    toast_exported: 'Report exported successfully 📥'
  }
};

const I18n = {
  currentLang: 'th',

  init() {
    try {
      const saved = localStorage.getItem(I18N_STORAGE_KEY);
      if (saved === 'en' || saved === 'th') {
        this.currentLang = saved;
      } else {
        this.currentLang = 'th';
      }
    } catch (e) {
      this.currentLang = 'th';
    }
    this.apply();
  },

  getLanguage() {
    return this.currentLang;
  },

  setLanguage(lang) {
    if (lang !== 'th' && lang !== 'en') return;
    this.currentLang = lang;
    try {
      localStorage.setItem(I18N_STORAGE_KEY, lang);
    } catch (e) {
      console.error(e);
    }
    this.apply();
  },

  toggleLanguage() {
    const nextLang = this.currentLang === 'th' ? 'en' : 'th';
    this.setLanguage(nextLang);
  },

  t(key) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.th;
    return dict[key] || TRANSLATIONS.th[key] || key;
  },

  apply() {
    // 1. Update Lang Switcher UI Buttons in Header
    const thBtn = document.getElementById('lang-btn-th');
    const enBtn = document.getElementById('lang-btn-en');
    if (thBtn && enBtn) {
      if (this.currentLang === 'th') {
        thBtn.className = 'px-2 py-0.5 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-xs transition-all cursor-pointer';
        enBtn.className = 'px-2 py-0.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-700 transition-all cursor-pointer';
      } else {
        thBtn.className = 'px-2 py-0.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-700 transition-all cursor-pointer';
        enBtn.className = 'px-2 py-0.5 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-xs transition-all cursor-pointer';
      }
    }

    // 2. Translate text nodes with [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // 3. Translate placeholders with [data-i18n-placeholder]
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // 4. Update dynamic components in App & Simulator
    if (typeof App !== 'undefined' && App.renderAll) {
      App.renderMonthSelector();
      App.renderAll();
      if (App.renderCategoriesTab) {
        App.renderCategoriesTab();
      }
      if (App.setInlineRecurringType) {
        App.setInlineRecurringType(App.inlineRecurringType);
      }
    }
    if (typeof BudgetSimulator !== 'undefined' && BudgetSimulator.render) {
      BudgetSimulator.render();
    }
  }
};
