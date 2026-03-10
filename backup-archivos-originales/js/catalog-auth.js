// catalog-auth.js - autenticación independiente para compradores (catálogo)
(function(){
  const USERS_KEY = 'kond_catalog_users';
  const SESSION_KEY = 'kond_catalog_session';

  function loadUsers(){
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch(e){ return []; }
  }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  function signup({email, telefono, password, nombre, apellido, provincia, localidad, cp, direccion, observaciones}){
    const users = loadUsers();
    if (!email || !password) return { ok:false, error:'Email y contraseña son requeridos' };
    if (!nombre || !apellido) return { ok:false, error:'Nombre y apellido son requeridos' };
    if (!provincia || !localidad || !cp || !direccion) return { ok:false, error:'Datos de envío completos son requeridos' };
    
    if (users.find(x => String(x.email).toLowerCase() === String(email).toLowerCase())){
      return { ok:false, error:'El email ya está registrado' };
    }
    
    const id = Date.now() + Math.floor(Math.random()*1000);
    const user = { 
      id, email, password,
      nombre: nombre || '', 
      apellido: apellido || '',
      telefono: telefono || '', 
      provincia: provincia || '',
      localidad: localidad || '',
      cp: cp || '',
      direccion: direccion || '',
      observaciones: observaciones || ''
    };
    
    users.push(user);
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: id }));
    return { ok:true, user };
  }

  function login({email, password}){
    const users = loadUsers();
    const user = users.find(x => String(x.email).toLowerCase() === String(email).toLowerCase() && x.password === password);
    if (!user) return { ok:false, error:'Credenciales inválidas' };
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
    return { ok:true, user };
  }

  function logout(){ localStorage.removeItem(SESSION_KEY); }

  function currentUser(){
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      if (!s || !s.userId) return null;
      const users = loadUsers();
      return users.find(u => String(u.id) === String(s.userId)) || null;
    } catch(e){ return null; }
  }

  function updateProfile({ userId, nombre, apellido, telefono, avatar }){
    const users = loadUsers();
    const idx = users.findIndex(u => String(u.id) === String(userId));
    if (idx === -1) return { ok:false, error:'Usuario no encontrado' };
    if (nombre !== undefined) users[idx].nombre = nombre;
    if (apellido !== undefined) users[idx].apellido = apellido;
    if (telefono !== undefined) users[idx].telefono = telefono;
    if (avatar !== undefined) users[idx].avatar = avatar;
    
    // Campos adicionales del catálogo
    if (arguments[0].provincia !== undefined) users[idx].provincia = arguments[0].provincia;
    if (arguments[0].localidad !== undefined) users[idx].localidad = arguments[0].localidad;
    if (arguments[0].cp !== undefined) users[idx].cp = arguments[0].cp;
    if (arguments[0].direccion !== undefined) users[idx].direccion = arguments[0].direccion;
    if (arguments[0].observaciones !== undefined) users[idx].observaciones = arguments[0].observaciones;
    
    saveUsers(users);
    return { ok:true, user: users[idx] };
  }

  function changePassword({ userId, currentPassword, newPassword }){
    const users = loadUsers();
    const idx = users.findIndex(u => String(u.id) === String(userId));
    if (idx === -1) return { ok:false, error:'Usuario no encontrado' };
    if (users[idx].password !== currentPassword) return { ok:false, error:'Contraseña actual incorrecta' };
    users[idx].password = newPassword;
    saveUsers(users);
    return { ok:true };
  }

  // Open modal if present
  function openLoginModal(){
    const modal = document.getElementById('loginModalCatalog');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
    try { modal.classList.add('show'); } catch(e){}
  }

  // Wire modal buttons if present
  document.addEventListener('DOMContentLoaded', () => {
    const btnDoLogin = document.getElementById('btnDoLoginCatalog');
    const btnDoSignup = document.getElementById('btnDoSignupCatalog');
    const btnShowSignup = document.getElementById('btnShowSignupCatalog');
    const btnShowLogin = document.getElementById('btnShowLoginCatalog');
    const closeLogin = document.getElementById('closeLoginModalCatalog');
    
    const loginForm = document.getElementById('loginFormCatalog');
    const signupForm = document.getElementById('signupFormCatalog');
    const modalTitle = document.getElementById('modalTitleCatalog');

    // Toggle between login and signup forms
    if (btnShowSignup) btnShowSignup.addEventListener('click', () => {
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
      if (modalTitle) modalTitle.textContent = 'Registrarse como comprador';
    });

    if (btnShowLogin) btnShowLogin.addEventListener('click', () => {
      if (signupForm) signupForm.style.display = 'none';
      if (loginForm) loginForm.style.display = 'block';
      if (modalTitle) modalTitle.textContent = 'Ingresar como comprador';
    });

    // Handle login
    if (btnDoLogin) btnDoLogin.addEventListener('click', () => {
      const email = (document.getElementById('authEmailCatalog')||{}).value || '';
      const password = (document.getElementById('authPasswordCatalog')||{}).value || '';
      const res = login({email, password});
      if (!res.ok){ alert(res.error); return; }
      const lm = document.getElementById('loginModalCatalog');
      if (lm) { lm.style.display='none'; lm.setAttribute('aria-hidden','true'); try{ lm.classList.remove('show'); }catch(e){} }
      location.reload();
    });

    // Handle signup
    if (btnDoSignup) btnDoSignup.addEventListener('click', () => {
      const email = (document.getElementById('signupEmailCatalog')||{}).value || '';
      const password = (document.getElementById('signupPasswordCatalog')||{}).value || '';
      const nombre = (document.getElementById('signupNombreCatalog')||{}).value || '';
      const apellido = (document.getElementById('signupApellidoCatalog')||{}).value || '';
      const telefono = (document.getElementById('signupTelefonoCatalog')||{}).value || '';
      const provincia = (document.getElementById('signupProvinciaCatalog')||{}).value || '';
      const localidad = (document.getElementById('signupLocalidadCatalog')||{}).value || '';
      const cp = (document.getElementById('signupCpCatalog')||{}).value || '';
      const direccion = (document.getElementById('signupDireccionCatalog')||{}).value || '';
      const observaciones = (document.getElementById('signupObservacionesCatalog')||{}).value || '';
      
      const res = signup({email, password, nombre, apellido, telefono, provincia, localidad, cp, direccion, observaciones});
      if (!res.ok){ alert(res.error); return; }
      
      const lm = document.getElementById('loginModalCatalog');
      if (lm) { lm.style.display='none'; lm.setAttribute('aria-hidden','true'); try{ lm.classList.remove('show'); }catch(e){} }
      location.reload();
    });

    // Handle close
    if (closeLogin) closeLogin.addEventListener('click', () => {
      const lm = document.getElementById('loginModalCatalog');
      if (lm) { lm.style.display='none'; lm.setAttribute('aria-hidden','true'); try{ lm.classList.remove('show'); }catch(e){} }
      
      // Reset forms
      if (signupForm) signupForm.style.display = 'none';
      if (loginForm) loginForm.style.display = 'block';
      if (modalTitle) modalTitle.textContent = 'Ingresar como comprador';
    });
  });

  window.KONDCatalogAuth = { signup, login, logout, currentUser, openLoginModal, updateProfile, changePassword };
})();
