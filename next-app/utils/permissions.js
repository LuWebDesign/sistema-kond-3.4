// ============================================
// SISTEMA DE PERMISOS PARA ADMINS
// Funciones para verificar roles y permisos
// ============================================

/**
 * Verificar si el usuario actual es Super Admin
 */
export function isSuperAdmin(user) {
  return user?.rol === 'super_admin';
}

/**
 * Verificar si el usuario actual es Admin (cualquier tipo)
 */
export function isAdmin(user) {
  return user?.rol === 'admin' || user?.rol === 'super_admin';
}

/**
 * Verificar si el usuario actual es Cliente
 */
export function isCliente(user) {
  return user?.rol === 'cliente' || !user?.rol;
}

/**
 * Obtener permisos del usuario actual
 */
export function getUserPermissions(user) {
  if (!user) return [];

  const permissions = {
    super_admin: [
      'manage_users',
      'manage_admins',
      'manage_products',
      'manage_orders',
      'manage_finances',
      'manage_settings',
      'view_all_data',
      'delete_data'
    ],
    admin: [
      'manage_products',
      'manage_orders',
      'manage_finances',
      'view_reports'
    ],
    cliente: [
      'view_own_profile',
      'create_orders',
      'view_own_orders'
    ]
  };

  return permissions[user.rol] || permissions.cliente;
}

/**
 * Verificar si el usuario tiene un permiso específico
 */
export function hasPermission(user, permission) {
  const permissions = getUserPermissions(user);
  return permissions.includes(permission);
}

/**
 * Hook personalizado para usar permisos en componentes
 */
export function usePermissions() {
  // Obtener usuario del contexto o localStorage
  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('currentUser') || 'null')
    : null;

  return {
    user,
    isSuperAdmin: isSuperAdmin(user),
    isAdmin: isAdmin(user),
    isCliente: isCliente(user),
    permissions: getUserPermissions(user),
    hasPermission: (permission) => hasPermission(user, permission)
  };
}