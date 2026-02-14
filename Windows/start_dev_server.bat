@echo off
echo ==========================================
echo SINGMODE DEV LAUNCHER
echo ==========================================

cd ..
echo [INFO] Checking dependencies...
if not exist "node_modules" (
    echo [INFO] Installing packages...
    call npm install
)

echo [INFO] Starting Application...
echo [INFO] Access via http://localhost:5173
call npm run dev

pause
