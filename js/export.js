document.getElementById('exportBtn').addEventListener('click', () => {
  const headers = ['ID', 'Nombre', 'Unidades por Placa', 'Uso de Placas', 'Costo', 'Material', 'Dimensiones', 'Tiempo Unitario', 'Unidades', 'Costo Placa', 'Costo Material', 'Margen Material (%)', 'Precio Unitario', 'Ensamble', 'Tipo'];
  const data = productosBase.filter(p => p.active).map(p => [
    p.id,
    p.nombre,
    p.unidadesPorPlaca || 0,
    p.usoPlacas || 0,
    p.costo || 0,
    p.material || '',
    p.medidas || '',
    p.tiempoUnitario || '',
    p.unidades || 0,
    p.costoPlaca || 0,
    p.costoMaterial || 0,
    p.margenMaterial || 0,
    p.precioUnitario || 0,
    p.ensamble || 'Sin ensamble',
    p.tipo || 'Venta'
  ]);

  let csvContent = headers.join(',') + '\n';
  data.forEach(row => {
    csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'productos.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});