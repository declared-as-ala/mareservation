let refreshPromise: Promise<boolean> | null = null;

export function refreshAuthSession(apiBase: string): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBase}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
