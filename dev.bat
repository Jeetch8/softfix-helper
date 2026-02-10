@echo off
echo Starting Development Servers...
echo.
echo [1/2] Starting Backend Server on port 3000...
echo [2/2] Starting Frontend Server on port 5173...
echo.
start "Backend Server" cmd /k "cd server && npm run dev"
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo.
echo Both servers are starting in separate windows!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window (servers will keep running)...
pause >nul
