'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuthStore, type User } from '@/stores/auth';

type AuthContextValue = {
  user: User | null;
  authStatus: 'checking' | 'authenticated' | 'guest';
  isAuthenticated: boolean;
  role: string | null;
  isVerified: boolean;
  /** True while the initial session validation is in progress. */
  isLoading: boolean;
  /** True when the store has finished hydrating from localStorage. */
  hasHydrated: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authStatus: 'checking',
  isAuthenticated: false,
  role: null,
  isVerified: false,
  isLoading: true,
  hasHydrated: false,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/**
 * AuthProvider — runs once at the app root.
 *
 * It waits for Zustand to hydrate from localStorage, then validates the
 * session by calling `fetchMe()`.  If the server returns a valid user the
 * app continues; otherwise the user object is cleared.
 *
 * Components can call `useAuth()` to get `{ user, isLoading, hasHydrated }`
 * and make routing / UI decisions based on the single source of truth.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isResolving, hasHydrated, fetchMe, authStatus, isAuthenticated, role, isVerified } = useAuthStore();
  const bootstrapped = useRef(false);
  const [ready, setReady] = useState(false);

  // Run the bootstrap exactly once after Zustand has hydrated.
  useEffect(() => {
    if (!hasHydrated || bootstrapped.current) return;
    bootstrapped.current = true;

    // If we already have a user from localStorage, still validate it
    // against the server to avoid stale / revoked sessions.
    fetchMe().finally(() => setReady(true));
  }, [hasHydrated, fetchMe]);

  // If there was no persisted user at all, still try once.
  useEffect(() => {
    if (!hasHydrated || bootstrapped.current) return;
    // The effect above will handle it when a user exists.  If no user
    // was persisted we still want to call fetchMe so the navbar knows
    // whether a valid httpOnly cookie session exists.
    if (!user) {
      bootstrapped.current = true;
      fetchMe().finally(() => setReady(true));
    }
  }, [hasHydrated, user, fetchMe]);

  const isLoading = !ready || isResolving;

  return (
    <AuthContext.Provider
      value={{ user, authStatus, isAuthenticated, role, isVerified, isLoading, hasHydrated }}
    >
      {children}
    </AuthContext.Provider>
  );
}
