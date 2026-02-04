# ZKTeco Fingerprint Bridge - Step-by-Step Setup Guide

Complete guide for integrating USB ZK9500 fingerprint scanner with E-Coupon PWA system.

---

## 📋 Prerequisites

### Required Hardware
- ZK9500 USB fingerprint scanner
- Computer with USB 2.0 port available
- (Optional) Network connection if using network mode

### Required Software

**For CLI Mode:**
- Visual Studio C++ (2015 or later) OR MinGW-w64
- Windows SDK

**For Native Mode:**
- Node.js 16+ installed
- Python 2.7+ (for node-gyp)
- Windows Build Tools

**For Network Mode:**
- zkteco-js npm package

---

## 📂 Step 1: Clone ZKTeco SDK

The SDK has been cloned to:
```
X:\FP-E-coupon\Standalone-SDK\
```

### Option A: Copy SDK DLLs (If provided separately)

If you received ZK9500 SDK on CD/USB drive:

1. Copy all `.dll` files from SDK disk to:
   ```
   X:\FP-E-coupon\Standalone-SDK\Communication Protocol SDK(32Bit Ver6.2.4.11)\sdk\
   ```

2. Required DLLs:
   - `zkemsdk.dll` - Main SDK (fingerprint operations)
   - `usbcomm.dll` - USB communication
   - `zkemkeeper.dll` - Device management

### Option B: Run SDK Auto-Install (If SDK came with device)

If your ZK9500 device included SDK on CD/USB:

1. Navigate to SDK directory:
   ```batch
   cd "X:\FP-E-coupon\Standalone-SDK\Communication Protocol SDK(32Bit Ver6.2.4.11)"
   ```

2. Run auto-install:
   ```batch
   Auto-install_sdk.bat
   ```

3. Verify DLLs are installed:
   ```batch
   dir "%windir%\system32\zkemkeeper.dll"
   dir "%windir%\system32\zkemsdk.dll"
   ```

