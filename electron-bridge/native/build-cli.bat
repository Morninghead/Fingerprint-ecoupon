@echo off
REM Build ZKTeco CLI Wrapper for Windows
echo Compiling zkteco-cli.exe...

set SDK_PATH=%~dp0\Standalone-SDK\Communication Protocol SDK(32Bit Ver6.2.4.11)\sdk

REM Check if SDK exists
if not exist "%SDK_PATH%\zkemsdk.dll" (
    echo ERROR: zkemsdk.dll not found in %SDK_PATH%
    echo Please copy the SDK files to the project directory first
    pause
    exit /b 1
)

REM Compile with Visual Studio if available
where cl.exe >nul 2>&1
if %errorlevel% equ 0 (
    cl.exe /EHsc /O2 /std:c++17 /I"%SDK_PATH%" zkteco-cli.cpp /link /LIBPATH:"%SDK_PATH%" zkemsdk.lib ws2_32.lib
    if %errorlevel% neq 0 (
        echo ERROR: Compilation failed
        exit /b 1
    )
    echo SUCCESS: zkteco-cli.exe created
    goto :end
)

REM Compile with MinGW as fallback
where g++.exe >nul 2>&1
if %errorlevel% equ 0 (
    g++ -std=c++17 -O2 -I"%SDK_PATH%" -DWIN32 zkteco-cli.cpp -o zkteco-cli.exe -L"%SDK_PATH%" -lzkemsdk -lws2_32
    if %errorlevel% neq 0 (
        echo ERROR: Compilation failed
        exit /b 1
    )
    echo SUCCESS: zkteco-cli.exe created with MinGW
    goto :end
)

echo ERROR: Neither cl.exe nor g++.exe found
echo Please install Visual Studio or MinGW to compile
pause
exit /b 1

:end
