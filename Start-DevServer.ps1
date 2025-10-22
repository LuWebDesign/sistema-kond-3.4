# Script de PowerShell para servidor de desarrollo con auto-reinicio
param(
    [switch]$NoRestart
)

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$nextAppPath = Join-Path $projectPath "next-app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SISTEMA KOND - SERVIDOR DE DESARROLLO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $nextAppPath

if ($NoRestart) {
    Write-Host "Modo sin reinicio automático activado" -ForegroundColor Yellow
    Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
    Write-Host ""
    npm run dev
} else {
    Write-Host "Modo con reinicio automático activado" -ForegroundColor Green
    Write-Host "El servidor se reiniciará automáticamente si se detiene" -ForegroundColor Green
    Write-Host "Presiona Ctrl+C dos veces para detener permanentemente" -ForegroundColor Yellow
    Write-Host ""

    while ($true) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] Iniciando Next.js..." -ForegroundColor Green

        try {
            npm run dev
        } catch {
            Write-Host "Error detectado en el servidor" -ForegroundColor Red
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Servidor detenido normalmente" -ForegroundColor Yellow
            break
        } else {
            Write-Host ""
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Write-Host "[$timestamp] Servidor detenido con error. Reiniciando en 3 segundos..." -ForegroundColor Red
            Start-Sleep -Seconds 3
        }
    }
}

Write-Host ""
Write-Host "Servidor detenido permanentemente." -ForegroundColor Cyan