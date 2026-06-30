/**
 * In development, browser requests use the frontend origin and Next.js
 * rewrites proxy /api/v1 to the backend.
 * 
 * In production, we also use relative paths (empty API_BASE) so that the browser
 * sends requests to the same origin (e.g., https://www.exploria360.com/api/v1/...).
 * This avoids Mixed Content (HTTP vs HTTPS) blocking and CORS issues.
 * Next.js rewrites or Nginx will proxy these requests to the backend container.
 */
export const API_BASE = '';
