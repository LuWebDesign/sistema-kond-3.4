// filters.js

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const tipo = document.getElementById('filterTipo').value;
  
  filteredProductos = productosBase.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search) || 
                         p.tipo.toLowerCase().includes(search || '') ||
                         (p.medidas && p.medidas.toLowerCase().includes(search));
    
    const matchesTipo = !tipo || p.tipo === tipo;
    
    // Mostrar solo si publicado (para consistencia con catálogo) y no oculto específicamente en productos
    return p.publicado !== false && !p.hiddenInProductos && matchesSearch && matchesTipo;
  });
  
  cargarProductos(1);
}

function cargarProductos(page = 1) {
  currentPage = page;
  const container = document.getElementById('productosContainer');
  container.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(filteredProductos.length / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pag = filteredProductos.slice(start, end);
  
  pag.forEach(p => {
    createProductCard(p.nombre, p.tiempoUnitario, p.unidades, p.precioUnitario, p.tipo, p.imagen, p.id);
  });
  
  document.getElementById('pageInfo').textContent = `Página ${page} de ${totalPages}`;
  document.getElementById('prevPage').disabled = page === 1;
  document.getElementById('nextPage').disabled = page === totalPages;
  updateMetrics();
}

document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) cargarProductos(currentPage - 1);
});

document.getElementById('nextPage').addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(filteredProductos.length / pageSize));
  if (currentPage < totalPages) cargarProductos(currentPage + 1);
});

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterTipo').addEventListener('change', applyFilters);