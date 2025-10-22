// Datos globales
let productosBase = JSON.parse(localStorage.getItem('productosBase')) || [];
let pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
let filteredProductos = [...productosBase];
let currentPage = 1;
const pageSize = 10;
let currentMonth = new Date();

// Inicializar productosBase con valores por defecto
productosBase = productosBase.map(p => ({
  ...p,
  active: p.active !== undefined ? p.active : true,
  publicado: p.publicado !== undefined ? p.publicado : false, // Por defecto NO publicado
  unidadesPorPlaca: p.unidadesPorPlaca || 0,
  usoPlacas: p.usoPlacas || 0,
  costoPlaca: p.costoPlaca || 0,
  costoMaterial: p.costoMaterial || 0,
  margenMaterial: p.margenMaterial || 0,
  costo: p.costo || 0,
  material: p.material || '',
  dimensiones: p.dimensiones || '',
  ensamble: p.ensamble || 'Sin ensamble',
  utilidad: p.utilidad || 0,
  precio1: p.precio1 || 0,
  stockActual: p.stockActual || 0
}));

// Guardar productos actualizados
guardarProductos();

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  setupTopbarNavigation();
  
  // Configurar navegación con Enter en el formulario de productos
  if (typeof setupFormEnterNavigation === 'function') {
    setupFormEnterNavigation();
  }
  
  // Solo llamar si existe
  if (typeof renderPedidos === 'function') {
    renderPedidos();
  }
  if (typeof updateMetrics === 'function') updateMetrics();
  if (typeof populateCategorySelect === 'function') populateCategorySelect(); // <-- AGREGAR ESTA LÍNEA

  if (typeof applyFilters === 'function') applyFilters();
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof renderDatabase === 'function') renderDatabase();
  if (typeof renderFinanzas === 'function') renderFinanzas();
  if (typeof updateMetrics === 'function') updateMetrics();

  // Toggle formulario Agregar Producto con animación
  const formSection = document.getElementById('addProductSection');
  const toggleFormBtn = document.getElementById('toggleAddProductBtn');
  if (formSection) {
    formSection.style.display = 'none';
    formSection.style.overflow = 'hidden';
    formSection.style.maxHeight = '0';
  }
  if (toggleFormBtn && formSection) {
    toggleFormBtn.addEventListener('click', function() {
      if (!formSection.classList.contains('show')) {
        formSection.style.display = 'block';
        formSection.classList.add('show');
        toggleFormBtn.textContent = '∧ Ocultar Formulario';
        setTimeout(() => {
          formSection.style.overflow = 'visible';
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Enfocar el primer campo después de que se abra el formulario
          if (typeof focusFirstFormField === 'function') {
            focusFirstFormField();
          }
        }, 500);
      } else {
        formSection.classList.remove('show');
        formSection.style.overflow = 'hidden';
        toggleFormBtn.textContent = '+ Agregar Producto';
        setTimeout(() => {
          formSection.style.display = 'none';
        }, 500);
      }
    });
  }

  // Delegated handler for elements using data-action (replaces inline onclick handlers to comply with CSP)
  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    // common actions
    if (action === 'close-modal') {
      const targetId = btn.getAttribute('data-target');
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) el.style.display = 'none';
      }
      return;
    }
    if (action === 'show-delete-product') {
      const id = btn.getAttribute('data-id');
      if (typeof showDeleteModal === 'function') showDeleteModal(id);
      return;
    }
    if (action === 'view-pedido') {
      const id = btn.getAttribute('data-id');
      const fecha = btn.getAttribute('data-fecha');
      if (typeof showDetallePedidoById === 'function') return showDetallePedidoById(id);
      if (typeof showCalendarModal === 'function') return showCalendarModal(fecha);
      return;
    }
    if (action === 'delete-pedido') {
      const id = btn.getAttribute('data-id');
      if (typeof deletePedido === 'function') return deletePedido(id);
    }
  });

  // Global logout button (in topbar or header)
  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('#globalLogoutBtn');
    if (!btn) return;
    // perform logout
    if (window.KONDAuth && typeof window.KONDAuth.logout === 'function') {
      try { window.KONDAuth.logout(); } catch (err) { /* ignore */ }
    }
    // clear session keys
    try { localStorage.removeItem('kond_session'); localStorage.removeItem('user'); } catch (e) {}
    // redirect to catalog as not-logged
    location.href = 'catalog.html';
  });

  // Previsualizar imagen
  const imagenInput = document.getElementById('newImagen');
  if (imagenInput) {
    imagenInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById('imagePreview');
      if (file && preview) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.innerHTML = `<img src="${ev.target.result}" alt="Vista previa" style="max-width:100%; border-radius:8px;">`;
        };
        reader.readAsDataURL(file);
      } else if (preview) {
        preview.innerHTML = 'Sin imagen';
      }
    });
  }
});