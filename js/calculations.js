function updateFormCalculatedFields() {
  const unidades = parseFloat(document.getElementById('newUnidades').value) || 0;
  const unidadesPorPlaca = parseFloat(document.getElementById('newUnidadesPorPlaca').value) || 1;
  const costoPlaca = parseFloat(document.getElementById('newCostoPlaca').value) || 0;
  const margenMaterial = parseFloat(document.getElementById('newMargenMaterial').value) || 0;
  const tiempoUnitario = document.getElementById('newTiempoUnitario').value;

  const usoPlacasInput = document.getElementById('newUsoPlacas');
  const isUsoPlacasManual = !usoPlacasInput.readOnly;
  if (!isUsoPlacasManual) {
    const usoPlacas = unidadesPorPlaca > 0 ? Math.ceil(unidades / unidadesPorPlaca) : 0;
    usoPlacasInput.value = usoPlacas;
  }

  const costoMaterialInput = document.getElementById('newCostoMaterial');
  const isCostoMaterialManual = !costoMaterialInput.readOnly;
  if (!isCostoMaterialManual) {
    const costoMaterial = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0;
    costoMaterialInput.value = costoMaterial.toFixed(2);
  }

  const costoMaterial = parseFloat(costoMaterialInput.value) || 0;
  const precioUnitarioInput = document.getElementById('newPrecioUnitario');
  const isPrecioUnitarioManual = !precioUnitarioInput.readOnly;
  if (!isPrecioUnitarioManual) {
    const precioUnitario = costoMaterial * (1 + margenMaterial / 100);
    precioUnitarioInput.value = precioUnitario.toFixed(2);
  } else {
    // Cuando el precio es manual, derivar el margen desde el precio y el costo de material
    const precioUnitarioManual = parseFloat(precioUnitarioInput.value) || 0;
    const margenDesdePrecio = costoMaterial > 0 ? ((precioUnitarioManual / costoMaterial) - 1) * 100 : 0;
    const margenRedondeado = parseFloat(margenDesdePrecio.toFixed(1));
    const margenInput = document.getElementById('newMargenMaterial');
    if (margenInput) margenInput.value = margenRedondeado;
  }

  const precioUnitario = parseFloat(precioUnitarioInput.value) || 0;
  const tiempoMinutos = timeToMinutes(tiempoUnitario);
  const tiempoTotalMinutos = tiempoMinutos * unidades;
  const precioPorMinuto = tiempoMinutos > 0 ? precioUnitario / tiempoMinutos : 0;

  document.getElementById('newTiempoTotal').value = minutesToTime(tiempoTotalMinutos);
  document.getElementById('newPrecioPorMinuto').value = formatCurrency(precioPorMinuto);
}

['newUnidades', 'newUnidadesPorPlaca', 'newCostoPlaca', 'newMargenMaterial', 'newTiempoUnitario', 'newCostoMaterial', 'newPrecioUnitario', 'newUsoPlacas'].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener('input', updateFormCalculatedFields);
});

document.getElementById('toggleUsoPlacas').addEventListener('click', () => {
  const input = document.getElementById('newUsoPlacas');
  const button = document.getElementById('toggleUsoPlacas');
  if (input.readOnly) {
    input.readOnly = false;
    input.style.background = '#222';
    input.style.cursor = 'text';
    button.textContent = 'Automático';
  } else {
    input.readOnly = true;
    input.style.background = '#333';
    input.style.cursor = 'not-allowed';
    button.textContent = 'Manual';
    updateFormCalculatedFields();
  }
});

document.getElementById('toggleCostoMaterial').addEventListener('click', () => {
  const input = document.getElementById('newCostoMaterial');
  const button = document.getElementById('toggleCostoMaterial');
  if (input.readOnly) {
    input.readOnly = false;
    input.style.background = '#222';
    input.style.cursor = 'text';
    button.textContent = 'Automático';
  } else {
    input.readOnly = true;
    input.style.background = '#333';
    input.style.cursor = 'not-allowed';
    button.textContent = 'Manual';
    updateFormCalculatedFields();
  }
});

