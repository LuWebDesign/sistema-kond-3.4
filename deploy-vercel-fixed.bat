@echo off
REM ============================================
REM Deploy Vercel - Configuración correcta
REM ============================================

echo.
echo Preparando deploy con configuracion correcta...
echo.

REM Ir al directorio next-app
cd next-app

echo Verificando que estamos en el directorio correcto...
if not exist "package.json" (
    echo ERROR: No se encuentra package.json en next-app/
    cd ..
    pause
    exit /b 1
)

echo OK - package.json encontrado
echo.

REM Verificar Vercel CLI
where vercel >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Instalando Vercel CLI...
    npm install -g vercel
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Fallo la instalacion de Vercel CLI
        cd ..
        pause
        exit /b 1
    )
)

echo.
echo IMPORTANTE: Cuando Vercel pregunte "In which directory is your code located?"
echo           Responde: ./  (punto y barra - ya estamos en next-app)
echo.
echo Presiona cualquier tecla para continuar...
pause >nul

echo.
echo Iniciando deploy desde next-app/...
vercel

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: El deploy fallo
    cd ..
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Deploy completado!
echo ========================================
echo.

cd ..
pause
