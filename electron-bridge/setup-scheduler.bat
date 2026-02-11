@echo off
REM Run this script AS ADMINISTRATOR to create the scheduled task
REM This will sync attendance every 15 minutes

echo Creating scheduled task for ZKTeco Attendance Sync...

schtasks /create /tn "ZKTeco Attendance Sync" /tr "X:\FP-E-coupon\electron-bridge\sync-task.bat" /sc minute /mo 15 /ru "%USERNAME%" /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ Task created successfully!
    echo Task will run every 15 minutes.
    echo.
    echo To view: Task Scheduler ^> ZKTeco Attendance Sync
) else (
    echo.
    echo ❌ Failed to create task. Please run as Administrator.
)

pause
