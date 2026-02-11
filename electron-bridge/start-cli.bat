@echo off
REM Start fingerprint bridge in CLI mode (real ZK9500 scanner)
echo ========================================
echo Starting Fingerprint Bridge - CLI Mode
echo ========================================
echo.
echo Using REAL ZK9500 Scanner!
echo.

set ZK_INTEGRATION_MODE=cli
cd /d "%~dp0"
node server.js

pause
