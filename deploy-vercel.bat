@echo off
REM ============================================
REM Script de Deploy a Vercel - Sistema KOND
REM ============================================

echo.
echo ========================================
echo   Sistema KOND - Deploy a Vercel
echo ========================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "next-app\package.json" (
    echo ERROR: No se encuentra next-app/package.json
    echo Por favor ejecuta este script desde la raiz del proyecto
    pause
    exit /b 1
)

echo [1/4] Verificando instalacion de Vercel CLI...
where vercel >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Vercel CLI no esta instalado.
    echo Deseas instalarlo ahora? (S/N)
    set /p INSTALL_VERCEL=
    if /i "%INSTALL_VERCEL%"=="S" (
        echo Instalando Vercel CLI...
        npm install -g vercel
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Fallo la instalacion de Vercel CLI
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo Por favor instala Vercel CLI manualmente:
        echo   npm install -g vercel
        pause
        exit /b 1
    )
)
echo OK - Vercel CLI instalado

echo.
echo [2/4] Verificando login en Vercel...
vercel whoami >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo No estas logueado en Vercel.
    echo Iniciando proceso de login...
    vercel login
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Fallo el login en Vercel
        pause
        exit /b 1
    )
)
echo OK - Sesion de Vercel activa

echo.
echo [3/4] Preparando proyecto para deploy...
cd next-app
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo acceder a next-app/
    cd ..
    pause
    exit /b 1
)

echo.
echo Tipo de deploy:
echo   1) Preview (testing)
echo   2) Production (publico)
echo.
set /p DEPLOY_TYPE="Selecciona (1 o 2): "

if "%DEPLOY_TYPE%"=="2" (
    set DEPLOY_CMD=vercel --prod
    echo.
    echo ATENCION: Estas por deployar a PRODUCCION
    echo.
    set /p CONFIRM="Estas seguro? (S/N): "
    if /i not "%CONFIRM%"=="S" (
        echo Deploy cancelado
        cd ..
        pause
        exit /b 0
    )
) else (
    set DEPLOY_CMD=vercel
)

echo.
echo [4/4] Ejecutando deploy...
echo Comando: %DEPLOY_CMD%
echo.

%DEPLOY_CMD%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: El deploy fallo
    echo Revisa los logs arriba para mas detalles
    cd ..
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Deploy completado exitosamente!
echo ========================================
echo.
echo Vercel te ha proporcionado la URL del deployment.
echo.
echo Proximos pasos:
echo   1. Probar la URL en el navegador
echo   2. Verificar que el catalogo cargue productos
echo   3. Revisar los logs en Vercel Dashboard
echo.

cd ..
pause
