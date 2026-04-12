// products.js

// Variable global para el ID del producto a toggle
let productToToggleId = null;
let productToggleContext = null;



// Función para mostrar el modal de toggle visibilidad
function showToggleVisibilityModal(productId, context = 'database') {
  const producto = productosBase.find(p => p.id === productId);
  if (!producto) return;
  
  productToToggleId = productId;
  productToggleContext = context;
  
  const isProductosContext = context === 'productos';
  const currentState = isProductosContext ? !producto.hiddenInProductos : producto.publicado !== false;
  
  const modal = document.getElementById('toggleVisibilityModal');
  const productName = document.getElementById('toggleProductName');
  const toggleAction = document.getElementById('toggleAction');
  const toggleDescription = document.getElementById('toggleDescription');
  const toggleBtnText = document.getElementById('toggleBtnText');
  
  if (modal && productName) {
    productName.textContent = producto.nombre;
    
    if (currentState) {  // Actualmente visible, va a ocultar
      toggleAction.textContent = 'Ocultar';
      toggleBtnText.textContent = '👁️‍🗨️ Ocultar';
    } else {  // Oculto, va a mostrar
      toggleAction.textContent = 'Mostrar';
      toggleBtnText.textContent = '👁️ Mostrar';
    }
    
    if (isProductosContext) {
      toggleDescription.textContent = `Este producto ${currentState ? 'dejará de mostrarse' : 'volverá a mostrarse'} solo en Productos (no afecta Catálogo).`;
    } else {
      toggleDescription.textContent = `Este producto ${currentState ? 'dejará de mostrarse' : 'volverá a mostrarse'} en Catálogo (y también en Productos si aplica).`;
    }
    
    modal.style.display = 'flex';
    // Forzar centrado inline (en caso de que CSS no lo haga)
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.zIndex = '1000';
  }
}

// Inicializar event listeners del modal
document.addEventListener('DOMContentLoaded', () => {
  const toggleModalCancel = document.getElementById('toggleModalCancel');
  const toggleModalConfirm = document.getElementById('toggleModalConfirm');

  if (toggleModalCancel) {
    toggleModalCancel.addEventListener('click', () => {
      document.getElementById('toggleVisibilityModal').style.display = 'none';
      productToToggleId = null;
      productToggleContext = null;
    });
  }

  if (toggleModalConfirm) {
    toggleModalConfirm.addEventListener('click', () => {
      if (productToToggleId) {
        const idx = productosBase.findIndex(p => p.id === productToToggleId);
        if (idx !== -1) {
          const isProductosContext = productToggleContext === 'productos';
          if (isProductosContext) {
            const newHidden = !productosBase[idx].hiddenInProductos;
            productosBase[idx].hiddenInProductos = newHidden;
            const action = newHidden ? 'ocultado' : 'mostrado';
            showNotification(`Producto ${action} en Productos`, 'success');
          } else {
            const newPublicado = productosBase[idx].publicado === false ? true : false;
            productosBase[idx].publicado = newPublicado;
            const action = newPublicado ? 'mostrado' : 'ocultado';
            showNotification(`Producto ${action} en Catálogo`, 'success');
          }
          
          guardarProductos();
          applyFilters();
          renderCalendar();
          renderDatabase();
          renderPedidos();
        }
      }
      document.getElementById('toggleVisibilityModal').style.display = 'none';
      productToToggleId = null;
      productToggleContext = null;
    });
  }
  
  // Poblar categorías al cargar
  populateCategorySelect();
});

// Función para poblar el select de categorías dinámicamente
function populateCategorySelect() {
  const select = document.getElementById('newCategoriaSelect');
  if (!select) return;
  
  const categorias = [...new Set(
    productosBase
      .map(p => p.categoria)
      .filter(cat => cat && cat.trim() !== '')
  )].sort();
  
  select.innerHTML = '<option value="">Selecciona o crea una categoría</option>';
  
  categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  
  const optionCustom = document.createElement('option');
  optionCustom.value = 'custom';
  optionCustom.textContent = '+ Crear nueva...';
  select.appendChild(optionCustom);
}

