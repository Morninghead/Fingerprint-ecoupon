# ZKTeco SDK Integration Guide

This directory contains three integration approaches for USB ZK9500 fingerprint scanner.

## Files

- `zkteco-cli.cpp` - CLI wrapper (C++)
- `zkteco-cli.exe` - Compiled CLI executable (run build-cli.bat)
- `zkteco-native.cpp` - Node.js native addon (C++ with N-API)
- `zkteco_native.node` - Compiled native addon (run node-gyp rebuild)
- `binding.gyp` - Build configuration for native addon
- `build-native.bat` - Build script for native addon

## SDK Files Location

The ZKTeco Standalone SDK DLLs should be at:
```
X:\FP-E-coupon\Standalone-SDK\Communication Protocol SDK(32Bit Ver6.2.4.11)\sdk\
```

Required DLLs:
- `zkemsdk.dll` - Main ZK EMS SDK (fingerprint operations)
- `usbcomm.dll` - USB communication
- `zkemkeeper.dll` - Device management

## Integration Modes

### Mode 1: CLI Wrapper (Recommended for Testing)

1. Build the CLI:
   ```batch
   cd electron-bridge/native
   build-cli.bat
   ```

2. Set environment variable:
   ```batch
   set ZK_INTEGRATION_MODE=cli
   ```

3. Start Electron bridge

**Commands supported:**
- `capture` - Capture fingerprint from USB device
- `version` - Get device version
- `serial` - Get device serial number

### Mode 2: Native Node.js Addon (Best Performance)

1. Install dependencies:
   ```bash
   cd electron-bridge/native
   npm install
   ```

2. Build native addon:
   ```bash
   node-gyp rebuild
   ```

3. Set environment variable:
   ```batch
   set ZK_INTEGRATION_MODE=native
   ```

4. Start Electron bridge

**Functions available:**
- `captureFingerprint()` - Returns Buffer with fingerprint template
- `getVersion()` - Returns device version string
- `connect(ip, port)` - Connect to networked ZK device

### Mode 3: Networked Mode (Alternative)

If your ZK9500 is connected via Ethernet instead of USB:

1. Install zkteco-js:
   ```bash
   cd electron-bridge
   npm install zkteco-js
   ```

2. Set environment variable:
   ```batch
   set ZK_INTEGRATION_MODE=network
   set ZK_DEVICE_IP=192.168.1.201
   ```

3. Start Electron bridge

This uses zkteco-js to communicate over TCP/IP network.

### Mode 4: Mock Mode (Default)

No SDK required - for development and UI testing only.

```bash
set ZK_INTEGRATION_MODE=mock
```

## Testing

Test each mode by setting `ZK_INTEGRATION_MODE` before starting:

```batch
# Test CLI mode
set ZK_INTEGRATION_MODE=cli
npm start

# Test Native mode (after building)
set ZK_INTEGRATION_MODE=native
npm start

# Test Network mode (after installing zkteco-js)
set ZK_INTEGRATION_MODE=network
npm start

# Test Mock mode (default)
npm start
```

## Troubleshooting

**CLI mode fails:**
- Check if `zkemsdk.dll` is in `Standalone-SDK/sdk/` folder
- Run `Auto-install_sdk.bat` from SDK directory first

**Native mode fails:**
- Run `node-gyp rebuild`
- Check Python 2.7+ is installed
- Check Visual Studio Build Tools are installed

**Network mode fails:**
- Verify device IP address
- Ensure device supports TCP/IP mode
- Check firewall settings

**Device not detected:**
- Check USB connection (try ZK software demo app)
- Verify device drivers are installed
- Check Windows Device Manager
