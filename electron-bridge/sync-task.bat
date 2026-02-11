@echo off
REM Sync attendance from ZKTeco devices to Supabase
REM This script is meant to be run by Windows Task Scheduler

cd /d "X:\FP-E-coupon\electron-bridge"
node sync-attendance.js >> sync-log.txt 2>&1