function updateCategoryInput() {
  const select = document.getElementById('newCategoriaSelect');
  const customInput = document.getElementById('newCategoriaCustom');
  
  if (select && customInput) {
    if (select.value === 'custom') {
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      customInput.value = '';
    }
  }
}

document.getElementById('addBtn').addEventListener('click', async () => {
  const nombre = document.getElementById('newNombre').value.trim();
  const categoriaSelect = document.getElementById('newCategoriaSelect').value.trim();
  const categoriaCustom = document.getElementById('newCategoriaCustom').value.trim();
  const categoria = categoriaCustom || (categoriaSelect && categoriaSelect !== 'custom' ? categoriaSelect : '');
  const medidas = document.getElementById('newMedidas').value.trim();
  const tiempoUnitarioStr = document.getElementById('newTiempoUnitario').value || '00:00:00';
  const unidades = parseFloat(document.getElementById('newUnidades').value) || 1;
  const unidadesPorPlaca = parseFloat(document.getElementById('newUnidadesPorPlaca').value) || 0;
  const usoPlacas = parseFloat(document.getElementById('newUsoPlacas').value) || 0;
  const costoPlaca = parseFloat(document.getElementById('newCostoPlaca').value) || 0;
  const costoMaterial = parseFloat(document.getElementById('newCostoMaterial').value) || 0;
  const margenMaterial = parseFloat(document.getElementById('newMargenMaterial').value) || 0;
  const precioUnitario = parseFloat(document.getElementById('newPrecioUnitario').value) || 0;
  const tipo = document.getElementById('newTipo').value || 'Venta';
  const ensamble = document.getElementById('newEnsamble').value || 'Sin ensamble';
  const imagenInput = document.getElementById('newImagen');
  const publicado = document.getElementById('newPublicado')?.checked ?? true;


  // Limpiar mensajes de error
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  if (!nombre) { document.getElementById('nombre-error').textContent = 'El nombre es requerido'; return; }
  if (productosBase.some(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.publicado !== false)) {
    document.getElementById('nombre-error').textContent = 'Ya existe un producto con ese nombre'; return;
  }
  if (!medidas) { document.getElementById('medidas-error').textContent = 'Las medidas son requeridas'; return; }
  if (!validateTimeFormat(tiempoUnitarioStr)) {
    document.getElementById('tiempo-error').textContent = 'Formato: HH:MM:SS'; return;
  }
  const tiempoUnitarioMin = timeToMinutes(tiempoUnitarioStr);
  if (tiempoUnitarioMin <= 0) {
    document.getElementById('tiempo-error').textContent = 'Tiempo debe ser mayor a 0'; return;
  }
  if (unidades <= 0) { document.getElementById('unidades-error').textContent = 'Unidades deben ser mayor a 0'; return; }
  if (!categoria) { document.getElementById('categoria-error').textContent = 'La categoría es requerida'; return; }

  let imagenURL = '';
  if (imagenInput && imagenInput.files && imagenInput.files[0]) {
    imagenURL = await fileToBase64(imagenInput.files[0]);
  }

  const nuevoProducto = {
    id: Date.now() + Math.floor(Math.random() * 100000),
    nombre,
    categoria,
    medidas,
    tiempoUnitario: tiempoUnitarioStr,
    unidades,
    unidadesPorPlaca,
    usoPlacas,
    costoPlaca,
    costoMaterial,
    margenMaterial,
    precioUnitario,
    tipo,
    ensamble,
    imagen: imagenURL,
    costo: 0,
    material: '',
    dimensiones: medidas,
    utilidad: 0,
    precio1: 0,
    stockActual: 0,
    active: true,
    publicado,
    hiddenInProductos: false,
    allowPromotions: true  // Necesario para integración con Marketing
  };



  productosBase.push(nuevoProducto);
  guardarProductos();
  applyFilters();
  renderCalendar();
  renderDatabase();
  renderPedidos();
  showNotification('Producto agregado correctamente');

  // Limpiar formulario
  document.getElementById('newNombre').value = '';
  document.getElementById('newCategoriaSelect').value = '';
  document.getElementById('newCategoriaCustom').value = '';
  document.getElementById('newCategoriaCustom').style.display = 'none';
  document.getElementById('newMedidas').value = '';
  document.getElementById('newTiempoUnitario').value = '';
  document.getElementById('newUnidades').value = '';
  document.getElementById('newUnidadesPorPlaca').value = '';
  document.getElementById('newUsoPlacas').value = '';
  document.getElementById('newCostoPlaca').value = '';
  document.getElementById('newCostoMaterial').value = '';
  document.getElementById('newMargenMaterial').value = '';
  document.getElementById('newPrecioUnitario').value = '';
  document.getElementById('newTipo').value = 'Venta';
  document.getElementById('newEnsamble').value = 'Sin ensamble';
  document.getElementById('newImagen').value = '';
  document.getElementById('imagePreview').innerHTML = 'Sin imagen';

  updateFormCalculatedFields();
  
  // Actualizar lista de categorías y enfocar el primer campo para continuar agregando
  populateCategorySelect();
  if (typeof focusFirstFormField === 'function') {
    focusFirstFormField();
  }
});


