@echo off
echo ========================================
echo   Rupiya - Local Development Setup
echo ========================================
echo.

echo Step 1: Adding env-local.js script to HTML files...
node add-env-script.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Failed to add script references!
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Generating env-local.js from .env file...
node build-local.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Build failed! Please check the error above.
    echo.
    pause
    exit /b 1
)

echo.
echo Step 3: Starting local server...
echo.
echo 🚀 Server will start at: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

python -m http.server 8000
