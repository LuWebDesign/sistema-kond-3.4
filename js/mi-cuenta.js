// Funcionalidad para la sección Mi Cuenta

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tema desde localStorage
    initializeTheme();
    
    // Inicializar datos cuando se carga la sección Mi Cuenta
    initializeMiCuenta();
    
    // Event listeners
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', cerrarSesion);
    }
    
    // Botones del topbar
    const btnCerrarSesionTopbar = document.getElementById('btnCerrarSesionTopbar');
    if (btnCerrarSesionTopbar) {
        btnCerrarSesionTopbar.addEventListener('click', cerrarSesion);
    }
    
    const btnMiCuenta = document.getElementById('btnMiCuenta');
    if (btnMiCuenta) {
        btnMiCuenta.addEventListener('click', function() {
            // Usar el sistema de navegación existente para ir a Mi Cuenta
            const sideLink = document.querySelector('[data-section="mi-cuenta"]');
            if (sideLink && sideLink !== btnMiCuenta) {
                sideLink.click();
            } else {
                // Si no existe el sistema de sidebar, navegar directamente
                navigateToMiCuenta();
            }
        });
    }
    
    // Configuraciones
    setupConfiguraciones();
});

function initializeTheme() {
    // Cargar tema guardado o usar oscuro por defecto
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Actualizar icono del toggle del topbar si existe
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

function initializeMiCuenta() {
    // Actualizar fecha/hora de último acceso
    updateUltimoAcceso();
    
    // Cargar estadísticas del sistema
    loadSystemStats();
    
    // Cargar actividad reciente
    loadActivityFeed();
}

function updateUltimoAcceso() {
    const ultimoAccesoElement = document.getElementById('ultimoAcceso');
    if (ultimoAccesoElement) {
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
        const hora = ahora.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        ultimoAccesoElement.textContent = `${fecha}, ${hora}`;
    }
}

function loadSystemStats() {
    try {
        // Productos
        const productosBase = JSON.parse(localStorage.getItem('productosBase') || '[]');
        const totalProductosEl = document.getElementById('totalProductos');
        if (totalProductosEl) {
            totalProductosEl.textContent = productosBase.length;
        }
        
        // Pedidos (internos + catálogo)
        const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
        const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
        const totalPedidosEl = document.getElementById('totalPedidos');
        if (totalPedidosEl) {
            totalPedidosEl.textContent = pedidos.length + pedidosCatalogo.length;
        }
        
        // Clientes únicos del catálogo
        const clientesUnicos = new Set();
        pedidosCatalogo.forEach(pedido => {
            if (pedido.cliente && pedido.cliente.nombre) {
                clientesUnicos.add(pedido.cliente.nombre.toLowerCase());
            }
        });
        const totalClientesEl = document.getElementById('totalClientes');
        if (totalClientesEl) {
            totalClientesEl.textContent = clientesUnicos.size;
        }
        
        // Balance total de finanzas
        const movimientos = JSON.parse(localStorage.getItem('movimientos') || '[]');
        let balance = 0;
        movimientos.forEach(mov => {
            if (mov.tipo === 'ingreso') {
                balance += parseFloat(mov.monto || 0);
            } else if (mov.tipo === 'egreso') {
                balance -= parseFloat(mov.monto || 0);
            }
        });
        const balanceTotalEl = document.getElementById('balanceTotal');
        if (balanceTotalEl) {
            balanceTotalEl.textContent = formatCurrency(balance);
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas del sistema:', error);
    }
}

function loadActivityFeed() {
    const actividadElement = document.getElementById('actividadReciente');
    if (!actividadElement) return;
    
    try {
        // Obtener actividades recientes de diferentes fuentes
        const actividades = [];
        
        // Pedidos recientes del catálogo
        const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
        pedidosCatalogo
            .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
            .slice(0, 3)
            .forEach(pedido => {
                actividades.push({
                    tipo: 'pedido',
                    fecha: new Date(pedido.fechaCreacion),
                    descripcion: `Nuevo pedido de ${pedido.cliente.nombre}`,
                    icon: '📦',
                    detalle: `Total: ${formatCurrency(pedido.total)}`
                });
            });
        
        // Productos recientes (si tienen fecha de creación)
        const productosBase = JSON.parse(localStorage.getItem('productosBase') || '[]');
        productosBase
            .filter(p => p.fechaCreacion)
            .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
            .slice(0, 2)
            .forEach(producto => {
                actividades.push({
                    tipo: 'producto',
                    fecha: new Date(producto.fechaCreacion),
                    descripcion: `Producto "${producto.nombre}" creado`,
                    icon: '🏷️',
                    detalle: `Categoría: ${producto.categoria}`
                });
            });
        
        // Movimientos financieros recientes
        const movimientos = JSON.parse(localStorage.getItem('movimientos') || '[]');
        movimientos
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 2)
            .forEach(mov => {
                actividades.push({
                    tipo: 'finanza',
                    fecha: new Date(mov.fecha),
                    descripcion: `${mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}: ${mov.descripcion}`,
                    icon: mov.tipo === 'ingreso' ? '💰' : '💸',
                    detalle: `${formatCurrency(mov.monto)}`
                });
            });
        
        // Ordenar por fecha más reciente y tomar solo los últimos 8
        actividades
            .sort((a, b) => b.fecha - a.fecha)
            .slice(0, 8);
        
        // Renderizar actividades
        if (actividades.length === 0) {
            actividadElement.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 20px;">No hay actividad reciente</div>';
            return;
        }
        
        actividadElement.innerHTML = actividades.map(actividad => {
            const tiempoRelativo = getTimeAgo(actividad.fecha);
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #374151;">
                    <div style="font-size: 20px;">${actividad.icon}</div>
                    <div style="flex: 1;">
                        <div style="color: #f8fafc; font-size: 0.9rem; font-weight: 500;">${actividad.descripcion}</div>
                        <div style="color: #94a3b8; font-size: 0.8rem;">${actividad.detalle}</div>
                        <div style="color: #6b7280; font-size: 0.75rem; margin-top: 2px;">${tiempoRelativo}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando actividad reciente:', error);
        actividadElement.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Error cargando actividad</div>';
    }
}

function getTimeAgo(fecha) {
    const ahora = new Date();
    const diferencia = ahora - fecha;
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    if (dias < 7) return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
    
    return fecha.toLocaleDateString('es-ES');
}

function setupConfiguraciones() {
    // Tema oscuro
    const toggleTema = document.getElementById('toggleTemaOscuro');
    if (toggleTema) {
        // Sincronizar con el tema actual
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        toggleTema.checked = currentTheme === 'dark';
        
        toggleTema.addEventListener('change', function() {
            // Cambiar tema directamente
            const newTheme = this.checked ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            
            // Guardar preferencia
            localStorage.setItem('theme', newTheme);
            
            // También activar el toggle del topbar si existe
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                // Actualizar el icono del toggle
                themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
            
            showNotification(
                `Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`,
                'success'
            );
        });
    }
    
    // Notificaciones
    const toggleNotificaciones = document.getElementById('toggleNotificaciones');
    if (toggleNotificaciones) {
        const notifEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
        toggleNotificaciones.checked = notifEnabled;
        
        toggleNotificaciones.addEventListener('change', function() {
            localStorage.setItem('notificationsEnabled', this.checked);
            showNotification(
                this.checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas',
                this.checked ? 'success' : 'info'
            );
        });
    }
    
    // Sonidos
    const toggleSonidos = document.getElementById('toggleSonidos');
    if (toggleSonidos) {
        const soundEnabled = localStorage.getItem('soundEnabled') === 'true';
        toggleSonidos.checked = soundEnabled;
        
        toggleSonidos.addEventListener('change', function() {
            localStorage.setItem('soundEnabled', this.checked);
            showNotification(
                this.checked ? 'Sonidos activados' : 'Sonidos desactivados',
                'info'
            );
        });
    }
    
    // Botones de configuración
    setupConfigButtons();
}

function setupConfigButtons() {
    // Exportar datos
    const btnExportar = document.querySelector('.quick-settings button:nth-of-type(1)');
    if (btnExportar) {
        btnExportar.addEventListener('click', exportarDatos);
    }
    
    // Limpiar cache
    const btnLimpiarCache = document.querySelector('.quick-settings button:nth-of-type(2)');
    if (btnLimpiarCache) {
        btnLimpiarCache.addEventListener('click', limpiarCache);
    }
    
    // Reset sistema
    const btnReset = document.querySelector('.quick-settings button:nth-of-type(3)');
    if (btnReset) {
        btnReset.addEventListener('click', resetSistema);
    }
}

function exportarDatos() {
    try {
        const datos = {
            productos: JSON.parse(localStorage.getItem('productosBase') || '[]'),
            pedidos: JSON.parse(localStorage.getItem('pedidos') || '[]'),
            pedidosCatalogo: JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]'),
            movimientos: JSON.parse(localStorage.getItem('movimientos') || '[]'),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kond-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Datos exportados exitosamente', 'success');
    } catch (error) {
        console.error('Error exportando datos:', error);
        showNotification('Error al exportar datos', 'error');
    }
}

function limpiarCache() {
    showCustomConfirm(
        'Limpiar Caché',
        '¿Estás seguro de que quieres limpiar el caché? Esto puede mejorar el rendimiento pero algunos datos temporales se perderán.',
        () => {
        try {
            // Mantener solo los datos esenciales
            const datosEsenciales = {
                productosBase: localStorage.getItem('productosBase'),
                pedidos: localStorage.getItem('pedidos'),
                pedidosCatalogo: localStorage.getItem('pedidosCatalogo'),
                movimientos: localStorage.getItem('movimientos'),
                notificationsEnabled: localStorage.getItem('notificationsEnabled'),
                soundEnabled: localStorage.getItem('soundEnabled')
            };
            
            // Limpiar todo el localStorage
            localStorage.clear();
            
            // Restaurar datos esenciales
            Object.entries(datosEsenciales).forEach(([key, value]) => {
                if (value !== null) {
                    localStorage.setItem(key, value);
                }
            });
            
            showNotification('Cache limpiado exitosamente', 'success');
            
            // Recargar estadísticas
            setTimeout(() => {
                loadSystemStats();
                loadActivityFeed();
            }, 500);
            
        } catch (error) {
            console.error('Error limpiando cache:', error);
            showNotification('Error al limpiar cache', 'error');
        }
    });
}

function resetSistema() {
    showCustomConfirm(
        '⚠️ RESETEAR SISTEMA',
        '¿Estás completamente seguro de que quieres resetear TODO el sistema? Esta acción NO se puede deshacer y perderás TODOS los datos.',
        () => {
            showCustomConfirm(
                '🚨 ÚLTIMA ADVERTENCIA',
                'Se eliminarán todos los productos, pedidos, finanzas y configuraciones. Esta acción es IRREVERSIBLE. ¿Continuar?',
                () => {
                    try {
                        localStorage.clear();
                        showCustomAlert('Sistema Reseteado', 'El sistema ha sido reseteado completamente. La página se recargará automáticamente.', 'success', () => {
                            window.location.reload();
                        });
                        
                    } catch (error) {
                        console.error('Error reseteando sistema:', error);
                        showCustomAlert('Error', 'Hubo un error al resetear el sistema', 'error');
                    }
                }
            );
        }
    );
}

function cerrarSesion() {
    showCustomConfirm(
        'Cerrar Sesión',
        '¿Estás seguro de que deseas cerrar la sesión administrativa? Serás redirigido a la página principal.',
        () => {
            // Limpiar sesión (si hay datos de sesión)
            localStorage.removeItem('userSession');
            localStorage.removeItem('lastAccess');
            
            showCustomAlert('Sesión Cerrada', 'Has cerrado sesión exitosamente. Redirigiendo...', 'success', () => {
                window.location.href = 'home.html';
            });
        }
    );
}

// Función para actualizar estadísticas cuando se cambie de sección a Mi Cuenta
function updateMiCuentaWhenVisible() {
    const miCuentaSection = document.getElementById('mi-cuenta-section');
    if (miCuentaSection && !miCuentaSection.hidden) {
        loadSystemStats();
        loadActivityFeed();
    }
}

function navigateToMiCuenta() {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.hidden = true;
        section.classList.remove('active');
    });
    
    // Mostrar sección Mi Cuenta
    const miCuentaSection = document.getElementById('mi-cuenta-section');
    if (miCuentaSection) {
        miCuentaSection.hidden = false;
        miCuentaSection.classList.add('active');
        
        // Actualizar datos al mostrar
        loadSystemStats();
        loadActivityFeed();
    }
    
    // Actualizar sidebar
    document.querySelectorAll('.side-link').forEach(link => {
        link.classList.remove('active');
        link.setAttribute('aria-expanded', 'false');
    });
    
    const miCuentaSideLink = document.querySelector('.side-link[data-section="mi-cuenta"]');
    if (miCuentaSideLink) {
        miCuentaSideLink.classList.add('active');
        miCuentaSideLink.setAttribute('aria-expanded', 'true');
    }
    
    // Actualizar botón del topbar
    const btnMiCuenta = document.getElementById('btnMiCuenta');
    if (btnMiCuenta) {
        btnMiCuenta.classList.add('active');
    }
}

// Función para remover estado activo cuando se cambie de sección
function updateTopbarButtonStates(activeSection) {
    const btnMiCuenta = document.getElementById('btnMiCuenta');
    if (btnMiCuenta) {
        if (activeSection === 'mi-cuenta') {
            btnMiCuenta.classList.add('active');
        } else {
            btnMiCuenta.classList.remove('active');
        }
    }
}

// Exportar funciones para uso global
window.miCuentaUtils = {
    initializeMiCuenta,
    updateMiCuentaWhenVisible,
    loadSystemStats,
    loadActivityFeed,
    navigateToMiCuenta,
    updateTopbarButtonStates,
    cerrarSesion
};