import { useAuthStore } from '@/stores/auth';

let refreshPromise: Promise<boolean> | null = null;

export function refreshAuthSession(apiBase: string): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBase}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
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
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
