#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('=======================================');
console.log('  SISTEMA KOND - SERVIDOR DE DESARROLLO');
console.log('=======================================');
console.log('');

const projectRoot = path.resolve(__dirname);
const nextAppPath = path.join(projectRoot, 'next-app');

process.chdir(nextAppPath);

function startServer() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Iniciando servidor Next.js...`);

  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: nextAppPath
  });

  server.on('close', (code) => {
    const timestamp = new Date().toISOString();
    if (code === 0) {
      console.log(`[${timestamp}] Servidor detenido normalmente (código ${code})`);
      process.exit(0);
    } else {
      console.log(`[${timestamp}] Servidor detenido con error (código ${code}). Reiniciando en 3 segundos...`);
      setTimeout(startServer, 3000);
    }
  });

  server.on('error', (error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error al iniciar servidor:`, error.message);
    console.log(`[${timestamp}] Reintentando en 3 segundos...`);
    setTimeout(startServer, 3000);
  });

  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\nDeteniendo servidor...');
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\nDeteniendo servidor...');
    server.kill('SIGTERM');
  });
}

console.log('Servidor con reinicio automático activado');
console.log('Presiona Ctrl+C para detener permanentemente');
console.log('');

startServer();