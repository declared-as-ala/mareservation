# MaTable (MaReservation) — Completed Checklist & Next Steps

## ✅ Deliverable checklist (done)

- **Navbar / routes**
  - Same AppBar on all screens (Home + inner pages); search bar on every page.
  - Removed “Pour les établissements” and “Comment ça marche”; no owner role or owner dashboard. Only CUSTOMER + ADMIN.

- **Global search (AppBar)**
  - Placeholder: “Rechercher un lieu, un événement…”
  - Backend: `GET /api/search?q=...` returns lieux, chambres, evenements (grouped).
  - Frontend: debounce, dropdown grouped by type, Ctrl+K/Cmd+K focus, clear button.

- **Database**
  - MongoDB Atlas only; `MONGO_URI` in `backend/.env`; no Docker Mongo. `.env.example` has placeholders; docker-compose: frontend + backend only.

- **Auth**
  - Register / login / logout / refresh; bcrypt; JWT + refresh (httpOnly). Customer + Admin only.
  - “Réserver” when not logged in → modal “Vous devez vous connecter pour réserver” (Se connecter / Créer un compte).

- **Reservations**
  - Real reservations in MongoDB; no fake dashboard data. Dashboard: À venir / Passées; venue, date/time, booking type (Table / Chambre / Place), price, status; “Voir QR” and “Imprimer” ticket.

- **Booking structure**
  - TABLE (café/restaurant), ROOM (hotel), SEAT (cinema). Models: Users, Venues, VenueMedia, Tables, Rooms, Seats, Events, Reservations (bookingType, tableId/roomId/seatId, totalPrice). Conflict checks for overlapping table/room/seat.

- **360° tours**
  - Klapty only (no AI). `VenueMedia` kind `TOUR_360_EMBED_URL`; rendered via iframe. Cafés max 2 tables; hotels: list rooms + 360 + “Réserver cette chambre”; cinema: 360 + 3 seats.

- **Venue detail UX**
  - Stepper: 1) Date/heure (or nights for hotel), 2) Choose table/room/seat, 3) Confirm. Availability and disabled reserved items.

- **Home**
  - “Événements à venir” from `GET /api/events?upcoming=true` with skeleton; event cards with “Voir”.

- **Admin**
  - `/admin` (ADMIN only): overview (users, venues, reservations today/week, events); tables (users, venues, reservations); cancel reservation.

- **Seed**
  - 1 admin, 3 customers; 2 cafés (2 tables each), 1 restaurant, 1 hotel (rooms), 1 cinema (3 seats); Klapty URLs; events; sample reservations for `client1@example.com`. Credentials in README (password: `password123`).

- **Run**
  - Backend + frontend via docker-compose; frontend at http://localhost:5173.

---

## Next steps (optional / future)

1. **Email / SMS**
   - Send confirmation (and optional reminder) when a reservation is created or cancelled.

2. **Search polish**
   - Optional: highlight match in results; recent searches persisted across sessions (if not already).

3. **Admin**
   - Optional: “Deactivate venue” action; export reservations (CSV); more filters (booking type, date range).

4. **Tests**
   - E2E (Playwright/Cypress) for reserve flow and auth.
   - Unit tests for overlap logic, validation, and critical API routes.

5. **i18n**
   - Extract French strings and add language switching if you plan multiple locales.

6. **Deploy**
   - Deploy backend (e.g. Railway, Render) and frontend (Vercel, Netlify); keep `MONGO_URI`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `FRONTEND_URL` in env; optional rate limiting and CORS for production.

7. **Analytics**
   - Admin: charts for reservations over time, revenue by venue/type. Optional for MVP.
