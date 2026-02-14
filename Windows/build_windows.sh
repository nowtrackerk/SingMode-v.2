#!/bin/bash

# SingMode Windows Build Script (Linux Cross-Compilation)
# This script builds the web app and packages it using Electron.

echo "=========================================="
echo "SINGMODE WINDOWS BUILDER (LINUX)"
echo "=========================================="

# Check for Wine dependency
WINE_AVAILABLE=true
if ! command -v wine &> /dev/null; then
    echo "[WARNING] 'wine' is not installed. Professional .exe installer cannot be built."
    echo "[INFO] You can still build a 'Web Bundle' ZIP for manual hosting."
    echo "------------------------------------------"
    read -p "Create Web Bundle ZIP instead? (y/n): " confirm_fallback
    if [[ $confirm_fallback != [yY] ]]; then
        echo "[FIX] Please install wine: sudo apt update && sudo apt install wine"
        exit 1
    fi
    WINE_AVAILABLE=false
fi

# 1. Build the web app
echo "[INFO] Building web frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Web build failed. Exiting."
    exit 1
fi

if [ "$WINE_AVAILABLE" = false ]; then
    echo "[INFO] Creating Web Bundle ZIP..."
    zip -r SingMode-Web-Bundle.zip dist/
    echo "=========================================="
    echo "WEB BUNDLE CREATED: SingMode-Web-Bundle.zip"
    echo "Note: This is a static web folder. To run it, host it on a local server."
    echo "=========================================="
    exit 0
fi

# 2. Deploy to installer directory
echo "[INFO] Syncing assets to installer directory..."
rm -rf Windows/installer/dist
mkdir -p Windows/installer/dist
cp -r dist/* Windows/installer/dist/
# Copy metadata/guide files to installer for convenience
cp Windows/Installation_Guide.md Windows/installer/release/ 2>/dev/null || true
cp Windows/SINGMODE_APP_DESC.md Windows/installer/release/ 2>/dev/null || true

# 3. Build the Windows executable
echo "[INFO] Packaging Windows Application..."
cd Windows/installer

# Clean old releases
rm -rf release

if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing Electron dependencies..."
    npm install
fi

# Run electron-builder for windows
npm run dist -- --win
if [ $? -ne 0 ]; then
    echo "[ERROR] Windows packaging failed."
    exit 1
fi

echo "=========================================="
echo "BUILD COMPLETE"
echo "Check the 'Windows/installer/release' folder for your Setup.exe"
echo "=========================================="
