// Sidebar wiring: toggle active section when side links clicked
document.addEventListener('DOMContentLoaded', () => {
  function showSection(name, updateHistory = true) {
    // hide all sections
    document.querySelectorAll('.section').forEach(s => {
      s.classList.remove('active');
      s.hidden = true;
    });

    // show target
    const sec = document.getElementById(name + '-section');
    if (sec) {
      sec.classList.add('active');
      sec.hidden = false;
    }

    // mark active link
    document.querySelectorAll('.side-link').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.side-link[data-section="${name}"]`);
    if (btn) btn.classList.add('active');
    
    // Update topbar button states
    if (window.miCuentaUtils && window.miCuentaUtils.updateTopbarButtonStates) {
      window.miCuentaUtils.updateTopbarButtonStates(name);
    }
    
    // Special handling for Mi Cuenta section
    if (name === 'mi-cuenta' && window.miCuentaUtils && window.miCuentaUtils.updateMiCuentaWhenVisible) {
      window.miCuentaUtils.updateMiCuentaWhenVisible();
    }

    // Update URL with History API (without reloading page)
    if (updateHistory) {
      const newUrl = `${window.location.pathname}#/${name}`;
      history.pushState({ section: name }, '', newUrl);
      
      // Update page title based on section
      const sectionTitles = {
        'productos': 'Productos - Sistema KOND',
        'pedidos': 'Pedidos - Sistema KOND',
        'marketing': 'Marketing - Sistema KOND',
        'finanzas': 'Finanzas - Sistema KOND',
        'database': 'Base de Datos - Sistema KOND',
        'mi-cuenta': 'Mi Cuenta - Sistema KOND',
        'reportes': 'Reportes - Sistema KOND'
      };
      document.title = sectionTitles[name] || 'Sistema KOND';
    }
  }

  // Make showSection globally accessible for other modules
  window.showSection = showSection;

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.section) {
      showSection(event.state.section, false);
    } else {
      // If no state, try to get section from URL hash
      const hash = window.location.hash;
      const match = hash.match(/#\/(.+)/);
      if (match && match[1]) {
        showSection(match[1], false);
      }
    }
  });

  // Get initial section from URL or default to productos
  function getInitialSection() {
    const hash = window.location.hash;
    const match = hash.match(/#\/(.+)/);
    if (match && match[1]) {
      const sectionName = match[1];
      const sectionExists = document.getElementById(sectionName + '-section');
      if (sectionExists) {
        return sectionName;
      }
    }
    return 'productos';
  }

  document.body.addEventListener('click', (e) => {
    const link = (e.target && typeof e.target.closest === 'function') ? e.target.closest('.side-link') : null;
    if (!link) return;
    e.preventDefault();
    const section = link.dataset.section;
    if (section) showSection(section, true);
  });

  // Initialize: set active section based on URL or default to productos
  setTimeout(() => {
    const initialSection = getInitialSection();
    if (document.getElementById(initialSection + '-section')) {
      showSection(initialSection, false);
      // Set initial state
      history.replaceState({ section: initialSection }, '', `${window.location.pathname}#/${initialSection}`);
    }
  }, 100);

  // Touch devices: toggle expansion on tap of the sidebar area
  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl) {
    let touchTimer = null;
    sidebarEl.addEventListener('click', (e) => {
      // If it's already expanded via hover (desktop), ignore
      if (window.matchMedia && window.matchMedia('(hover: hover)').matches) return;
      // Toggle expanded class for touch devices
      sidebarEl.classList.toggle('expanded');
      document.querySelectorAll('.main-with-sidebar').forEach(m => {
        if (sidebarEl.classList.contains('expanded')) {
          m.style.marginLeft = '240px';
        } else {
          m.style.marginLeft = '80px';
        }
      });
      // actualizar aria-expanded en botones
      const expanded = sidebarEl.classList.contains('expanded');
      sidebarEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      document.querySelectorAll('.side-link').forEach(btn => btn.setAttribute('aria-expanded', expanded ? 'true' : 'false'));
    });
  }
});

// Detect hover via mouseenter/mouseleave to set aria-expanded for accessibility
const sidebarElGlobal = document.querySelector('.sidebar');
if (sidebarElGlobal) {
  sidebarElGlobal.addEventListener('mouseenter', () => {
    sidebarElGlobal.setAttribute('aria-expanded', 'true');
    document.querySelectorAll('.side-link').forEach(btn => btn.setAttribute('aria-expanded', 'true'));
  });
  sidebarElGlobal.addEventListener('mouseleave', () => {
    // if expanded via touch, don't override
    if (sidebarElGlobal.classList.contains('expanded')) return;
    sidebarElGlobal.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.side-link').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  });
}