document.getElementById('togglePrecioUnitario').addEventListener('click', () => {
  const input = document.getElementById('newPrecioUnitario');
  const button = document.getElementById('togglePrecioUnitario');
  if (input.readOnly) {
    input.readOnly = false;
    input.style.background = '#222';
    input.style.cursor = 'text';
    button.textContent = 'Automático';
  } else {
    input.readOnly = true;
    input.style.background = '#333';
    input.style.cursor = 'not-allowed';
    button.textContent = 'Manual';
    updateFormCalculatedFields();
  }
});

function setupEditModeCalculations(card) {
  const inputs = [
    '.unidades-input',
    '.unidades-placa-input', 
    '.costo-placa-input',
    '.margen-material-input',
    '.tiempo-unitario-input',
    '.costo-material-input',
    '.precio-unitario-input',
    '.uso-placas-input'
  ];
  
  inputs.forEach(selector => {
    const input = card.querySelector(selector);
    if (input) {
      input.addEventListener('input', () => updateEditCalculations(card));
    }
  });
}

function updateEditCalculations(card) {
  const unidades = parseFloat(card.querySelector('.unidades-input')?.value) || 0;
  const unidadesPorPlaca = parseFloat(card.querySelector('.unidades-placa-input')?.value) || 1;
  const costoPlaca = parseFloat(card.querySelector('.costo-placa-input')?.value) || 0;
  const margenMaterial = parseFloat(card.querySelector('.margen-material-input')?.value) || 0;

  const usoPlacasInput = card.querySelector('.uso-placas-input');
  if (usoPlacasInput && unidadesPorPlaca > 0) {
    usoPlacasInput.value = Math.ceil(unidades / unidadesPorPlaca);
  }

  const costoMaterialInput = card.querySelector('.costo-material-input');
  if (costoMaterialInput && unidadesPorPlaca > 0) {
    costoMaterialInput.value = (costoPlaca / unidadesPorPlaca).toFixed(2);
  }

  const precioInput = card.querySelector('.precio-unitario-input');
  const costoMaterial = parseFloat(costoMaterialInput?.value) || 0;
  if (precioInput) {
    precioInput.value = (costoMaterial * (1 + margenMaterial / 100)).toFixed(2);
  }

  updateLiveDisplays(card);
}

function updateLiveDisplays(card) {
  const unidades = parseFloat(card.querySelector('.unidades-input')?.value) || 0;
  const precioUnitario = parseFloat(card.querySelector('.precio-unitario-input')?.value) || 0;
  const tiempoUnitario = card.querySelector('.tiempo-unitario-input')?.value || '00:00:00';
  const tiempoMinutos = timeToMinutes(tiempoUnitario);
  const tiempoTotalMinutos = tiempoMinutos * unidades;
  const precioPorMinuto = tiempoMinutos > 0 ? precioUnitario / tiempoMinutos : 0;
  const precioPorHora = precioPorMinuto * 60;
  const precioTotal = precioUnitario * unidades;

  const precioTotalHeader = card.querySelector('.precio-total');
  if (precioTotalHeader) precioTotalHeader.textContent = formatCurrency(precioTotal);

  const precioUnitarioDisplay = card.querySelector('.precio-unitario');
  if (precioUnitarioDisplay) precioUnitarioDisplay.textContent = formatCurrency(precioUnitario);

  const tiempoTotalElement = card.querySelector('.tiempo-total');
  if (tiempoTotalElement) tiempoTotalElement.textContent = minutesToTime(tiempoTotalMinutos);

  const precioPorMinElement = card.querySelector('.precio-por-min');
  if (precioPorMinElement) precioPorMinElement.textContent = formatCurrency(precioPorMinuto);

  const horaValueElement = card.querySelector('.hora-value');
  if (horaValueElement) horaValueElement.textContent = formatCurrency(precioPorHora);
}