# 🔐 ZK9500 Fingerprint System Documentation

## สรุปการพัฒนาระบบ Fingerprint Scanner
**วันที่:** 6 กุมภาพันธ์ 2026  
**อุปกรณ์:** ZK9500 USB Fingerprint Scanner  
**สถานะ:** ✅ ทำงานได้สมบูรณ์

---

## 📋 สิ่งที่ค้นพบ (Key Findings)

### 1. Template Format ที่ถูกต้อง
| Column ใน MDB | Format | ขนาด | สถานะ |
|---------------|--------|------|-------|
| TEMPLATE | V9 SS21 (Standalone) | ~600 bytes | ❌ ไม่ compatible กับ ZK9500 SDK |
| TEMPLATE4 | V10 (ActiveX compatible) | ~700-1200 bytes | ✅ **ใช้งานได้!** |

**สำคัญ:** TEMPLATE4 คือ column ที่ต้องใช้ ไม่ใช่ TEMPLATE!

### 2. SDK Configuration ที่ถูกต้อง
```csharp
// ✅ ถูกต้อง - ใช้ V10
zkfp.FPEngineVersion = "10";
fpcHandle = zkfp.CreateFPCacheDB();

// ❌ ไม่ถูกต้อง - V9 ไม่ compatible
// zkfp.FPEngineVersion = "9";
```

### 3. Cache ID Formula
```
cacheId = mdbUserId * 10 + fingerId
```
- `mdbUserId` = USERID จาก MDB (1, 2, 3, ...)
- `fingerId` = หมายเลขนิ้ว (0-9)
- ตัวอย่าง: userId=1095, finger=6 → cacheId=10956

---

## 📂 File Locations

### Source Files
| ไฟล์ | ที่อยู่ | คำอธิบาย |
|------|-------|---------|
| MDB Database | `X:\FP-E-coupon\Thai01\ATT2000.MDB` | ข้อมูลพนักงานและ fingerprints |
| FpTest.exe | `X:\FP-E-coupon\FpTest\bin\Release\net48\FpTest.exe` | โปรแกรม scanner ที่ใช้งานได้ |
| Templates Cache | `X:\FP-E-coupon\FpTest\bin\Release\net48\templates_cache.json` | Cache file สำหรับ templates |
| Users JSON | `X:\FP-E-coupon\electron-bridge\users_with_fp.json` | ข้อมูลพนักงานจาก MDB |

### Scripts
| Script | คำสั่งรัน | คำอธิบาย |
|--------|----------|---------|
| extract-template4.vbs | `C:\Windows\SysWOW64\cscript.exe extract-template4.vbs` | Extract templates จาก TEMPLATE4 |
| extract-users-with-fp.vbs | `C:\Windows\SysWOW64\cscript.exe extract-users-with-fp.vbs` | Extract ข้อมูลพนักงาน |

---

## 🗄️ MDB Database Structure

### Table: USERINFO (พนักงาน)
| Column | Type | คำอธิบาย |
|--------|------|---------|
| USERID | Integer | ID ภายใน MDB (1, 2, 3, ...) |
| Badgenumber | Text | **รหัสพนักงาน** (เช่น "26024", "18084") |
| Name | Text | ชื่อพนักงาน (เช่น "Kanyaphat") |

### Table: TEMPLATE (ลายนิ้วมือ)
| Column | Type | คำอธิบาย |
|--------|------|---------|
| TEMPLATEID | Integer | ID ของ template |
| USERID | Integer | Link to USERINFO.USERID |
| FINGERID | Integer | หมายเลขนิ้ว (0-9) |
| TEMPLATE | Binary | V9 SS21 format ❌ ไม่ใช้ |
| **TEMPLATE4** | Binary | **V10 format ✅ ใช้อันนี้!** |
| DivisionFP | Integer | ค่า 10 = V10 format |

### Finger ID Mapping
| ID | นิ้ว (ขวา) | ID | นิ้ว (ซ้าย) |
|----|------------|----|-----------| 
| 0 | หัวแม่มือขวา | 5 | หัวแม่มือซ้าย |
| 1 | ชี้ขวา | 6 | ชี้ซ้าย |
| 2 | กลางขวา | 7 | กลางซ้าย |
| 3 | นางขวา | 8 | นางซ้าย |
| 4 | ก้อยขวา | 9 | ก้อยซ้าย |

---

## 🔧 C# ActiveX SDK Usage

### 1. Initialize SDK
```csharp
// Create COM object
Type zkfpType = Type.GetTypeFromProgID("ZKFPEngXControl.ZKFPEngX");
dynamic zkfp = Activator.CreateInstance(zkfpType);

// Initialize
if (zkfp.InitEngine() == 0)
{
    zkfp.FPEngineVersion = "10";  // ✅ ต้องใช้ V10!
    fpcHandle = zkfp.CreateFPCacheDB();
    string sn = zkfp.SensorSN;
}
```

### 2. Load Templates to Cache
```csharp
// base64Template = Base64 encoded binary from TEMPLATE4
int cacheId = mdbUserId * 10 + fingerId;
int result = zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, cacheId, base64Template);
// result = 0 means success
```

