@echo off
echo Compiling Java Fingerprint CLI...

set JAVA_HOME=C:\Program Files\Java\jdk-24
set SRC_DIR=src
set LIB_DIR=lib
set OUT_DIR=bin
set JAR_NAME=FpJavaCLI.jar

REM Create output directory
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

REM Compile Java files
echo Compiling...
javac -cp "%LIB_DIR%\ZKFingerReader.jar" -d "%OUT_DIR%" "%SRC_DIR%\com\zkteco\fp\FpScanner.java"

if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)

REM Create manifest
echo Main-Class: com.zkteco.fp.FpScanner> manifest.txt
echo Class-Path: lib/ZKFingerReader.jar>> manifest.txt

REM Create JAR
echo Creating JAR...
jar cfm "%JAR_NAME%" manifest.txt -C "%OUT_DIR%" .

if errorlevel 1 (
    echo JAR creation failed!
    pause
    exit /b 1
)

del manifest.txt

echo.
echo Build successful! Created %JAR_NAME%
echo.
echo Usage:
echo   java -jar %JAR_NAME% test             - Test device
echo   java -jar %JAR_NAME% scan [json]      - Scan mode
echo.
pause
