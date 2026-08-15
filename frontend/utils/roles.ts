export type Role = 'SUPERADMIN' | 'DISPATCHER' | 'FLEET_MANAGER' | 'DRIVER';

export const ROLE_HOME: Record<Role, string> = {
  SUPERADMIN: '/admin',
  DISPATCHER: '/dispatch/live',
  FLEET_MANAGER: '/fleet/vehicles',
  DRIVER: '/driver',
};

export const homeFor = (role: string | null | undefined): string => ROLE_HOME[role as Role] ?? '/login';
