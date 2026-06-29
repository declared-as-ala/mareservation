import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import categoriesRouter from './routes/categories';
import venuesRouter from './routes/venues';
import tablesRouter from './routes/tables';
import eventsRouter from './routes/events';
import reservationsRouter from './routes/reservations';
import authRouter from './routes/auth';
import searchRouter from './routes/search';
import adminRouter from './routes/admin';
import adminHotelRouter from './routes/admin-hotel';
import eventCheckoutRouter from './routes/event-checkout';
import favoritesRouter from './routes/favorites';
import hotelCheckoutRouter from './routes/hotel-checkout';
import menuDuJourRouter from './routes/menu-du-jour';
import menuRouter from './routes/menuItems';
import metaRouter from './routes/meta';
import organizerRouter from './routes/organizer';
import uploadsRouter from './routes/uploads';
import ownerRouter from './routes/owner';
import ownerCoworkingRouter from './routes/owner-coworking';
import ownerEventsRouter from './routes/owner-events';
import ownerHotelRouter from './routes/owner-hotel';
import ownerTableRouter from './routes/owner-table';
import paymentsRouter from './routes/payments';
import payoutsRouter from './routes/payouts';
import pricingRouter from './routes/pricing';
import reviewsRouter from './routes/reviews';
import scenesRouter from './routes/scenes';
import partnerApplicationsRouter from './routes/partner-applications';
import sosConseilRouter from './routes/sos-conseil';
import supportRouter from './routes/support';
import tagsRouter from './routes/tags';

dotenv.config();

const app = express();

// Extra origins can be supplied via env (comma/semicolon separated) so new
// domains never require a code change: CORS_ORIGINS / CORS_ORIGIN / FRONTEND_URL.
const ENV_ORIGINS = [
  process.env.CORS_ORIGINS,
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .flatMap((v) => String(v).split(/[,;]/))
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(
  new Set(
    [
      'http://localhost:5173',
      'http://localhost:3000',
      // Production frontends
      'https://www.exploria360.com',
      'https://exploria360.com',
      'http://145.223.118.9:3000',
      'http://145.223.118.9',
      'https://mareservtaion-frontend.vercel.app',
      ...ENV_ORIGINS,
    ].filter(Boolean)
  )
);

// Also allow any *.exploria360.com subdomain (e.g. admin/staging) over https.
const ALLOWED_ORIGIN_REGEXES = [/^https:\/\/([a-z0-9-]+\.)*exploria360\.com$/i];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGIN_REGEXES.some((re) => re.test(origin));
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header (server-to-server, curl, same-origin) → allow.
    if (!origin || isAllowedOrigin(origin)) cb(null, origin || ALLOWED_ORIGINS[0]);
    else cb(null, false);
  },
  credentials: true,
  // Make the Bearer token reach the server through preflight on every browser
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Retry'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Ma Reservation API',
    version: '1.0',
    health: '/api/v1/health',
    message: 'Ma Reservation API is running.',
  });
});

// Avoid 404s from browser favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// API v1 — primary
app.get('/api/v1/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/venues', venuesRouter);
app.use('/api/v1/tables', tablesRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/reservations', reservationsRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/admin-hotel', adminHotelRouter);
app.use('/api/v1/event-checkout', eventCheckoutRouter);
app.use('/api/v1/favorites', favoritesRouter);
app.use('/api/v1/hotel-checkout', hotelCheckoutRouter);
app.use('/api/v1/menu-du-jour', menuDuJourRouter);
app.use('/api/v1/menu', menuRouter);
app.use('/api/v1/meta', metaRouter);
app.use('/api/v1/organizer', organizerRouter);
app.use('/api/v1/uploads', uploadsRouter);
app.use('/api/v1/owner', ownerRouter);
app.use('/api/v1/owner-coworking', ownerCoworkingRouter);
app.use('/api/v1/owner-events', ownerEventsRouter);
app.use('/api/v1/owner-hotel', ownerHotelRouter);
app.use('/api/v1/owner-table', ownerTableRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/payouts', payoutsRouter);
app.use('/api/v1/pricing', pricingRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/scenes', scenesRouter);
app.use('/api/v1/partner-applications', partnerApplicationsRouter);
app.use('/api/v1/sos-conseil', sosConseilRouter);
app.use('/api/v1/support', supportRouter);
app.use('/api/v1/tags', tagsRouter);

// Legacy /api/* (backward compatibility during migration)
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});
app.use('/api/categories', categoriesRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);

// Error-handling middleware MUST declare 4 parameters; otherwise Express
// treats it as a regular middleware and shifts (err, req, res) into the
// next handler — causing `res.status is not a function` further down.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err?.message || err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error', message: err?.message });
});

// Explicit 404 — ensures clear JSON response for unknown routes (avoids ambiguous NOT_FOUND)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    method: req.method,
    path: req.path,
    message: `Endpoint ${req.method} ${req.path} not found.`,
  });
});

export default app;
