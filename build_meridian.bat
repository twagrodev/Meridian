@echo off
echo Building AgroFair Meridian for production...
echo.

cd /d "%~dp0"

npm run build

echo.
echo Build complete. Run "npm start" to start in production mode.
