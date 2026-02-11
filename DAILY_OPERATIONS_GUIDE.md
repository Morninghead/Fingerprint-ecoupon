# 📋 คู่มือการใช้งานระบบ E-Coupon ประจำวัน

**อัพเดท:** 2026-02-09  
**ระบบ:** Fingerprint E-Coupon (ZKTeco + Supabase)

---

## 🔄 สิ่งที่ต้องทำทุกวัน (Daily Operations)

### ✅ ขั้นตอนเปิดระบบตอนเช้า (ก่อน 07:00)

```
1. เปิดเครื่อง PC ที่ Kiosk
2. เปิด Terminal 1: รัน Next.js server
   > cd X:\FP-E-coupon
   > npm run dev
   
3. เปิด FpTest.exe
   > Start-Process "X:\FP-E-coupon\FpTest\bin\Release\net48\FpTest.exe"
   
4. รอ auto-startup (อัตโนมัติ):
   ✅ Scanner connected
   ✅ Templates loaded from cache
   ✅ Scanning started

5. กดปุ่ม "📁 MDB" เพื่อโหลด templates จาก ZKTime (ถ้าต้องการข้อมูลล่าสุด)

6. กดปุ่ม "🔄 Sync Attendance" อย่างน้อย 1 ครั้งก่อน 11:00
   → ดึง attendance จาก ZKTeco devices
   → ให้สิทธิ์อาหารอัตโนมัติ
```

---

## ⚙️ ตั้งค่าให้ทำงานอัตโนมัติ (Automatic)

### วิธี A: ใช้ Windows Task Scheduler (แนะนำ)

#### 1. สร้าง Batch File สำหรับ Sync

สร้างไฟล์ `X:\FP-E-coupon\auto-sync.bat`:
```batch
@echo off
cd /d X:\FP-E-coupon\electron-bridge
node sync-attendance.js >> sync-log.txt 2>&1
```

#### 2. ตั้งค่า Task Scheduler

1. เปิด `taskschd.msc`
2. Create Basic Task: **"FP E-Coupon Auto Sync"**
3. Trigger: **Daily**, Every day at **06:30, 10:30, 14:30, 17:30**
   - หรือ: Every 30 minutes from 06:00 to 18:00
4. Action: Start a program
   - Program: `X:\FP-E-coupon\auto-sync.bat`
5. ✅ Run whether user is logged in or not
6. ✅ Run with highest privileges

#### 3. ตั้งค่า Next.js Server เป็น Windows Service (ถ้าต้องการ)

ใช้ `pm2` หรือ `nssm` เพื่อรัน Next.js เป็น background service:

```powershell
# ติดตั้ง pm2
npm install -g pm2 pm2-windows-startup

# รัน Next.js เป็น service
cd X:\FP-E-coupon
pm2 start npm --name "fp-ecoupon" -- run dev
pm2 save
pm2-startup install
```

---

### วิธี B: เปิด FpTest.exe ค้างไว้ตลอดวัน

ถ้า FpTest.exe เปิดอยู่แล้ว:
1. กดปุ่ม **"🔄 Sync Attendance"** เป็นประจำ (ทุกๆ 1-2 ชั่วโมง)
2. หรือใช้ Auto-Sync ผ่าน Task Scheduler ควบคู่กัน

---

## 👤 การเพิ่มพนักงานใหม่

### 🔵 วิธีที่ 1: ลงทะเบียนที่เครื่อง ZKTeco (แนะนำ)

1. **ที่เครื่อง ZKTeco (192.168.0.151-154):**
   - กด Menu → User Mgt → New User
   - ใส่ **User ID** = รหัสพนักงาน 5 หลัก (เช่น 25100)
   - ใส่ **Name** = ชื่อพนักงาน
   - ลงทะเบียนลายนิ้วมือ 2 นิ้ว

2. **Sync ข้อมูลมาที่ระบบ:**
   - เปิด **ZKTime Pro** → กด Sync จาก Device
   - หรือกด **"🔄 Sync Attendance"** ใน FpTest

3. **เพิ่มพนักงานใน Supabase:**
   - เปิด `http://localhost:3000/admin/employees`
   - กด "Import" หรือ "Add Employee"
   - กรอกข้อมูล: employee_code = รหัส 5 หลัก (เช่น 25100)

4. **โหลด Templates ใหม่:**
   - ใน FpTest กดปุ่ม **"📁 MDB"** หรือ **"🌐 Supabase"**
   - Templates ใหม่จะถูกโหลดเข้า FPCacheDB

---

### 🟣 วิธีที่ 2: ลงทะเบียนผ่าน FpTest (ใช้ ZK9500 USB Scanner)

1. **เปิด FpTest.exe**

2. **กดปุ่ม "📝 ลงทะเบียนใหม่"**
   - กรอกรหัสพนักงาน (5 หลัก เช่น 25100)
   - กรอกชื่อพนักงาน
   - วางนิ้ว 3 ครั้งสำหรับแต่ละนิ้ว (แนะนำ 2 นิ้ว)

