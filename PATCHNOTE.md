# 📜 Money Memo — Patch Notes & Changelog

บันทึกประวัติการพัฒนาและการอัปเดตฟีเจอร์ของ **Money Memo** ในแต่ละเวอร์ชัน

---

## 📱 Version 3.6 (Current Version) — *Full K PLUS Mockup Design & Raised Quick Add Dock*
**วันที่อัปเดต:** กันยายน 2026

### 🎨 ปรับหน้าประวัติรายการ & สเตทเมนต์ ให้ตรงตาม Mockup 100%
- **Month Switcher & Summary Capsule**: แถบเลือกเดือน `[ ◀ ] กันยายน 2569 [ ▶ ]` พร้อมแคปซูลสรุปยอดเงิน `( 🟢 รับ | 🔴 จ่าย | คงเหลือสุทธิ )` สไตล์มินิมอลโมเดิร์น
- **Search & Category Dropdown Filter**: เพิ่มตัวกรองหมวดหมู่ `🏷️ ทุกหมวดหมู่` และชิปกรอง `ทั้งหมด`, `🔴 รายจ่าย`, `🟢 รายรับ` ให้ค้นหาและกรองได้ละเอียดขึ้น
- **Daily Grouped Cards**: บัตรกลุ่มรายการประจำวัน `📅 วันนี้ (9 ก.ย. 2569)` พร้อมป้าย `[ รวมวัน: -฿120 ]` ทางขวา และรายการแสดงผล `🍔 หมวดหมู่ (โน้ตช่วยจำ)` และ `เวลา • ช่องทางชำระเงิน`
- **Center Raised Action Button ( ➕ ) บน Mobile Dock**: ปุ่มลัดตรงกลางแบบลอยเด่น สำหรับกดบันทึกรายการด่วนได้จากทุกหน้าจอ สลับไปโฟกัสช่องจำนวนเงินทันที

---

## 📱 Version 3.5 — *Dedicated Statement Feed & Recurring Items Deletion Fix*
**วันที่อัปเดต:** กันยายน 2026

### 📋 หน้าประวัติรายการ & สเตทเมนต์แยก (Dedicated Statement Feed — K PLUS Style)
- **แท็บประวัติรายการเฉพาะ (Dedicated Tab 2: ประวัติ / History)**: แยกหน้าประวัติรายการออกมาเป็นหน้าสเตทเมนต์เต็มรูปแบบ ทั้งบน Mobile Bottom Bar และ Desktop Navigation
- **Daily Grouped Statement**: จัดกลุ่มรายการตามวัน (`วันนี้`, `เมื่อวาน`, `วันจันทร์ ฯลฯ`) พร้อมคำนวณยอดรวมรายรับ-รายจ่ายของแต่ละวันอย่างชัดเจน
- **Statement Flow Summary Banner**: แบนเนอร์แสดงสรุปยอดเงินเข้า-ออก (🟢 Inflow / 🔴 Outflow) และยอดเงินคงเหลือสุทธิ (Net Balance) ประจำเดือน
- **Search & Type Filter Chips**: ค้นหาตามโน้ต หมวดหมู่ ช่องทางชำระเงิน หรือจำนวนเงิน พร้อมชิปกรองเฉพาะ `ทั้งหมด`, `รายจ่าย`, `รายรับ`
- **Interactive Digital Memo Slip**: แตะรายการใดๆ เพื่อเปิดสลิปรายละเอียด (Digital Memo Slip) ขนาดกะทัดรัด พร้อมปุ่มแก้ไขและลบ

### 🛡️ แก้ไขบั๊กการลบรายการประจำ (Permanent Recurring Deletion & Cross-Device Sync)
- **Permanent Recurring Item Deletion**: แก้ไขปัญหาที่รายการประจำที่ถูกลบไปแล้วเด้งกลับมาใหม่หลังจากรีเฟรชหรือเปิดแอปใหม่
- **Tombstone ID Tracking (`money_memo_deleted_rec_ids_v1`)**: บันทึก ID รายการประจำที่ถูกลบ เพื่อป้องกันไม่ให้ระบบนำ Default Items หรือข้อมูลจาก Cloud มาสร้างทับ
- **Real-time Two-Way Cloud Sync**: ซิงค์การลบรายการประจำข้ามอุปกรณ์ (PC 💻 และ Mobile 📱) ผ่าน Firebase Firestore อย่างสมบูรณ์แบบ ลบจากอุปกรณ์หนึ่งจะหายจากทุกอุปกรณ์ทันที

