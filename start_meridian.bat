@echo off
echo Starting AgroFair Meridian...
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

:: Check if database exists
if not exist "dev.db" (
    echo Setting up database...
    npx prisma db push
    npx tsx prisma/seed.ts
    echo.
)

echo Starting development server on http://localhost:3000
npm run dev
