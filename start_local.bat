@echo off
chcp 65001 > nul
echo ================================
echo  OmniAlarm 로컬 서버 시작
echo ================================
echo.

echo 백엔드 서버 시작 중... (포트 3001)
start "OmniAlarm - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo 2초 대기 중...
timeout /t 2 /nobreak > nul

echo 프론트엔드 서버 시작 중... (포트 5173)
start "OmniAlarm - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo ================================
echo  서버 실행 완료!
echo ================================
echo.
echo  접속 주소: http://localhost:5173
echo  로그인:    admin@farmalarm.com
echo  비밀번호:  admin1234
echo.
echo  (이 창은 닫아도 됩니다)
echo ================================
pause
