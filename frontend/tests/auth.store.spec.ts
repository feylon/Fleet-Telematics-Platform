import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AUTH_STORAGE_KEY, useAuthStore } from '~/stores/auth';

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('stores tokens and user on login and persists them', () => {
    const auth = useAuthStore();
    auth.setTokens({ accessToken: 'a.b.c', refreshToken: 'r', expiresIn: 900 });
    auth.setUser({ id: '1', login: 'disp', role: 'DISPATCHER', organizationId: 'o', fullName: 'D', locale: 'uz', phone: null, email: null, mustChangePassword: false, sessionId: 's' });
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.role).toBe('DISPATCHER');
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '{}').refreshToken).toBe('r');
  });

  it('clears everything on logout', () => {
    const auth = useAuthStore();
    auth.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 });
    auth.clear();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('decodes the role from a jwt payload', () => {
    const auth = useAuthStore();
    const payload = btoa(JSON.stringify({ role: 'DRIVER' })).replace(/=+$/, '');
    expect(auth.decodeRole(`x.${payload}.y`)).toBe('DRIVER');
  });
});
