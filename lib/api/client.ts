/**
 * Central API client with cookie-based auth.
 *
 * The backend uses httpOnly cookies for both access and refresh tokens.
 * This client sends those cookies with `credentials: 'include'` and performs
 * one shared silent refresh when protected requests receive a 401.
 */

import { useAuthStore } from '@/stores/auth';
import { isProtectedPath } from '@/lib/auth/redirect';
import { refreshAuthSession } from './auth-session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mareservtaion-backend.vercel.app';

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
  errors?: unknown;
};

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };

function clearAuthAndRedirectToLogin() {
  const store = useAuthStore.getState();
  store.clearAll();

  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname || '/';
    if (isProtectedPath(currentPath)) {
      window.location.href = `/login?returnTo=${encodeURIComponent(currentPath)}`;
    }
  }
}

function getErrorMessage(json: Record<string, unknown>, status: number): string {
  return ((json.message ?? json.error) || `HTTP ${status}`) as string;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

function isAuthBootstrapPath(path: string): boolean {
  return path === '/auth/refresh' || path === '/auth/login' || path === '/auth/register';
}

async function apiFetchInternal<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}/api/v1${path}`;

  let body: BodyInit | null | undefined = options.body as BodyInit | null | undefined;
  if (
    options.body &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob)
  ) {
    body = JSON.stringify(options.body);
  }

  // Attach Bearer token if the store has one — fallback for deployments
  // where httpOnly cookies don't reach cross-port subdomains.
  const token = useAuthStore.getState().accessToken;

  const baseOpts: RequestInit = {
    ...options,
    body,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const res = await fetch(url, baseOpts);

  if (res.status === 401 && !isAuthBootstrapPath(path)) {
    const refreshed = await refreshAuthSession(API_BASE);

    if (refreshed) {
      // Refresh may have returned a fresh accessToken — pick up the new one.
      const freshToken = useAuthStore.getState().accessToken;
      const retryRes = await fetch(url, {
        ...baseOpts,
        headers: {
          ...baseOpts.headers,
          ...(freshToken ? { Authorization: `Bearer ${freshToken}` } : {}),
          'X-Retry': '1',
        } as Record<string, string>,
      });

      if (retryRes.ok) {
        return (await parseJson(retryRes)) as ApiResponse<T>;
      }

      const retryJson = await parseJson(retryRes);
      if (retryRes.status === 401) {
        clearAuthAndRedirectToLogin();
        throw new Error('Session expiree. Veuillez vous reconnecter.');
      }
      throw new Error(getErrorMessage(retryJson, retryRes.status));
    }

    clearAuthAndRedirectToLogin();
    throw new Error('Session expiree. Veuillez vous reconnecter.');
  }

  const json = await parseJson(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(json, res.status));
  }

  return json as ApiResponse<T>;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return apiFetchInternal<T>(path, { method: 'GET', ...options });
}

export async function apiGetRaw<T = unknown>(path: string): Promise<T> {
  const res = await apiFetchInternal<T>(path, { method: 'GET' });
  return res as unknown as T;
}

export async function apiPostRaw<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await apiFetchInternal<T>(path, { method: 'POST', body: JSON.stringify(body) });
  return res as unknown as T;
}

export async function apiPatchRaw<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await apiFetchInternal<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  return res as unknown as T;
}

export async function apiDeleteRaw<T = unknown>(path: string): Promise<T> {
  const res = await apiFetchInternal<T>(path, { method: 'DELETE' });
  return res as unknown as T;
}

export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/v1/uploads/image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { url?: string }; message?: string };
  if (!res.ok) throw new Error(json.message || 'Upload failed.');
  if (!json.data?.url) throw new Error('Reponse upload invalide.');
  return json.data.url;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
