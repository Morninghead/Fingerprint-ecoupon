@echo off
:: ============================================
:: FP E-Coupon Auto Sync Script
:: ============================================
:: Run via Task Scheduler every 30-60 minutes
:: ============================================

cd /d X:\FP-E-coupon\electron-bridge

echo [%date% %time%] Running auto sync... >> sync-log.txt
node sync-attendance.js >> sync-log.txt 2>&1
echo [%date% %time%] Sync completed. >> sync-log.txt
echo. >> sync-log.txt
