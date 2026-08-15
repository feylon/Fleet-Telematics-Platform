import { useAuthStore, type TokenPair } from '~/stores/auth';

export interface ApiError {
  status: number;
  message: string;
}

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshing: Promise<boolean> | null = null;

const messageOf = (error: unknown): string => {
  const data = (error as { data?: { message?: string | string[] } })?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return (error as Error)?.message ?? 'Request failed';
};

export const useApi = () => {
  const config = useRuntimeConfig();
  const auth = useAuthStore();
  const base = config.public.apiBase;

  const refresh = async (): Promise<boolean> => {
    if (!auth.refreshToken) return false;
    if (!refreshing) {
      refreshing = $fetch<TokenPair>(`${base}/api/auth/refresh`, { method: 'POST', body: { refreshToken: auth.refreshToken } })
        .then((pair) => {
          auth.setTokens(pair);
          return true;
        })
        .catch(() => false)
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  };

  const request = async <T>(path: string, options: Record<string, unknown> = {}, retry = true): Promise<T> => {
    const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) };
    if (auth.accessToken) headers.authorization = `Bearer ${auth.accessToken}`;
    try {
      return await $fetch<T>(`${base}${path}`, { ...options, headers } as never);
    } catch (error) {
      const status = (error as { status?: number; statusCode?: number })?.status ?? (error as { statusCode?: number })?.statusCode ?? 0;
      if (status === 401 && retry && auth.refreshToken) {
        const ok = await refresh();
        if (ok) return request<T>(path, options, false);
        auth.clear();
        await navigateTo('/login');
      }
      throw new ApiRequestError(status, messageOf(error));
    }
  };

  const get = <T>(path: string, query?: Record<string, unknown>) => request<T>(path, { method: 'GET', query });
  const post = <T>(path: string, body?: unknown, query?: Record<string, unknown>) => request<T>(path, { method: 'POST', body, query });
  const put = <T>(path: string, body?: unknown, query?: Record<string, unknown>) => request<T>(path, { method: 'PUT', body, query });
  const del = <T>(path: string, query?: Record<string, unknown>) => request<T>(path, { method: 'DELETE', query });

  const downloadBlob = async (path: string, query?: Record<string, unknown>): Promise<{ blob: Blob; fileName: string }> => {
    const url = new URL(`${base}${path}`, window.location.origin);
    for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    const response = await fetch(url.toString(), { headers: auth.accessToken ? { authorization: `Bearer ${auth.accessToken}` } : {} });
    if (!response.ok) throw new ApiRequestError(response.status, 'Download failed');
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return { blob: await response.blob(), fileName: match?.[1] ?? 'report' };
  };

  return { request, get, post, put, del, downloadBlob, refresh };
};