document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('newNombre').value = '';
  document.getElementById('newCategoriaSelect').value = '';
  document.getElementById('newCategoriaCustom').value = '';
  document.getElementById('newCategoriaCustom').style.display = 'none';
  document.getElementById('newMedidas').value = '';
  document.getElementById('newTiempoUnitario').value = '';
  document.getElementById('newUnidades').value = '';
  document.getElementById('newUnidadesPorPlaca').value = '';
  document.getElementById('newUsoPlacas').value = '';
  document.getElementById('newCostoPlaca').value = '';
  document.getElementById('newCostoMaterial').value = '';
  document.getElementById('newMargenMaterial').value = '';
  document.getElementById('newPrecioUnitario').value = '';
  document.getElementById('newTipo').value = 'Venta';
  document.getElementById('newEnsamble').value = 'Sin ensamble';
  document.getElementById('newImagen').value = '';
  document.getElementById('imagePreview').innerHTML = 'Sin imagen';
  const usoPlacasInput = document.getElementById('newUsoPlacas');
  const costoMaterialInput = document.getElementById('newCostoMaterial');
  const precioUnitarioInput = document.getElementById('newPrecioUnitario');
  usoPlacasInput.readOnly = true;
  usoPlacasInput.style.background = '#333';
  usoPlacasInput.style.cursor = 'not-allowed';
  document.getElementById('toggleUsoPlacas').textContent = 'Manual';
  costoMaterialInput.readOnly = true;
  costoMaterialInput.style.background = '#333';
  costoMaterialInput.style.cursor = 'not-allowed';
  document.getElementById('toggleCostoMaterial').textContent = 'Manual';
  precioUnitarioInput.readOnly = true;
  precioUnitarioInput.style.background = '#333';
  precioUnitarioInput.style.cursor = 'not-allowed';
  document.getElementById('togglePrecioUnitario').textContent = 'Manual';
  updateFormCalculatedFields();
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  
  // Enfocar el primer campo después de limpiar
  if (typeof focusFirstFormField === 'function') {
    focusFirstFormField();
  }
});

