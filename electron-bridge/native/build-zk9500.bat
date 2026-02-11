@echo off
REM Build ZK9500 CLI using libzkfp SDK
echo ========================================
echo Building ZK9500 CLI with libzkfp SDK
echo ========================================
echo.

cd /d "%~dp0"

set "SDK_INCLUDE=..\..\ZK9500\C\libs\include"
set "SDK_LIB_X64=..\..\ZK9500\C\libs\x64lib"
set "MINGW=C:\Users\snatc\mingw64\bin\g++.exe"

echo Checking SDK files...
if not exist "%SDK_INCLUDE%\libzkfp.h" (
    echo [ERROR] libzkfp.h not found!
    pause
    exit /b 1
)

if not exist "%SDK_LIB_X64%\libzkfp.lib" (
    echo [ERROR] libzkfp.lib not found!
    pause
    exit /b 1
)

echo [OK] SDK files found
echo.

REM Check for MinGW
if exist "%MINGW%" (
    echo [OK] MinGW found
    echo Compiling...
    
    "%MINGW%" -std=c++17 -O2 ^
        -I"%SDK_INCLUDE%" ^
        zk9500-cli.cpp ^
        -o zk9500-cli.exe ^
        -L"%SDK_LIB_X64%" ^
        -lzkfp ^
        -lws2_32
    
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] zk9500-cli.exe created!
        echo.
        echo Test it:
        echo   zk9500-cli.exe test
        echo   zk9500-cli.exe capture
        echo.
        goto success
    ) else (
        echo [ERROR] Compilation failed
        pause
        exit /b 1
    )
)

REM Check for Visual Studio
where cl.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Visual Studio found
    echo Compiling...
    
    cl.exe /EHsc /O2 /std:c++17 ^
        /I"%SDK_INCLUDE%" ^
        zk9500-cli.cpp ^
        /link /LIBPATH:"%SDK_LIB_X64%" ^
        libzkfp.lib ws2_32.lib
    
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] zk9500-cli.exe created!
        goto success
    )
)

echo [ERROR] No compiler found!
echo Please install Visual Studio or ensure MinGW is at:
echo %MINGW%
pause
exit /b 1

:success
pause
exit /b 0
