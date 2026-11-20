# ARCHITECTURE — Ma Reservation

Immersive reservation platform (cafés, restaurants, hotels, coworking, events/cinema). Users explore a venue in 360°/virtual tour, click a table/seat, hold it, pay.
Index: GitNexus repo `mareservation` (605 files, 10.8k nodes, 428 flows). Generated 2026-11-14, from commit `2ff3893` + dirty working tree.

## Top-level layout

| Path | What | Status |
|---|---|---|
| `frontend/` | Next.js App Router, Tailwind, shadcn/ui, Zustand | **Main client** |
| `backend/` | Express + Mongoose (MongoDB Atlas), JWT auth | **Main API** |
| `src/`, `index.html`, `vite.config.ts`, root `package.json`, `public/`, `test.html` | Separate Vite + React app (`@figma/my-make-file`, react-query, AuthContext). Untracked. | Looks like a Figma-Make export / legacy; not part of the Next.js flow. GitNexus communities such as "Sos-conseil"/"Hotel" partly come from it. Confirm before relying on it. |
| `docs/`, many root `*.md` | Notes, deployment guides | Not authoritative; code wins |

## Backend (`backend/src`)

- Entry: `server.ts` (listen), `app.ts` (Express app, helmet, CORS allow-list, cookie-parser), `vercel-handler.ts` (serverless).
- Routes mounted under `/api/v1/*` and legacy `/api/*`.
- **Mounted in `app.ts` today:** venues, tables, events, reservations, auth, search, admin, scenes, categories (legacy only).
- **Route files that exist but are NOT mounted in the current `app.ts`:** owner, owner-table, owner-hotel, owner-coworking, owner-events, admin-hotel, payments, payouts, pricing, reviews, support, hotel-checkout, event-checkout, favorites, menu-du-jour, menuItems, organizer, partner-applications, sos-conseil, uploads, tags, meta. GitNexus `route_map` lists them (203 routes, 28 in `owner.ts`, 19 in `owner-table.ts`, 18 in `admin.ts`). **Verify whether the working-tree `app.ts` regressed** (it is modified vs HEAD and HEAD followed a malware cleanup) before touching routing.
- Auth: `middleware/auth.ts` — `authenticate` (Bearer JWT → `userId`, `userRole`), `requireAdmin`. Has an insecure fallback `JWT_SECRET`; refresh tokens exist as a model (`RefreshToken`), login throttling via `LoginAttempt`.
- Services: `email`, `payment`, `whatsapp`, `reservation-ticket-email`, `sos-conseil-chat`, `availabilityEvents`.
- Jobs: `expireHolds.job`, `holdExpiry.service` (temporary hold expiry), `payouts.cron`, `notifications.cron`, `sendReservationEmails.job`.
- Dead/empty dirs: `prisma/`, `venues/`, DTO-only `auth/ owner/ reservations/`. `middlewares/` and `middleware/` both exist.

### Data model (Mongoose, `models/`)
- Venue core: `Venue`, `Category`, `Tag`, `VenueMedia`, `VirtualTour`, `Scene`, `TourHotspot`, `BannerSlide`, `Zone`.
- Tables: `Table`, `TablePlacement`, `TableHotspot`, `TableBlock`, `VenueTablePolicy`.
- Hotel/other units: `Room`, `RoomBlock`, `Seat`, `ReservableUnit`, `Coworking*`, `Event`, `EventSession`.
- Booking/money: `Reservation`, `ReservationHold`, `Payment`, `Payout`, `PricingRule`, `PromoCode`, `SponsoredPlacement`.
- Users/other: `User`, `RefreshToken`, `EmailVerification`, `PasswordReset`, `LoginAttempt`, `Favorite`, `Review`, `SupportCase`, `PartnerApplication`, `SOSConseilRequest`, `MenuItem`, `MenuDuJour`, `AppSettings`, `AuditLog`.

## Frontend (`frontend/`)

- `middleware.ts`: route gating (auth/role redirects, maintenance gate); helper `lib/auth/redirect.ts`.
- Route groups in `app/`: `(public)` (home, cafes, restaurants, hotels, coworking, cinema/evenements, explorer, lieu, reservation, checkout, panier, login/register, profile, mes-reservations, sos-conseil, owner…), `(admin)/admin`, `(dashboard)/dashboard`, plus `maintenance`, `unauthorized`.
- **Immersive core:** `components/immersive/` — `ImmersiveViewer` (entry), `PanoramaEngine` / `PanoramaTourViewer` (custom 360, yaw/pitch markers), `MatterportEngine`, `MatterportClientViewer`, `EmbedEngine`, `VirtualTourViewer` (iframe tours).
- Other component areas: `admin/` (table editor), `reservation/`, `venue/`, `detail/`, `hotel/`, `events/`, `owner/`, `dashboard/`, `discover/`, `home/`, `layout/` (Navbar), `ui/` (shadcn), `sos-conseil/`.
- State: `stores/auth.ts` (session), `stores/cart.ts` (cart). API client in `lib/api/`.

## Key flows (to confirm per task via `query`/`trace`)
1. Browse → venue page opens immersive viewer directly (no preview).
2. Viewer loads Scene + TablePlacement + Table status from API → markers (green/red).
3. Click table → modal → cart (`stores/cart`) → `POST /reservations` creates `ReservationHold` (expires via `expireHolds.job`) → payment → confirmed.
4. Admin/owner table editor: click in 360 → yaw/pitch → create Table + TablePlacement.
5. Auth: login → JWT (+ refresh) → `stores/auth` → `middleware.ts` gating.

## Risks / open questions
- Unmounted route files vs. `app.ts` (above).
- Hard-coded origins and default JWT secret in backend.
- Duplicate Vite app at repo root; stray untracked `.next/`, `Dockerfile`, `package.json`.

## GitNexus working agreement
- Orient with `query` / `context`; blast radius with `impact` (upstream) before any edit; `detect_changes` before commit; `route_map`/`api_impact` for API changes.
- Graph is a map, not truth: verify in source. Index is of HEAD plus working tree at 13:46 UTC; re-run `analyze` after large changes. `embeddings: 0` so `query` is keyword-only.


## Update 2026-11-14 — launch changes
- **Catalogue flag:** `backend/src/config/publicCatalog.ts` (`PUBLIC_VENUE_TYPES`, default `MAISON_DHOTE`; optional `PUBLIC_VENUE_SLUGS` allowlist). Frontend mirror `frontend/lib/publicCatalog.ts` + `middleware.ts` (hidden categories → 404 + noindex; `/hotel(s)` → 308).
- **Availability search:** `backend/src/utils/stayAvailability.ts`, used by `GET /venues?checkIn&checkOut&guests`.
- **Booking safety:** `backend/src/utils/bookingLock.ts` (per-room mutex + Mongo transaction) around hotel hold/confirm in `routes/hotel-checkout.ts`.
- **Secrets:** JWT secret only via `getEnv()` (validated). **Tests:** `backend/tests` (vitest, supertest, mongodb-memory-server). **CI/CD:** manual `deploy.yml`, key-based.
- **Frontend design system:** `frontend/components/exploria/*`, tokens in `app/globals.css`, fonts via @fontsource.
