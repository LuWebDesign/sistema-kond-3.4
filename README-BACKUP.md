# Backup de archivos estáticos removidos

Resumen
-------
Los archivos estáticos originales (HTML/CSS/JS) que formaban la versión legacy del sistema fueron movidos fuera del repositorio y comprimidos en un ZIP para mantener un respaldo seguro antes de la limpieza.

Ubicación del ZIP
------------------
- Ruta en este equipo: `C:\archives\backup-20251106.zip`

Commit que registró la eliminación
---------------------------------
- Commit: `095c714`
- Mensaje: "chore: remove legacy backup-archivos-originales (moved to C:\\archives)"

Contenido y restauración
------------------------
Si necesitas revisar o restaurar algún archivo desde el ZIP, puedes descomprimirlo con PowerShell:

```powershell
# Extraer en la carpeta actual
Expand-Archive -Path 'C:\archives\backup-20251106.zip' -DestinationPath .\restored-backup -Force

# O extraer a una ruta específica
Expand-Archive -Path 'C:\archives\backup-20251106.zip' -DestinationPath 'C:\temp\restored-backup' -Force
```

Notas
-----
- Mantengo este README dentro del repo para documentar dónde quedó el backup y qué commit realizó la eliminación. El ZIP se encuentra fuera del repositorio para evitar almacenar binarios pesados en Git.
- Si prefieres que suba el ZIP a un almacenamiento externo (S3, Google Drive), indícalo y te doy los pasos o lo subo si me proporcionas acceso.

Fecha de la operación: 2025-11-06
