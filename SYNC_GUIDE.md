# 🔄 คู่มือขั้นตอนการ Sync ที่ถูกต้อง

**อัพเดท:** 2026-02-09  
**ระบบ:** Fingerprint E-Coupon (ZKTeco → Supabase)

---

## 📋 สรุปสั้นๆ: ระบบมี 2 วิธี Sync

| # | วิธี | ใช้เมื่อ | ข้อดี |
|---|------|---------|-------|
| **A** | **FpTest.exe** (ปุ่ม 🔄 Sync Attendance) | ใช้งานปกติหน้า Kiosk | มี GUI, sync + grant credits ครบ |
| **B** | **Node.js** (`sync-attendance.js`) | ใช้ผ่าน CMD / Task Scheduler | ตั้ง auto ได้, มี log file |

ทั้ง 2 วิธีทำงานเหมือนกัน = **ดึง attendance จากเครื่อง ZKTeco → อัพโหลด Supabase → Grant meal credits**

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ZKTeco Devices (4 เครื่องสแกนฝาผนัง)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │.151      │ │.152      │ │.153      │ │.154      │               │
│  │SSTH-Entr │ │Factory A │ │Haoli     │ │PPS       │               │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘               │
└───────┼────────────┼────────────┼────────────┼──────────────────────┘
        │            │            │            │  TCP port 4370
        └────────────┴─────┬──────┴────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
 ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
 │ FpTest.exe  │  │ sync-attend  │  │ ZKTime Pro   │
 │ (วิธี A)    │  │ ance.js      │  │ (ซอฟต์แวร์   │
 │             │  │ (วิธี B)     │  │  ของ ZKTeco)  │
 │ ใช้ zkemkee │  │ ใช้ zkteco-  │  │              │
 │ per COM     │  │ js (Node)    │  │ sync → MDB   │
 └──────┬──────┘  └──────┬───────┘  └──────┬───────┘
        │                │                 │
        ▼                ▼                 ▼
 ┌────────────────────────────┐    ┌──────────────┐
 │  Supabase (attendance)     │    │ ATT2000.MDB  │
 │  + auto-grant credits API  │    │ (local file) │
 └────────────┬───────────────┘    └──────────────┘
              │
              ▼
 ┌────────────────────────────┐
 │  meal_credits table        │
 │  (สิทธิ์อาหาร)              │
 └────────────┬───────────────┘
              │
              ▼
 ┌────────────────────────────┐
 │  Web UI                    │
 │  /admin/daily-credits      │
 │  (ดูรายงานสิทธิ์อาหาร)      │
 └────────────────────────────┘
```

---

## 🅰️ วิธี A: Sync ผ่าน FpTest.exe (แนะนำ สำหรับใช้งานปกติ)

### Pre-requisites:
1. ✅ เครื่อง ZKTeco 4 เครื่อง เปิดอยู่ + เชื่อมต่อ Network
2. ✅ ZK9500 USB Scanner ต่ออยู่ (สำหรับสแกนนิ้ว)
3. ✅ Next.js dev server รันอยู่ที่ `localhost:3000` (สำหรับ auto-grant credits)
4. ✅ `.env.local` มี Supabase Key

### ขั้นตอน:

#### Step 1: รัน Next.js Server (ถ้ายังไม่ได้รัน)
```powershell
cd X:\FP-E-coupon
npm run dev
```

#### Step 2: เปิด FpTest.exe
```powershell
Start-Process "X:\FP-E-coupon\FpTest\bin\Release\net48\FpTest.exe"
```

#### Step 3: รอ Auto-startup (อัตโนมัติ)
FpTest จะทำ 3 อย่างอัตโนมัติตอนเปิด:
```
1. 🔌 เชื่อมต่อ ZK9500 Scanner       → ✅ Connected (SN: xxx)
2. 📂 โหลด Templates จาก cache/MDB   → ✅ 2506 templates (1253 คน)
3. 🟢 เริ่มสแกนอัตโนมัติ               → ✅ Scanning...
```

#### Step 4: กดปุ่ม 🔄 Sync Attendance ⭐
```
📍 ตำแหน่งปุ่ม: แถวที่ 2 ของ Status Panel (ล่างซ้าย)
📋 ปุ่มสีเขียวเทา "🔄 Sync Attendance"
```

**สิ่งที่จะเกิดขึ้น:**
```
1. 📡 เชื่อมต่อ ZKTeco 4 เครื่อง ผ่าน zkemkeeper COM
   - ลองวิธี SOAP ก่อน → ถ้าไม่ได้ใช้ SDK (Connect_Net)
   - ดึง attendance logs ที่ใหม่กว่า lastSync
   - กรองวันที่ที่ถูกต้อง (ไม่เก่าก่อน 2025, ไม่ใช่อนาคต)

2. 📤 อัพโหลดไป Supabase โดยตรง (REST API)
   - ใช้ Prefer: resolution=ignore-duplicates
   - บันทึก employee_code + check_time + device_ip
   - Duplicate = skip (ไม่ error)

