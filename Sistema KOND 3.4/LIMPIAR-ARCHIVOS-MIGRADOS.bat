@echo off
echo ===============================================
echo    LIMPIEZA SEGURA - Sistema KOND Migrado
echo ===============================================
echo.
echo Este script eliminara los archivos HTML/JS originales
echo que ya fueron migrados a Next.js
echo.
echo IMPORTANTE: 
echo - Haz verificado que Next.js funciona correctamente?
echo - Tienes un backup de seguridad?
echo.
set /p confirm="Continuar con la limpieza? (S/N): "
if /i "%confirm%" NEQ "S" (
    echo Operacion cancelada.
    pause
    exit /b 0
)

echo.
echo Creando backup de seguridad...
if not exist "backup-archivos-originales" mkdir "backup-archivos-originales"

echo Copiando archivos a backup...
copy catalog.html backup-archivos-originales\ >nul 2>&1
copy dashboard.html backup-archivos-originales\ >nul 2>&1
copy tracking.html backup-archivos-originales\ >nul 2>&1
copy user.html backup-archivos-originales\ >nul 2>&1
copy index.html backup-archivos-originales\ >nul 2>&1
copy test-*.html backup-archivos-originales\ >nul 2>&1

if not exist "backup-archivos-originales\js" mkdir "backup-archivos-originales\js"
copy js\catalog.js backup-archivos-originales\js\ >nul 2>&1
copy js\catalog_backup_errors.js backup-archivos-originales\js\ >nul 2>&1
copy js\catalog-auth.js backup-archivos-originales\js\ >nul 2>&1
copy js\pedidos-catalogo.js backup-archivos-originales\js\ >nul 2>&1

if not exist "backup-archivos-originales\css" mkdir "backup-archivos-originales\css"
copy css\catalog.css backup-archivos-originales\css\ >nul 2>&1
copy css\pedidos-catalogo.css backup-archivos-originales\css\ >nul 2>&1

echo ✓ Backup creado en: backup-archivos-originales\
echo.

echo Eliminando archivos migrados...
echo.

REM Eliminar HTML migrados
echo [1/4] Eliminando paginas HTML migradas...
if exist catalog.html (
    del catalog.html
    echo   ✓ catalog.html eliminado
)
if exist dashboard.html (
    del dashboard.html  
    echo   ✓ dashboard.html eliminado
)
if exist tracking.html (
    del tracking.html
    echo   ✓ tracking.html eliminado
)
if exist user.html (
    del user.html
    echo   ✓ user.html eliminado
)

REM Eliminar archivos de testing
echo [2/4] Eliminando archivos de testing...
if exist test-calendario-dinamico.html (
    del test-calendario-dinamico.html
    echo   ✓ test-calendario-dinamico.html eliminado
)
if exist test-diagnostico-catalogo.html (
    del test-diagnostico-catalogo.html
    echo   ✓ test-diagnostico-catalogo.html eliminado
)
if exist test-pedidos.html (
    del test-pedidos.html
    echo   ✓ test-pedidos.html eliminado
)
if exist test-promociones-multiples.html (
    del test-promociones-multiples.html
    echo   ✓ test-promociones-multiples.html eliminado
)

REM Eliminar JS migrados
echo [3/4] Eliminando JavaScript migrado...
if exist js\catalog.js (
    del js\catalog.js
    echo   ✓ js\catalog.js eliminado
)
if exist js\catalog_backup_errors.js (
    del js\catalog_backup_errors.js
    echo   ✓ js\catalog_backup_errors.js eliminado
)
if exist js\catalog-auth.js (
    del js\catalog-auth.js
    echo   ✓ js\catalog-auth.js eliminado
)
if exist js\pedidos-catalogo.js (
    del js\pedidos-catalogo.js
    echo   ✓ js\pedidos-catalogo.js eliminado
)

REM Eliminar CSS migrados
echo [4/4] Eliminando CSS migrado...
if exist css\catalog.css (
    del css\catalog.css
    echo   ✓ css\catalog.css eliminado
)
if exist css\pedidos-catalogo.css (
    del css\pedidos-catalogo.css
    echo   ✓ css\pedidos-catalogo.css eliminado
)

echo.
echo ===============================================
echo           LIMPIEZA COMPLETADA
echo ===============================================
echo.
echo ✓ Archivos migrados eliminados exitosamente
echo ✓ Backup guardado en: backup-archivos-originales\
echo ✓ Sistema Next.js preservado en: next-app\
echo ✓ Utilidades administrativas preservadas
echo.
echo ESTRUCTURA ACTUAL:
echo   next-app\          ← Sistema web principal
echo   js\                ← Solo utilidades y admin  
echo   css\               ← Solo estilos base
echo   backend\           ← API (si existe)
echo   backup-archivos-originales\ ← Backup de seguridad
echo.
echo PROXIMO PASO:
echo   Ejecuta Next.js desde: next-app\
echo   Comando: npm run dev
echo   URL: http://localhost:3000
echo.
pause