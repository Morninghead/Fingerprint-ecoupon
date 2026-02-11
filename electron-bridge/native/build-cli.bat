@echo off
REM Build ZKTeco CLI Wrapper for Windows
echo ========================================
echo Building ZKTeco CLI for ZK9500  
echo ========================================
echo.

REM Set paths
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "SDK_DIR=%SCRIPT_DIR%..\..\Standalone-SDK\SDK_v6.2.4.11\sdk"
set "MINGW_PATH=C:\Users\snatc\mingw64\bin\g++.exe"

echo Checking SDK files...
echo SDK Directory: %SDK_DIR%
echo.

REM Check if SDK DLL exists
if not exist "%SDK_DIR%\zkemsdk.dll" (
    echo [ERROR] zkemsdk.dll not found!
    echo Expected location: %SDK_DIR%
    echo.
    echo Please ensure the ZK SDK is installed.
    pause
    exit /b 1
)

echo [OK] SDK files found
echo.

REM Check for Visual Studio compiler
echo Checking for Visual Studio compiler...
where cl.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Visual Studio compiler found
    echo Compiling with Visual Studio...
    cl.exe /EHsc /O2 /std:c++17 /I"%SDK_DIR%" zkteco-cli.cpp /link /LIBPATH:"%SDK_DIR%" zkemsdk.lib ws2_32.lib
    if %errorlevel% neq 0 (
        echo [ERROR] Compilation failed
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] zkteco-cli.exe created successfully!
    goto success
)

REM Check for MinGW at known location
echo Visual Studio not found, checking for MinGW...
if exist "%MINGW_PATH%" (
    echo [OK] MinGW found at: %MINGW_PATH%
    echo Compiling with MinGW...
    "%MINGW_PATH%" -std=c++17 -O2 -I"%SDK_DIR%" -DWIN32 zkteco-cli.cpp -o zkteco-cli.exe -L"%SDK_DIR%" -lzkemsdk -lws2_32
    if %errorlevel% neq 0 (
        echo [ERROR] Compilation failed
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] zkteco-cli.exe created successfully with MinGW!
    goto success
)

REM Check for g++ in PATH
where g++.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MinGW found in PATH
    echo Compiling with MinGW...
    g++ -std=c++17 -O2 -I"%SDK_DIR%" -DWIN32 zkteco-cli.cpp -o zkteco-cli.exe -L"%SDK_DIR%" -lzkemsdk -lws2_32
    if %errorlevel% neq 0 (
        echo [ERROR] Compilation failed
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] zkteco-cli.exe created successfully with MinGW!
    goto success
)

echo [ERROR] No C++ compiler found!
echo.
echo Checked:
echo  - Visual Studio (cl.exe)
echo  - MinGW at: %MINGW_PATH%
echo  - g++ in PATH
echo.
pause
exit /b 1

:success
echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo.
echo 1. Test scanner:
echo    zkteco-cli.exe --test
echo.
echo 2. Capture fingerprint:
echo    zkteco-cli.exe --capture
echo.
echo 3. Start bridge in CLI mode:
echo    cd ..
echo    set ZK_INTEGRATION_MODE=cli
echo    node server.js
echo.
pause
exit /b 0
