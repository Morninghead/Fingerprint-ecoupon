@echo off
REM Build ZK9500 CLI with Visual Studio 2022
echo ========================================
echo Building ZK9500 CLI with Visual Studio
echo ========================================
echo.

cd /d "%~dp0"

set "SDK_INCLUDE=..\..\ZK9500\C\libs\include"
set "SDK_LIB_X64=..\..\ZK9500\C\libs\x64lib"

REM Try to find Visual Studio 2022
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"

if exist "%VSWHERE%" (
    for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
        set "VS_PATH=%%i"
    )
)

if defined VS_PATH (
    echo Found Visual Studio at: %VS_PATH%
    call "%VS_PATH%\VC\Auxiliary\Build\vcvars64.bat"
    echo.
) else (
    echo Trying to use cl.exe from PATH...
)

echo Checking SDK files...
if not exist "%SDK_INCLUDE%\libzkfp.h" (
    echo [ERROR] libzkfp.h not found!
    echo Expected: %SDK_INCLUDE%\libzkfp.h
    pause
    exit /b 1
)

if not exist "%SDK_LIB_X64%\libzkfp.lib" (
    echo [ERROR] libzkfp.lib not found!
    echo Expected: %SDK_LIB_X64%\libzkfp.lib
    pause
    exit /b 1
)

echo [OK] SDK files found
echo.

echo Compiling with Visual Studio...
cl.exe /EHsc /O2 /std:c++17 /I"%SDK_INCLUDE%" zk9500-cli.cpp /link /LIBPATH:"%SDK_LIB_X64%" libzkfp.lib ws2_32.lib /OUT:zk9500-cli.exe

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo [SUCCESS] zk9500-cli.exe created!
    echo ========================================
    echo.
    echo Test commands:
    echo   zk9500-cli.exe test       - Check if scanner detected
    echo   zk9500-cli.exe capture    - Capture fingerprint
    echo.
    pause
    exit /b 0
) else (
    echo.
    echo [ERROR] Compilation failed with error code %errorlevel%
    pause
    exit /b 1
)