4. Note: SDK should now be in `C:\Windows\System32\` (or SysWOW64 for 32-bit apps)

---

## 🔨 Step 2: Choose Integration Mode

**Option 1: CLI Mode (Recommended - Easiest to Test)**

Best for initial testing because you can run the CLI directly without Electron.

**Option 2: Native Node.js Addon (Best Performance)**

Direct Node.js FFI bindings to ZK SDK DLLs for maximum performance.

**Option 3: Networked Mode (If Device Supports Ethernet)**

Use TCP/IP communication instead of USB if your ZK9500 is networked.

**Option 4: Mock Mode (Default - Development)**

Simulated fingerprint capture for UI testing without hardware.

---

## 🔨 Step 3: Build Integration

### For CLI Mode

**3.1. Build CLI executable:**

1. Open Command Prompt as Administrator
2. Navigate to native directory:
   ```batch
   cd X:\FP-E-coupon\electron-bridge\native
   ```

3. Run build script:
   ```batch
   build-cli.bat
   ```

4. This will attempt to compile with:
   - Visual Studio C++ (first priority)
   - MinGW-w64 (fallback)

5. Verify compilation:
   - Look for: `SUCCESS: zkteco-cli.exe created`
   - If successful, `zkteco-cli.exe` should exist in `native/` folder

### For Native Mode

**3.1. Install dependencies:**

1. Open Command Prompt as Administrator
2. Navigate to native directory:
   ```batch
   cd X:\FP-E-coupon\electron-bridge\native
   ```

3. Install Node.js build tools:
   ```bash
   npm install
   ```

4. Build native addon:
   ```bash
   node-gyp rebuild
   ```

5. This will:
   - Download and install node-gyp if not present
   - Compile `zkteco-native.cpp` using Visual C++
   - Create `build/Release/zkteco_native.node`
   - Copy compiled addon to `native/` folder

6. Verify build:
   - Check if `zkteco_native.node` exists in `native/` folder
   - Check if `build/Release/` folder was created

### For Network Mode

**3.1. Install zkteco-js:**

1. Navigate to electron-bridge directory:
   ```batch
   cd X:\FP-E-coupon\electron-bridge
   ```

2. Install library:
   ```bash
   npm install zkteco-js
   ```

---

## 🔨 Step 4: Test Integration

### Test CLI Mode

**4.1. Run Electron bridge in CLI mode:**

1. Set environment variable:
   ```batch
   set ZK_INTEGRATION_MODE=cli
   ```

2. Start Electron bridge:
   ```batch
   cd X:\FP-E-coupon\electron-bridge
   npm start
   ```

3. Open Kiosk UI in browser:
   ```
   http://localhost:3000/kiosk
   ```

4. Click "Scan Fingerprint" button

5. Expected result:
   - Fingerprint captures from USB device
   - Template returned in base64 format
   - Employee looked up via `/api/verify-fingerprint`

**4.2. Verify CLI works standalone:**

Test CLI directly without Electron:
```batch
cd X:\FP-E-coupon\electron-bridge\native
zkteco-cli.exe capture
```

Expected JSON output:
```json
{"success":true,"template":"hexhexhexhex...","length":512}
```

### Test Native Mode

**4.3. Run Electron bridge in Native mode:**

1. Set environment variable:
   ```batch
   set ZK_INTEGRATION_MODE=native
   ```

2. Start Electron bridge:
   ```batch
   cd X:\FP-E-coupon\electron-bridge
   npm start
   ```

3. Open Kiosk UI in browser:
   ```
   http://localhost:3000/kiosk
   ```

4. Click "Scan Fingerprint" button

5. Expected result:
   - Direct Node.js FFI call to ZK SDK
   - Best performance (no CLI overhead)
   - Template returned as Buffer → converted to base64

### Test Network Mode

**4.4. Check if your ZK9500 supports Ethernet:**

Some ZK9500 models have both USB and Ethernet ports.

**4.5. Run Electron bridge in Network mode:**

1. Install zkteco-js if not installed:
   ```bash
   cd X:\FP-E-coupon\electron-bridge
   npm install zkteco-js
   ```

2. Find your device IP:
   - Use ZKTeco software or router to find device IP
   - Default ZK devices often use: `192.168.1.201`

3. Set environment variables:
   ```batch
   set ZK_INTEGRATION_MODE=network
   set ZK_DEVICE_IP=192.168.1.201
   ```

4. Start Electron bridge:
   ```batch
   cd X:\FP-E-coupon\electron-bridge
   npm start
   ```

5. Open Kiosk UI in browser:
   ```
   http://localhost:3000/kiosk
   ```

6. Click "Scan Fingerprint" button

7. Expected result:
   - Connects to ZK device via TCP/IP
   - Monitors for attendance/fingerprint events
   - Returns mock template (real fingerprint requires device protocol)

### Test Mock Mode (Default)

**4.6. Verify default behavior:**

1. No setup required - just start:
   ```batch
   cd X:\FP-E-coupon\electron-bridge
   npm start
   ```

2. Open Kiosk UI and click "Scan Fingerprint"

3. Expected result:
   - Simulated fingerprint capture
   - Template: `mock_fingerprint_template` (base64 encoded)
   - Works without any hardware

---

## 🔨 Step 5: Integrate with Kiosk UI

The Kiosk UI at `/kiosk` is already configured to communicate with the fingerprint bridge.

**Current behavior:**
- Connects to WebSocket: `ws://localhost:8081`
- Sends command: `{"type":"capture"}`
- Receives response: `{"type":"fingerprint","template":"..."}`
- Sends template to API: `/api/verify-fingerprint`
- Displays success/error messages

**No additional UI changes needed** - the bridge handles all modes transparently!

---

## 🔍 Step 6: Troubleshooting

### CLI Mode Issues

**Problem:** `build-cli.bat` fails with "SDK not found"

