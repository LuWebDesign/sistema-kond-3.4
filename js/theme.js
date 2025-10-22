// Sistema de temas claro/oscuro
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Permitir forzar tema vía parámetro de URL (ej: ?theme=light)
const urlParams = new URLSearchParams(window.location.search);
const forcedTheme = urlParams.get('theme');

// Cargar tema guardado (o forzado por URL) — por defecto 'dark'
const savedTheme = forcedTheme || localStorage.getItem('theme') || 'dark';
body.setAttribute('data-theme', savedTheme);
if (typeof updateThemeIcon === 'undefined') {
  // definir función si no existe aún (compatibilidad en hot-reload)
  window.updateThemeIcon = (theme) => {
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      themeToggle.title = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    }
  };
}
updateThemeIcon(savedTheme);

// Toggle de tema (si existe el botón)
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // Animación suave
    body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  });
}

// Exponer helper para pruebas desde consola
window.setAppTheme = (t) => { body.setAttribute('data-theme', t); localStorage.setItem('theme', t); updateThemeIcon(t); };