---

## 📱 Version 3.4 — *Mobile Compact Category Dropdown & Usage-Ranked Sorting*
**วันที่อัปเดต:** กันยายน 2026

### 📂 ช่องเลือกหมวดหมู่แบบ Dropdown ประหยัดพื้นที่บนมือถือ & จัดอันดับตามการใช้งานจริง
- **Mobile Dropdown Category Selector**: ปรับช่องเลือกหมวดหมู่บนหน้าจอมือถือจากตาราง Grid 9 ช่อง ให้กลายเป็น **Dropdown เลือกหมวดหมู่แถวเดียว (Compact Dropdown)** ที่กินพื้นที่หน้าจอเพียง 42px ช่วยลดความยาวของฟอร์มบันทึกรายการบนมือถือลงกว่า 70% ทำให้เห็นปุ่มบันทึกและรายละเอียดครบในหน้าจอเดียว
- **Smart Usage-Ranked Sorting (เรียงหมวดที่ใช้บ่อยขึ้นบนสุด)**: คำนวณความถี่และเวลาการใช้งานล่าสุดจากรายการบันทึกจริง หมวดหมู่ที่บันทึกบ่อย (เช่น ค่าสัตว์เลี้ยง, ค่าอาหาร, บิล น้ำ/ไฟ) จะถูกนำขึ้นมาอยู่อันดับต้นๆ ของ Dropdown และ Grid โดยอัตโนมัติ พร้อมแสดงป้าย `⭐ ใช้บ่อย / ล่าสุด`
- **Two-Way Responsive Sync**: ซิงค์การเลือกหมวดหมู่ระหว่าง Mobile Dropdown และ Desktop Grid อย่างสมบูรณ์ ไม่ว่าจะกดเลือกจากแบบไหน ข้อมูลจะเชื่อมโยงกัน 100%
- **Edit Modal Optimization**: ปรับใช้ Compact Dropdown และการเรียงลำดับตามการใช้งานจริงในหน้าต่างแก้ไขรายการด้วยเช่นกัน

---

## ⚡ Version 3.3 — *Ultra-Fast Instant Refresh & 60 FPS Performance*
**วันที่อัปเดต:** กันยายน 2026

### 🚀 ปรับปรุงความเร็วในการโหลด & รีเฟรชหน้าจอระดับ Sub-100ms
- **In-Memory Caching System**: แคชข้อมูลรายการ รายรับ-รายจ่าย หมวดหมู่ และแบบจำลองงบประมาณไว้ใน RAM ระดับ Memory พร้อม Map Lookup O(1) ลดการอ่านและแปลง `JSON.parse(localStorage)` จากเดิมหลายร้อยครั้งเหลือ 0 ครั้งในแต่ละรอบ Render
- **Lazy Tab & Chart Rendering**: ปรับระบบเรนเดอร์ให้ประมวลผลเฉพาะแท็บที่กำลังเปิดใช้งานอยู่ (`renderActiveTab`) ไม่สร้างหรือทำลาย Chart.js และ DOM ของแท็บที่ถูกซ่อนอยู่เบื้องหลัง ช่วยลด First Contentful Paint (FCP) และ Time to Interactive (TTI) ลงอย่างมาก
- **Non-blocking Script Architecture**: ใส่ `defer`, `preconnect` และ `dns-prefetch` ให้กับ CDN Libraries ทั้ง Chart.js และ Firebase Compat SDK เพื่อให้ HTML/CSS แสดงผลบนหน้าจอทันทีโดยไม่ถูกบล็อก
- **Service Worker PWA Caching (`sw.js`)**: ติดตั้ง Service Worker แบบ Stale-While-Revalidate และ Cache-First สำหรับไฟล์แอป สไตล์ชีต และฟอนต์ ทำให้การเปิดแอปหรือกดรีเฟรชครั้งต่อไปโหลดได้แบบทันที (Instant 0ms Load) ทั้งบนมือถือและคอมพิวเตอร์
- **Debounced Cloud Sync Listeners**: ควบรวม Event จาก Firestore Real-time Listeners เข้าสู่ Animation Frame เดียว (`requestRender`) ป้องกันอาการกระตุกหรือรีเฟรชหน้าซ้ำซ้อนตอนเริ่มต้นแอป

