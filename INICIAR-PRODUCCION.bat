@echo off
echo Build y arranque en modo PRODUCCION (Next.js)
echo =============================================
cd /d "%~dp0\next-app"
set PATH=%PATH%;C:\Program Files\nodejs
echo Directorio actual: %CD%
echo.
echo Compilando (npm run build)...
npm run build || goto :error
echo.
echo Iniciando (npm start) en http://localhost:3000
npm start
pause
exit /b 0
:error
echo Fallo el build. Revisa los errores arriba.
pause
exit /b 1
