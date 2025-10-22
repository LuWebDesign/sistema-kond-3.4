@echo off
REM Start Next.js dev server from this folder (portable, no rutas hardcodeadas)
cd /d "%~dp0"
set PATH=%PATH%;C:\Program Files\nodejs
echo Iniciando Next.js dev en: %CD%
npm run dev
pause