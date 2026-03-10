@echo off
echo Iniciando Sistema KOND (Next.js)
echo ================================
cd /d "%~dp0"
set PATH=%PATH%;C:\Program Files\nodejs
echo Directorio actual: %CD%
echo.
echo Verificando archivos...
if exist package.json (
    echo ✓ package.json encontrado
) else (
    echo ✗ package.json NO encontrado
    pause
    exit /b 1
)

if exist node_modules (
    echo ✓ node_modules encontrado
) else (
    echo ✗ node_modules NO encontrado - ejecutando npm install...
    npm install
)

echo.
echo Iniciando servidor de desarrollo...
echo Abre tu navegador en: http://localhost:3000
echo.
echo Presiona Ctrl+C para detener el servidor
echo ================================
npm run dev
pause