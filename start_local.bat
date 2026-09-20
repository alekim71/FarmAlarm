@echo off
cd /d %~dp0
echo Starting OmniAlarm...
echo.

echo Starting backend server (port 3001)...
start "OmniAlarm Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo Waiting 2 seconds...
timeout /t 2 /nobreak > nul

echo Starting frontend server (port 5173)...
start "OmniAlarm Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo ================================
echo  OmniAlarm is running!
echo  Open: http://localhost:5173
echo  Login: admin@farmalarm.com
echo  Password: admin1234
echo ================================
pause
