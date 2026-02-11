# 🔍 ZK9500 Troubleshooting Summary

**Time:** 2026-02-05 13:59  
**Status:** SDK compiled, scanner detected, but fingerprint capture failing

---

## ✅ **What's Working:**

1. **Compilation:** Visual Studio successfully compiled the CLI
2. **Device Detection:** 2 devices found (Device 0 available)
3. **SDK Initialization:**  ZKFPM_Init() = Success
4. **Device Open:** ZKFPM_OpenDevice(0) = Success 
5. **Sensor Init:** Exposure settings loading correctly

---

## ❌ **Current Issue:**

**Error Code: -8** when calling `ZKFPM_AcquireFingerprint()`

**Error -8 = ZKFP_ERR_TIMEOUT** - This means:
- The SDK is waiting for a finger
- But nothing is detected within the timeout period
- Function returns immediately (not actually waiting)

---

## 🤔 **Possible Causes:**

### **1. SDK API Not Fully Understood**
- `ZKFPM_AcquireFingerprint()` might need different parameters
- May need to call other setup functions first
- Template buffer size might be wrong

### **2. Scanner Not In Capture Mode**
- Device might need to be "armed" first
- LED might need to be activated
- Sensor might need a wake-up call

### **3. Wrong Device Selected**
- Device 0 opens successfully but might not be the ZK9500
- Device 1 is "unavailable" - might be the actual ZK9500

---

## 📋 **Next Steps to Try:**

### **Option A: Check SDK Documentation** ⭐
- Look at C API PDF: `x:\FP-E-coupon\ZK9500\C\ZKFinger Reader SDK C API_en_V2.pdf`
- Find example code for `ZKFPM_AcquireFingerprint()`
- Check if there are prerequisite calls

### **Option B: Try Demo Code**
- Check: `x:\FP-E-coupon\ZK9500\C\MFC Demo\`
- See how they call the capture function
- Copy their approach

### **Option C: Different Capture Method**
- Try `ZKFPM_AcquireFingerprintImage()` instead
- Try setting parameters before capture
- Try with callback instead of blocking call

### **Option D: Simpler Test**
- Don't try to capture yet
- Just check if we can:
  - Turn LED on/off
  - Get device parameters
  - Read sensor status

---

## 💡 **Most Likely Fix:**

Based on the error pattern, we probably need to:

1. Call a "Begin Capture" or "Enable Sensor" function
2. Wait for sensor ready callback
3. THEN call AcquireFingerprint()

---

## 🎯 **Immediate Action:**

**Check the SDK PDF documentation to see the proper capture sequence!**

The PDF should show example code like:
```cpp
// Probably missing steps like:
ZKFPM_SetParameters(...);  // Configure sensor?
ZKFPM_BeginCapture(...);   // Start capture mode?
// THEN:
ZKFPM_AcquireFingerprint(...);
```

---

**File to check:** `x:\FP-E-coupon\ZK9500\C\ZKFinger Reader SDK C API_en_V2.pdf`
