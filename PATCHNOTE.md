# 📜 Money Memo — Patch Notes & Changelog

บันทึกประวัติการพัฒนาและการอัปเดตฟีเจอร์ของ **Money Memo** ในแต่ละเวอร์ชัน

---

## 🔥 Version 2.9 (Current Version) — *Google Firebase & Cloud Firestore Integration*
**วันที่อัปเดต:** สิงหาคม 2026

### ☁️ ยกระดับระบบคลาวด์ด้วย Google Firebase (No Sleep / Never Pauses)
- **Google Cloud Firestore Database**: เปลี่ยนระบบฐานข้อมูลมาใช้ **Cloud Firestore (Google)** เสถียร รวดเร็ว และไม่มีวันหลับ (Never Sleeps) ตลอดชีพ
- **Native Google Sign-In**: เข้าสู่ระบบด้วยบัญชี Google ผ่าน Firebase Authentication โดยตรง สมูทและปลอดภัยสูงสุด
- **User Subcollections Architecture**: จัดเก็บข้อมูลแยกตาม `users/{userId}` ซิงค์รายการบันทึก หมวดหมู่ และรายการประจำแบบเรียลไทม์
- **Firestore Security Rules**: ล็อกความปลอดภัยระดับบุคคล ข้อมูลของแต่ละคนจะถูกแยกกระเป๋าเงินอย่างเด็ดขาด 100%
- **Hybrid Support**: ใช้งานได้ทั้งแบบล็อกอิน Google ซิงค์หลายเครื่อง หรือใช้งานออฟไลน์ในเครื่อง (LocalStorage)

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
