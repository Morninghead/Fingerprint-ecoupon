# ZKTeco Fingerprint Bridge for Electron

USB ZK9500 fingerprint scanner integration for E-Coupon PWA system.

## Files

- `fingerprint.js` - WebSocket bridge with 4 integration modes
- `main.js` - Electron main process
- `native/` - ZKTeco SDK integration files
  - `zkteco-cli.cpp` - CLI wrapper (C++)
  - `zkteco-cli.exe` - Compiled CLI (run build-cli.bat)
  - `binding.gyp` - Native addon build config
  - `zkteco-native.cpp` - Node.js native addon (with N-API)
  - `zkteco_native.node` - Compiled native addon (run node-gyp rebuild)
  - `build-cli.bat` - Build script for CLI
  - `build-native.bat` - Build script for native addon
  - `README.md` - Native integration guide

## SDK Files Location

Required ZKTeco Standalone SDK files should be at:
```
X:\FP-E-coupon\Standalone-SDK\Communication Protocol SDK(32Bit Ver6.2.4.11)\sdk\
```

Required DLLs:
- `zkemsdk.dll` - Main ZK EMS SDK (fingerprint operations)
- `usbcomm.dll` - USB communication
- `zkemkeeper.dll` - Device management

## Integration Modes

### Mode 1: CLI Wrapper (Recommended for Testing)

**Setup:**
```batch
cd electron-bridge/native
build-cli.bat
```

**Usage:**
```batch
set ZK_INTEGRATION_MODE=cli
cd ..
npm start
```

**Commands:**
- `capture` - Capture fingerprint from USB device
- `version` - Get device version
- `serial` - Get device serial number

### Mode 2: Native Node.js Addon (Best Performance)

**Setup:**
```bash
cd electron-bridge/native
npm install
node-gyp rebuild
```

**Usage:**
```batch
set ZK_INTEGRATION_MODE=native
cd ..
npm start
```

**Functions:**
- `captureFingerprint()` - Returns Buffer with fingerprint template
- `getVersion()` - Returns device version string
- `connect(ip, port)` - Connect to networked ZK device

### Mode 3: Networked Mode (Alternative)

**Setup:**
```bash
cd electron-bridge
npm install zkteco-js
```

**Usage:**
```batch
set ZK_INTEGRATION_MODE=network
set ZK_DEVICE_IP=192.168.1.201
npm start
```

Uses zkteco-js library for TCP/IP communication with ZK device.

### Mode 4: Mock Mode (Default - Development)

**Usage:**
```batch
set ZK_INTEGRATION_MODE=mock
npm start
```

Uses simulated fingerprint capture for UI testing.

## Environment Variables

| Variable | Options | Description |
|----------|---------|-------------|
| `ZK_INTEGRATION_MODE` | `cli`, `native`, `network`, `mock` | Integration mode to use |
| `ZK_DEVICE_IP` | `192.168.x.x` | Device IP for network mode |

## Testing Each Mode

### Test CLI Mode:
```batch
cd electron-bridge/native
build-cli.bat
cd ..
set ZK_INTEGRATION_MODE=cli
npm start
```

### Test Native Mode:
```bash
cd electron-bridge/native
npm install
node-gyp rebuild
cd ..
set ZK_INTEGRATION_MODE=native
npm start
```

### Test Network Mode:
```batch
cd electron-bridge
npm install zkteco-js
set ZK_INTEGRATION_MODE=network
set ZK_DEVICE_IP=192.168.1.201
npm start
```

### Test Mock Mode:
```batch
set ZK_INTEGRATION_MODE=mock
npm start
```

## Troubleshooting

**CLI/Native modes fail:**
- Ensure SDK DLLs are in `Standalone-SDK/sdk/`
- Run SDK's `Auto-install_sdk.bat` first
- Check Visual Studio or MinGW is installed

**Network mode fails:**
- Verify ZK device IP address
- Ensure device supports TCP/IP mode
- Check firewall settings

**Device not detected:**
- Check USB connection (try ZK software demo app)
- Verify device drivers are installed
- Check Windows Device Manager

## Current Status

- ✅ SDK cloned to `X:\FP-E-coupon\Standalone-SDK\`
- ✅ Integration files created in `electron-bridge/native/`
- ✅ fingerprint.js updated with 4-mode support
- ✅ Ready to test with your ZK9500 hardware

## Next Steps

1. Copy SDK DLLs to `Standalone-SDK/sdk/` or run `Auto-install_sdk.bat`
2. Choose integration mode and test
3. Configure device IP for network mode (if applicable)
4. Test fingerprint capture with Kiosk UI
