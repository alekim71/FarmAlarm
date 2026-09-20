@echo off
chcp 65001 > nul
echo ================================
echo  OmniAlarm 로컬 환경 최초 설정
echo ================================
echo.

echo [1/5] 백엔드 패키지 설치 중...
cd backend
call npm install
if errorlevel 1 (echo 오류: npm install 실패 && pause && exit /b 1)

echo.
echo [2/5] Prisma 클라이언트 생성 중 (SQLite)...
call npx prisma generate --schema prisma/schema.local.prisma
if errorlevel 1 (echo 오류: prisma generate 실패 && pause && exit /b 1)

echo.
echo [3/5] 로컬 데이터베이스 생성 중...
call npx prisma db push --schema prisma/schema.local.prisma
if errorlevel 1 (echo 오류: prisma db push 실패 && pause && exit /b 1)

echo.
echo [4/5] 초기 데이터 생성 중...
call node prisma/seed.js
if errorlevel 1 (echo 오류: seed 실패 && pause && exit /b 1)

echo.
echo [5/5] 프론트엔드 패키지 설치 중...
cd ..\frontend
call npm install
if errorlevel 1 (echo 오류: 프론트엔드 npm install 실패 && pause && exit /b 1)

cd ..
echo.
echo ================================
echo  설정 완료!
echo  이제 start_local.bat 을 실행하세요.
echo ================================
pause