3. 💳 Auto Grant Meal Credits
   - เรียก POST localhost:3000/api/auto-grant-credits
   - ให้สิทธิ์ lunch อัตโนมัติ (grantOT: false)

4. 📋 แสดง 10 attendance ล่าสุดจาก Supabase
```

#### Step 5: ตรวจสอบผล
- ดูใน Log ของ FpTest ว่าแสดง ✅ NEW กี่รายการ
- เปิด `http://localhost:3000/admin/daily-credits` ตรวจสิทธิ์อาหาร

---

### ⚡ ทางเลือก: ปุ่ม "⚡ โหลด ZKTime"

ปุ่มนี้ทำ **อีกแบบหนึ่ง** คือ:
1. Copy `Thai01\ATT2000.MDB` → folder FpTest
2. อ่าน CHECKINOUT table จาก MDB
3. ถ้าวันนี้มีคนสแกน → ส่ง attendance ไป Supabase
4. เรียก auto-grant credits

**⚠️ ข้อจำกัดสำคัญ:**
- MDB จะมีข้อมูลวันนี้ **เฉพาะเมื่อ ZKTime Pro ทำ sync จากเครื่อง ZKTeco ไปยัง MDB แล้ว**
- ถ้ายังไม่ได้ sync ZKTime → จะขึ้น "⚠️ ไม่มีข้อมูลสแกนวันนี้ใน MDB"
- **แนะนำใช้ปุ่ม "🔄 Sync Attendance" แทน** เพราะดึงจากเครื่อง ZKTeco โดยตรง ไม่ต้องรอ ZKTime

---

## 🅱️ วิธี B: Sync ผ่าน Node.js CLI (สำหรับ Auto / Task Scheduler)

### Pre-requisites:
1. ✅ Node.js + npm install แล้ว (ใน electron-bridge)
2. ✅ `.env.local` มี Supabase URL + Key
3. ✅ เครื่อง ZKTeco ออนไลน์
4. ✅ Next.js server รันอยู่ (สำหรับ auto-grant)

### ขั้นตอน:

#### Step 1: รัน Next.js Server
```powershell
cd X:\FP-E-coupon
npm run dev
```

#### Step 2: รัน Sync Script
```powershell
cd X:\FP-E-coupon\electron-bridge
node sync-attendance.js
```

#### สิ่งที่เกิดขึ้น:
```
1. 📂 อ่าน sync-state.json (lastSync ต่อเครื่อง)
2. 📡 เชื่อมต่อ ZKTeco 4 เครื่อง ผ่าน zkteco-js (TCP:4370)
3. 📥 ดึง ALL attendance records
4. 🔍 กรอง: เอาเฉพาะ record ที่ >= cutoff
   - cutoff = min(lastSync, yesterday)
   - ไม่ย้อนก่อน 26 Dec 2025
5. 📤 Upsert ไป Supabase ทีละ batch 100
6. 💾 บันทึก lastSync ลง sync-state.json
7. 💳 เรียก auto-grant-credits API (ถ้ามี records ใหม่)
```

### ตั้ง Task Scheduler (อัตโนมัติ):
1. เปิด `taskschd.msc`
2. Create Basic Task: "FP Sync Attendance"
3. Action: `X:\FP-E-coupon\electron-bridge\sync-task.bat`
4. Trigger: ทุก 30-60 นาที

---

## ❓ เปรียบเทียบ 2 วิธี

| หัวข้อ | วิธี A (FpTest) | วิธี B (Node.js) |
|--------|-----------------|-------------------|
| **วิธีเชื่อมต่อ ZKTeco** | zkemkeeper COM (SOAP → SDK) | zkteco-js (TCP:4370) |
| **ต้องมี ZKTime** | ❌ ไม่ต้อง (ปุ่ม Sync ดึงตรงจากเครื่อง) | ❌ ไม่ต้อง |
| **State file** | `fptest-sync-state.json` | `sync-state.json` |
| **ตั้ง Auto ได้** | ❌ ต้องกดปุ่มเอง | ✅ Task Scheduler |
| **มี GUI** | ✅ เห็น log, ผลลัพธ์ | ❌ CLI เท่านั้น |
| **Grant credits** | ✅ อัตโนมัติ | ✅ อัตโนมัติ |
| **ใช้คู่กับ Scanner** | ✅ ใช้ได้เลย | ❌ ต้องใช้แยก |

---

## ⚠️ ปัญหาที่พบบ่อย + วิธีแก้

### ❌ ปัญหา 1: "ไม่มีข้อมูลสแกนวันนี้ใน MDB - ลอง Sync ZKTime ก่อน"
**ปุ่มที่กด:** ⚡ โหลด ZKTime  
**สาเหตุ:** MDB ยังไม่มี attendance วันนี้ เพราะ ZKTime ยังไม่ sync  
**✅ แก้ไข:** **ใช้ปุ่ม "🔄 Sync Attendance" แทน** → ดึงจากเครื่อง ZKTeco โดยตรง ไม่ต้องรอ ZKTime

