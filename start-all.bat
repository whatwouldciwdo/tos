@echo off
chcp 65001 > nul
echo ════════════════════════════════════════
echo   TOR Online — Production Startup
echo   Menjalankan Next.js + WebSocket Server
echo ════════════════════════════════════════

echo.
echo [1/2] Memulai WebSocket Collaboration Server (port 3001)...
start "TOR - WebSocket Server" cmd /k "node ws-server.js"

timeout /t 2 /nobreak > nul

echo [2/2] Memulai Next.js App (port 3120)...
start "TOR - Next.js App" cmd /k "npm run start"

echo.
echo ✅ Kedua server sudah berjalan!
echo    Next.js  : http://localhost:3120 (atau http://IP_KOMPUTER:3120 dari komputer lain)

echo    WebSocket: ws://localhost:3001
echo.
echo Tutup window ini jika sudah selesai.
pause