---

## 💰 Version 3.0 — *Salary Pay Cycle & Custom Date Range Dashboard*
**วันที่อัปเดต:** สิงหาคม 2026

### 💳 ระบบวิเคราะห์กราฟตาม "รอบเงินเดือน" & "กำหนดช่วงวันที่เอง" (Pay Cycle & Custom Range)
- **โหมด `💰 รอบเงินเดือน / กำหนดเอง`**: แก้ปัญหาเงินเดือนเข้าช่วงปลายเดือน (เช่น วันที่ 25 หรือ 28) แล้วตัดรอบไม่ตรงกับเดือนปฏิทิน
- **ปุ่มลัดรอบเงินเดือนยอดนิยม (Quick Pay Cycle Presets)**:
  - 💰 **รอบ 28–27**: สำหรับคนเงินเดือนออกวันที่ 28 (คำนวณตั้งแต่วันที่ 28 เดือนก่อนหน้า ถึง 27 เดือนปัจจุบัน)
  - 💰 **รอบ 25–24**: สำหรับคนเงินเดือนออกวันที่ 25 (คำนวณตั้งแต่วันที่ 25 เดือนก่อนหน้า ถึง 24 เดือนปัจจุบัน)
  - 🗓️ **รอบ 1–สิ้นเดือน**: สำหรับรอบปฏิทินมาตรฐาน
  - ⚡ **30 วันล่าสุด** & **7 วันล่าสุด**: สรุปยอดเร็วทันใจ
- **ตัวเลือกช่วงวันที่อิสระ (Custom Start & End Date Pickers)**: เลือกวันเริ่มต้นและวันสิ้นสุดได้อิสระตามรอบบิลของแต่ละคน
- **กราฟและ KPI คำนวณตรงรอบแบบ Real-time**:
  - การ์ดสรุปยอด รายรับ รายจ่าย คงเหลือสุทธิ ในรอบเงินเดือนที่เลือก
  - กราฟวงกลมและ Top 5 หมวดหมู่ที่จ่ายไปในรอบเงินเดือนนั้น
  - กราฟแท่ง Daily Spending Trend พล็อตยอดใช้จ่ายและรายรับทุกวันตลอดช่วงวันที่เลือก

---

## 🔥 Version 2.9 — *Google Firebase & Annual Financial Overview*
**วันที่อัปเดต:** สิงหาคม 2026

### 📆 สรุปภาพรวมการเงินรายปี (Annual / Yearly Financial Overview)
- **โหมดสรุปรายปี 12 เดือน**: เพิ่มโหมด `📆 สรุปภาพรวมรายปี` ในแท็บแดชบอร์ด สามารถเลือกปีย้อนหลัง/ถัดไปได้ทันที
- **4 การ์ดสถิติประจำปี (Annual KPI Cards)**:
  - 🟢 **รายรับรวมทั้งปี (Annual Income)**
  - 🔴 **รายจ่ายรวมทั้งปี (Annual Expense)**
  - 🟣 **เงินออมสุทธิทั้งปี (Annual Net Savings)**
  - 🌟 **อัตราการออมเฉลี่ย (% Annual Savings Rate)** พร้อมคำนวณค่าเฉลี่ยรายจ่ายต่อเดือน
- **ชาร์ตเปรียบเทียบรายรับ vs รายจ่าย 12 เดือน (12-Month Comparison Bar Chart)**: กราฟแท่งสีพาสเทลคู่ เปรียบเทียบรายรับและรายจ่ายของทุกเดือน (ม.ค. - ธ.ค.)
- **ชาร์ตสัดส่วนรายจ่ายตลอดทั้งปี (Annual Category Doughnut Chart)**: วิเคราะห์ Top 5 หมวดหมู่ที่ใช้เงินมากที่สุดในรอบปี
- **ตารางสรุปผลการเงิน 12 เดือน (12-Month Performance Table)**: ตารางแจกแจงรายรับ รายจ่าย คงเหลือ และ % ออมของแต่ละเดือนตลอดทั้งปี

