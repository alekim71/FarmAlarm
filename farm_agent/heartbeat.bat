@echo off
REM OmniAlarm Heartbeat Agent
REM Place this file on the farm computer and schedule it to run every minute

REM === SETTINGS (edit these) ===
set AGENT_ID=farm-001
set SERVER_URL=http://localhost:3001

REM ==============================
curl -s -X POST "%SERVER_URL%/api/heartbeat/%AGENT_ID%" -o nul
