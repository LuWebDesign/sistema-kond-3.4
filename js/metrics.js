let tipoChart = null;
let rentabilidadChart = null;

function updateMetrics() {
  const totalProductos = filteredProductos.length;
  const valorTotal = filteredProductos.reduce((s,p) => s + (p.precioUnitario || 0) * (p.unidades || 0), 0);
  const tiempoTotalMinutos = filteredProductos.reduce((s,p) => s + timeToMinutes(p.tiempoUnitario) * (p.unidades || 0), 0);
  const precioPromedio = totalProductos > 0 ? filteredProductos.reduce((sum, p) => {
    const tiempoMin = timeToMinutes(p.tiempoUnitario);
    return sum + (tiempoMin > 0 ? p.precioUnitario / tiempoMin : 0);
  }, 0) / totalProductos : 0;

  document.getElementById('totalProductos').textContent = totalProductos;
  document.getElementById('valorTotal').textContent = formatCurrency(valorTotal);
  document.getElementById('tiempoTotal').textContent = minutesToTime(tiempoTotalMinutos);
  document.getElementById('precioPromedio').textContent = formatCurrency(precioPromedio);

  const tipos = { Venta: 0, Presupuesto: 0, Stock: 0 };
  filteredProductos.forEach(p => {
    if (p.tipo in tipos) tipos[p.tipo]++;
  });

  const tipoChartCanvas = document.getElementById('tipoChartCanvas');
  if (tipoChartCanvas && typeof Chart !== 'undefined') {
    if (tipoChart) tipoChart.destroy();
    tipoChart = new Chart(tipoChartCanvas, {
      type: 'pie',
      data: {
        labels: ['Venta', 'Presupuesto', 'Stock'],
        datasets: [{
          data: [tipos.Venta, tipos.Presupuesto, tipos.Stock],
          backgroundColor: ['#4CAF50', '#0984e3', '#2196F3'],
          borderColor: ['#4CAF50', '#0984e3', '#2196F3'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#e0e0e0' } }
        }
      }
    });
  }

  const rentabilidad = filteredProductos
    .map(p => ({
      nombre: p.nombre,
      rentabilidad: timeToMinutes(p.tiempoUnitario) > 0 ? p.precioUnitario / timeToMinutes(p.tiempoUnitario) : 0
    }))
    .sort((a, b) => b.rentabilidad - a.rentabilidad)
    .slice(0, 5);

  const rentabilidadChartCanvas = document.getElementById('rentabilidadChartCanvas');
  if (rentabilidadChartCanvas && typeof Chart !== 'undefined') {
    if (rentabilidadChart) rentabilidadChart.destroy();
    rentabilidadChart = new Chart(rentabilidadChartCanvas, {
      type: 'bar',
      data: {
        labels: rentabilidad.map(p => p.nombre),
        datasets: [{
          label: 'Rentabilidad ($/min)',
          data: rentabilidad.map(p => p.rentabilidad),
          backgroundColor: '#0984e3',
          borderColor: '#0984e3',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { color: '#e0e0e0' } },
          x: { ticks: { color: '#e0e0e0' } }
        },
        plugins: {
          legend: { display: false },
          title: { display: false }
        }
      }
    });
  }
}