# 🚀 Quick ZK9500 Scanner Setup

**Time Required:** 15-30 minutes  
**Difficulty:** Medium

---

## ✅ Pre-Flight Checklist

Before starting, verify:
- [ ] ZK9500 scanner physically available
- [ ] USB cable connected to PC
- [ ] Scanner has power (LED should light up)
- [ ] Windows PC (this guide is for Windows)
- [ ] Node.js installed (`node --version`)

---

## 📝 Step-by-Step Setup

### **Step 1: Connect & Verify Scanner (2 minutes)**

1. **Plug in ZK9500** via USB
2. **Check Device Manager:**
   ```cmd
   devmgmt.msc
   ```
3. Look for **"ZK Scanner"** or **"USB Device"** under:
   - Biometric Devices
   - USB Controllers
   - Other Devices (if driver not installed)

**Status:** Scanner should appear in Device Manager

---

### **Step 2: Install Dependencies (5 minutes)**

```cmd
cd x:\FP-E-coupon\electron-bridge
npm install

cd native
npm install
```

**What this does:**
- Installs WebSocket server (`ws`)
- Installs Electron
- Installs build tools for native modules

---

### **Step 3: Build CLI Integration (5 minutes)**

The ZK9500 SDK uses C++ DLLs. We'll build a simple CLI to talk to it:

```cmd
cd x:\FP-E-coupon\electron-bridge\native
build-cli.bat
```

**Expected output:**
```
Building zkfp CLI...
Linking zkfp-cli.exe...
Build successful!
```

**If build fails:**
- Missing Visual Studio C++ tools
- Missing Windows SDK
- Missing SDK DLLs

---

### **Step 4: Test Scanner Connection (2 minutes)**

```cmd
cd x:\FP-E-coupon\electron-bridge\native
zkfp-cli.exe --test
```

**Expected output:**
```
ZK9500 Scanner Test
-------------------
Initializing SDK... OK
Opening device... OK
Device SN: 1234567890
Sensor: Active
Status: Ready
```

**If fails:**
- Check USB connection
- Install ZK9500 driver from manufacturer
- Run as Administrator

---

### **Step 5: Capture Test Fingerprint (3 minutes)**

```cmd
zkfp-cli.exe --capture
```

**Instructions:**
1. Place finger on scanner
2. Wait for beep/LED
3. Remove finger
4. Template will be printed (base64 encoded)

**Example output:**
```
Waiting for fingerprint...
Finger detected!
Capturing template...
Template: aGVsbG8gd29ybGQgZmluZ2VycHJpbnQgdGVtcGxhdGU=
Quality: 85%
Capture successful!
```

---

### **Step 6: Start WebSocket Bridge (2 minutes)**

This bridges the scanner to your web app:

```cmd
cd x:\FP-E-coupon\electron-bridge
set ZK_INTEGRATION_MODE=cli
npm start
```

**Expected output:**
```
Electron Fingerprint Bridge
---------------------------
Mode: CLI
WebSocket: ws://localhost:8081
Scanner: ZK9500 Connected
Ready for captures!
```

**Keep this terminal open!**

---

### **Step 7: Test with Kiosk (5 minutes)**

1. **Keep bridge running** (from Step 6)

2. **In NEW terminal**, start dev server:
   ```cmd
   cd x:\FP-E-coupon
   npm run dev
   ```

3. **Open browser:** `http://localhost:3000/kiosk`

4. **Click "Scan Fingerprint"**

5. **Place finger on ZK9500 scanner**

6. **Expected:**
   - Scanner LED lights up
   - Beep sound
   - Template captured
   - Sent to kiosk via WebSocket
   - Employee verified
   - Meal redeemed!

---

## 🔧 Troubleshooting

### Scanner not detected

```cmd
# Check USB devices
wmic path Win32_USBControllerDevice get Dependent
```

### DLL errors

The ZK SDK DLLs may be missing. You need:
- `zkemsdk.dll`
- `zkemkeeper.dll`

**Where to get them:**
1. Check if you have ZK9500 driver CD/USB
2. Download from ZKTeco website
3. Contact ZKTeco support

### Build fails

Install Visual Studio Build Tools:
```cmd
# Option 1: Full Visual Studio (recommended)
# Download from: https://visualstudio.microsoft.com/downloads/

# Option 2: Build Tools only
npm install --global windows-build-tools
```

### Bridge won't start

```cmd
# Check if port 8081 is available
netstat -ano | findstr :8081

# Kill if occupied
taskkill /PID <PID> /F
```

---

## 🎯 Success Criteria

✅ Scanner appears in Device Manager  
✅ CLI test runs successfully  
✅ Can capture fingerprint via CLI  
✅ Bridge starts without errors  
✅ Kiosk can communicate with bridge  
✅ Real fingerprint scan triggers verification  

---

## 📁 Quick Reference

### File Locations
- **SDK DLLs:** `x:\FP-E-coupon\Standalone-SDK\`
- **CLI Source:** `x:\FP-E-coupon\electron-bridge\native\`
- **Bridge:** `x:\FP-E-coupon\electron-bridge\main.js`
- **Kiosk UI:** `x:\FP-E-coupon\src\app\kiosk\`

### Commands
```cmd
# Test scanner
zkfp-cli.exe --test

# Capture fingerprint
zkfp-cli.exe --capture

# Start bridge
cd x:\FP-E-coupon\electron-bridge
set ZK_INTEGRATION_MODE=cli
npm start

# Start kiosk
cd x:\FP-E-coupon
npm run dev
```

---

## 🔄 Integration Modes

We support 4 modes (configured via environment variable):

| Mode | Env Var | Use Case |
|------|---------|----------|
| **CLI** | `ZK_INTEGRATION_MODE=cli` | Easiest, good for testing |
| **Native** | `ZK_INTEGRATION_MODE=native` | Best performance |
| **Network** | `ZK_INTEGRATION_MODE=network` | If scanner is networked |
| **Mock** | `ZK_INTEGRATION_MODE=mock` | Default, no hardware needed |

---

## 📞 Next Steps After Setup

1. **Enroll Employees:**
   - Capture fingerprints for each employee
   - Save templates to database
   - Map to employee IDs

2. **Test Workflow:**
   - Scan real fingerprint
   - Verify employee
   - Redeem meal
   - Check admin panel

3. **Production Hardening:**
   - Auto-start bridge on boot
   - Error recovery
   - Logging
   - Backup power

---

**Ready to start? Let's begin with Step 1!**
