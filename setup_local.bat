@echo off
cd /d %~dp0
echo Current directory: %CD%
echo.

echo [1/5] Installing backend packages...
cd backend
call npm install
echo Done: npm install
echo.

echo [2/5] Generating Prisma client...
call npx prisma generate --schema prisma/schema.local.prisma
echo Done: prisma generate
echo.

echo [3/5] Creating local database...
call npx prisma db push --schema prisma/schema.local.prisma
echo Done: prisma db push
echo.

echo [4/5] Seeding initial data...
call node prisma/seed.js
echo Done: seed
echo.

echo [5/5] Installing frontend packages...
cd ..\frontend
call npm install
echo Done: frontend npm install
echo.

cd ..
echo ================================
echo  Setup complete!
echo  Run start_local.bat to start.
echo ================================
pause
