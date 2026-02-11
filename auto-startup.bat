@echo off
:: ============================================
:: FP E-Coupon Auto Startup Script
:: ============================================
:: วางไว้ใน Windows Startup folder หรือ Task Scheduler
:: ============================================

echo [%date% %time%] Starting FP E-Coupon System...

:: 1. Start Next.js Server in background
cd /d X:\FP-E-coupon
start "NextJS Server" cmd /c "npm run dev"

:: Wait for server to start
timeout /t 10 /nobreak

:: 2. Start FpTest.exe
start "" "X:\FP-E-coupon\FpTest\bin\Release\net48\FpTest.exe"

echo [%date% %time%] System started successfully!
