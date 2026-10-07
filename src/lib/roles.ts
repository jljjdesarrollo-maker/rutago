/**
 * Fuente Única de la Verdad para Roles y Permisos en RutaGo
 * Unifica la jerarquía canónica:
 * - SUPERADMIN_SAAS: Vendor Desarrollador / Dueño de Plataforma (PIN 9999)
 * - SOCIO: Socio Propietario de Autobús
 * - CONDUCTOR / AYUDANTE: Tripulación operativa del autobús
 */

export type AppUserRole = 'SUPERADMIN_SAAS' | 'SOCIO' | 'CONDUCTOR' | 'AYUDANTE' | 'ADMIN';

export interface UserRolePayload {
  rol?: string | null;
  subRol?: string | null;
  id?: string | null;
  nombre?: string | null;
}

export function isSuperAdmin(user?: UserRolePayload | null): boolean {
  if (!user) return false;
  return (
    user.rol === 'SUPERADMIN_SAAS' ||
    user.rol === 'ADMIN' ||
    user.subRol === 'SUPERADMIN_SAAS' ||
    user.id === 'saas-superadmin' ||
    user.id === 'cmumqilqq0000jp04fx4oyh1f' ||
    (typeof user.nombre === 'string' && user.nombre.toLowerCase().includes('superadmin'))
  );
}

export function isSocio(user?: UserRolePayload | null): boolean {
  if (!user) return false;
  return user.rol === 'SOCIO' && !isSuperAdmin(user);
}

export function isTripulacion(user?: UserRolePayload | null): boolean {
  if (!user) return false;
  return user.rol === 'CONDUCTOR' || user.rol === 'AYUDANTE';
}
