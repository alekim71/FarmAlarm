@echo off
echo Installing OmniAlarm Heartbeat Agent...

REM === SETTINGS (edit before running) ===
set AGENT_ID=farm-001
set SERVER_URL=http://localhost:3001
set BAT_PATH=%~dp0heartbeat.bat

REM Update heartbeat.bat with the correct settings
echo @echo off > "%BAT_PATH%"
echo set AGENT_ID=%AGENT_ID% >> "%BAT_PATH%"
echo set SERVER_URL=%SERVER_URL% >> "%BAT_PATH%"
echo curl -s -X POST "%%SERVER_URL%%/api/heartbeat/%%AGENT_ID%%" -o nul >> "%BAT_PATH%"

REM Register in Windows Task Scheduler (runs every 1 minute)
schtasks /create /tn "OmniAlarm-Heartbeat" /tr "%BAT_PATH%" /sc minute /mo 1 /ru SYSTEM /f

if errorlevel 1 (
    echo ERROR: Failed to create scheduled task. Run as Administrator.
    pause
    exit /b 1
)

echo.
echo ================================
echo  Agent installed successfully!
echo  Task: OmniAlarm-Heartbeat
echo  Runs every 1 minute
echo  Agent ID: %AGENT_ID%
echo  Server: %SERVER_URL%
echo ================================
pause