3. **Templates จะถูกบันทึก:**
   - ✅ เพิ่มเข้า FPCacheDB ทันที (สแกนได้เลย)
   - ✅ บันทึกลง Supabase `fingerprint_templates` table

4. **เพิ่มพนักงานใน Supabase:**
   - เปิด `http://localhost:3000/admin/employees`
   - เพิ่มพนักงานพร้อม employee_code ตรงกัน

---

## 📊 Flow ข้อมูลทั้งระบบ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        พนักงานใหม่                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
    ┌─────────────────┐                 ┌─────────────────┐
    │ ZKTeco Device   │                 │ FpTest.exe      │
    │ (เครื่องสแกนผนัง)│                 │ (ZK9500 USB)    │
    │                 │                 │                 │
    │ • User ID (PIN) │                 │ • รหัสพนักงาน   │
    │ • ชื่อ           │                 │ • ชื่อ          │
    │ • ลายนิ้วมือ     │                 │ • ลายนิ้วมือ    │
    └────────┬────────┘                 └────────┬────────┘
             │                                    │
             ▼                                    ▼
    ┌─────────────────┐                 ┌─────────────────┐
    │ ZKTime Pro Sync │                 │ Supabase API    │
    │     ↓           │                 │                 │
    │ ATT2000.MDB     │                 │ fingerprint_    │
    │ (local file)    │                 │ templates table │
    └────────┬────────┘                 └────────┬────────┘
             │                                    │
             └─────────────────┬──────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ FpTest "📁 MDB" หรือ │
                    │ "🌐 Supabase" button │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ FPCacheDB           │
                    │ (in-memory cache)   │
                    │ สำหรับ 1:N matching  │
                    └─────────────────────┘
```

---

## ⏰ ตารางเวลา Sync ที่แนะนำ

| เวลา | กิจกรรม | เหตุผล |
|------|---------|--------|
| **06:30** | Auto Sync #1 | จับเวลาเข้างาน (กะเช้า) |
| **10:30** | Auto Sync #2 | ⭐ **สำคัญ!** ก่อนเที่ยง - ให้สิทธิ์ lunch |
| **14:30** | Auto Sync #3 | จับเวลาหลังเที่ยง |
| **17:30** | Auto Sync #4 | จับเวลาเลิกงาน |
| **20:00** | Auto Sync #5 (ถ้ามี OT) | จับ OT |

---

## 🔧 Quick Reference Commands

```powershell
# === รัน Next.js Server ===
cd X:\FP-E-coupon
npm run dev

# === เปิด FpTest ===
Start-Process "X:\FP-E-coupon\FpTest\bin\Release\net48\FpTest.exe"

# === Sync ด้วยมือ (Node.js) ===
cd X:\FP-E-coupon\electron-bridge
node sync-attendance.js

# === ดู Sync Log ===
type X:\FP-E-coupon\electron-bridge\sync-log.txt

# === Reset Sync State (ถ้าต้องการ sync ใหม่ทั้งหมด) ===
del X:\FP-E-coupon\electron-bridge\sync-state.json
del X:\FP-E-coupon\FpTest\bin\Release\net48\fptest-sync-state.json

# === ดู employees ใน Supabase ===
# เปิด: http://localhost:3000/admin/employees

# === ดู daily credits ===
# เปิด: http://localhost:3000/admin/daily-credits
```

---

## ❓ FAQ

### Q: พนักงานสแกนเข้างานแล้ว ทำไมไม่มีสิทธิ์อาหาร?

**A:** ต้อง Sync Attendance ก่อน!
- กดปุ่ม "🔄 Sync Attendance" ใน FpTest
- หรือรอ Auto Sync ตามเวลาที่ตั้งไว้

### Q: สแกนนิ้วแล้วขึ้น "ไม่พบในระบบ"?

**A:** Templates ยังไม่ได้โหลด
- กดปุ่ม "📁 MDB" เพื่อโหลด templates จาก ZKTime
- หรือ "🌐 Supabase" ถ้า templates อยู่ใน cloud

### Q: สแกนเจอ แต่ขึ้น "ไม่มีสิทธิ์อาหาร"?

**A:** ตรวจสอบ:
1. พนักงานมี attendance วันนี้หรือยัง? → Sync Attendance
2. พนักงานมีใน employees table หรือยัง? → Import/Add ที่ admin panel
3. employee_code ตรงกันหรือไม่? (ใช้ Badgenumber 5 หลัก)

### Q: เพิ่มพนักงานใหม่แล้ว สแกนไม่เจอ?

**A:** ต้องโหลด templates ใหม่
- ถ้าลงทะเบียนที่ ZKTeco → กด "📁 MDB"
- ถ้าลงทะเบียนที่ FpTest → templates ถูกเพิ่มอัตโนมัติ

---

## 📞 Support

- ดู log ที่: `X:\FP-E-coupon\electron-bridge\sync-log.txt`
- ดู FpTest log ที่หน้าจอ (📜 Log panel)
- ตรวจสอบ Supabase: `http://localhost:3000/admin/daily-credits`
