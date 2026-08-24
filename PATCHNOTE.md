# 📜 Money Memo — Patch Notes & Changelog

บันทึกประวัติการพัฒนาและการอัปเดตฟีเจอร์ของ **Money Memo** ในแต่ละเวอร์ชัน

---

## 🔥 Version 2.9 (Current Version) — *Google Firebase & Annual Financial Overview*
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
