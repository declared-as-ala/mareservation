/**
 * Klapty 360° embed: we must use the official tunnel URL only.
 * Format: https://www.klapty.com/tour/tunnel/<TOUR_ID>
 * Do NOT use: storage.klapty.com, or public page URLs (/p/.../t/...).
 */

/** Iframe src MUST start with this exact prefix. Never use storage.klapty.com or /p/ or /t/ public URLs. */
export const KLAPTY_TUNNEL_PREFIX = 'https://www.klapty.com/tour/tunnel/';
const TUNNEL_REGEX = /^https:\/\/www\.klapty\.com\/tour\/tunnel\/[^/?#]+/i;

/** Reject any URL that indicates wrong format (storage or public page). */
function isInvalidKlaptyUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (u.includes('storage.klapty.com')) return true;
  if (u.includes('klapty.com') && u.includes('/p/')) return true;
  if (u.includes('klapty.com') && u.includes('/t/') && u.indexOf('/tour/tunnel/') === -1) return true;
  return false;
}

/**
 * Returns true if the URL is the correct Klapty tunnel embed URL.
 */
export function isKlaptyTunnelUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim();
  if (isInvalidKlaptyUrl(u)) return false;
  return TUNNEL_REGEX.test(u);
}

/**
 * Returns the URL to use for the iframe embed, or null if not embeddable.
 * STRICT: only returns URL when it starts with https://www.klapty.com/tour/tunnel/
 * Rejects storage.klapty.com, /p/.../t/... public pages, and any non-tunnel URL.
 */
export function getKlaptyEmbedUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (isInvalidKlaptyUrl(u)) return null;
  if (!u.startsWith(KLAPTY_TUNNEL_PREFIX)) return null;
  if (!TUNNEL_REGEX.test(u)) return null;
  return u;
}

/**
 * Build tunnel URL from a known tour ID (for seed/manual data).
 */
export function buildKlaptyTunnelUrl(tourId: string): string {
  return `${KLAPTY_TUNNEL_PREFIX}${tourId}`;
}
