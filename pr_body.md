## Resumen
Se corrige next-app/pages/_document.js: se exporta la clase Document que Next.js espera en _document. Esto resuelve el error minificado de React (#418) que ocurría al abrir "Catálogo público" desde una sesión admin.

## Cambios
- next-app/pages/_document.js: reemplazado componente funcional por `class MyDocument extends Document`.

## Verificación
1. Tras mergear a `main`, Vercel (si está configurado para desplegar `main`) hará un nuevo deploy.
2. Probar: Iniciar sesión como admin → ir a /catalog → hacer clic en "Catálogo público". La consola debe quedar sin el error #418.

## Riesgos
Bajo. Si el error persiste en producción, posibles causas:
- Duplicación de dependencias React en el build (verificar `npm ls react react-dom` en la build).
- Caché de Vercel (intentar redeploy manual).