### ☁️ สถาปัตยกรรมลด Read บน Google Cloud Firestore (Pre-Aggregated Summaries)
- **Monthly Summary Document (`summaries_monthly/{YYYY-MM}`)**: จัดเก็บยอดรวมและสถิติแยกตามหมวดหมู่ของแต่ละเดือน คำนวณอัตโนมัติเมื่อบันทึก ลดค่า Read จากเดิม 100+ รายการ เหลือเพียง **1 Read** ทันที
- **Yearly Summary Document (`summaries_yearly/{YYYY}`)**: จัดเก็บยอดรวมและสถิติ 12 เดือนของทั้งปี คำนวณแบบ Pre-aggregated
- **Google Cloud Firestore Database**: เสถียร รวดเร็ว ไม่มีวันหลับ (Never Sleeps) ตลอดชีพ
- **Native Google Sign-In**: เข้าสู่ระบบด้วยบัญชี Google ผ่าน Firebase Authentication โดยตรง
- **Firestore Security Rules**: ล็อกความปลอดภัยระดับบุคคล ข้อมูลแยกกระเป๋าเงินอย่างเด็ดขาด 100%

---

## 📱 Version 2.8 — *PWA & Native-like Mobile App Experience*
**วันที่อัปเดต:** สิงหาคม 2026

### 📲 ระบบติดตั้งเป็นแอปบนมือถือ (PWA & Web Manifest)
- **Web App Manifest (`manifest.json`)**: รองรับมาตรฐาน Progressive Web App (PWA) ติดตั้งลงหน้าจอมือถือได้ทันที
- **โหมดแอปเต็มหน้าจอ (Standalone Fullscreen)**: เมื่อเปิดจากหน้าจอโฮม แถบเบราว์เซอร์และแถบ URL จะซ่อนไปโดยอัตโนมัติ ให้ประสบการณ์ใช้งานเต็มจอไร้รอยต่อเหมือนโหลดจาก App Store / Play Store
- **ชุดไอคอนความละเอียดสูง (High-Res Pastel App Icons)**:
  - `icon-192.png` & `icon-512.png`: ไอคอนความละเอียดสูงสำหรับ Android Home Screen & Chrome
  - `apple-touch-icon.png`: ไอคอนคมชัดสำหรับ iOS Safari (iPhone / iPad)
  - `favicon.png`: ไอคอนแท็บเบราว์เซอร์สำหรับคอมพิวเตอร์
- **ธีมแถบสถานะกลมกลืน (Theme Color Matching)**: ตั้งค่า Theme Color แถบด้านบนของมือถือเป็นสี Warm Cream (`#FBF9F5`) เข้ากับตัวแอปแบบ 100%

---

## ☁️ Version 2.7 — *Cloud Sync & Google Auth Integration*
**วันที่อัปเดต:** สิงหาคม 2026

- ระบบซิงค์ข้อมูลบนคลาวด์ & 1-Click Google Login ข้ามอุปกรณ์

---

## 🎨 Version 2.5 — *Ultra-Minimal Pastel & Mobile-First UI*
**วันที่อัปเดต:** สิงหาคม 2026

- ปรับโฉมดีไซน์ Minimalist Pastel สบายตา พร้อมแถบ Mobile Bottom Navigation Bar 5 ไอคอนด้านล่าง

---

## 📥 Version 2.2 — *Filtered Export & Rich Reports*
**วันที่อัปเดต:** สิงหาคม 2026

- ระบบส่งออกรายงานขั้นสูง CSV / Excel UTF-8 with BOM พร้อมตัวกรองและสรุปยอดรวม

---

## 🏷️ Version 2.0 — *Bilingual Support & Category Manager*
**วันที่อัปเดต:** สิงหาคม 2026

- รองรับ 2 ภาษา (ไทย 🇹🇭 / English 🇬🇧) และแท็บจัดการหมวดหมู่

---

## 📌 Version 1.5 — *Recurring Items & Budget Simulator Sandbox*
**วันที่อัปเดต:** สิงหาคม 2026

- จัดการรายรับ-รายจ่ายประจำเดือน และเครื่องมือจำลองงบประมาณ 50/30/20

---

## 💰 Version 1.0 — *Initial Release*
**วันที่อัปเดต:** สิงหาคม 2026

- ระบบบันทึกรายรับ-รายจ่าย แดชบอร์ดสรุปยอด และกราฟสถิติพื้นฐาน
