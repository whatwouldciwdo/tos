@echo off
chcp 65001 > nul
echo ════════════════════════════════════════
echo   TOR Online — Development Mode
echo   Menjalankan Next.js + WebSocket Server
echo ════════════════════════════════════════

echo.
echo [1/2] Memulai WebSocket Collaboration Server (port 3121)...
start "TOR - WebSocket Dev" cmd /k "node ws-server.js"

timeout /t 2 /nobreak > nul

echo [2/2] Memulai Next.js Dev Server (port 3120)...
start "TOR - Next.js Dev" cmd /k "npm run dev"

echo.
echo ✅ Development servers berjalan!
echo    Next.js  : http://localhost:3120 (atau http://IP_KOMPUTER:3120 dari komputer lain)
echo    WebSocket: ws://localhost:3121

echo.
pause
