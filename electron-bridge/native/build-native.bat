@echo off
REM Build ZKTeco Native Addon for Node.js
echo Building zkteco_native.node...

REM Check SDK path
set SDK_PATH=%~dp0\Standalone-SDK\Communication Protocol SDK(32Bit Ver6.2.4.11)\sdk

if not exist "%SDK_PATH%\zkemsdk.dll" (
    echo ERROR: zkemsdk.dll not found in %SDK_PATH%
    echo Please copy the SDK files to the project directory first
    pause
    exit /b 1
)

REM Run node-gyp rebuild
node-gyp rebuild

if %errorlevel% equ 0 (
    echo SUCCESS: zkteco_native.node created
) else (
    echo ERROR: Build failed
    pause
    exit /b 1
)
