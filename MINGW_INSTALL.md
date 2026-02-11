# 🔧 MinGW Installation Guide for ZK9500 SDK

## 📥 **Step 1: Download MinGW**

**Browser should now be open to:**
https://github.com/niXman/mingw-builds-binaries/releases

**Download the correct version:**

### **For 64-bit Windows (most common):**
Look for file named like:
```
x86_64-14.2.0-release-win32-seh-ucrt-rt_v12-rev0.7z
```

**Key parts:**
- `x86_64` = 64-bit
- `win32` = Windows API
- `seh` = Exception handling
- Latest version (14.x or 13.x)

### **For 32-bit Windows (rare):**
Look for:
```
i686-14.2.0-release-win32-dwarf-ucrt-rt_v12-rev0.7z
```

**Click to download (~50-80 MB)**

---

## 📁 **Step 2: Extract MinGW**

**After download completes:**

1. **Extract the .7z file**
   - Right-click → Extract Here (needs 7-Zip)
   - Or use WinRAR
   - If you don't have 7-Zip: https://www.7-zip.org/download.html

2. **Move to C:\\ drive**
   ```
   Move the extracted "mingw64" folder to:
   C:\mingw64
   ```

**Final location should be:**
```
C:\mingw64\bin\g++.exe  ← This file should exist!
```

---

## 🔧 **Step 3: Add to PATH**

**Option A: PowerShell (Quick)**

Run this command:
```powershell
[System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\mingw64\bin", [System.EnvironmentVariableTarget]::Machine)
```

**Option B: GUI (Manual)**

1. Press `Win + X` → System
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "System variables", find "Path"
5. Click "Edit"
6. Click "New"
7. Add: `C:\mingw64\bin`
8. Click "OK" on all windows

---

## ✅ **Step 4: Verify Installation**

**Close ALL PowerShell/CMD windows, then open NEW window:**

```cmd
g++ --version
```

**Expected output:**
```
g++ (GCC) 14.2.0
Copyright (C) 2024 Free Software Foundation, Inc.
```

---

## 🏗️ **Step 5: Build ZK CLI**

```cmd
cd x:\FP-E-coupon\electron-bridge\native
.\build-cli.bat
```

**Expected:**
```
[OK] MinGW compiler found
Compiling with MinGW...
[SUCCESS] zkteco-cli.exe created successfully with MinGW!
```

---

## 🧪 **Step 6: Test Real Scanner**

```cmd
# Test scanner connection
.\zkteco-cli.exe --test

# Expected:
# Device detected: ZK9500
# Status: Ready
# ✅ LED should light up green!
```

---

## ⏱️ **Timeline**

- Download: ~2 minutes
- Extract: ~30 seconds
- Move files: ~30 seconds
- Add to PATH: ~1 minute
- Build CLI: ~30 seconds
- **Total: ~5 minutes**

---

## 🆘 **Troubleshooting**

### **Can't extract .7z file:**
Install 7-Zip: https://www.7-zip.org/download.html

### **g++ not found after adding to PATH:**
- Close ALL terminals
- Open NEW PowerShell
- Try again

### **Permission denied:**
- Run PowerShell as Administrator
- Or move mingw64 to your user folder instead

### **Build still fails:**
- Check that `C:\mingw64\bin\g++.exe` exists
- Verify PATH was added correctly: `$env:Path`

---

**Current Step: Download MinGW from the browser that just opened!**

Let me know when you've downloaded the file!