### 3. Capture and Identify
```csharp
zkfp.FPEngineVersion = "10";
object capturedTemplate = zkfp.GetTemplate();
byte[] capBytes = capturedTemplate as byte[];

// Identification (1:N matching)
object score = 0;
object processedNum = 0;
int cacheId = zkfp.IdentificationInFPCacheDB(fpcHandle, capturedTemplate, ref score, ref processedNum);

if (cacheId > 0 && Convert.ToInt32(score) > 30)
{
    // Match found!
    int mdbUserId = cacheId / 10;
    int fingerId = cacheId % 10;
}
```

### 4. Enrollment (ลงทะเบียนใหม่)
```csharp
zkfp.EnrollCount = 3;  // สแกน 3 ครั้ง
zkfp.BeginEnroll();

// รอจน IsRegister = false
// แล้วดึง template:
string templateStr = zkfp.GetTemplateAsStringEx("10");
zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, fid, templateStr);
```

---

## 📊 สถิติข้อมูล

| รายการ | จำนวน |
|--------|-------|
| พนักงานใน MDB | 1,256 คน |
| พนักงานที่มีลายนิ้วมือ | 1,253 คน |
| จำนวน Templates ทั้งหมด | 2,506 templates |
| เฉลี่ย Templates/คน | 2 นิ้ว/คน |
| Template Size | 700-1,200 bytes |

---

## ⚠️ ปัญหาที่พบและแก้ไข

### ปัญหา 1: Template format ไม่ compatible
**อาการ:** `processed=0`, ไม่ match เลย  
**สาเหตุ:** ใช้ TEMPLATE column (V9 SS21)  
**แก้ไข:** เปลี่ยนไปใช้ TEMPLATE4 column

### ปัญหา 2: Invalid argument error
**อาการ:** `GetTemplateAsStringEx("9")` ได้ error  
**สาเหตุ:** ZK9500 ไม่รองรับ V9 mode โดยตรง  
**แก้ไข:** ใช้ `FPEngineVersion = "10"` และ `GetTemplate()`

### ปัญหา 3: GenerateRegTemplateFromCaptured not found
**อาการ:** Method ไม่มีใน COM object  
**แก้ไข:** ใช้ SDK built-in `BeginEnroll()` + `EnrollCount` แทน

---

## 🚀 วิธีใช้งาน

### Step 1: Extract Templates จาก MDB
```powershell
cd X:\FP-E-coupon\electron-bridge
C:\Windows\SysWOW64\cscript.exe extract-template4.vbs
C:\Windows\SysWOW64\cscript.exe extract-users-with-fp.vbs
```

### Step 2: สร้าง Cache JSON
```javascript
// ใช้ Node.js script สร้าง templates_cache.json
// รวม template data + employee info
```

### Step 3: รัน FpTest
```powershell
Start-Process "X:\FP-E-coupon\FpTest\bin\Release\net48\FpTest.exe"
```

### Step 4: ทดสอบ
1. กด "เชื่อมต่อ Scanner"
2. กด "โหลด Templates"
3. กด "เริ่มสแกน"
4. วางนิ้วบน Scanner

---

## 📝 Cache JSON Format

```json
{
  "templates": [
    {
      "mdb_user_id": 1095,
      "finger_id": 6,
      "employee_code": "26024",
      "employee_name": "Kanyaphat",
      "template_data": "base64_encoded_binary..."
    }
  ],
  "employees": {
    "1095": {
      "employee_code": "26024",
      "name": "Kanyaphat",
      "fingerprint_count": 2
    }
  }
}
```

---

## 🔗 Future Development Notes

### สำหรับ Supabase Integration
1. อัพโหลด templates_cache.json ไป Supabase
2. สร้าง table `fingerprint_templates` ใน Supabase
3. Match employee_code กับ employees table
4. บันทึก attendance logs เมื่อ match สำเร็จ

### สำหรับ Java CLI
- Java SDK ใช้ `libzkfp.dll` ไม่ใช่ ActiveX
- อาจต้องใช้วิธีอื่นในการ load templates
- พิจารณา JNI หรือ HTTP bridge

### การ Re-enrollment
- ถ้าต้อง re-enroll พนักงานใหม่:
  1. ใช้ฟังก์ชัน "ลงทะเบียนใหม่" ใน FpTest
  2. สแกน 3 ครั้ง × 2 นิ้ว
  3. บันทึกลง Supabase

---

## ✅ Verification Checklist

- [x] Templates extracted from TEMPLATE4 (not TEMPLATE)
- [x] FPEngineVersion = "10"
- [x] CreateFPCacheDB() (not CreateFPCacheDBEx)
- [x] AddRegTemplateStrToFPCacheDB() works
- [x] IdentificationInFPCacheDB() returns correct cacheId
- [x] Employee data matched (code + name)
- [x] Score threshold > 30 works
- [x] Enrollment flow works

---

**Last Updated:** 2026-02-06 12:42 ICT  
**Author:** Development Team  
**Status:** Production Ready ✅
