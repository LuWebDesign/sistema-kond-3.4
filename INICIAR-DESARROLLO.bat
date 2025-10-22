@echo off
cd /d "%~dp0next-app"
echo.
echo ========================================
echo   Sistema KOND - Servidor de Desarrollo
echo ========================================
echo.
echo Iniciando servidor en http://localhost:3000
echo Presiona Ctrl+C para detener el servidor
echo.
npm run dev
pause