**Solution:**
1. Check if `X:\FP-E-coupon\Standalone-SDK\Communication Protocol SDK(32Bit Ver6.2.4.11)\sdk\` exists
2. Run SDK's `Auto-install_sdk.bat` first to install DLLs to system
3. Then try building CLI again

**Problem:** `zkteco-cli.exe capture` returns error

**Solution:**
1. Test CLI standalone first (without Electron)
2. Check Windows Device Manager for ZK device recognition
3. Try running as Administrator
4. Verify device is connected via USB

### Native Mode Issues

**Problem:** `node-gyp rebuild` fails

**Solution:**
1. Install Visual Studio Build Tools
2. Check Python 2.7+ is installed: `python --version`
3. Clear node-gyp cache: `npm cache clean --force`
4. Try running with verbose: `node-gyp rebuild --verbose`

**Problem:** `require('./zkteco_native.node')` fails

**Solution:**
1. Verify `zkteco_native.node` was compiled successfully
2. Check it's in the correct location: `electron-bridge/native/`
3. Try rebuilding if needed

### Network Mode Issues

**Problem:** Cannot connect to device IP

**Solution:**
1. Verify device is on same network
2. Check firewall settings (allow port 4370)
3. Ping device: `ping 192.168.1.201`
4. Try device IP without port first (some ZK devices use different default port)
5. Check if zkteco-js library works: create simple test script

### Device Not Detected

**Problem:** Fingerprint scanner not recognized

**Solution:**
1. Check USB connection (try another USB port)
2. Verify device drivers installed
3. Check Windows Device Manager - look for "ZK" or "Fingerprint" devices
4. Try device with ZKTeco's own software (demo app usually included)
5. Restart computer and reconnect device

---

## 📊 Integration Mode Comparison

| Mode | Setup Complexity | Performance | Reliability | Best For |
|-------|-----------------|------------|--------------|------------|
| **CLI** | Low (compile once) | Medium (CLI overhead) | ⭐⭐⭐⭐⭐⭐⭐ | Quick testing |
| **Native** | Medium (node-gyp) | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Production use |
| **Network** | Low (npm install) | Medium (TCP/IP) | ⭐⭐⭐ | Ethernet devices |
| **Mock** | None (default) | N/A | ⭐ | UI testing only |

---

## 🎯 Recommendations

### For Production: Use **Native Mode**

1. Build native addon for best performance
2. Test thoroughly with CLI mode first
3. Deploy with proper error handling

### For Development: Use **Mock Mode**

1. No hardware required
2. Fast UI iteration
3. Focus on business logic first

### For Initial Testing: Use **CLI Mode**

1. Easiest to verify SDK works
2. Can test independently of Electron
3. Clear error messages

---

## 📝 Quick Reference Commands

### Test All Modes:
```batch
# CLI Mode
set ZK_INTEGRATION_MODE=cli && npm start

# Native Mode (after building)
set ZK_INTEGRATION_MODE=native && npm start

# Network Mode
npm install zkteco-js
set ZK_INTEGRATION_MODE=network && npm start

# Mock Mode (default)
set ZK_INTEGRATION_MODE=mock && npm start
```

### Build CLI:
```batch
cd electron-bridge\native
build-cli.bat
```

### Build Native:
```batch
cd electron-bridge\native
npm install
node-gyp rebuild
```

### Check SDK Installation:
```batch
dir "%windir%\system32\zkemkeeper.dll"
dir "%windir%\system32\zkemsdk.dll"
```

---

## ✅ Checklist

Before starting production, verify:

- [ ] SDK DLLs are in system32 (or installed via electron-bridge)
- [ ] Integration mode tested successfully
- [ ] Fingerprint capture working with hardware
- [ ] Employee lookup via `/api/verify-fingerprint` working
- [ ] Meal redemption via `/api/redeem` working
- [ ] Error handling tested
- [ ] Offline PWA mode tested

---

## 📞 Support

If you encounter issues not covered in this guide:

1. Check `electron-bridge/README.md` for integration details
2. Check `electron-bridge/native/README.md` for native/CLI specifics
3. Review ZKTeco SDK documentation (if available)
4. Check browser console for WebSocket errors

---

## 📖 Additional Notes

- The fingerprint bridge runs on WebSocket port **8081**
- Electron bridge starts automatically with `npm start` in `electron-bridge/`
- Mode is controlled by `ZK_INTEGRATION_MODE` environment variable
- Default mode is **mock** (no hardware required)
- Kiosk UI is at `http://localhost:3000/kiosk`
- Admin UI is at `http://localhost:3000/admin`

---

**Last updated:** 2026-02-04
**Integration files location:** `X:\FP-E-coupon\electron-bridge\`
**SDK location:** `X:\FP-E-coupon\Standalone-SDK\`
