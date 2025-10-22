@echo off
echo Iniciando Sistema KOND (Next.js)
echo ================================
cd /d "%~dp0\next-app"
set PATH=%PATH%;C:\Program Files\nodejs
echo Directorio actual: %CD%
echo.
echo Verificando dependencias...
if not exist node_modules (
  echo Instalando dependencias (npm install)...
  npm install
)
echo.
echo Iniciando servidor de desarrollo en http://localhost:3000
echo (mantener esta ventana abierta)
echo ================================
npm run dev
pause
