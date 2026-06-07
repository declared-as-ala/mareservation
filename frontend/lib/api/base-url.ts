/**
 * In development, browser requests use the frontend origin and Next.js
 * rewrites proxy /api/v1 to the backend. In production, requests go
 * directly to the backend to avoid unreliable proxy setups.
 */
const VPS_BACKEND_API_URL = 'http://145.223.118.9:5001';
const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE = isProduction ? VPS_BACKEND_API_URL : '';
