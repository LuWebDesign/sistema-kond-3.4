# Sistema KOND - Servidor de Desarrollo

## 🚀 Inicio Rápido

### Opción 1: Servidor con Auto-Reinicio (Recomendado)
```bash
# Desde la raíz del proyecto
npm run dev:auto
# o
./INICIAR-SERVIDOR-AUTO.bat
# o
powershell .\Start-DevServer.ps1
```

### Opción 2: Servidor Estándar
```bash
cd next-app
npm run dev
```

### Opción 3: Servidor sin Auto-Reinicio
```bash
powershell .\Start-DevServer.ps1 -NoRestart
```

## 🔧 Solución al Problema de Conexión

Si el servidor se desconecta constantemente al hacer cambios:

### Problema Identificado:
- Next.js se detiene completamente en lugar de recargar automáticamente
- ERR_CONNECTION_REFUSED al hacer cambios en archivos

### Soluciones Implementadas:

1. **Auto-Reinicio Automático**: El servidor se reinicia automáticamente si se detiene
2. **Manejo de Errores**: Detecta errores y reintenta la conexión
3. **Scripts Robustos**: Múltiples opciones para diferentes entornos

## 📋 Scripts Disponibles

| Comando | Descripción | Reinicio Automático |
|---------|-------------|-------------------|
| `npm run dev:auto` | Servidor con auto-reinicio | ✅ |
| `npm run dev` | Servidor estándar | ❌ |
| `npm run dev:robust` | Con Turbo mode | ❌ |
| `./INICIAR-SERVIDOR-AUTO.bat` | Batch script | ✅ |
| `.\Start-DevServer.ps1` | PowerShell script | ✅ |

## 🎯 Uso Recomendado

Para desarrollo diario, usa:
```bash
npm run dev:auto
```

Este comando:
- ✅ Inicia el servidor automáticamente
- ✅ Lo reinicia si se detiene por errores
- ✅ Muestra timestamps de reinicio
- ✅ Se detiene gracefully con Ctrl+C

## 🔍 Verificación

Una vez ejecutado, deberías ver:
```
=======================================
  SISTEMA KOND - SERVIDOR DE DESARROLLO
=======================================

[2025-01-XX XX:XX:XX] Iniciando Next.js...
▲ Next.js 14.2.0
- Local: http://localhost:3000
- Network: http://0.0.0.0:3000
✓ Ready in XXXXms
```

## 🛠️ Troubleshooting

### Si aún hay problemas:

1. **Verificar puerto 3000**:
   ```bash
   netstat -ano | findstr :3000
   ```

2. **Matar procesos en puerto 3000**:
   ```bash
   # Windows
   for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000') do taskkill /f /pid %a
   ```

3. **Limpiar cache de Next.js**:
   ```bash
   cd next-app
   rm -rf .next
   npm run dev:auto
   ```

4. **Verificar Node.js**:
   ```bash
   node --version
   npm --version
   ```

## 📞 Soporte

Si el problema persiste:
1. Verifica que no haya antivirus bloqueando el puerto
2. Asegúrate de que el puerto 3000 esté disponible
3. Prueba ejecutar como administrador
4. Revisa los logs de error en la consola