@echo off
echo ========================================
echo   SISTEMA KOND - SERVIDOR DE DESARROLLO
echo ========================================
echo.

cd /d "%~dp0next-app"

echo Iniciando servidor de desarrollo...
echo Presiona Ctrl+C para detener el servidor
echo.

:restart
echo [%date% %time%] Iniciando Next.js...
npm run dev

echo.
echo [%date% %time%] Servidor detenido. Reiniciando en 3 segundos...
timeout /t 3 /nobreak > nul
goto restart

echo.
echo Servidor detenido permanentemente.
pause