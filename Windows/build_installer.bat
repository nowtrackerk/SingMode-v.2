@echo off
echo ==========================================
echo SINGMODE WINDOWS BUILDER
echo ==========================================

cd installer

if not exist "dist" (
    echo [ERROR] 'dist' folder missing in installer directory.
    echo Copying from project root...
    xcopy /E /I /Y "..\..\dist" "dist"
)

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
)

echo [INFO] Building Windows Application...
call npm run dist

echo ==========================================
echo BUILD COMPLETE
echo Check the 'Windows\installer\release' folder for your Setup.exe
echo ==========================================
pause
