// auth.js - autenticación local mínima basada en localStorage
(function(){
  const USERS_KEY = 'kond_users';
  const SESSION_KEY = 'kond_session';

  function loadUsers(){
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch(e){ return []; }
  }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  function signup({email, telefono, password}){
    const users = loadUsers();
    if (!email || !password) return { ok:false, error:'Email y contraseña son requeridos' };
    if (users.find(x => String(x.email).toLowerCase() === String(email).toLowerCase())){
      return { ok:false, error:'El email ya está registrado' };
    }
    const id = Date.now() + Math.floor(Math.random()*1000);
    const user = { id, email, telefono: telefono || '', password };
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
    // Campos de envío
    // direccion, provincia, localidad, cp, observaciones
    if (arguments[0].direccion !== undefined) users[idx].direccion = arguments[0].direccion;
    if (arguments[0].provincia !== undefined) users[idx].provincia = arguments[0].provincia;
    if (arguments[0].localidad !== undefined) users[idx].localidad = arguments[0].localidad;
    if (arguments[0].cp !== undefined) users[idx].cp = arguments[0].cp;
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

  // Small UI helpers: open modal if present
  function openLoginModal(){
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    // Usar la clase y estilos del sistema de checkout-modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
    // Si hay clase show en CSS para animación, se puede añadir
    try { modal.classList.add('show'); } catch(e){}
  }

  // Wire modal buttons if present
  document.addEventListener('DOMContentLoaded', () => {
    const btnDoLogin = document.getElementById('btnDoLogin');
    const btnOpenSignup = document.getElementById('btnOpenSignup');
    const closeLogin = document.getElementById('closeLoginModal');

  if (btnDoLogin) btnDoLogin.addEventListener('click', () => {
      const email = (document.getElementById('authEmail')||{}).value || '';
      const phone = (document.getElementById('authPhone')||{}).value || '';
      const password = (document.getElementById('authPassword')||{}).value || '';
      const res = login({email, password});
      if (!res.ok){ alert(res.error); return; }
      // Close modal and refresh page to reflect session
      const lm = document.getElementById('loginModal');
      if (lm) { lm.style.display='none'; lm.setAttribute('aria-hidden','true'); try{ lm.classList.remove('show'); }catch(e){} }
      // Redirect to profile
      location.href = 'user.html';
    });

  if (btnOpenSignup) btnOpenSignup.addEventListener('click', () => {
      // Simple signup flow using current inputs
      const email = (document.getElementById('authEmail')||{}).value || '';
      const phone = (document.getElementById('authPhone')||{}).value || '';
      const password = (document.getElementById('authPassword')||{}).value || '';
      const res = signup({email, telefono:phone, password});
      if (!res.ok){ alert(res.error); return; }
      const lm = document.getElementById('loginModal');
      if (lm) { lm.style.display='none'; lm.setAttribute('aria-hidden','true'); try{ lm.classList.remove('show'); }catch(e){} }
      // Redirect to profile
      location.href = 'user.html';
    });

    if (closeLogin) closeLogin.addEventListener('click', () => {
      const lm = document.getElementById('loginModal');
      if (lm) { lm.style.display='none'; lm.setAttribute('aria-hidden','true'); try{ lm.classList.remove('show'); }catch(e){} }
    });
  });

  // Public API
  window.KONDAuth = { signup, login, logout, currentUser, openLoginModal, updateProfile, changePassword };
})();
