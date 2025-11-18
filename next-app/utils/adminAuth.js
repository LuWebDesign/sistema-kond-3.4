// ============================================
// MIDDLEWARE PARA PROTEGER RUTAS DE ADMIN
// Verifica permisos antes de acceder a páginas admin
// ============================================

import { usePermissions } from '../utils/permissions';

export function withAdminAuth(Component) {
  return function AdminProtectedComponent(props) {
    const { isAdmin, user } = usePermissions();

    // Si no está logueado como admin, redirigir
    if (typeof window !== 'undefined' && !isAdmin) {
      // Solo redirigir en el cliente para evitar problemas de SSR
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
        return null;
      }
    }

    // Si está logueado como admin, mostrar el componente
    return <Component {...props} user={user} />;
  };
}

export function withSuperAdminAuth(Component) {
  return function SuperAdminProtectedComponent(props) {
    const { isSuperAdmin, user } = usePermissions();

    // Si no es super admin, redirigir
    if (typeof window !== 'undefined' && !isSuperAdmin) {
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
        return null;
      }
    }

    return <Component {...props} user={user} />;
  };
}

// Hook para usar en componentes que necesitan verificar permisos
export function useAdminAuth() {
  const { user, isAdmin, isSuperAdmin, hasPermission } = usePermissions();

  return {
    user,
    isAdmin,
    isSuperAdmin,
    hasPermission,
    canAccess: (requiredPermission) => hasPermission(requiredPermission)
  };
}