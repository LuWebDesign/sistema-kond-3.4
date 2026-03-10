# 🚀 Quick Start - Next.js Migration

## ✅ Lo que ya está hecho

Se ha creado exitosamente la estructura base de Next.js con:

- ✅ Configuración de Next.js 14.2.0 con React 18
- ✅ Sistema de temas claro/oscuro con persistencia
- ✅ Layout principal con sidebar navegable
- ✅ Páginas placeholder (Home, Catálogo, Marketing)
- ✅ Estilos globales con variables CSS
- ✅ Proxy configurado para backend (localhost:5000)
- ✅ Documentación completa

## 📦 Paso 1: Instalar Dependencias

Abre una terminal PowerShell y ejecuta:

```powershell
cd "c:\Users\usuario\Documents\sistema interno 3.2\sistema interno 3.2\next-app"
npm install
```

**Tiempo estimado**: 2-3 minutos

## 🔥 Paso 2: Iniciar Servidor de Desarrollo

```powershell
npm run dev
```

Deberías ver:

```
- ready started server on 0.0.0.0:3000
- event compiled client and server successfully
```

## 🌐 Paso 3: Abrir en Navegador

Abre tu navegador en: **http://localhost:3000**

## ✨ Funcionalidades para Probar

### 1. Navegación
- Click en los links del sidebar: Inicio, Catálogo, Marketing
- Las URLs deberían cambiar sin recargar la página

### 2. Sistema de Temas
- Click en el botón "☀️ Modo Claro" / "🌙 Modo Oscuro" en la parte inferior del sidebar
- El tema debería cambiar instantáneamente
- Recargar la página - el tema se mantiene (localStorage)

### 3. Responsive Design
- Redimensionar la ventana del navegador
- El layout debería adaptarse

## 🔧 Paso 4: Verificar Integración Backend (Opcional)

Si tienes el backend corriendo en `localhost:5000`:

### Iniciar Backend
```powershell
cd "c:\Users\usuario\Documents\sistema interno 3.2\sistema interno 3.2\backend"
npm start
```

### Probar API desde Next.js
En Next.js, las llamadas a `/api/*` se redirigen automáticamente al backend.

Ejemplo en consola del navegador:
```javascript
fetch('/api/productos')
  .then(r => r.json())
  .then(console.log)
```

## 📁 Estructura Creada

```
next-app/
├── .gitignore                 # Archivos ignorados por git
├── package.json               # Dependencias del proyecto
├── next.config.js             # Config Next.js + proxy backend
├── README.md                  # Documentación completa
│
├── components/
│   └── Layout.js              # Layout principal (sidebar + contenido)
│
├── pages/
│   ├── _app.js                # App wrapper (tema, estilos globales)
│   ├── index.js               # Página principal
│   ├── catalog.js             # Catálogo (placeholder)
│   └── marketing.js           # Marketing (placeholder)
│
├── styles/
│   └── globals.css            # Estilos globales + variables de tema
│
└── public/
    └── css/
        └── README.md          # Info sobre CSS del proyecto original
```

## 🎯 Próximos Pasos

### Inmediatos (Tú puedes hacerlo):
1. ✅ Ejecutar `npm install`
2. ✅ Ejecutar `npm run dev`
3. ✅ Probar navegación y tema
4. ✅ Familiarizarte con la estructura

### A Corto Plazo (Siguientes sesiones):
1. **Migrar utilidades** (`js/utils.js` → `lib/`)
2. **Migrar Productos** (primera sección completa)
3. **Migrar Calendario** (segunda prioridad)
4. **Agregar autenticación** (cuando sea necesario)

### Documentación Disponible:
- 📖 `next-app/README.md` - Documentación técnica completa
- 📖 `GUIA-MIGRACION-NEXTJS.md` - Plan detallado de migración fase por fase
- 📖 Este archivo - Quick start

## 🐛 Troubleshooting Común

### Error: "Cannot find module"
```powershell
rm -r node_modules
rm package-lock.json
npm install
```

### Puerto 3000 ocupado
Editar `package.json`, cambiar:
```json
"dev": "next dev -p 3001"
```

### Backend no responde
Verificar que esté corriendo:
```powershell
cd ../backend
npm start
```

Verificar que esté en puerto 5000 (revisar `backend/server.js`)

## 📚 Recursos Útiles

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- Carpeta `next-app/README.md` para más detalles
- Carpeta raíz `GUIA-MIGRACION-NEXTJS.md` para plan completo

## ✅ Checklist de Verificación

Marca cuando completes cada paso:

- [ ] Instalé dependencias (`npm install`)
- [ ] Inicié servidor de desarrollo (`npm run dev`)
- [ ] Navegué a http://localhost:3000
- [ ] Probé cambiar entre páginas (Home, Catálogo, Marketing)
- [ ] Probé el toggle de tema (claro/oscuro)
- [ ] El tema persiste al recargar la página
- [ ] Leí el README.md de next-app
- [ ] Leí GUIA-MIGRACION-NEXTJS.md
- [ ] Entiendo la estructura del proyecto
- [ ] (Opcional) Backend corriendo y respondiendo

## 🎉 ¡Todo Listo!

Si completaste todos los pasos del checklist, estás listo para empezar a migrar funcionalidades del sistema actual a Next.js.

La migración será progresiva, así que el sistema actual seguirá funcionando mientras trabajas en la nueva versión.

---

**¿Necesitas ayuda?** Consulta:
1. `next-app/README.md` - Documentación técnica
2. `GUIA-MIGRACION-NEXTJS.md` - Plan de migración
3. Archivos de código - Están comentados

**¿Listo para migrar código?** Empieza con las utilidades (Fase 2 en GUIA-MIGRACION-NEXTJS.md)

---

**Creado**: 20 de octubre de 2025  
**Proyecto**: Sistema KOND - Migración Next.js