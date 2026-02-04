@echo off
REM Quick Start Script for ZKTeco Fingerprint Bridge
REM Makes it easy to switch between integration modes and test

echo.
echo ========================================
echo   ZK9500 Fingerprint Bridge - Quick Start
echo ========================================
echo.
echo Current Settings:
echo.

REM Check current mode (if environment variable is set)
if defined ZK_INTEGRATION_MODE (
    echo   Integration Mode: %ZK_INTEGRATION_MODE%
) else (
    echo   Integration Mode: mock ^(default^)
)

REM Check device IP for network mode
if defined ZK_DEVICE_IP (
    echo   Device IP: %ZK_DEVICE_IP%
)

REM Check auth token for development
if defined ZK_AUTH_TOKEN (
    echo   Auth Token: Set ^(development mode^)
) else (
    echo   Auth Token: Not set
)

echo.
echo Available Integration Modes:
echo   1. CLI       - Easiest to test with ZK9500 hardware
echo   2. Native     - Best performance (requires native addon build)
echo   3. Network    - For Ethernet-connected ZK devices
echo   4. Mock       - Default mode for development (no hardware)
echo.
echo Quick Commands:
echo   test           - Start Electron bridge and open Kiosk UI
echo   build-cli       - Build CLI wrapper ^(for mode 1^)
echo   build-native    - Build native addon ^(for mode 2^)
echo   stop           - Stop Electron bridge
echo   clean           - Clean build artifacts
echo.
echo ========================================
echo.

REM Command handling
if "%1"=="test" (
    cd X:\FP-E-coupon\electron-bridge
    start npm start
    goto :end
)

if "%1"=="build-cli" (
    cd X:\FP-E-coupon\electron-bridge\native
    call build-cli.bat
    echo.
    echo CLI build complete. You can now test mode 1.
    goto :end
)

if "%1"=="build-native" (
    cd X:\FP-E-coupon\electron-bridge\native
    call build-native.bat
    echo.
    echo Native addon build complete. You can now test mode 2.
    goto :end
)

if "%1"=="stop" (
    taskkill /F /IM node.exe /T
    echo.
    echo Electron bridge stopped.
    goto :end
)

if "%1"=="clean" (
    cd X:\FP-E-coupon\electron-bridge\native
    if exist build rmdir /s /q build
    if exist release rmdir /s /q release
    if exist zkteco-cli.exe del zkteco-cli.exe
    echo.
    echo Build artifacts cleaned.
    goto :end
)

REM Mode switching
if "%2"=="cli" (
    set ZK_INTEGRATION_MODE=cli
    echo.
    echo Switched to CLI mode ^(mode 1^)
    echo Start bridge with: start.bat test
    goto :end
)

if "%2"=="native" (
    set ZK_INTEGRATION_MODE=native
    echo.
    echo Switched to Native mode ^(mode 2^)
    echo Start bridge with: start.bat test
    goto :end
)

if "%2"=="network" (
    set ZK_INTEGRATION_MODE=network
    echo.
    echo Switched to Network mode ^(mode 3^)
    echo Start bridge with: start.bat test
    goto :end
)

if "%2"=="mock" (
    set ZK_INTEGRATION_MODE=
    echo.
    echo Switched to Mock mode ^(mode 4 - default^)
    echo Start bridge with: start.bat test
    goto :end
)

REM Show help if no arguments
if "%1"=="" (
    echo.
    echo No command specified.
    echo.
    echo Usage: start.bat [command] [mode]
    echo.
    echo Commands:
    echo   test          - Start bridge and open Kiosk
    echo   build-cli     - Build CLI wrapper
    echo   build-native  - Build native addon
    echo   stop          - Stop bridge
    echo   clean         - Clean build artifacts
    echo.
    echo Mode switching: start.bat [cli^|native^|network^|mock]
    echo.
    echo Environment Variables:
    echo   ZK_INTEGRATION_MODE - Set integration mode
    echo   ZK_DEVICE_IP       - Set device IP for network mode
    echo   ZK_AUTH_TOKEN      - Set auth token for dev mode
    echo.
    goto :end
)

:end
echo.
