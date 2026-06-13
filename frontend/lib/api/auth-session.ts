import { useAuthStore } from '@/stores/auth';

let refreshPromise: Promise<boolean> | null = null;
const REFRESH_TIMEOUT_MS = 15_000;

export function refreshAuthSession(apiBase: string): Promise<boolean> {
  if (!refreshPromise) {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    refreshPromise = fetch(`${apiBase}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return false;
        // The backend may return a fresh accessToken in the JSON body —
        // persist it so the API client can attach it on retried requests.
        try {
          const data = (await res.clone().json().catch(() => null)) as { accessToken?: string } | null;
          const next = data?.accessToken;
          if (next) useAuthStore.getState().setAccessToken(next);
        } catch {
          // ignore JSON errors; cookie-only refreshes still succeed
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        globalThis.clearTimeout(timeout);
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
