@echo off
echo ========================================
echo Starting ZK9500 Hybrid Mock Bridge  
echo ========================================
echo.
echo Mode: HYBRID-MOCK
echo - Simulates realistic scanner experience
echo - Returns mock data for testing
echo - Random employee selection (5 test users)
echo.
echo Starting bridge on ws://localhost:8081...
echo.

cd /d "%~dp0"
set ZK_INTEGRATION_MODE=hybrid-mock
node server.js
