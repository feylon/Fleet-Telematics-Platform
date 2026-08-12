import { useAuthStore } from '~/stores/auth';
import { homeFor } from '~/utils/roles';

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;
  const auth = useAuthStore();
  auth.hydrate();
  const isPublic = to.path === '/login';
  if (!auth.isAuthenticated) {
    return isPublic ? undefined : navigateTo({ path: '/login', query: to.path !== '/' ? { redirect: to.fullPath } : {} });
  }
  const role = auth.role ?? auth.decodeRole(auth.accessToken ?? '');
  if (isPublic || to.path === '/') return navigateTo(homeFor(role));
  const allowed = to.meta.roles as string[] | undefined;
  if (allowed && allowed.length > 0 && role && !allowed.includes(role)) return navigateTo(homeFor(role));
  return undefined;
});