### ❌ ปัญหา 2: Credits ไม่ถูก Grant อัตโนมัติ
**สาเหตุ:** Next.js server ไม่ได้รัน  
**✅ แก้ไข:**
```powershell
# Terminal 1: รัน Next.js
cd X:\FP-E-coupon && npm run dev
# Terminal 2: รัน Sync
```

### ❌ ปัญหา 3: Sync แล้วไม่มี records ใหม่ (Node.js)
**สาเหตุ:** sync-state.json มีค่า lastSync ที่ผิดปกติ  
**✅ แก้ไข:**
```powershell
del X:\FP-E-coupon\electron-bridge\sync-state.json
node sync-attendance.js
```

### ❌ ปัญหา 4: เชื่อมต่อ ZKTeco ไม่ได้
**สาเหตุ:** เครื่องปิด, Network ขาด  
**✅ แก้ไข:**
```powershell
ping 192.168.0.151
ping 192.168.0.152
ping 192.168.0.153
ping 192.168.0.154
```

### ❌ ปัญหา 5: Employee code ไม่ match
**สาเหตุ:** พนักงานยังไม่ได้ import เข้า Supabase  
**✅ แก้ไข:** ดู log "Employee code not found" → Import ผ่านหน้า admin

### ❌ ปัญหา 6: "Sync service ไม่พร้อม" (FpTest)
**สาเหตุ:** .env.local ไม่มี Supabase Key  
**✅ แก้ไข:** ตรวจไฟล์ `X:\FP-E-coupon\.env.local` ว่ามี `NEXT_PUBLIC_SUPABASE_KEY=...`

---

## ✅ Flow ที่แนะนำสำหรับใช้งานจริงทุกวัน

```
🌅 เช้า (ก่อน 11:30):
│
├── 1. เปิดเครื่อง PC ที่ Kiosk
├── 2. รัน Next.js server (npm run dev)
├── 3. เปิด FpTest.exe
│      ├── Scanner เชื่อมต่ออัตโนมัติ ✅
│      └── Templates โหลดอัตโนมัติ ✅
│
├── 4. กดปุ่ม "🔄 Sync Attendance" ⭐
│      ├── ดึง attendance จากเครื่อง ZKTeco ✅
│      ├── อัพโหลด Supabase ✅
│      └── ให้สิทธิ์อาหาร lunch ✅
│
├── 5. ตรวจ: เปิด /admin/daily-credits
│      └── ดูว่าพนักงานมีสิทธิ์อาหาร ✅
│
🍚 เที่ยง:
│
├── 6. พนักงานสแกนนิ้วที่ Kiosk (FpTest)
│      └── ระบบตัดสิทธิ์อาหารอัตโนมัติ ✅
│
🌙 เย็น:
│
├── 7. กดปุ่ม "🔄 Sync Attendance" อีกครั้ง (ถ้าต้องการ)
│      └── จับเวลาเลิกงาน / OT ✅
│
└── 8. ปิดโปรแกรม
```

---

## 🔧 Quick Reference Commands

```powershell
# === ใช้ FpTest (วิธี A) ===
Start-Process "X:\FP-E-coupon\FpTest\bin\Release\net48\FpTest.exe"
# → กดปุ่ม "🔄 Sync Attendance"

# === ใช้ Node.js (วิธี B) ===
cd X:\FP-E-coupon\electron-bridge
node sync-attendance.js

# === Reset sync state ===
# FpTest:
del "X:\FP-E-coupon\FpTest\bin\Release\net48\fptest-sync-state.json"
# Node.js:
del "X:\FP-E-coupon\electron-bridge\sync-state.json"

# === ดู sync state ===
type "X:\FP-E-coupon\electron-bridge\sync-state.json"
type "X:\FP-E-coupon\FpTest\bin\Release\net48\fptest-sync-state.json"

# === Next.js server ===
cd X:\FP-E-coupon
npm run dev

# === Grant credits ด้วยมือ ===
# เปิด: http://localhost:3000/admin/credits
# กด: "All Employees + Next 7 Days" → Add Credits

# === ตรวจสอบ ===
# เปิด: http://localhost:3000/admin/daily-credits
```

---

## 📅 ตารางการ Sync ที่แนะนำ

| เวลา | ทำอะไร | ทำไม |
|-------|--------|------|
| **07:00** | Sync ครั้งที่ 1 | จับเวลาเข้างาน (กะเช้า) |
| **11:00** | ⭐ Sync ครั้งที่ 2 | **สำคัญ! ก่อนเวลาอาหาร → grant credits** |
| **17:00** | Sync ครั้งที่ 3 | จับเวลาเลิกงาน |
| **20:00** | Sync ครั้งที่ 4 (ถ้ามี OT) | จับ OT |

> 💡 **กฎสำคัญ:** ต้อง Sync อย่างน้อย 1 ครั้ง **ก่อน 11:30** เพื่อให้พนักงานมีสิทธิ์รับอาหารกลางวัน
