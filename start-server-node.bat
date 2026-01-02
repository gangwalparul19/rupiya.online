@echo off
echo ========================================
echo   RUPIYA - Starting Local Server (Node.js)
echo ========================================
echo.
echo Checking if http-server is installed...
echo.

where npx >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Starting server on port 8000...
echo.
echo Open your browser to: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

npx http-server -p 8000 -c-1

pause