function setupEditEnterNavigation(card) {
  const formFields = [
    '.nombre-input',
    '.medidas-input',
    '.tiempo-unitario-input',
    '.unidades-input',
    '.unidades-placa-input',
    '.uso-placas-input',
    '.costo-placa-input',
    '.costo-material-input',
    '.margen-material-input',
    '.precio-unitario-input',
    '.ensamble-input',
    '.tipo-input'
  ];

  formFields.forEach((selector, index) => {
    const element = card.querySelector(selector);
    if (!element) return;

    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();

        let nextIndex = index + 1;
        while (nextIndex < formFields.length) {
          const nextElement = card.querySelector(formFields[nextIndex]);
          if (nextElement && !nextElement.readOnly && !nextElement.disabled) {
            setTimeout(() => {
              nextElement.focus();
              if (nextElement.tagName === 'INPUT' && nextElement.type !== 'file') {
                nextElement.select();
              }
            }, 0);
            break;
          }
          nextIndex++;
        }
      }
    });
  });
}

function createProductCard(nombre, tiempoUnitarioStr, unidades, precioUnitario, tipo, imagen, id) {
  const producto = productosBase.find(p => p.id === id);
  const tiempoUnitarioMin = timeToMinutes(tiempoUnitarioStr);
  const tiempoTotalMin = tiempoUnitarioMin * (unidades || 0);
  const tiempoTotalStr = minutesToTime(tiempoTotalMin);
  const pedido = (precioUnitario || 0) * (unidades || 0);
  const precioPorMin = tiempoUnitarioMin > 0 ? precioUnitario / tiempoUnitarioMin : 0;
  const precioPorHora = precioPorMin * 60;

  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.tipo = tipo;
  card.dataset.id = id;
  card.innerHTML = `
    <!-- Header de la tarjeta -->
    <div class="card-header">
      <div class="title-block">
        <h3 class="titulo">${escapeHtml(nombre)}</h3>
        <div class="id">#${id}</div>
        <div class="collapsed-indicators">
          <div class="collapsed-indicator">
            <div class="collapsed-indicator-label">Precio Unit.</div>
            <div class="collapsed-indicator-value precio-unitario-collapsed">${formatCurrency(precioUnitario)}</div>
          </div>
          <div class="collapsed-indicator">
            <div class="collapsed-indicator-label">Precio/Min</div>
            <div class="collapsed-indicator-value precio-min-collapsed">${formatCurrency(precioPorMin)}</div>
          </div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="precio-total">${formatCurrency(pedido)}</div>
        <div class="action-buttons" role="group" aria-label="Acciones tarjeta">
          <button class="edit-btn" title="Editar">Editar</button>
          <button class="save-btn" title="Guardar" style="display:none;">Guardar</button>
          <button class="delete-btn" title="Eliminar">×</button>
          <button class="collapse-btn" aria-expanded="true" title="Colapsar">−</button>
        </div>
      </div>
    </div>

    <!-- Contenido principal -->
    <div class="card-main-content">
      <div>
        <div class="info-blocks view-mode">
          <!-- Fila 1: Información básica -->
          <div class="info-block">
            <div class="label">Nombre</div>
            <div class="value nombre-value">${escapeHtml(nombre)}</div>
          </div>
          <div class="info-block">
            <div class="label">Categoría</div>
            <div class="value categoria-value">${escapeHtml(producto.categoria || 'Sin categoría')}</div>
          </div>
          <div class="info-block">
            <div class="label">Medidas/Detalle</div>
            <div class="value medidas-value">${escapeHtml(producto.medidas || '')}</div>
          </div>
          <div class="info-block">
            <div class="label">Unidades a producir</div>
            <div class="value highlight unidades-value">${unidades}</div>
          </div>

          <!-- Fila 2: Tiempos y producción -->
          <div class="info-block">
            <div class="label">Tiempo Unitario</div>
            <div class="value time tiempo-unitario-value">${tiempoUnitarioStr || '00:00:00'}</div>
          </div>
          <div class="info-block">
            <div class="label">Unidades x Placa</div>
            <div class="value highlight unidades-placa-value">${producto.unidadesPorPlaca || 0}</div>
          </div>
          <div class="info-block">
            <div class="label">Uso de Placas</div>
            <div class="value highlight uso-placas-value">${producto.usoPlacas || 0}</div>
          </div>

          <!-- Fila 3: Costos -->
          <div class="info-block">
            <div class="label">Costo Placa</div>
            <div class="value price costo-placa-value">${formatCurrency(producto.costoPlaca || 0)}</div>
          </div>
          <div class="info-block">
            <div class="label">Costo Material</div>
            <div class="value price costo-material-value">${formatCurrency(producto.costoMaterial || 0)}</div>
          </div>
          <div class="info-block">
            <div class="label">Margen Material</div>
            <div class="value percentage margen-material-value">${producto.margenMaterial || 0}%</div>
          </div>

          <!-- Fila 4: Precios y detalles -->
          <div class="info-block">
            <div class="label">Precio Unitario</div>
            <div class="value price precio-unitario-value">${formatCurrency(precioUnitario)}</div>
          </div>
          <div class="info-block">
            <div class="label">Ensamble</div>
            <div class="value ensamble-value">${escapeHtml(producto.ensamble || 'Sin ensamble')}</div>
          </div>
          <div class="info-block">
            <div class="label">Pedido Total</div>
            <div class="value price pedido-value">${formatCurrency(pedido)}</div>
          </div>
        </div>

        <!-- Contenido de edición (oculto por defecto) -->
        <div class="info-blocks edit-mode" style="display:none;">
          <div class="info-block">
            <div class="label">Nombre</div>
            <input type="text" class="edit-input nombre-input value" value="${escapeHtml(nombre)}">
          </div>
          <div class="info-block">
            <div class="label">Categoría</div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <select class="edit-input categoria-input-select value" onchange="updateCategoryInputCard(this)">
                <option value="">Selecciona o crea una categoría</option>
                <option value="Señales" ${producto.categoria === 'Señales' ? 'selected' : ''}>Señales</option>
                <option value="Llaveros" ${producto.categoria === 'Llaveros' ? 'selected' : ''}>Llaveros</option>
                <option value="Decoraciones" ${producto.categoria === 'Decoraciones' ? 'selected' : ''}>Decoraciones</option>
                <option value="Portarretratos" ${producto.categoria === 'Portarretratos' ? 'selected' : ''}>Portarretratos</option>
                <option value="Puzzles" ${producto.categoria === 'Puzzles' ? 'selected' : ''}>Puzzles</option>
                <option value="Otros" ${producto.categoria === 'Otros' ? 'selected' : ''}>Otros</option>
                <option value="custom">Crear nueva...</option>
              </select>
              <input type="text" class="edit-input categoria-input-custom value" placeholder="Nueva categoría" style="display: none; width: 150px;" value="${producto.categoria && !['Señales', 'Llaveros', 'Decoraciones', 'Portarretratos', 'Puzzles', 'Otros'].includes(producto.categoria) ? producto.categoria : ''}">
            </div>
          </div>
          <div class="info-block">
            <div class="label">Medidas/Detalle</div>
            <input type="text" class="edit-input medidas-input value" value="${escapeHtml(producto.medidas || '')}">
          </div>
          <div class="info-block">
            <div class="label">Unidades a producir</div>
            <input type="number" class="edit-input unidades-input value" value="${unidades}">
          </div>
          <div class="info-block">
            <div class="label">Tiempo (HH:MM:SS)</div>
            <input type="text" class="edit-input tiempo-unitario-input value" value="${tiempoUnitarioStr || '00:00:00'}">
          </div>
          <div class="info-block">
            <div class="label">Unidades x Placa</div>
            <input type="number" class="edit-input unidades-placa-input value" value="${producto.unidadesPorPlaca || 0}">
          </div>
          <div class="info-block">
            <div class="label">Uso de Placas</div>
            <input type="number" class="edit-input uso-placas-input value" value="${producto.usoPlacas || 0}">
          </div>
          <div class="info-block">
            <div class="label">Costo Placa</div>
            <input type="number" class="edit-input costo-placa-input value" value="${producto.costoPlaca || 0}">
          </div>
          <div class="info-block">
            <div class="label">Costo Material</div>
            <input type="number" class="edit-input costo-material-input value" value="${producto.costoMaterial || 0}">
          </div>
          <div class="info-block">
            <div class="label">Margen Material (%)</div>
            <input type="number" class="edit-input margen-material-input value" value="${producto.margenMaterial || 0}">
          </div>
          <div class="info-block">
            <div class="label">Precio Unitario</div>
            <input type="number" class="edit-input precio-unitario-input value" value="${precioUnitario}">
          </div>

          <div class="info-block">
            <div class="label">Ensamble</div>
            <select class="edit-input ensamble-input value">
              <option value="Manual" ${producto.ensamble === 'Manual' ? 'selected' : ''}>Manual</option>
              <option value="Automático" ${producto.ensamble === 'Automático' ? 'selected' : ''}>Automático</option>
              <option value="Sin ensamble" ${producto.ensamble === 'Sin ensamble' ? 'selected' : ''}>Sin ensamble</option>
            </select>
          </div>
          <div class="info-block">
            <div class="label">Tipo</div>
            <select class="edit-input tipo-input value">
              <option value="Venta" ${tipo === 'Venta' ? 'selected' : ''}>Venta</option>
              <option value="Presupuesto" ${tipo === 'Presupuesto' ? 'selected' : ''}>Presupuesto</option>
              <option value="Stock" ${tipo === 'Stock' ? 'selected' : ''}>Stock</option>
            </select>
          </div>
          <div class="info-block">
            <div class="label">Imagen</div>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="file" accept="image/*" class="edit-input imagen-input" />
              <div class="edit-image-preview" style="width:64px; height:64px; border-radius:6px; background:#222; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                ${imagen ? `<img src="${imagen}" style="width:100%; height:100%; object-fit:cover;" />` : '<span style="color:#888; font-size:0.8rem;">Sin</span>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Resultados calculados -->
        <div class="result">
          <div class="result-item">
            <span class="result-label">Tiempo Total:</span>
            <span class="result-value tiempo-total">${tiempoTotalStr}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Precio por Minuto:</span>
            <span class="result-value precio-por-min">${formatCurrency(precioPorMin)}</span>
          </div>
        </div>
      </div>

      <!-- Sección derecha - Imagen y detalles -->
      <div class="card-right-container">
        <div class="card-right">
          ${imagen ? `<img src="${imagen}" alt="Imagen ${escapeHtml(nombre)}" class="product-image">` : '<div class="image-placeholder">Sin imagen</div>'}
        </div>
        <div class="precio-unitario">${formatCurrency(precioUnitario)}</div>
        <div class="type-card ${tipo.toLowerCase()}">${tipo}</div>
        <div class="hour-card">
          <div style="color:#b0b0b0; font-size:0.8rem; margin-bottom:4px;">Precio por Hora</div>
          <div class="hora-value">${formatCurrency(precioPorHora)}</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('productosContainer').appendChild(card);

  const collapseBtn = card.querySelector('.collapse-btn');
  const editBtn = card.querySelector('.edit-btn');
  const saveBtn = card.querySelector('.save-btn');
  const deleteBtn = card.querySelector('.delete-btn');
  // Usar el mismo estilo que el botón "Guardar" para el icono mostrar/ocultar
  if (deleteBtn) {
    deleteBtn.classList.remove('delete-btn');
    deleteBtn.classList.add('save-btn', 'toggle-visibility-btn');
  }
  const viewMode = card.querySelector('.view-mode');
  const editMode = card.querySelector('.edit-mode');
  const cardMainContent = card.querySelector('.card-main-content');

  card.classList.add('collapsed');
  cardMainContent.style.display = 'none';
  collapseBtn.textContent = '+';

  collapseBtn.addEventListener('click', () => {
    card.classList.toggle('collapsed');
    if (card.classList.contains('collapsed')) {
      collapseBtn.textContent = '+';
      cardMainContent.style.display = 'none';
    } else {
      collapseBtn.textContent = '−';
      cardMainContent.style.display = 'grid';
    }
  });

  editBtn.addEventListener('click', () => {
    card.classList.add('editing');
    if (card.classList.contains('collapsed')) {
      card.classList.remove('collapsed');
      collapseBtn.textContent = '−';
      cardMainContent.style.display = 'grid';
    }
    viewMode.style.display = 'none';
    editMode.style.display = 'grid';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    
    setupEditModeCalculations(card);
    setupEditEnterNavigation(card);
  });

saveBtn.addEventListener('click', async () => {
  const newNombre = card.querySelector('.nombre-input').value.trim();
  const newCategoriaSelect = card.querySelector('.categoria-input-select').value.trim();
  const newCategoriaCustom = card.querySelector('.categoria-input-custom').value.trim();
  const newCategoria = newCategoriaCustom || (newCategoriaSelect && newCategoriaSelect !== 'custom' ? newCategoriaSelect : '');
  const newMedidas = card.querySelector('.medidas-input').value.trim();
  const newTiempo = card.querySelector('.tiempo-unitario-input').value;
  const newUnidades = parseFloat(card.querySelector('.unidades-input').value) || 0;
  const newUnidadesPlaca = parseFloat(card.querySelector('.unidades-placa-input').value) || 0;
  const newUsoPlacas = parseFloat(card.querySelector('.uso-placas-input').value) || 0;
  const newCostoPlaca = parseFloat(card.querySelector('.costo-placa-input').value) || 0;
  const newCostoMaterial = parseFloat(card.querySelector('.costo-material-input').value) || 0;
  const newMargenMaterial = parseFloat(card.querySelector('.margen-material-input').value) || 0;
  const newPrecio = parseFloat(card.querySelector('.precio-unitario-input').value) || 0;
  const newEnsamble = card.querySelector('.ensamble-input').value;
  const newTipo = card.querySelector('.tipo-input').value;

  // imagen data will be set if a new image file is uploaded in the card
  let newImagenData = null;


  if (!newNombre) { showNotification('El nombre es requerido', 'error'); return; }
  if (!validateTimeFormat(newTiempo)) { showNotification('Formato de tiempo inválido', 'error'); return; }
  if (newUnidades <= 0) { showNotification('Unidades debe ser > 0', 'error'); return; }
  if (!newCategoria) { showNotification('La categoría es requerida', 'error'); return; }
  if (newPrecio <= 0) { showNotification('Precio debe ser > 0', 'error'); return; }

  const newTiempoUnitarioMin = timeToMinutes(newTiempo);
  const newTiempoTotalMin = newTiempoUnitarioMin * newUnidades;
  const newTiempoTotalStr = minutesToTime(newTiempoTotalMin);
  const newPedidoTotal = newPrecio * newUnidades;
  const newPrecioPorMin = newTiempoUnitarioMin > 0 ? newPrecio / newTiempoUnitarioMin : 0;
  const newPrecioPorHora = newPrecioPorMin * 60;

  const index = productosBase.findIndex(p => p.id === id);
  if (index !== -1) {
  // Si se subió una nueva imagen en el card, procesarla
  const imagenInputCard = card.querySelector('.imagen-input');
    if (imagenInputCard && imagenInputCard.files && imagenInputCard.files[0]) {
      try {
        newImagenData = await fileToBase64(imagenInputCard.files[0]);
      } catch (err) { console.warn('No se pudo procesar imagen', err); }
    }

    Object.assign(productosBase[index], {
      nombre: newNombre,
      categoria: newCategoria,
      medidas: newMedidas,
      tiempoUnitario: newTiempo,
      unidades: newUnidades,
      unidadesPorPlaca: newUnidadesPlaca,
      usoPlacas: newUsoPlacas,
      costoPlaca: newCostoPlaca,
      costoMaterial: newCostoMaterial,
      margenMaterial: newMargenMaterial,
      precioUnitario: newPrecio,
      tipo: newTipo,
      ensamble: newEnsamble,
      dimensiones: newMedidas
    });



    if (newImagenData) {
      productosBase[index].imagen = newImagenData;
    }

    guardarProductos();
    applyFilters();
    updateMetrics();
    renderCalendar();
    renderDatabase();
    renderPedidos();
  }

  card.querySelector('.titulo').textContent = newNombre;
  card.querySelector('.nombre-value').textContent = newNombre;
  card.querySelector('.categoria-value').textContent = newCategoria;
  card.querySelector('.medidas-value').textContent = newMedidas;
  card.querySelector('.tiempo-unitario-value').textContent = newTiempo;
  card.querySelector('.unidades-value').textContent = newUnidades;
  card.querySelector('.unidades-placa-value').textContent = newUnidadesPlaca || 0;
  card.querySelector('.uso-placas-value').textContent = newUsoPlacas || 0;
  card.querySelector('.costo-placa-value').textContent = formatCurrency(newCostoPlaca || 0);
  card.querySelector('.costo-material-value').textContent = formatCurrency(newCostoMaterial || 0);
  card.querySelector('.margen-material-value').textContent = `${newMargenMaterial || 0}%`;
  card.querySelector('.precio-unitario-value').textContent = formatCurrency(newPrecio);
  card.querySelector('.ensamble-value').textContent = newEnsamble;
  card.querySelector('.pedido-value').textContent = formatCurrency(newPedidoTotal);
  card.querySelector('.precio-total').textContent = formatCurrency(newPedidoTotal);
  card.querySelector('.tiempo-total').textContent = newTiempoTotalStr;
  card.querySelector('.precio-por-min').textContent = formatCurrency(newPrecioPorMin);
  card.querySelector('.precio-unitario').textContent = formatCurrency(newPrecio);
  card.querySelector('.hora-value').textContent = formatCurrency(newPrecioPorHora);
  const typeCard = card.querySelector('.type-card');
  typeCard.className = `type-card ${newTipo.toLowerCase()}`;
  typeCard.textContent = newTipo;

  // Actualizar imagen si cambió
  if (newImagenData) {
    const right = card.querySelector('.card-right');
    if (right) {
      const imgEl = right.querySelector('img.product-image');
      if (imgEl) imgEl.src = newImagenData;
      else {
        // Reemplazar placeholder
        const placeholder = right.querySelector('.image-placeholder');
        if (placeholder) placeholder.outerHTML = `<img src="${newImagenData}" alt="Imagen ${escapeHtml(newNombre)}" class="product-image">`;
      }
    }
  }

  card.classList.remove('editing');
  viewMode.style.display = 'grid';
  editMode.style.display = 'none';
  editBtn.style.display = 'inline-block';
  saveBtn.style.display = 'none';
  showNotification('Producto actualizado correctamente', 'success');
});

// Cambiar botón a toggle visibilidad
deleteBtn.textContent = '👁️';
deleteBtn.title = 'Ocultar/Mostrar producto';
deleteBtn.addEventListener('click', () => {
  showToggleVisibilityModal(id, 'productos');
});

  const productImage = card.querySelector('.product-image');
  if (productImage) {
    productImage.addEventListener('click', () => showImageModal(imagen));
  }
}

// Función para mostrar/ocultar input de categoría personalizada
function updateCategoryInput() {
  const select = document.getElementById('newCategoriaSelect');
  const customInput = document.getElementById('newCategoriaCustom');
  
  if (select && customInput) {
    if (select.value === 'custom') {
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      customInput.value = '';
    }
  }
}

// Al final de products.js, después de todas las funciones
const categoriaSelect = document.getElementById('newCategoriaSelect');
if (categoriaSelect) {
  categoriaSelect.addEventListener('change', updateCategoryInput);
}