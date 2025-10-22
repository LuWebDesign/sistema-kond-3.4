@echo off
REM Cierra cualquier proceso escuchando en el puerto 3000 y reinicia el dev server
setlocal ENABLEDELAYEDEXPANSION

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  echo Matando PID %%a en puerto 3000...
  taskkill /PID %%a /F >nul 2>&1
)

echo Iniciando servidor de desarrollo...
cd /d "%~dp0\next-app"
set WATCHPACK_POLLING=true
set CHOKIDAR_USEPOLLING=1
set CHOKIDAR_INTERVAL=200
npm run dev
