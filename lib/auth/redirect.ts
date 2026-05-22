export type AuthRole = string | null | undefined;

const DEFAULT_USER_HOME = '/';
const DEFAULT_ADMIN_HOME = '/admin/dashboard';
const DEFAULT_OWNER_HOME = '/owner';

const PUBLIC_PATH_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/email-verified',
  '/explorer',
  '/recherche',
  '/contact',
  '/faq',
  '/a-propos',
  '/comment-ca-marche',
  '/mentions-legales',
  '/cgv',
  '/cafes',
  '/restaurants',
  '/hotels',
  '/cinema',
  '/evenement',
  '/evenements',
  '/sos-conseil',
];

function stripHash(path: string): string {
  const hashIdx = path.indexOf('#');
  return hashIdx >= 0 ? path.slice(0, hashIdx) : path;
}

export function isAdminRole(role: AuthRole): boolean {
  return String(role ?? '').toUpperCase() === 'ADMIN';
}

export function isOwnerRole(role: AuthRole): boolean {
  const normalized = String(role ?? '').toUpperCase();
  return (
    normalized === 'ORGANIZER' ||
    normalized === 'OWNER' ||
    normalized.endsWith('_OWNER')
  );
}

export function getDefaultRedirectForRole(role: AuthRole): string {
  if (isAdminRole(role)) return DEFAULT_ADMIN_HOME;
  if (isOwnerRole(role)) return DEFAULT_OWNER_HOME;
  return DEFAULT_USER_HOME;
}

export function isSafeInternalPath(candidate: string | null | undefined): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  if (!candidate.startsWith('/')) return false;
  if (candidate.startsWith('//')) return false;
  if (candidate.startsWith('/\\')) return false;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) return false;
  return true;
}

export function sanitizeReturnTo(candidate: string | null | undefined): string | null {
  if (!isSafeInternalPath(candidate)) return null;
  const cleaned = stripHash(candidate!.trim());
  if (!cleaned.startsWith('/')) return null;
  return cleaned || '/';
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isProtectedPath(pathname: string): boolean {
  const path = pathname || '/';
  if (isAdminPath(path)) return true;
  if (path === '/owner' || path.startsWith('/owner/')) return true;
  if (path === '/profile' || path.startsWith('/profile/')) return true;
  if (path === '/mes-reservations' || path.startsWith('/mes-reservations/')) return true;
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return true;

  return !PUBLIC_PATH_PREFIXES.some((prefix) => {
    if (prefix === '/') return path === '/';
    return path === prefix || path.startsWith(prefix + '/');
  });
}

export function resolvePostLoginRedirect(role: AuthRole, returnTo: string | null | undefined): string {
  const fallback = getDefaultRedirectForRole(role);
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (!safeReturnTo) return fallback;

  if (!isAdminRole(role) && isAdminPath(safeReturnTo)) {
    return DEFAULT_USER_HOME;
  }
  if (!isOwnerRole(role) && (safeReturnTo === '/owner' || safeReturnTo.startsWith('/owner/'))) {
    return fallback;
  }

  return safeReturnTo;
}
